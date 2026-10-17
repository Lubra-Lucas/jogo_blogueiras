"""Helpers compartilhados do estudo visual de ultrarrealismo (nao integra nada no jogo)."""
import bpy, sys, math, os
from mathutils import Vector


def args():
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def setup_cycles(samples=256, res=(1100, 1500), denoise=True, gpu=True, exposure=0.0, look="AgX - Base Contrast"):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.samples = samples
    cy.use_denoising = denoise
    cy.max_bounces = 10
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.sample_clamp_indirect = 10
    dev = "CPU"
    if gpu:
        try:
            p = bpy.context.preferences.addons["cycles"].preferences
            p.compute_device_type = "HIP"
            p.refresh_devices()
            for d in p.devices:
                d.use = d.type == "HIP"
            if any(d.type == "HIP" and d.use for d in p.devices):
                cy.device = "GPU"
                dev = "HIP"
        except Exception as e:
            print("HIP falhou:", e)
    print("RENDER DEVICE:", dev)
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = int(float(os.environ.get('RSCALE', '1')) * 100)
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "8"
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = look
    except Exception:
        pass
    sc.view_settings.exposure = exposure
    return dev


def sky(sun_elev=28, sun_rot=215, strength=1.0, sun_size=0.6, air=1.0, dust=1.2):
    sc = bpy.context.scene
    w = bpy.data.worlds.new("sky")
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    s = nt.nodes.new("ShaderNodeTexSky")
    s.sky_type = "MULTIPLE_SCATTERING"
    s.sun_elevation = math.radians(sun_elev)
    s.sun_rotation = math.radians(sun_rot)
    s.sun_size = math.radians(sun_size)
    s.air_density = air
    bg.inputs[1].default_value = strength
    nt.links.new(s.outputs[0], bg.inputs[0])
    nt.links.new(bg.outputs[0], out.inputs[0])
    return w


def camera(loc, target, lens=50, fstop=None, focus=None, sensor=36):
    sc = bpy.context.scene
    c = bpy.data.cameras.new("cam")
    c.lens = lens
    c.sensor_width = sensor
    o = bpy.data.objects.new("cam", c)
    sc.collection.objects.link(o)
    sc.camera = o
    o.location = Vector(loc)
    d = Vector(target) - o.location
    o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    if fstop:
        c.dof.use_dof = True
        c.dof.aperture_fstop = fstop
        c.dof.focus_distance = focus if focus else d.length
    return o


def area_light(loc, target, size, energy, color=(1, 1, 1), shape="RECTANGLE", size_y=None):
    l = bpy.data.lights.new("a", "AREA")
    l.shape = shape
    l.size = size
    if size_y:
        l.size_y = size_y
    l.energy = energy
    l.color = color
    o = bpy.data.objects.new("a", l)
    bpy.context.scene.collection.objects.link(o)
    o.location = Vector(loc)
    o.rotation_euler = (Vector(target) - o.location).to_track_quat("-Z", "Y").to_euler()
    return o


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


# ---------- nodes utilitarios ----------
def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.node_tree.nodes.clear()
    return m


class NB:
    """Mini construtor de nodes."""
    def __init__(self, mat):
        self.nt = mat.node_tree
        self.n = self.nt.nodes
        self.l = self.nt.links

    def add(self, t, **kw):
        nd = self.n.new(t)
        for k, v in kw.items():
            if k == "inputs":
                for i, val in v.items():
                    nd.inputs[i].default_value = val
            else:
                if k == "use_clamp" and nd.bl_idname == "ShaderNodeMapRange":
                    k = "clamp"
                setattr(nd, k, v)
        return nd

    def link(self, a, ao, b, bi):
        if isinstance(a, bpy.types.NodeSocket):
            # forma curta: link(socket, dest_node, dest_input)
            self.l.new(a, b.inputs[bi] if isinstance(bi, (int, str)) else bi)
            return
        self.l.new(a.outputs[ao] if isinstance(ao, (int, str)) else ao, b.inputs[bi] if isinstance(bi, (int, str)) else bi)

    def out(self, shader, disp=None):
        o = self.add("ShaderNodeOutputMaterial")
        self.l.new(shader.outputs[0], o.inputs["Surface"])
        if disp is not None:
            self.l.new(disp, o.inputs["Displacement"])
        return o


def color_ramp(nb, src, stops, interp="LINEAR"):
    r = nb.add("ShaderNodeValToRGB")
    r.color_ramp.interpolation = interp
    el = r.color_ramp.elements
    while len(el) > len(stops):
        el.remove(el[-1])
    while len(el) < len(stops):
        el.new(0.5)
    for e, (p, c) in zip(el, stops):
        e.position = p
        e.color = c
    nb.l.new(src, r.inputs[0])
    return r


def srgb(h):
    """'#rrggbb' -> linear rgba."""
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [(x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4) for x in c]
    return (c[0], c[1], c[2], 1)

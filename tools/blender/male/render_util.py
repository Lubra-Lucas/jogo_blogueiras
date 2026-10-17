import bpy, math
from mathutils import Vector
def setup(res=(900,900)):
    sc=bpy.context.scene
    sc.render.engine='BLENDER_EEVEE'
    sc.render.resolution_x,sc.render.resolution_y=res
    w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True
    w.node_tree.nodes['Background'].inputs[0].default_value=(0.82,0.84,0.88,1)
    w.node_tree.nodes['Background'].inputs[1].default_value=1.0
    for loc,e in (((2,-3,3),3.0),((-3,-2,1.5),1.2)):
        l=bpy.data.lights.new('l','SUN'); l.energy=e
        o=bpy.data.objects.new('l',l); sc.collection.objects.link(o)
        o.rotation_euler=(Vector((0,0,0))-Vector(loc)).to_track_quat('-Z','Y').to_euler()
def cam(center,dist,azim_deg,elev_deg=5,ortho=None,res=None):
    sc=bpy.context.scene
    c=bpy.data.objects.get('cam')
    if not c:
        c=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); sc.collection.objects.link(c)
    sc.camera=c
    a=math.radians(azim_deg); e=math.radians(elev_deg)
    # azim 0 => camera at -Y looking +Y (character faces -Y in blender)
    p=Vector((math.sin(a)*math.cos(e),-math.cos(a)*math.cos(e),math.sin(e)))*dist+Vector(center)
    c.location=p
    c.rotation_euler=(Vector(center)-p).to_track_quat('-Z','Y').to_euler()
    if ortho: c.data.type='ORTHO'; c.data.ortho_scale=ortho
    else: c.data.type='PERSP'; c.data.lens=70
def shot(path):
    bpy.context.scene.render.filepath=path; bpy.ops.render.render(write_still=True)


def hex2lin(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]


def male_material(base_png, mask_png, skin='#e8b89c', suit='#2a4fa8', rough=0.45):
    """Blender preview that mimics the game's mask recolouring (R skin, G base/boxer, B painted features)."""
    m = bpy.data.materials.new('male_prev'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    tb = nt.nodes.new('ShaderNodeTexImage'); tb.image = bpy.data.images.load(base_png); tb.image.colorspace_settings.name = 'sRGB'
    tm = nt.nodes.new('ShaderNodeTexImage'); tm.image = bpy.data.images.load(mask_png); tm.image.colorspace_settings.name = 'Non-Color'
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(tm.outputs['Color'], sep.inputs['Color'])
    def rgb(c):
        n = nt.nodes.new('ShaderNodeRGB'); n.outputs[0].default_value = (*hex2lin(c), 1); return n
    def mixn(a, b, fac):
        n = nt.nodes.new('ShaderNodeMix'); n.data_type = 'RGBA'
        nt.links.new(fac, n.inputs['Factor'])
        if isinstance(a, tuple): n.inputs['A'].default_value = a
        else: nt.links.new(a, n.inputs['A'])
        nt.links.new(b, n.inputs['B']); return n.outputs['Result']
    c = mixn(tb.outputs['Color'], rgb(skin).outputs[0], sep.outputs['Red'])      # skin where R
    c = mixn(c, rgb(suit).outputs[0], sep.outputs['Green'])                        # boxer where G
    nt.links.new(c, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = rough
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return m

"""Texturas procedurais: renda (alpha) e glitter (normal map)"""
import numpy as np, bpy, os


def save_png(path, rgba):
    h, w = rgba.shape[:2]
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=True)
    img.pixels.foreach_set(np.clip(rgba.astype(np.float32), 0, 1).ravel())
    img.filepath_raw = path; img.file_format = 'PNG'; img.save()


def lace(N=1024):
    y, x = np.mgrid[0:N, 0:N] / N
    a = np.zeros((N, N), np.float32)
    k = 4; fx = (x * k) % 1 - 0.5; fy = (y * k) % 1 - 0.5
    r = np.hypot(fx, fy); th = np.arctan2(fy, fx)
    petals = 0.5 + 0.5 * np.cos(6 * th)
    ring = np.abs(r - (0.20 + 0.08 * petals)) < 0.028
    center = r < 0.06
    u = ((x + y) * k * 2) % 1; v = ((x - y) * k * 2) % 1
    net = (np.abs(u - 0.5) > 0.44) | (np.abs(v - 0.5) > 0.44)
    dots = np.hypot(((x * k * 2) % 1) - 0.5, ((y * k * 2) % 1) - 0.5) < 0.09
    outside = r > 0.34
    a[net & outside] = 0.9; a[dots & outside] = 1.0
    a[ring] = 1.0; a[center] = 1.0
    leaf = ((np.abs(fx) < 0.018) & (np.abs(fy) < 0.34)) | ((np.abs(fy) < 0.018) & (np.abs(fx) < 0.34))
    a[leaf & (r > 0.05)] = 1.0
    out = np.ones((N, N, 4), np.float32); out[..., 3] = a
    return out


def glitter(N=512, seed=3):
    rng = np.random.default_rng(seed)
    n = rng.normal(size=(N, N, 2)) * 0.9
    L = np.sqrt(n[..., 0] ** 2 + n[..., 1] ** 2 + 1.0)
    out = np.ones((N, N, 4), np.float32)
    out[..., 0] = n[..., 0] / L * 0.5 + 0.5; out[..., 1] = n[..., 1] / L * 0.5 + 0.5; out[..., 2] = 1.0 / L * 0.5 + 0.5
    return out


def make_all(d):
    save_png(os.path.join(d, "lace.png"), lace())
    save_png(os.path.join(d, "glitter_n.png"), glitter())

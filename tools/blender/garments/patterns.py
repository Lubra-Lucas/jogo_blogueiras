"""Estampas procedurais tileaveis (JPEG 512, 1 UV = ~1 m de tecido). Multiplicam a cor do slot (material.color do jogo)."""
import numpy as np, bpy, os

PATTERNS = {
    "xadrez": dict(label="Xadrez", tonal=False), "floral": dict(label="Floral", tonal=False), "poa": dict(label="Poá", tonal=False),
    "listras": dict(label="Listras", tonal=False), "leopardo": dict(label="Animal print", tonal=False),
    "jeans": dict(label="Jeans (trama)", tonal=True), "trico": dict(label="Tricô", tonal=True),
}


def save_jpg(path, rgb, q=88):
    h, w = rgb.shape[:2]
    rgba = np.ones((h, w, 4), np.float32); rgba[..., :3] = np.clip(rgb, 0, 1)
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=False)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = path; img.file_format = 'JPEG'
    bpy.context.scene.render.image_settings.quality = q
    img.save()


def _smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


def _tor(d):
    return (d + 0.5) % 1 - 0.5


def pat_xadrez(N=512):
    y, x = np.mgrid[0:N, 0:N] / N
    k = 8
    fx = (x * k) % 1; fy = (y * k) % 1
    base = np.array([0.66, 0.12, 0.13])
    wide = lambda f: _smooth(0.0, 0.03, f) * (1 - _smooth(0.30, 0.33, f))
    thin = lambda f: _smooth(0.55, 0.57, f) * (1 - _smooth(0.60, 0.62, f))
    col = np.ones((N, N, 3)) * base
    col = col * (1 - 0.62 * wide(fx)[..., None]); col = col * (1 - 0.62 * wide(fy)[..., None])
    t = np.maximum(thin(fx), thin(fy))
    col = col * (1 - t[..., None]) + np.array([0.92, 0.9, 0.82]) * t[..., None] * 0.85
    twill = 0.96 + 0.04 * np.sin((x + y) * 2 * np.pi * 256)
    return col * twill[..., None]


def pat_floral(N=512, seed=7):
    rng = np.random.default_rng(seed)
    img = np.ones((N, N, 3)) * np.array([0.96, 0.92, 0.84])
    yy, xx = np.mgrid[0:N, 0:N] / N
    g = 6
    cols = [np.array([0.80, 0.28, 0.33]), np.array([0.90, 0.60, 0.62]), np.array([0.72, 0.36, 0.52])]
    leaf = np.array([0.30, 0.46, 0.30])
    for i in range(g):
        for j in range(g):
            cx = (i + 0.5 + 0.35 * rng.uniform(-1, 1)) / g + (0.5 / g if j % 2 else 0); cy = (j + 0.5 + 0.35 * rng.uniform(-1, 1)) / g
            ci = rng.integers(0, 3); ph = rng.uniform(0, 6.28)
            dx = _tor(xx - cx); dy = _tor(yy - cy); r = np.hypot(dx, dy); th = np.arctan2(dy, dx)
            R = 0.045
            for a in (0.7, 2.6, 4.4):
                ca, sa = np.cos(a + ph), np.sin(a + ph)
                u = dx * ca + dy * sa; v = -dx * sa + dy * ca
                m = (np.abs(v) < 0.012 * np.clip(1 - np.abs(u - 0.05) / 0.045, 0, 1)) & (u > 0.0) & (u < 0.095)
                img[m] = leaf * (0.9 + 0.1 * rng.random())
            petal = (r < R * (0.62 + 0.38 * np.abs(np.cos(2.5 * (th + ph)))))
            img[petal] = cols[ci][None, :] * (0.88 + 0.12 * (r[petal] / R))[:, None]
            img[r < 0.011] = np.array([0.95, 0.78, 0.30])
    return img


def pat_poa(N=512):
    y, x = np.mgrid[0:N, 0:N] / N
    k = 14
    fx = (x * k) % 1; fy = ((y * k) + (0.5 * (np.floor(x * k) % 2))) % 1
    r = np.hypot(fx - 0.5, fy - 0.5)
    m = 1 - _smooth(0.17, 0.19, r)
    bg = np.array([0.97, 0.95, 0.90]); dot = np.array([0.13, 0.19, 0.38])
    return bg * (1 - m[..., None]) + dot * m[..., None]


def pat_listras(N=512):
    y, x = np.mgrid[0:N, 0:N] / N
    f = (y * 16) % 1
    m = _smooth(0.0, 0.03, f) * (1 - _smooth(0.45, 0.48, f))
    bg = np.array([0.95, 0.94, 0.90]); st = np.array([0.12, 0.20, 0.38])
    weave = 0.97 + 0.03 * np.sin(x * 2 * np.pi * 220) * np.sin(y * 2 * np.pi * 220)
    return (bg * (1 - m[..., None]) + st * m[..., None]) * weave[..., None]


def pat_leopardo(N=512, seed=11):
    rng = np.random.default_rng(seed)
    img = np.ones((N, N, 3)) * np.array([0.78, 0.55, 0.28])
    yy, xx = np.mgrid[0:N, 0:N] / N
    g = 9
    for i in range(g):
        for j in range(g):
            cx = (i + 0.5 + 0.4 * rng.uniform(-1, 1)) / g + (0.5 / g if j % 2 else 0); cy = (j + 0.5 + 0.4 * rng.uniform(-1, 1)) / g
            dx = _tor(xx - cx); dy = _tor(yy - cy); r = np.hypot(dx, dy); th = np.arctan2(dy, dx)
            R = 0.030 * rng.uniform(0.8, 1.2); ph = rng.uniform(0, 6.28)
            wob = 1 + 0.22 * np.sin(3 * th + ph) + 0.12 * np.sin(5 * th + 2 * ph)
            ring = (r < R * wob) & (r > R * wob * 0.58)
            gap = np.sin(2 * th + ph * 0.7) > 0.72
            img[ring & ~gap] = np.array([0.20, 0.12, 0.07])
            img[r <= R * wob * 0.58] = np.array([0.62, 0.40, 0.18])
    return img * (0.97 + 0.03 * rng.random((N, N, 1)))


def pat_jeans(N=512, seed=5):
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:N, 0:N] / N
    tw = 0.5 + 0.5 * np.sin((x + y) * 2 * np.pi * 170)
    v = 0.90 + 0.07 * tw + rng.normal(size=(N, N)) * 0.04
    return np.stack([v, v, v], -1)


def pat_trico(N=512):
    y, x = np.mgrid[0:N, 0:N] / N
    fx = (x * 24) % 1; fy = (y * 30) % 1
    v = 0.78 + 0.22 * np.clip(1 - np.abs(np.abs(fx - 0.5) * 2.0 - (1 - fy) * 1.0) * 2.2, 0, 1)
    v = v * (0.92 + 0.08 * np.cos(fx * 2 * np.pi))
    return np.stack([v, v, v], -1)


def make_patterns(d):
    for k, f in (("xadrez", pat_xadrez), ("floral", pat_floral), ("poa", pat_poa), ("listras", pat_listras), ("leopardo", pat_leopardo),
                 ("jeans", pat_jeans), ("trico", pat_trico)):
        save_jpg(os.path.join(d, "pattern_" + k + ".jpg"), f())

"""Genera las imágenes de los perfiles de prueba de Tinker (planos, renders, placas, gráficas, rutas...).

Uso:  python3 demo/generar_imagenes.py   -> crea demo/img/*.jpg
"""
import io, math, os, random
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Circle, FancyBboxPatch, Rectangle, Polygon, Arc
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), 'img')
os.makedirs(OUT, exist_ok=True)
for f in ['/usr/share/fonts/opentype/inter/Inter-Regular.otf', '/usr/share/fonts/opentype/inter/Inter-Bold.otf',
          '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf', '/usr/share/fonts/opentype/inter/Inter-Medium.otf']:
    if os.path.exists(f):
        font_manager.fontManager.addfont(f)
plt.rcParams['font.family'] = 'Inter'
YELLOW = '#fdf33c'
INK = '#111111'


def save(fig, name, dpi=100):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=dpi, facecolor=fig.get_facecolor())
    plt.close(fig)
    buf.seek(0)
    Image.open(buf).convert('RGB').save(os.path.join(OUT, name), 'JPEG', quality=86, optimize=True)
    print('  ', name)


def canvas(w, h, bg):
    fig = plt.figure(figsize=(w / 100, h / 100), facecolor=bg)
    ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, w); ax.set_ylim(0, h); ax.axis('off'); ax.set_facecolor(bg)
    return fig, ax


# ---------------------------------------------------------------- planos
def blueprint(name, kind, title, author, w=1200, h=900, seed=0):
    random.seed(seed)
    bg, line, faint = '#123a6b', '#e8f1ff', '#2c5a92'
    fig, ax = canvas(w, h, bg)
    for x in range(0, w, 25): ax.plot([x, x], [0, h], color=faint, lw=.5 if x % 100 else 1, zorder=0)
    for y in range(0, h, 25): ax.plot([0, w], [y, y], color=faint, lw=.5 if y % 100 else 1, zorder=0)
    ax.add_patch(Rectangle((30, 30), w - 60, h - 60, fill=False, ec=line, lw=2))
    cx, cy = w * .45, h * .55
    L = dict(color=line, lw=2.2, solid_capstyle='round')

    def dim(x1, y1, x2, y2, txt, off=30):
        dx, dy = x2 - x1, y2 - y1; n = math.hypot(dx, dy); nx, ny = -dy / n * off, dx / n * off
        ax.plot([x1, x1 + nx * 1.2], [y1, y1 + ny * 1.2], color=line, lw=.8)
        ax.plot([x2, x2 + nx * 1.2], [y2, y2 + ny * 1.2], color=line, lw=.8)
        ax.annotate('', (x2 + nx, y2 + ny), (x1 + nx, y1 + ny), arrowprops=dict(arrowstyle='<->', color=line, lw=1))
        ax.text((x1 + x2) / 2 + nx * 1.5, (y1 + y2) / 2 + ny * 1.5, txt, color=line, ha='center', va='center', fontsize=12,
                rotation=math.degrees(math.atan2(dy, dx)) if abs(dx) < abs(dy) else 0)

    if kind == 'quad':
        r = min(w, h) * .3
        for a in [45, 135, 225, 315]:
            t = math.radians(a); ex, ey = cx + r * math.cos(t), cy + r * math.sin(t)
            px, py = 14 * math.cos(t + math.pi / 2), 14 * math.sin(t + math.pi / 2)
            ax.add_patch(Polygon([[cx + px, cy + py], [ex + px, ey + py], [ex - px, ey - py], [cx - px, cy - py]], closed=True, fill=False, ec=line, lw=2))
            ax.add_patch(Circle((ex, ey), 30, fill=False, ec=line, lw=2.2)); ax.add_patch(Circle((ex, ey), 8, fill=False, ec=line, lw=1.5))
            ax.add_patch(Circle((ex, ey), r * .62, fill=False, ec=line, lw=1, ls=(0, (6, 5))))
        ax.add_patch(FancyBboxPatch((cx - 70, cy - 95), 140, 190, boxstyle='round,pad=0,rounding_size=18', fill=False, ec=line, lw=2.4))
        for dx in (-35, 35):
            for dy in (-35, 35): ax.add_patch(Circle((cx + dx, cy + dy), 5, fill=False, ec=line, lw=1.2))
        ax.add_patch(Rectangle((cx - 20, cy + 95), 40, 26, fill=False, ec=line, lw=1.5))
        t = math.radians(45); dim(cx + r * math.cos(t + math.pi), cy + r * math.sin(t + math.pi), cx + r * math.cos(t), cy + r * math.sin(t), '226 mm', 40)
        ax.text(cx, cy, 'FC\n30.5×30.5', color=line, ha='center', va='center', fontsize=11)
    elif kind == 'scara':
        bx, by = w * .2, h * .22
        ax.add_patch(Rectangle((bx - 80, by - 30), 160, 30, fill=False, ec=line, lw=2.2))
        ax.add_patch(Rectangle((bx - 35, by), 70, h * .38, fill=False, ec=line, lw=2.2))
        jy = by + h * .38
        l1, l2 = w * .3, w * .25
        ax.add_patch(FancyBboxPatch((bx - 40, jy - 30), l1 + 80, 60, boxstyle='round,pad=0,rounding_size=30', fill=False, ec=line, lw=2.2))
        ax.add_patch(FancyBboxPatch((bx + l1 - 32, jy + 30), l2 + 64, 50, boxstyle='round,pad=0,rounding_size=25', fill=False, ec=line, lw=2.2))
        for x, yy, rr in [(bx, jy, 22), (bx + l1, jy, 22), (bx + l1, jy + 55, 16), (bx + l1 + l2, jy + 55, 16)]:
            ax.add_patch(Circle((x, yy), rr, fill=False, ec=line, lw=1.6))
        ex = bx + l1 + l2
        ax.add_patch(Rectangle((ex - 8, jy - 120), 16, 175, fill=False, ec=line, lw=1.8))
        ax.plot([ex - 25, ex - 8], [jy - 120, jy - 150], **L); ax.plot([ex + 25, ex + 8], [jy - 120, jy - 150], **L)
        dim(bx, jy + 110, bx + l1, jy + 110, f'{int(l1 * .5)} mm', 25)
        dim(bx + l1, jy + 110, ex, jy + 110, f'{int(l2 * .5)} mm', 25)
        dim(bx - 120, by, bx - 120, jy, '240 mm', 0)
    elif kind == 'rig':
        ax.add_patch(Rectangle((w * .12, h * .18), w * .62, 26, fill=False, ec=line, lw=2.2))
        ax.add_patch(Rectangle((w * .18, h * .18 + 26), 30, h * .42, fill=False, ec=line, lw=2.2))
        ax.add_patch(Rectangle((w * .18 + 30, h * .52), w * .4, 40, fill=False, ec=line, lw=2.2))
        ax.add_patch(Rectangle((w * .44, h * .52 - 70), 80, 70, fill=False, ec=line, lw=1.8))
        ax.text(w * .44 + 40, h * .52 - 35, 'CÉLULA\nCARGA', color=line, ha='center', va='center', fontsize=10)
        mx = w * .18 + 30 + w * .4
        ax.add_patch(Rectangle((mx - 10, h * .52 - 10), 60, 60, fill=False, ec=line, lw=2.2))
        ax.plot([mx + 50, mx + 50], [h * .52 - 160, h * .52 + 210], color=line, lw=1.2, ls=(0, (8, 6)))
        ax.add_patch(Arc((mx + 50, h * .52 + 20), 60, 360, theta1=-80, theta2=80, ec=line, lw=1.4))
        ax.annotate('', (mx + 140, h * .52 + 20), (mx + 70, h * .52 + 20), arrowprops=dict(arrowstyle='->', color=YELLOW, lw=3))
        ax.text(mx + 150, h * .52 + 20, 'EMPUJE', color=YELLOW, va='center', fontsize=13, fontweight='bold')
        dim(w * .18, h * .18 + 26 + h * .42 + 60, mx + 50, h * .18 + 26 + h * .42 + 60, '420 mm', 0)
    elif kind == 'enclosure':
        for i, (ox, oy, ww, hh, lab) in enumerate([(w * .1, h * .35, 300, 220, 'ALZADO'), (w * .1 + 360, h * .35, 160, 220, 'PERFIL'), (w * .1, h * .35 - 260, 300, 160, 'PLANTA')]):
            ax.add_patch(FancyBboxPatch((ox, oy), ww, hh, boxstyle='round,pad=0,rounding_size=12', fill=False, ec=line, lw=2.2))
            ax.text(ox, oy + hh + 18, lab, color=line, fontsize=11, fontweight='bold')
        ox, oy = w * .1, h * .35
        for k in range(5): ax.plot([ox + 40, ox + 140], [oy + 40 + k * 18] * 2, color=line, lw=1.5)
        ax.add_patch(Circle((ox + 230, oy + 150), 28, fill=False, ec=line, lw=1.6))
        ax.add_patch(Rectangle((ox + 60, oy + 230), 180, 8, fill=False, ec=line, lw=1.2))
        dim(ox, oy - 20, ox + 300, oy - 20, '150 mm', -20)
        dim(ox + 360 + 180, oy, ox + 360 + 180, oy + 220, '110 mm', 0)
    elif kind == 'trainer':
        ax.add_patch(Circle((w * .62, h * .5), 120, fill=False, ec=line, lw=2.4))
        ax.add_patch(Circle((w * .62, h * .5), 30, fill=False, ec=line, lw=1.8))
        for a in range(0, 360, 30):
            t = math.radians(a); ax.plot([w * .62 + 30 * math.cos(t), w * .62 + 118 * math.cos(t)], [h * .5 + 30 * math.sin(t), h * .5 + 118 * math.sin(t)], color=line, lw=.8)
        ax.add_patch(Circle((w * .62 - 180, h * .5 - 60), 34, fill=False, ec=line, lw=2.2))
        ax.plot([w * .62 - 180, w * .62], [h * .5 - 26, h * .5 + 120], color=line, lw=1.2, ls=(0, (6, 5)))
        ax.add_patch(Polygon([[w * .2, h * .18], [w * .8, h * .18], [w * .7, h * .5 - 20], [w * .3, h * .5 - 20]], closed=True, fill=False, ec=line, lw=2.2))
        ax.add_patch(Rectangle((w * .62 + 150, h * .5 - 40), 70, 80, fill=False, ec=line, lw=1.8))
        ax.text(w * .62 + 185, h * .5, 'FRENO\nFOUCAULT', color=line, ha='center', va='center', fontsize=9)
        dim(w * .62 - 120, h * .5 + 160, w * .62 + 120, h * .5 + 160, 'Ø 240 mm · 4,2 kg', 0)
    # cajetín
    tx, ty, tw, th = w - 30 - 360, 30, 360, 110
    ax.add_patch(Rectangle((tx, ty), tw, th, fill=False, ec=line, lw=2))
    ax.plot([tx, tx + tw], [ty + 60, ty + 60], color=line, lw=1); ax.plot([tx + 200, tx + 200], [ty, ty + 60], color=line, lw=1)
    ax.text(tx + 14, ty + 84, title.upper(), color=line, fontsize=14, fontweight='bold', va='center')
    ax.text(tx + 14, ty + 30, f'Diseño: {author}', color=line, fontsize=10, va='center')
    ax.text(tx + 214, ty + 30, 'Escala 1:2 · Hoja 1/3', color=line, fontsize=10, va='center')
    save(fig, name)


# ---------------------------------------------------------------- renders 3D
def box(x, y, z, dx, dy, dz):
    v = np.array([[x, y, z], [x + dx, y, z], [x + dx, y + dy, z], [x, y + dy, z], [x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz]])
    return [[v[0], v[1], v[2], v[3]], [v[4], v[5], v[6], v[7]], [v[0], v[1], v[5], v[4]], [v[2], v[3], v[7], v[6]], [v[1], v[2], v[6], v[5]], [v[0], v[3], v[7], v[4]]]


def cyl(x, y, z, r, hgt, n=32):
    t = np.linspace(0, 2 * np.pi, n + 1)
    faces = [[[x + r * np.cos(t[i]), y + r * np.sin(t[i]), z], [x + r * np.cos(t[i + 1]), y + r * np.sin(t[i + 1]), z],
              [x + r * np.cos(t[i + 1]), y + r * np.sin(t[i + 1]), z + hgt], [x + r * np.cos(t[i]), y + r * np.sin(t[i]), z + hgt]] for i in range(n)]
    faces.append([[x + r * np.cos(a), y + r * np.sin(a), z + hgt] for a in t])
    return faces


def shade(faces, base, light=np.array([.4, -.5, .8])):
    light = light / np.linalg.norm(light); base = np.array(matplotlib.colors.to_rgb(base)); out = []
    for f in faces:
        f = np.array(f); n = np.cross(f[1] - f[0], f[2] - f[0]); nn = np.linalg.norm(n)
        k = .45 + .55 * abs(np.dot(n / nn, light)) if nn else .7
        out.append(np.clip(base * k + .05, 0, 1))
    return out


def render(name, kind, w=1000, h=1000, bg=('#2a2d33', '#0e0f12'), elev=28, azim=-55):
    fig = plt.figure(figsize=(w / 100, h / 100))
    bga = fig.add_axes([0, 0, 1, 1]); bga.axis('off')
    g = np.linspace(0, 1, 256)[:, None]
    bga.imshow(g, cmap=matplotlib.colors.LinearSegmentedColormap.from_list('g', [bg[0], bg[1]]), aspect='auto', extent=[0, 1, 0, 1])
    ax = fig.add_axes([0, 0, 1, 1], projection='3d'); ax.set_facecolor((0, 0, 0, 0)); ax.axis('off')
    parts = []
    if kind == 'quad':
        parts += [(box(-35, -45, 0, 70, 90, 4), '#2b2b2b'), (box(-30, -40, 22, 60, 80, 3), '#2b2b2b')]
        for x in (-25, 25):
            for y in (-35, 35): parts.append((cyl(x, y, 4, 3, 18, 12), '#c8c8c8'))
        parts.append((box(-15, -15, 8, 30, 30, 5), '#1f6f43'))
        for a in [45, 135, 225, 315]:
            t = math.radians(a); ex, ey = 110 * math.cos(t), 110 * math.sin(t)
            for s in np.linspace(0, 1, 6)[:-1]:
                parts.append((box(ex * s - 6, ey * s - 6, 0, 12, 12, 4) if False else box(ex * s - 7, ey * s - 7, 0, 14, 14, 4), '#303030'))
            parts.append((cyl(ex, ey, 4, 13, 16), '#9aa0a6'))
            parts.append((cyl(ex, ey, 20, 3, 8, 12), '#d0d0d0'))
            pr = 62; tt = np.linspace(0, 2 * np.pi, 3)
            parts.append(([[[ex, ey, 28], [ex + pr * math.cos(a2), ey + pr * math.sin(a2), 28.5], [ex + pr * math.cos(a2 + .18), ey + pr * math.sin(a2 + .18), 28.5]] for a2 in (t, t + math.pi)], YELLOW))
        ax.set_xlim(-130, 130); ax.set_ylim(-130, 130); ax.set_zlim(-80, 120)
    elif kind == 'scara':
        parts += [(cyl(0, 0, 0, 55, 18), '#3a3f47'), (cyl(0, 0, 18, 28, 140), '#d8dbe0'), (cyl(0, 0, 158, 34, 30), '#2b2f36')]
        parts += [(box(-30, -22, 160, 170, 44, 26), YELLOW), (cyl(150, 0, 186, 26, 22), '#2b2f36'), (box(140, -18, 192, 140, 36, 20), '#e9e9e9')]
        parts += [(cyl(270, 0, 120, 6, 95), '#9aa0a6'), (box(258, -12, 105, 24, 24, 15), '#2b2f36')]
        ax.set_xlim(-80, 320); ax.set_ylim(-200, 200); ax.set_zlim(0, 300)
    elif kind == 'enclosure':
        parts += [(box(0, 0, 0, 150, 110, 70), '#e7e9ec'), (box(-4, -4, 70, 158, 118, 10), '#cfd3d8'), (box(20, -1, 25, 50, 2, 6), '#555')]
        parts += [(box(45, 15, 80, 70, 80, 3), '#1d2a44')]
        for i in range(6): parts.append((box(48 + i * 11, 18, 83, 9, 74, .5), '#2f4a7a'))
        parts += [(cyl(130, 55, 80, 10, 40), '#9aa0a6'), (box(110, 40, 120, 40, 30, 4), '#e7e9ec')]
        ax.set_xlim(-40, 190); ax.set_ylim(-60, 170); ax.set_zlim(-60, 170)
    elif kind == 'trainer':
        parts += [(box(-140, -60, 0, 280, 20, 14), '#2b2f36'), (box(-140, 40, 0, 280, 20, 14), '#2b2f36'), (box(-20, -60, 0, 40, 120, 10), '#2b2f36')]
        t = np.linspace(0, 2 * np.pi, 48)
        disc = [[[60 + 80 * math.cos(a), -6, 100 + 80 * math.sin(a)] for a in t]]
        parts += [(disc, '#c9ced6'), ([[[60 + 80 * math.cos(a), 6, 100 + 80 * math.sin(a)] for a in t]], '#aeb4bd')]
        parts += [(box(52, -8, 0, 16, 16, 100), '#2b2f36'), (box(120, -30, 70, 40, 60, 60), YELLOW), (cyl(-60, 0, 14, 22, 30), '#555')]
        ax.set_xlim(-160, 180); ax.set_ylim(-170, 170); ax.set_zlim(-40, 220)
    for faces, col in parts:
        ax.add_collection3d(Poly3DCollection(faces, facecolors=shade(faces, col), edgecolors=(0, 0, 0, .15), linewidths=.3))
    ax.view_init(elev=elev, azim=azim)
    try: ax.set_box_aspect((1, 1, .8))
    except Exception: pass
    save(fig, name)


# ---------------------------------------------------------------- placas
def pcb(name, chips, title, w=1100, h=800, seed=1, color='#0f4d2e'):
    rnd = random.Random(seed)
    fig, ax = canvas(w, h, '#151515')
    ax.add_patch(FancyBboxPatch((60, 60), w - 120, h - 120, boxstyle='round,pad=0,rounding_size=30', fc=color, ec='#0a3320', lw=3))
    for x, y in [(95, 95), (w - 95, 95), (95, h - 95), (w - 95, h - 95)]:
        ax.add_patch(Circle((x, y), 16, fc='#c9a227', ec='none')); ax.add_patch(Circle((x, y), 8, fc='#151515'))
    pads = []
    for cx, cy, cw, chh, lab in chips:
        ax.add_patch(Rectangle((cx, cy), cw, chh, fc='#1b1b1b', ec='#333', lw=1.5, zorder=3))
        ax.text(cx + cw / 2, cy + chh / 2, lab, color='#d9d9d9', ha='center', va='center', fontsize=12 if cw > 120 else 9, fontweight='bold', zorder=4)
        n = max(4, int(cw / 18))
        for i in range(n):
            px = cx + 8 + i * (cw - 16) / (n - 1)
            for py in (cy - 10, cy + chh + 2):
                ax.add_patch(Rectangle((px - 4, py), 8, 8, fc='#d4af37', ec='none', zorder=3)); pads.append((px, py + 4))
    for _ in range(70):
        x0, y0 = rnd.choice(pads) if pads else (rnd.uniform(100, w - 100), rnd.uniform(100, h - 100))
        x, y = x0, y0; pts = [(x, y)]
        for _ in range(rnd.randint(2, 4)):
            if rnd.random() < .5: x = min(max(x + rnd.choice([-1, 1]) * rnd.uniform(40, 220), 90), w - 90)
            else: y = min(max(y + rnd.choice([-1, 1]) * rnd.uniform(40, 200), 90), h - 90)
            d = rnd.uniform(10, 25)
            pts.append((x, y))
        xs, ys = zip(*pts)
        ax.plot(xs, ys, color='#2f8f58', lw=rnd.choice([2, 2, 3, 5]), solid_capstyle='round', zorder=1, alpha=.9)
        ax.add_patch(Circle(pts[-1], 6, fc='#d4af37', ec='none', zorder=2)); ax.add_patch(Circle(pts[-1], 2.5, fc=color, zorder=2))
    for _ in range(18):
        x, y = rnd.uniform(120, w - 160), rnd.uniform(120, h - 140)
        ax.add_patch(Rectangle((x, y), 26, 12, fc='#c49a6c' if rnd.random() < .5 else '#3a3a3a', ec='#999', lw=.5, zorder=3))
        ax.add_patch(Rectangle((x - 4, y), 6, 12, fc='#d4af37', zorder=3)); ax.add_patch(Rectangle((x + 24, y), 6, 12, fc='#d4af37', zorder=3))
    ax.text(110, h - 140, title, color='#e8e8e8', fontsize=18, fontweight='bold', zorder=5)
    ax.text(110, h - 170, 'rev B · 2 capas · 1,6 mm', color='#bfe3cc', fontsize=11, zorder=5)
    save(fig, name)


# ---------------------------------------------------------------- gráficas
def dark_chart(w, h):
    fig = plt.figure(figsize=(w / 100, h / 100), facecolor='#141414')
    ax = fig.add_axes([.1, .14, .84, .62]); ax.set_facecolor('#141414')
    for s in ax.spines.values(): s.set_visible(False)
    ax.tick_params(colors='#9a9a9a', labelsize=11); ax.grid(color='#2a2a2a', lw=1); ax.set_axisbelow(True)
    return fig, ax


def chart_title(fig, title, sub, big=None, big_lab=None):
    fig.text(.06, .91, title, color='white', fontsize=22, fontweight='bold')
    fig.text(.06, .855, sub, color='#9a9a9a', fontsize=13)
    if big:
        fig.text(.94, .9, big, color=YELLOW, fontsize=30, fontweight='bold', ha='right')
        fig.text(.94, .855, big_lab, color='#9a9a9a', fontsize=12, ha='right')


def chart(name, kind, w=1100, h=760, seed=2):
    rng = np.random.default_rng(seed)
    fig, ax = dark_chart(w, h)
    if kind == 'telemetry':
        t = np.linspace(0, 240, 600); alt = np.clip(np.cumsum(rng.normal(0, .25, 600)) + 30 * np.sin(t / 40) ** 2 + 5, 0, None); alt[:20] = np.linspace(0, alt[20], 20); alt[-30:] = np.linspace(alt[-30], 0, 30)
        bat = 16.8 - 3.2 * t / 240 - .25 * np.sin(t / 7) ** 2
        ax.fill_between(t, alt, color=YELLOW, alpha=.12); ax.plot(t, alt, color=YELLOW, lw=2.5); ax.set_ylabel('Altura (m)', color='#9a9a9a'); ax.set_xlabel('Tiempo (s)', color='#9a9a9a')
        a2 = ax.twinx(); a2.plot(t, bat, color='#6cc4ff', lw=2); a2.tick_params(colors='#6cc4ff', labelsize=11); a2.set_ylabel('Batería (V)', color='#6cc4ff')
        for s in a2.spines.values(): s.set_visible(False)
        chart_title(fig, 'Vuelo de prueba #7', 'Altura y tensión de la LiPo 4S', '4 min 02 s', 'tiempo de vuelo')
    elif kind == 'thrust':
        thr = np.linspace(0, 100, 30)
        for lab, k, c in [("5×4,3×3", 1.0, YELLOW), ("5,1×3,6×3", .9, '#6cc4ff'), ("5×4,8×2", .8, '#ff8a5b')]:
            ax.plot(thr, k * 1450 * (thr / 100) ** 1.7 + rng.normal(0, 8, 30), color=c, lw=2.5, marker='o', ms=4, label=lab)
        ax.legend(frameon=False, labelcolor='white', fontsize=12, loc='upper left'); ax.set_xlabel('Acelerador (%)', color='#9a9a9a'); ax.set_ylabel('Empuje (g)', color='#9a9a9a')
        chart_title(fig, 'Curvas de empuje · motor 2207 1950KV', 'Tres hélices medidas en el banco', '1.452 g', 'empuje máximo')
    elif kind == 'efficiency':
        thr = np.linspace(10, 100, 19); eff = 6.2 - 3.4 * (thr / 100) ** 1.3 + rng.normal(0, .06, 19)
        ax.bar(thr, eff, width=3.6, color=[YELLOW if v == eff.max() else '#3c3c3c' for v in eff]); ax.set_xlabel('Acelerador (%)', color='#9a9a9a'); ax.set_ylabel('Eficiencia (g/W)', color='#9a9a9a')
        chart_title(fig, 'Eficiencia por tramo de acelerador', 'Hélice 5×4,3×3 · LiPo 4S', '5,9 g/W', 'a crucero (25 %)')
    elif kind == 'training':
        weeks = np.arange(1, 17); swim = rng.uniform(5, 9, 16); bike = np.linspace(120, 260, 16) + rng.normal(0, 15, 16); run = np.linspace(25, 50, 16) + rng.normal(0, 4, 16)
        for i in (3, 7, 11): bike[i] *= .6; run[i] *= .65
        ax.bar(weeks, bike / 10, color='#3c3c3c', label='Bici (×10 km)'); ax.bar(weeks, run / 5, bottom=bike / 10, color='#6cc4ff', label='Carrera (×5 km)'); ax.bar(weeks, swim, bottom=bike / 10 + run / 5, color='#ff8a5b', label='Natación (km)')
        ctl = np.convolve(bike / 10 + run / 5 + swim, np.ones(4) / 4, mode='same'); ax.plot(weeks, ctl, color=YELLOW, lw=3, label='Carga media')
        ax.legend(frameon=False, labelcolor='white', fontsize=11, ncol=4, loc='upper left', bbox_to_anchor=(0, 1.13)); ax.set_xlabel('Semana', color='#9a9a9a')
        chart_title(fig, 'Bloque de preparación · 16 semanas', 'Volumen semanal por disciplina', '3.410 km', 'en total')
    elif kind == 'pace':
        km = np.arange(1, 22); pace = 4.55 + .08 * np.sin(km / 3) + rng.normal(0, .04, 21); pace[-4:] += np.linspace(0, .12, 4); hr = 158 + km * .9 + rng.normal(0, 1.5, 21)
        ax.plot(km, pace, color=YELLOW, lw=3, marker='o', ms=6); ax.invert_yaxis(); ax.set_ylabel('Ritmo (min/km)', color='#9a9a9a'); ax.set_xlabel('Kilómetro', color='#9a9a9a')
        a2 = ax.twinx(); a2.plot(km, hr, color='#ff5b6e', lw=2, ls='--'); a2.tick_params(colors='#ff5b6e', labelsize=11); a2.set_ylabel('Pulso (ppm)', color='#ff5b6e')
        for s in a2.spines.values(): s.set_visible(False)
        chart_title(fig, 'Tirada larga de 21 km', 'Ritmo y pulso por kilómetro', '4:37 /km', 'ritmo medio')
    elif kind == 'power':
        t = np.linspace(0, 60, 400); p = 210 + 25 * np.sin(t / 2.5) + rng.normal(0, 12, 400)
        for a, b in [(10, 14), (25, 29), (40, 44)]: p[(t > a) & (t < b)] += 140
        ax.plot(t, p, color=YELLOW, lw=1.6); ax.fill_between(t, p, color=YELLOW, alpha=.1); ax.set_xlabel('Minutos', color='#9a9a9a'); ax.set_ylabel('Potencia (W)', color='#9a9a9a')
        ax.axhline(265, color='#6cc4ff', lw=1.5, ls='--'); ax.text(1, 272, 'FTP 265 W', color='#6cc4ff', fontsize=11)
        chart_title(fig, 'Validación del medidor de potencia', 'Sesión de series 3×4 min contra un potenciómetro comercial', '±1,8 %', 'error medio')
    elif kind == 'weather':
        hrs = np.arange(0, 72, .5); temp = 17 + 6 * np.sin((hrs - 9) / 24 * 2 * np.pi) + rng.normal(0, .3, len(hrs)); hum = 70 - 18 * np.sin((hrs - 9) / 24 * 2 * np.pi) + rng.normal(0, 1.5, len(hrs))
        ax.plot(hrs, temp, color=YELLOW, lw=2.5); ax.set_ylabel('Temperatura (°C)', color='#9a9a9a'); ax.set_xlabel('Horas', color='#9a9a9a')
        a2 = ax.twinx(); a2.plot(hrs, hum, color='#6cc4ff', lw=2); a2.tick_params(colors='#6cc4ff', labelsize=11); a2.set_ylabel('Humedad (%)', color='#6cc4ff')
        for s in a2.spines.values(): s.set_visible(False)
        chart_title(fig, 'Primeras 72 horas en la azotea', 'Temperatura y humedad cada 30 min', '23,4 °C', 'máxima')
    elif kind == 'solar':
        hrs = np.arange(0, 48, .25); sun = np.clip(np.sin((hrs % 24 - 6) / 12 * np.pi), 0, None) * 5.5; soc = 60 + np.cumsum(sun * .25 - .32) ; soc = np.clip(soc, 0, 100)
        ax.fill_between(hrs, sun * 15, color='#ff8a5b', alpha=.25, label='Panel (mW ×15)'); ax.plot(hrs, soc, color=YELLOW, lw=3, label='Batería (%)')
        ax.legend(frameon=False, labelcolor='white', fontsize=12, loc='lower right'); ax.set_xlabel('Horas', color='#9a9a9a')
        chart_title(fig, 'Balance energético', 'Panel de 1 W + LiFePO4 de 1.500 mAh', '100 %', 'autonomía cubierta')
    elif kind == 'workspace':
        a1 = rng.uniform(-2.2, 2.2, 5000); a2 = rng.uniform(-2.5, 2.5, 5000); x = 150 * np.cos(a1) + 125 * np.cos(a1 + a2); y = 150 * np.sin(a1) + 125 * np.sin(a1 + a2)
        ax.scatter(x, y, s=3, c=np.hypot(x, y), cmap=matplotlib.colors.LinearSegmentedColormap.from_list('y', ['#3c3c3c', YELLOW])); ax.set_aspect('equal')
        ax.set_xlabel('X (mm)', color='#9a9a9a'); ax.set_ylabel('Y (mm)', color='#9a9a9a')
        chart_title(fig, 'Espacio de trabajo del SCARA', 'Cinemática directa · 5.000 posiciones', '275 mm', 'alcance')
    save(fig, name)


# ---------------------------------------------------------------- esquemas
def schematic(name, title, blocks, w=1100, h=760):
    fig, ax = canvas(w, h, '#f6f4ee')
    for x in range(0, w, 20): ax.plot([x, x], [0, h], color='#ebe7dc', lw=.6, zorder=0)
    for y in range(0, h, 20): ax.plot([0, w], [y, y], color='#ebe7dc', lw=.6, zorder=0)
    ink = '#1d2a44'
    for (x, y, bw, bh, lab, pins) in blocks:
        ax.add_patch(Rectangle((x, y), bw, bh, fc='#fffdf7', ec=ink, lw=2.2, zorder=3))
        ax.text(x + bw / 2, y + bh / 2, lab, color=ink, ha='center', va='center', fontsize=13, fontweight='bold', zorder=4)
        for i, p in enumerate(pins):
            py = y + bh - 22 - i * 22
            ax.plot([x + bw, x + bw + 30], [py, py], color=ink, lw=1.6, zorder=2); ax.text(x + bw - 8, py, p, color=ink, ha='right', va='center', fontsize=9, zorder=4)
    def resistor(x, y, lab):
        xs = [x] + [x + 10 + i * 8 for i in range(7)] + [x + 70]; ys = [y] + [y + (8 if i % 2 else -8) for i in range(7)] + [y]
        ax.plot([x - 30, x] , [y, y], color=ink, lw=1.6); ax.plot(xs, ys, color=ink, lw=1.8); ax.plot([x + 70, x + 100], [y, y], color=ink, lw=1.6); ax.text(x + 35, y + 20, lab, color=ink, ha='center', fontsize=10)
    def cap(x, y, lab):
        ax.plot([x, x + 30], [y, y], color=ink, lw=1.6); ax.plot([x + 30, x + 30], [y - 16, y + 16], color=ink, lw=2.2); ax.plot([x + 40, x + 40], [y - 16, y + 16], color=ink, lw=2.2); ax.plot([x + 40, x + 70], [y, y], color=ink, lw=1.6); ax.text(x + 35, y + 24, lab, color=ink, ha='center', fontsize=10)
    resistor(w * .55, h * .62, '10 kΩ'); resistor(w * .55, h * .5, '4,7 kΩ'); cap(w * .58, h * .36, '100 nF'); cap(w * .58, h * .26, '10 µF')
    for yy in (h * .62, h * .5, h * .36, h * .26): ax.plot([w * .55 + 100, w * .82], [yy, yy], color=ink, lw=1.6)
    ax.plot([w * .82, w * .82], [h * .2, h * .66], color=ink, lw=1.6)
    for k in range(3): ax.plot([w * .82 - 18 + k * 6, w * .82 + 18 - k * 6], [h * .2 - k * 7] * 2, color=ink, lw=2)
    ax.text(w * .06, h * .9, title, color=ink, fontsize=20, fontweight='bold'); ax.text(w * .06, h * .86, 'Esquema eléctrico · KiCad', color='#6b7385', fontsize=12)
    save(fig, name)


# ---------------------------------------------------------------- kit de piezas
def kit(name, title, items, w=1000, h=1250, seed=3):
    rnd = random.Random(seed)
    fig, ax = canvas(w, h, '#1f5d43')
    for x in range(0, w, 50): ax.plot([x, x], [0, h], color='#2f7a59', lw=1 if x % 250 else 2)
    for y in range(0, h, 50): ax.plot([0, w], [y, y], color='#2f7a59', lw=1 if y % 250 else 2)
    cols = 2; cw = (w - 120) / cols; rh = (h - 260) / math.ceil(len(items) / cols)
    for i, (lab, shape, col, qty) in enumerate(items):
        cx = 60 + (i % cols) * cw + cw / 2; cy = h - 200 - (i // cols) * rh - rh / 2
        s = min(cw, rh) * .32
        ax.add_patch(Circle((cx + 8, cy - 8), s * 1.05, fc=(0, 0, 0, .18), ec='none'))
        if shape == 'circle': ax.add_patch(Circle((cx, cy), s, fc=col, ec='#111', lw=1.5)); ax.add_patch(Circle((cx, cy), s * .3, fc='#1f5d43', ec='#111'))
        elif shape == 'rect': ax.add_patch(FancyBboxPatch((cx - s, cy - s * .6), 2 * s, 1.2 * s, boxstyle='round,pad=0,rounding_size=10', fc=col, ec='#111', lw=1.5))
        elif shape == 'board':
            ax.add_patch(FancyBboxPatch((cx - s, cy - s * .7), 2 * s, 1.4 * s, boxstyle='round,pad=0,rounding_size=8', fc=col, ec='#111', lw=1.5))
            ax.add_patch(Rectangle((cx - s * .35, cy - s * .35), s * .7, s * .7, fc='#1b1b1b'))
            for k in range(8): ax.add_patch(Rectangle((cx - s * .9 + k * s * .25, cy + s * .5), s * .12, s * .12, fc='#d4af37'))
        elif shape == 'rod': ax.add_patch(FancyBboxPatch((cx - s * 1.2, cy - s * .15), 2.4 * s, .3 * s, boxstyle='round,pad=0,rounding_size=6', fc=col, ec='#111', lw=1.5))
        elif shape == 'motor':
            ax.add_patch(Circle((cx, cy), s, fc=col, ec='#111', lw=1.5))
            for a in range(0, 360, 45): t = math.radians(a); ax.add_patch(Circle((cx + s * .65 * math.cos(t), cy + s * .65 * math.sin(t)), s * .1, fc='#222'))
            ax.add_patch(Circle((cx, cy), s * .2, fc='#ddd', ec='#111'))
        ax.text(cx, cy - s - 34, lab, color='white', ha='center', fontsize=15, fontweight='bold')
        ax.text(cx, cy - s - 58, qty, color='#cde9da', ha='center', fontsize=12)
    ax.text(60, h - 90, title, color='white', fontsize=28, fontweight='bold'); ax.text(60, h - 128, 'Todo lo que lleva, antes de montar', color='#cde9da', fontsize=15)
    save(fig, name)


# ---------------------------------------------------------------- rutas
def route(name, title, dist, gain, time, seed=4, w=1000, h=1250, color='#ff7a2f'):
    rng = np.random.default_rng(seed)
    fig = plt.figure(figsize=(w / 100, h / 100), facecolor='#101315')
    ax = fig.add_axes([0, .26, 1, .74]); ax.axis('off')
    X, Y = np.meshgrid(np.linspace(0, 10, 300), np.linspace(0, 12, 360)); Z = np.zeros_like(X)
    for _ in range(9): cx, cy, s, a = rng.uniform(0, 10), rng.uniform(0, 12), rng.uniform(1, 3), rng.uniform(.5, 2); Z += a * np.exp(-((X - cx) ** 2 + (Y - cy) ** 2) / (2 * s ** 2))
    ax.contourf(X, Y, Z, 14, cmap=matplotlib.colors.LinearSegmentedColormap.from_list('t', ['#16201d', '#2a3a33', '#3e5248']))
    ax.contour(X, Y, Z, 28, colors='#5d7569', linewidths=.6, alpha=.6)
    t = np.linspace(0, 2 * np.pi, 400); r = 3.6 + .9 * np.sin(3 * t + rng.uniform(0, 6)) + .5 * np.sin(5 * t + 1)
    px, py = 5 + r * np.cos(t) * .95, 6 + r * np.sin(t) * 1.15
    ax.plot(px, py, color='#000', lw=9, alpha=.35, solid_capstyle='round'); ax.plot(px, py, color=color, lw=5, solid_capstyle='round')
    ax.add_patch(Circle((px[0], py[0]), .22, fc='#3ad17a', ec='white', lw=2, zorder=5)); ax.text(px[0] + (-.35 if px[0] > 6 else .35), py[0], 'Salida / Meta', color='white', fontsize=13, va='center', ha='right' if px[0] > 6 else 'left', fontweight='bold')
    ax.set_xlim(0, 10); ax.set_ylim(0, 12)
    fig.text(.06, .95, title, color='white', fontsize=24, fontweight='bold', va='top')
    a2 = fig.add_axes([.06, .05, .88, .12]); a2.set_facecolor('#101315')
    for s in a2.spines.values(): s.set_visible(False)
    el = np.interp(np.linspace(0, 1, 300), np.linspace(0, 1, 400), np.array([Z[int(min(359, y / 12 * 359)), int(min(299, x / 10 * 299))] for x, y in zip(px, py)]))
    a2.fill_between(np.arange(300), el, el.min() - .2, color=color, alpha=.35); a2.plot(el, color=color, lw=2); a2.set_xticks([]); a2.set_yticks([])
    for i, (v, lab) in enumerate([(dist, 'Distancia'), (gain, 'Desnivel +'), (time, 'Tiempo')]):
        fig.text(.06 + i * .31, .225, v, color='white', fontsize=26, fontweight='bold'); fig.text(.06 + i * .31, .195, lab, color='#9a9a9a', fontsize=13)
    save(fig, name)


# ---------------------------------------------------------------- tarjeta de datos
def stat_card(name, title, sub, stats, w=1000, h=1000, accent=YELLOW):
    fig, ax = canvas(w, h, '#111111')
    ax.add_patch(Rectangle((0, h - 14), w, 14, fc=accent))
    ax.text(70, h - 110, title, color='white', fontsize=34, fontweight='bold'); ax.text(70, h - 160, sub, color='#9a9a9a', fontsize=17)
    for i, (v, lab) in enumerate(stats):
        x = 70 + (i % 2) * (w - 140) / 2; y = h - 330 - (i // 2) * 250
        ax.text(x, y, v, color=accent if i == 0 else 'white', fontsize=52, fontweight='bold'); ax.text(x, y - 60, lab, color='#9a9a9a', fontsize=17)
    save(fig, name)


# ---------------------------------------------------------------- avatares y banners (PIL)
def font(sz, bold=True):
    p = '/usr/share/fonts/opentype/inter/Inter-Bold.otf' if bold else '/usr/share/fonts/opentype/inter/Inter-Medium.otf'
    return ImageFont.truetype(p, sz)


def avatar(name, initials, c1, c2, size=600):
    im = Image.new('RGB', (size, size), c1); d = ImageDraw.Draw(im)
    for y in range(size):
        k = y / size; d.line([(0, y), (size, y)], fill=tuple(int(a + (b - a) * k) for a, b in zip(Image.new('RGB', (1, 1), c1).getpixel((0, 0)), Image.new('RGB', (1, 1), c2).getpixel((0, 0)))))
    d.ellipse([size * .55, -size * .2, size * 1.3, size * .55], fill=tuple(min(255, v + 25) for v in im.getpixel((size - 1, 0))))
    f = font(int(size * .36)); bb = d.textbbox((0, 0), initials, font=f)
    d.text(((size - (bb[2] - bb[0])) / 2 - bb[0], (size - (bb[3] - bb[1])) / 2 - bb[1]), initials, font=f, fill='white')
    im.save(os.path.join(OUT, name), 'JPEG', quality=88); print('  ', name)


def banner(name, kind, seed=5, w=2400, h=800):
    rng = np.random.default_rng(seed)
    fig, ax = canvas(w, h, '#0d1b2e' if kind == 'blue' else '#101315' if kind == 'topo' else '#0c1f16')
    if kind == 'blue':
        for x in range(0, w, 40): ax.plot([x, x], [0, h], color='#17304f', lw=.8 if x % 200 else 1.6)
        for y in range(0, h, 40): ax.plot([0, w], [y, y], color='#17304f', lw=.8 if y % 200 else 1.6)
        for cx, cy, r in [(1700, 420, 260), (600, 300, 160)]:
            for a in [45, 135, 225, 315]:
                t = math.radians(a); ax.plot([cx, cx + r * math.cos(t)], [cy, cy + r * math.sin(t)], color='#4f7fb8', lw=3)
                ax.add_patch(Circle((cx + r * math.cos(t), cy + r * math.sin(t)), r * .45, fill=False, ec='#4f7fb8', lw=1.5, ls=(0, (8, 6))))
            ax.add_patch(FancyBboxPatch((cx - r * .2, cy - r * .28), r * .4, r * .56, boxstyle='round,pad=0,rounding_size=12', fill=False, ec='#8fb6e6', lw=3))
    elif kind == 'topo':
        X, Y = np.meshgrid(np.linspace(0, 24, 600), np.linspace(0, 8, 200)); Z = np.zeros_like(X)
        for _ in range(14): cx, cy, s, a = rng.uniform(0, 24), rng.uniform(0, 8), rng.uniform(1, 3), rng.uniform(.5, 2); Z += a * np.exp(-((X - cx) ** 2 + (Y - cy) ** 2) / (2 * s ** 2))
        ax.contour(X * 100, Y * 100, Z, 30, colors='#ff7a2f', linewidths=1, alpha=.55)
    else:
        rnd = random.Random(seed)
        for _ in range(160):
            x, y = rnd.uniform(0, w), rnd.uniform(0, h); pts = [(x, y)]
            for _ in range(3):
                if rnd.random() < .5: x += rnd.choice([-1, 1]) * rnd.uniform(60, 300)
                else: y += rnd.choice([-1, 1]) * rnd.uniform(40, 200)
                pts.append((x, y))
            xs, ys = zip(*pts); ax.plot(xs, ys, color='#1f6b46', lw=rnd.choice([2, 3, 5]), alpha=.9); ax.add_patch(Circle(pts[-1], 7, fc='#c9a227'))
    save(fig, name)


if __name__ == '__main__':
    print('Generando imágenes en', OUT)
    # Lucía: drones
    avatar('lucia_avatar.jpg', 'LF', '#2b5876', '#4e4376'); banner('lucia_banner.jpg', 'blue', 11)
    blueprint('lucia_quad_plano.jpg', 'quad', 'Bastidor X 5"', 'L. Fernández', 1200, 900, 1)
    render('lucia_quad_render.jpg', 'quad', 1000, 1000)
    pcb('lucia_fc_pcb.jpg', [(380, 320, 180, 180, 'STM32F7'), (650, 380, 90, 90, 'ICM42688'), (200, 450, 100, 60, 'BMP280'), (650, 200, 140, 70, 'ESC 4in1')], 'Controladora de vuelo F7', 1100, 800, 3)
    kit('lucia_quad_kit.jpg', 'Kit del cuadricóptero', [('Motores 2207', 'motor', '#9aa0a6', '× 4'), ('Controladora F7', 'board', '#1b4d8c', '× 1'), ('ESC 4 en 1', 'board', '#2b2b2b', '× 1'), ('LiPo 4S 1.500', 'rect', '#e0b400', '× 2'), ('Hélices 5"', 'circle', YELLOW, '× 8'), ('Brazos carbono', 'rod', '#2b2b2b', '× 4')], 1000, 1250, 4)
    chart('lucia_telemetria.jpg', 'telemetry', 1100, 760, 5)
    blueprint('lucia_banco_plano.jpg', 'rig', 'Banco de empuje', 'L. Fernández', 1200, 850, 6)
    chart('lucia_empuje.jpg', 'thrust', 1100, 760, 7)
    schematic('lucia_hx711.jpg', 'Célula de carga + HX711', [(80, 300, 220, 200, 'HX711', ['E+', 'E-', 'A+', 'A-']), (80, 80, 220, 160, 'ESP32', ['GPIO4', 'GPIO5', '3V3'])])
    chart('lucia_eficiencia.jpg', 'efficiency', 1100, 760, 8)
    render('lucia_quad_render2.jpg', 'quad', 1000, 1250, ('#3a2f1a', '#0e0d0a'), 16, -20)
    # Marc: triatlón + rodillo
    avatar('marc_avatar.jpg', 'MS', '#d1572b', '#7a1f2b'); banner('marc_banner.jpg', 'topo', 21)
    route('marc_ruta_bici.jpg', 'Recorrido bici · Valencia', '90,1 km', '+612 m', '2 h 31 min', 22)
    chart('marc_entreno.jpg', 'training', 1100, 760, 23)
    stat_card('marc_resultado.jpg', 'Ironman 70.3 Valencia', 'Resultado final', [('4:41:18', 'Tiempo total'), ('31:05', 'Natación 1,9 km'), ('2:31:40', 'Bici 90 km'), ('1:32:51', 'Carrera 21,1 km')])
    route('marc_ruta_carrera.jpg', 'Tirada larga · Albufera', '21,3 km', '+48 m', '1 h 38 min', 24, color=YELLOW)
    chart('marc_ritmo.jpg', 'pace', 1100, 760, 25)
    blueprint('marc_rodillo_plano.jpg', 'trainer', 'Rodillo inteligente', 'M. Soler', 1200, 900, 26)
    render('marc_rodillo_render.jpg', 'trainer', 1000, 900, ('#2a2d33', '#0e0f12'), 20, -60)
    pcb('marc_potencia_pcb.jpg', [(360, 330, 170, 170, 'nRF52840'), (620, 360, 120, 80, 'HX711'), (220, 220, 110, 60, 'TPS63020'), (620, 200, 130, 80, 'ANT+/BLE')], 'Medidor de potencia', 1100, 800, 27, '#1a2f5a')
    chart('marc_potencia.jpg', 'power', 1100, 760, 28)
    kit('marc_rodillo_kit.jpg', 'Kit del rodillo', [('Volante 4,2 kg', 'circle', '#9aa0a6', '× 1'), ('Imanes N52', 'rect', '#c0c0c0', '× 12'), ('Servo freno', 'motor', '#2b2b2b', '× 1'), ('nRF52840', 'board', '#1a2f5a', '× 1'), ('Eje 15 mm', 'rod', '#9aa0a6', '× 1'), ('Perfil 2020', 'rod', '#d0d0d0', '× 6')], 1000, 1250, 29)
    # Irene: SCARA + estación meteo
    avatar('irene_avatar.jpg', 'IN', '#11998e', '#1e5b53'); banner('irene_banner.jpg', 'pcb', 31)
    blueprint('irene_scara_plano.jpg', 'scara', 'Brazo SCARA', 'I. Navarro', 1200, 900, 32)
    render('irene_scara_render.jpg', 'scara', 1000, 1100, ('#2d2a33', '#0f0e12'), 22, -60)
    chart('irene_workspace.jpg', 'workspace', 1000, 900, 33)
    schematic('irene_drivers.jpg', 'Drivers TMC2209 ×3', [(80, 330, 220, 190, 'TMC2209', ['STEP', 'DIR', 'EN', 'UART']), (80, 90, 220, 180, 'ESP32-S3', ['GPIO1', 'GPIO2', 'GPIO3'])])
    kit('irene_scara_kit.jpg', 'Kit del SCARA', [('NEMA 17', 'motor', '#3a3f47', '× 3'), ('TMC2209', 'board', '#8c1b4d', '× 3'), ('Varilla 8 mm', 'rod', '#c0c0c0', '× 2'), ('Polea GT2', 'circle', '#d0d0d0', '× 4'), ('ESP32-S3', 'board', '#1b4d8c', '× 1'), ('Fuente 24 V', 'rect', '#555', '× 1')], 1000, 1250, 34)
    pcb('irene_meteo_pcb.jpg', [(380, 330, 160, 160, 'ESP32-C3'), (620, 380, 90, 70, 'BME280'), (220, 220, 120, 70, 'CN3791'), (620, 220, 120, 60, 'LoRa')], 'Estación meteo · placa base', 1100, 800, 35, '#4a1f5c')
    blueprint('irene_caja_plano.jpg', 'enclosure', 'Caja IP65', 'I. Navarro', 1200, 850, 36)
    chart('irene_meteo.jpg', 'weather', 1100, 760, 37)
    chart('irene_solar.jpg', 'solar', 1100, 760, 38)
    render('irene_caja_render.jpg', 'enclosure', 1000, 1000, ('#2a3330', '#0d100f'), 25, -50)
    print('Listo')

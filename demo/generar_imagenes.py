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
    elif kind == 'wing':
        span, root, tip, sweep = w * .7, h * .32, h * .14, h * .2
        x0 = cx - span / 2; yr = cy + root / 2
        pts = [[cx, yr], [x0, yr - sweep], [x0, yr - sweep - tip], [cx, yr - root - sweep * .1], [cx + span / 2, yr - sweep - tip], [cx + span / 2, yr - sweep]]
        ax.add_patch(Polygon([[cx, yr], [x0, yr - sweep], [x0, yr - sweep - tip], [cx, yr - root]], closed=True, fill=False, ec=line, lw=2.4))
        ax.add_patch(Polygon([[cx, yr], [cx + span / 2, yr - sweep], [cx + span / 2, yr - sweep - tip], [cx, yr - root]], closed=True, fill=False, ec=line, lw=2.4))
        for sgn in (-1, 1):
            ex = cx + sgn * span / 2
            ax.add_patch(Polygon([[cx + sgn * span * .12, yr - root - sweep * .24 + root * .2], [ex, yr - sweep - tip], [ex, yr - sweep - tip + tip * .35], [cx + sgn * span * .12, yr - root - sweep * .24 + root * .32]], closed=True, fill=False, ec=YELLOW, lw=1.6))
        ax.add_patch(FancyBboxPatch((cx - 30, yr - root * .85), 60, root * .8, boxstyle='round,pad=0,rounding_size=20', fill=False, ec=line, lw=2))
        ax.add_patch(Circle((cx, yr - root - 18), 16, fill=False, ec=line, lw=1.8)); ax.plot([cx - 60, cx + 60], [yr - root - 18] * 2, color=line, lw=1.2, ls=(0, (6, 4)))
        dim(x0, cy - root * .9, x0 + span, cy - root * .9, f'Envergadura {int(span * 1.2)} mm', -10)
        ax.text(cx + span * .3, yr - sweep * .5 - 40, 'ELEVÓN', color=YELLOW, fontsize=11, fontweight='bold')
    elif kind == 'linebot':
        ax.add_patch(FancyBboxPatch((cx - 150, cy - 110), 300, 220, boxstyle='round,pad=0,rounding_size=30', fill=False, ec=line, lw=2.4))
        for sgn in (-1, 1): ax.add_patch(Rectangle((cx + sgn * 150 - (24 if sgn < 0 else 0), cy - 70), 24, 90, fill=False, ec=line, lw=2.2))
        ax.add_patch(Rectangle((cx - 170, cy + 140), 340, 30, fill=False, ec=line, lw=2))
        for k in range(8): ax.add_patch(Rectangle((cx - 155 + k * 40, cy + 147), 20, 16, fill=False, ec=YELLOW, lw=1.4))
        ax.plot([cx - 60, cx - 150], [cy + 110, cy + 140], color=line, lw=1.6); ax.plot([cx + 60, cx + 150], [cy + 110, cy + 140], color=line, lw=1.6)
        ax.add_patch(Circle((cx, cy - 90), 12, fill=False, ec=line, lw=1.6))
        ax.add_patch(Rectangle((cx - 50, cy - 30), 100, 70, fill=False, ec=line, lw=1.6)); ax.text(cx, cy + 5, 'STM32', color=line, ha='center', va='center', fontsize=11)
        ax.text(cx, cy + 185, '8 sensores IR', color=YELLOW, ha='center', fontsize=12, fontweight='bold')
        dim(cx - 174, cy - 140, cx + 174, cy - 140, '120 mm', 0)
    elif kind == 'cnc':
        bx0, by0, bw = w * .14, h * .2, w * .6
        ax.add_patch(Rectangle((bx0, by0), bw, 34, fill=False, ec=line, lw=2.4))
        for sx in (bx0 + 10, bx0 + bw - 46): ax.add_patch(Rectangle((sx, by0 + 34), 36, h * .42, fill=False, ec=line, lw=2.2))
        gy = by0 + 34 + h * .42 - 60
        ax.add_patch(Rectangle((bx0 + 10, gy), bw - 20, 50, fill=False, ec=line, lw=2.4))
        zx = bx0 + bw * .55
        ax.add_patch(Rectangle((zx - 45, gy - 150), 90, 230, fill=False, ec=line, lw=2.2))
        ax.add_patch(Rectangle((zx - 26, gy - 230), 52, 90, fill=False, ec=line, lw=2)); ax.plot([zx, zx], [gy - 230, gy - 262], color=YELLOW, lw=3)
        ax.add_patch(Rectangle((bx0 + 70, by0 + 34), bw - 140, 26, fill=False, ec=line, lw=1.6))
        for k in range(9): ax.plot([bx0 + 80 + k * (bw - 160) / 8] * 2, [by0 + 34, by0 + 60], color=line, lw=.8)
        dim(bx0, by0 - 40, bx0 + bw, by0 - 40, 'Área útil 300 × 400 mm', 0)
        ax.text(zx + 60, gy - 200, 'HUSILLO 800 W', color=YELLOW, fontsize=11, fontweight='bold')
    elif kind == 'bike':
        rw = 150; rx, ry = w * .26, h * .3; fx, fy = w * .66, h * .3
        bb = (w * .45, h * .27); st = (w * .41, h * .72); ht1 = (w * .62, h * .66); ht2 = (w * .63, h * .56)
        for c in [(rx, ry), (fx, fy)]: ax.add_patch(Circle(c, rw, fill=False, ec=line, lw=2.4)); ax.add_patch(Circle(c, 12, fill=False, ec=line, lw=1.6))
        for a, b2 in [(bb, st), (st, ht1), (bb, ht2), (ht1, ht2), ((rx, ry), bb), ((rx, ry), st)]:
            ax.plot([a[0], b2[0]], [a[1], b2[1]], color='#d9c27a', lw=7, solid_capstyle='round'); ax.plot([a[0], b2[0]], [a[1], b2[1]], color=line, lw=1.2)
        ax.plot([ht2[0], fx], [ht2[1], fy], color=line, lw=2.4); ax.plot([ht1[0], ht1[0] - 10], [ht1[1], ht1[1] + 50], color=line, lw=2)
        ax.plot([st[0], st[0] - 14], [st[1], st[1] + 60], color=line, lw=2); ax.add_patch(Rectangle((st[0] - 60, st[1] + 60), 90, 14, fill=False, ec=line, lw=1.8))
        ax.add_patch(Circle(bb, 22, fill=False, ec=line, lw=1.8))
        ax.add_patch(Arc(bb, 120, 120, theta1=70, theta2=100, ec=YELLOW, lw=2)); ax.text(bb[0] - 40, bb[1] + 75, '73,5°', color=YELLOW, fontsize=12, fontweight='bold')
        ax.add_patch(Arc(ht2, 120, 120, theta1=180, theta2=250, ec=YELLOW, lw=2)); ax.text(ht2[0] - 110, ht2[1] - 60, '71°', color=YELLOW, fontsize=12, fontweight='bold')
        dim(rx, ry - rw - 30, fx, fy - rw - 30, 'Distancia entre ejes 1.045 mm', 0)
        ax.text(w * .5, h * .82, 'Tubos de bambú · uniones de fibra de lino + epoxi', color=line, ha='center', fontsize=12)
    elif kind == 'corexy':
        s0 = min(w, h) * .62; x0, y0 = cx - s0 / 2, cy - s0 / 2
        ax.add_patch(Rectangle((x0, y0), s0, s0, fill=False, ec=line, lw=3))
        corners = [(x0 + 20, y0 + 20), (x0 + s0 - 20, y0 + 20), (x0 + s0 - 20, y0 + s0 - 20), (x0 + 20, y0 + s0 - 20)]
        for c in corners: ax.add_patch(Circle(c, 14, fill=False, ec=line, lw=1.8))
        car = (cx + 40, cy + 30); gy = car[1]
        ax.plot([x0 + 20, x0 + s0 - 20], [gy, gy], color=line, lw=2.2)
        ax.add_patch(Rectangle((car[0] - 40, car[1] - 34), 80, 68, fill=False, ec=line, lw=2.2)); ax.add_patch(Circle(car, 10, fill=False, ec=YELLOW, lw=2))
        for (a, b2), col in [((corners[0], corners[3]), YELLOW), ((corners[1], corners[2]), '#6cc4ff')]:
            ax.plot([a[0], car[0] - 40, b2[0]], [a[1], car[1], b2[1]], color=col, lw=1.6)
        ax.plot([corners[0][0], corners[1][0]], [corners[0][1], corners[1][1]], color=YELLOW, lw=1.6)
        ax.plot([corners[3][0], car[0] + 40, corners[2][0]], [corners[3][1], car[1], corners[2][1]], color='#6cc4ff', lw=1.6)
        for c in corners[:2]: ax.add_patch(Rectangle((c[0] - 22, c[1] - 22), 44, 44, fill=False, ec=line, lw=1.2, ls=(0, (4, 3))))
        dim(x0, y0 - 30, x0 + s0, y0 - 30, 'Volumen 235 × 235 × 250 mm', 0)
        ax.text(x0 + 30, y0 + s0 + 16, 'CORREAS GT2 · CINEMÁTICA COREXY', color=line, fontsize=11, fontweight='bold')
    elif kind == 'fingerboard':
        bw2, bh2 = w * .72, h * .36; x0, y0 = cx - bw2 / 2, cy - bh2 / 2 + 40
        ax.add_patch(FancyBboxPatch((x0, y0), bw2, bh2, boxstyle='round,pad=0,rounding_size=40', fill=False, ec=line, lw=2.6))
        for row, (dep, n) in enumerate([(20, 2), (15, 3), (10, 4)]):
            yy = y0 + bh2 - 50 - row * 70; seg = (bw2 - 80) / n
            for k in range(n): ax.add_patch(FancyBboxPatch((x0 + 40 + k * seg + 10, yy), seg - 20, 30, boxstyle='round,pad=0,rounding_size=8', fill=False, ec=line, lw=1.8))
            ax.text(x0 - 16, yy + 15, f'{dep} mm', color=YELLOW, ha='right', va='center', fontsize=11, fontweight='bold')
        for k in range(4): ax.add_patch(Rectangle((x0 + 60 + k * (bw2 - 180) / 3, y0 - 70), 60, 40, fill=False, ec=line, lw=1.8))
        ax.text(cx, y0 - 100, '4 CÉLULAS DE CARGA DE 100 kg', color=line, ha='center', fontsize=11, fontweight='bold')
        dim(x0, y0 + bh2 + 30, x0 + bw2, y0 + bh2 + 30, '600 mm', 0)
    elif kind == 'yagi':
        bx1, bx2, by = w * .1, w * .86, cy + 20
        ax.plot([bx1, bx2], [by, by], color=line, lw=3)
        lens = [(.96, 'R'), (.84, 'DE'), (.78, 'D1'), (.74, 'D2'), (.71, 'D3'), (.69, 'D4')]
        for k, (L, lab) in enumerate(lens):
            x = bx1 + 40 + k * (bx2 - bx1 - 80) / (len(lens) - 1); half = L * h * .32
            ax.plot([x, x], [by - half, by + half], color=YELLOW if lab == 'DE' else line, lw=2.6)
            ax.text(x, by + half + 20, lab, color=line, ha='center', fontsize=11, fontweight='bold')
            ax.text(x, by - half - 26, f'{int(L * 1040)} mm', color=line, ha='center', fontsize=9)
        dim(bx1 + 40, by - h * .36, bx2 - 40, by - h * .36, 'Boom 1.250 mm · 137 MHz', 0)
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
    elif kind == 'wing':
        span, root, tip, sweep = 300, 150, 60, 90
        for sgn in (-1, 1):
            parts.append(([[[0, 0, 0], [sgn * span, -sweep, 0], [sgn * span, -sweep - tip, 0], [0, -root, 0]]], '#e6e6e6'))
            parts.append(([[[0, 0, 4], [sgn * span, -sweep, 2], [sgn * span, -sweep - tip, 2], [0, -root, 4]]], '#f2f2f2'))
            parts.append(([[[sgn * 40, -root * .88, 3], [sgn * span, -sweep - tip, 2.5], [sgn * span, -sweep - tip + 18, 2.5], [sgn * 40, -root * .72, 3]]], YELLOW))
            parts.append((box(sgn * span - (6 if sgn > 0 else 0), -sweep - tip, 0, 6, tip, 40), '#2b2b2b'))
        parts += [(box(-22, -root + 10, 0, 44, root - 20, 26), '#2b2f36'), (cyl(0, -root - 6, 13, 9, 4), '#9aa0a6')]
        ax.set_xlim(-320, 320); ax.set_ylim(-400, 240); ax.set_zlim(-200, 200)
    elif kind == 'linebot':
        parts += [(box(-60, -45, 8, 120, 90, 3), '#1b4d8c'), (box(-70, 45, 4, 140, 16, 3), '#1b4d8c'), (box(-30, -20, 11, 60, 40, 6), '#1b1b1b')]
        for sx in (-1, 1): parts.append(([[[sx * 66, -15 + 22 * math.cos(a), 12 + 22 * math.sin(a)] for a in np.linspace(0, 2 * np.pi, 32)]], '#222'))
        for k in range(8): parts.append((box(-64 + k * 16, 50, 2, 8, 6, 2), YELLOW))
        parts += [(box(-20, -45, 11, 40, 20, 12), '#d0d0d0'), (cyl(0, -38, 0, 6, 8), '#9aa0a6')]
        ax.set_xlim(-110, 110); ax.set_ylim(-110, 110); ax.set_zlim(-60, 120)
    elif kind == 'cnc':
        parts += [(box(-160, -120, 0, 320, 240, 16), '#2b2f36'), (box(-130, -100, 16, 260, 200, 10), '#c9a227')]
        for sx in (-160, 140): parts.append((box(sx, -20, 16, 20, 40, 200), '#d8dbe0'))
        parts += [(box(-160, -20, 190, 320, 30, 40), '#d8dbe0'), (box(10, -40, 120, 60, 25, 110), YELLOW), (cyl(40, -28, 70, 16, 50), '#2b2b2b'), (cyl(40, -28, 50, 3, 20), '#cccccc')]
        ax.set_xlim(-200, 200); ax.set_ylim(-200, 200); ax.set_zlim(0, 300)
    elif kind == 'corexy':
        L = 200
        for x in (-L, L - 15):
            for y in (-L, L - 15): parts.append((box(x, y, 0, 15, 15, 300), '#d8dbe0'))
        for z in (0, 285):
            parts += [(box(-L, -L, z, 2 * L, 15, 15), '#d8dbe0'), (box(-L, L - 15, z, 2 * L, 15, 15), '#d8dbe0'), (box(-L, -L, z, 15, 2 * L, 15), '#d8dbe0'), (box(L - 15, -L, z, 15, 2 * L, 15), '#d8dbe0')]
        parts += [(box(-L + 15, 20, 280, 2 * L - 30, 10, 10), '#2b2b2b'), (box(10, 5, 262, 50, 40, 30), YELLOW), (box(-150, -150, 120, 300, 300, 6), '#1d1d1d')]
        ax.set_xlim(-260, 260); ax.set_ylim(-260, 260); ax.set_zlim(-40, 340)
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
    elif kind == 'airfoil':
        x = np.linspace(0, 1, 200); t = .12; yt = 5 * t * (.2969 * np.sqrt(x) - .126 * x - .3516 * x ** 2 + .2843 * x ** 3 - .1015 * x ** 4)
        m, pp = .02, .4; yc = np.where(x < pp, m / pp ** 2 * (2 * pp * x - x ** 2), m / (1 - pp) ** 2 * ((1 - 2 * pp) + 2 * pp * x - x ** 2))
        ax.fill_between(x, yc - yt, yc + yt, color=YELLOW, alpha=.85); ax.plot(x, yc, color='#141414', lw=1.5, ls='--'); ax.set_aspect('equal'); ax.set_ylim(-.15, .2)
        ax.set_xlabel('Cuerda (x/c)', color='#9a9a9a')
        chart_title(fig, 'Perfil del ala · MH45 modificado', 'Espesor 12 % · curvatura 2 % · estable sin cola', '9,8', 'L/D a crucero')
    elif kind == 'speed':
        t = np.linspace(0, 600, 800); v = 16 + 4 * np.sin(t / 50) + rng.normal(0, .5, 800); v[:40] = np.linspace(0, v[40], 40); alt = np.clip(60 + 25 * np.sin(t / 90) + np.cumsum(rng.normal(0, .15, 800)), 0, None); alt[:40] = np.linspace(0, alt[40], 40); alt[-40:] = np.linspace(alt[-40], 0, 40)
        ax.plot(t / 60, v * 3.6, color=YELLOW, lw=2); ax.set_ylabel('Velocidad (km/h)', color='#9a9a9a'); ax.set_xlabel('Minutos', color='#9a9a9a')
        a2 = ax.twinx(); a2.fill_between(t / 60, alt, color='#6cc4ff', alpha=.18); a2.plot(t / 60, alt, color='#6cc4ff', lw=1.5); a2.tick_params(colors='#6cc4ff', labelsize=11); a2.set_ylabel('Altura (m)', color='#6cc4ff')
        for sp in a2.spines.values(): sp.set_visible(False)
        chart_title(fig, 'Primer vuelo largo del ala', 'Telemetría GPS · 10 minutos', '68 km/h', 'velocidad media')
    elif kind == 'marathon_weeks':
        wk = np.arange(1, 19); km = np.clip(45 + wk * 3.2 + rng.normal(0, 4, 18), 30, None); km[[3, 7, 11, 15]] *= .7; km[-2:] = [52, 30]; longr = np.clip(16 + wk * .9, 16, 32); longr[-2:] = [18, 12]
        ax.bar(wk, km, color=['#3c3c3c' if i not in (3, 7, 11, 15) else '#2a2a2a' for i in range(18)]); ax.plot(wk, longr * 3, color=YELLOW, lw=3, marker='o', ms=5)
        ax.set_xlabel('Semana', color='#9a9a9a'); ax.set_ylabel('km por semana', color='#9a9a9a')
        chart_title(fig, 'Plan de maratón · 18 semanas', 'Barras: volumen semanal · línea: tirada larga (×3)', '1.410 km', 'en total')
    elif kind == 'laps':
        v = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7']; tt = [21.4, 18.9, 16.2, 14.8, 13.1, 12.4, 11.6]
        ax.bar(v, tt, color=['#3c3c3c'] * 6 + [YELLOW]); ax.set_ylabel('Tiempo por vuelta (s)', color='#9a9a9a'); ax.set_xlabel('Versión del controlador', color='#9a9a9a')
        for i, val in enumerate(tt): ax.text(i, val + .3, f'{val:.1f}', color='white', ha='center', fontsize=11)
        chart_title(fig, 'Tiempo por vuelta en la pista oficial', 'PID → PID con anticipación → control por curvatura', '−46 %', 'desde la v1')
    elif kind == 'accuracy':
        xg, yg = np.meshgrid(np.linspace(0, 300, 13), np.linspace(0, 400, 17)); err = .02 + .03 * np.exp(-((xg - 150) ** 2 + (yg - 200) ** 2) / 20000) + rng.normal(0, .004, xg.shape)
        im = ax.pcolormesh(xg, yg, err * 1000, cmap=matplotlib.colors.LinearSegmentedColormap.from_list('e', ['#1f3d2e', '#3c3c3c', YELLOW]), shading='auto'); ax.set_aspect('equal')
        cb = fig.colorbar(im, ax=ax, fraction=.03); cb.ax.tick_params(colors='#9a9a9a'); cb.outline.set_visible(False); cb.set_label('Error (µm)', color='#9a9a9a')
        ax.set_xlabel('X (mm)', color='#9a9a9a'); ax.set_ylabel('Y (mm)', color='#9a9a9a')
        chart_title(fig, 'Mapa de precisión de la mesa', 'Medido con comparador en 221 puntos', '±0,04 mm', 'error máximo')
    elif kind == 'stiffness':
        f = np.linspace(0, 1200, 30)
        for lab, k, c in [('Bambú + lino', 1.0, YELLOW), ('Acero Cr-Mo', .82, '#6cc4ff'), ('Aluminio 6061', .7, '#ff8a5b')]: ax.plot(f, f / (k * 900), color=c, lw=2.5, marker='o', ms=3, label=lab)
        ax.legend(frameon=False, labelcolor='white', fontsize=12, loc='upper left'); ax.set_xlabel('Carga en el pedalier (N)', color='#9a9a9a'); ax.set_ylabel('Deformación (mm)', color='#9a9a9a')
        chart_title(fig, 'Ensayo de rigidez del cuadro', 'Carga lateral en el eje de pedalier', '1,33 mm', 'a 1.200 N')
    elif kind == 'resonance':
        fr = np.linspace(10, 150, 400)
        for lab, f0, c in [('Eje X', 48, YELLOW), ('Eje Y', 61, '#6cc4ff')]: ax.plot(fr, 1 / np.sqrt((1 - (fr / f0) ** 2) ** 2 + (.12 * fr / f0) ** 2) + rng.normal(0, .08, 400), color=c, lw=2, label=lab)
        ax.legend(frameon=False, labelcolor='white', fontsize=12); ax.set_xlabel('Frecuencia (Hz)', color='#9a9a9a'); ax.set_ylabel('Amplitud relativa', color='#9a9a9a')
        chart_title(fig, 'Resonancias medidas con acelerómetro', 'Input shaping en Klipper · ADXL345', '48 / 61 Hz', 'X / Y')
    elif kind == 'force':
        t = np.linspace(0, 10, 500)
        for lab, peak, c in [('Mano izquierda', 31, '#6cc4ff'), ('Mano derecha', 34, YELLOW)]:
            f = np.where((t > 1) & (t < 8), peak * (1 - np.exp(-(t - 1) * 3)) * (1 - .02 * (t - 1)), 0) + rng.normal(0, .4, 500); ax.plot(t, np.clip(f, 0, None), color=c, lw=2.2, label=lab)
        ax.legend(frameon=False, labelcolor='white', fontsize=12); ax.set_xlabel('Segundos', color='#9a9a9a'); ax.set_ylabel('Fuerza (kg)', color='#9a9a9a')
        chart_title(fig, 'Suspensión de 7 s en regleta de 20 mm', 'Fuerza por mano en tiempo real', '65 kg', 'total máximo')
    elif kind == 'strength_weeks':
        wk = np.arange(1, 13); mx = 54 + np.cumsum(rng.uniform(.4, 1.6, 12)); ax.plot(wk, mx, color=YELLOW, lw=3, marker='o', ms=7)
        ax.fill_between(wk, mx, 50, color=YELLOW, alpha=.1); ax.set_ylim(50, 72); ax.set_xlabel('Semana', color='#9a9a9a'); ax.set_ylabel('Fuerza máxima (kg)', color='#9a9a9a')
        chart_title(fig, 'Progreso en 12 semanas', 'Fuerza máxima en regleta de 20 mm', '+19 %', 'de mejora')
    elif kind == 'climb':
        d = np.linspace(0, 16.4, 400); e = 1940 + 1460 * np.clip(np.sin(d / 16.4 * np.pi) ** 1.6, 0, None) + 40 * np.sin(d * 3) * np.sin(d / 16.4 * np.pi)
        ax.fill_between(d, e, 1800, color=YELLOW, alpha=.2); ax.plot(d, e, color=YELLOW, lw=3); ax.set_ylim(1800, 3500)
        for x_, lab in [(0, 'La Besurta'), (4.1, 'Refugio de la Renclusa'), (6.6, 'Portillón Superior'), (8.2, 'Aneto 3.404 m')]:
            yv = np.interp(x_, d, e); ax.plot([x_], [yv], 'o', color='white', ms=7); ax.text(x_ + .15, yv + 50, lab, color='white', fontsize=11, fontweight='bold')
        ax.set_xlabel('Distancia (km)', color='#9a9a9a'); ax.set_ylabel('Altitud (m)', color='#9a9a9a')
        chart_title(fig, 'Perfil de la ascensión', 'Ida y vuelta por el glaciar del Aneto', '+1.560 m', 'desnivel positivo')
    elif kind == 'satpass':
        plt.close(fig)
        fig = plt.figure(figsize=(w / 100, h / 100), facecolor='#141414'); ax = fig.add_axes([.12, .06, .76, .74], projection='polar'); ax.set_facecolor('#141414')
        ax.set_theta_zero_location('N'); ax.set_theta_direction(-1); ax.set_rlim(90, 0); ax.tick_params(colors='#9a9a9a'); ax.grid(color='#2a2a2a')
        az = np.linspace(np.radians(200), np.radians(20), 100); el = 75 * np.sin(np.linspace(0, np.pi, 100))
        ax.plot(az, el, color=YELLOW, lw=3); ax.plot([az[50]], [el[50]], 'o', color='white', ms=9)
        ax.text(az[0], el[0] + 8, 'AOS 14:02', color='white', fontsize=11); ax.text(az[-1], el[-1] + 8, 'LOS 14:16', color='white', fontsize=11)
        chart_title(fig, 'Pase de NOAA-19', 'Acimut y elevación vistos desde Granada', '75°', 'elevación máxima')
    save(fig, name)


def waterfall(name, title, sub, w=1100, h=760, seed=9):
    rng = np.random.default_rng(seed)
    fig, ax = dark_chart(w, h)
    T, F = 300, 400; img = rng.normal(0, 1, (T, F)) * .6
    for t in range(T):
        f0 = int(200 + 120 * np.tanh((t - 150) / 60)); img[t, max(0, f0 - 4):f0 + 4] += 6
        img[t, max(0, f0 - 60):f0 - 52] += 2.5; img[t, f0 + 52:f0 + 60] += 2.5
    ax.imshow(img, aspect='auto', cmap='inferno', extent=[-20, 20, 15, 0]); ax.grid(False)
    ax.set_xlabel('Desplazamiento de frecuencia (kHz)', color='#9a9a9a'); ax.set_ylabel('Minutos', color='#9a9a9a')
    chart_title(fig, title, sub, '137,1 MHz', 'NOAA-19 · APT')
    save(fig, name)


def noaa(name, w=1040, h=1250, seed=10):
    rng = np.random.default_rng(seed)
    base = np.zeros((h // 4, (w - 120) // 4))
    for octave in range(6):
        k = 2 ** octave; n = rng.normal(0, 1, (base.shape[0] // max(1, 64 // k) + 2, base.shape[1] // max(1, 64 // k) + 2))
        base += np.array(Image.fromarray(n.astype(np.float32)).resize(base.shape[::-1], Image.BICUBIC)) / k
    base = (base - base.min()) / (base.max() - base.min())
    yy, xx = np.mgrid[0:base.shape[0], 0:base.shape[1]]
    land = (np.sin(xx / 22) + np.cos(yy / 30) + rng.normal(0, .05, base.shape) > .9) & (yy > base.shape[0] * .45)
    img = np.clip((base - .35) * 2.2, 0, 1) * 235 + 20; img[land] = np.maximum(img[land], 95)
    im = Image.fromarray(img.astype(np.uint8)).resize((w - 120, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(.6))
    out = Image.new('L', (w, h), 0); out.paste(im, (60, 0)); d = ImageDraw.Draw(out)
    for y in range(0, h, 8): d.rectangle([0, y, 50, y + 3], fill=255 if (y // 8) % 2 else 40); d.rectangle([w - 50, y, w, y + 3], fill=int(255 * (y / h)))
    rgb = Image.merge('RGB', (out, out, out)); dr = ImageDraw.Draw(rgb)
    f = font(30); dr.rectangle([60, 0, w - 60, 70], fill=(0, 0, 0)); dr.text((80, 18), 'NOAA-19 · canal 4 (infrarrojo) · 14:09', font=f, fill=(253, 243, 60))
    rgb.save(os.path.join(OUT, name), 'JPEG', quality=86); print('  ', name)


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
    fig, ax = canvas(w, h, {'blue': '#0d1b2e', 'topo': '#101315', 'topo2': '#0e1520', 'toolpath': '#141210'}.get(kind, '#0c1f16'))
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
    elif kind == 'topo2':
        X, Y = np.meshgrid(np.linspace(0, 24, 600), np.linspace(0, 8, 200)); Z = np.zeros_like(X)
        for _ in range(10): cx, cy, s, a = rng.uniform(0, 24), rng.uniform(0, 8), rng.uniform(1.5, 4), rng.uniform(1, 3); Z += a * np.exp(-((X - cx) ** 2 + (Y - cy) ** 2) / (2 * s ** 2))
        ax.contour(X * 100, Y * 100, Z, 34, colors='#6cc4ff', linewidths=1, alpha=.5)
        ax.contour(X * 100, Y * 100, Z, [Z.max() * .85], colors='#ffffff', linewidths=2, alpha=.8)
    elif kind == 'toolpath':
        for k in range(0, 60):
            y = 60 + k * 12; xs = [300 + (0 if k % 2 else 900), 300 + (900 if k % 2 else 0)]
            if y < 760: ax.plot(xs, [y, y], color='#c9a227', lw=1.2, alpha=.55)
        for r in range(20, 360, 18): ax.add_patch(Circle((1800, 400), r, fill=False, ec='#ff7a2f', lw=1.2, alpha=.5))
        ax.add_patch(Rectangle((280, 40), 940, 720, fill=False, ec='#e8e8e8', lw=2, alpha=.5))
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
    # --- terceros proyectos de Lucía, Marc e Irene
    blueprint('lucia_ala_plano.jpg', 'wing', 'Ala volante 1.200', 'L. Fernández', 1200, 900, 41)
    chart('lucia_ala_perfil.jpg', 'airfoil', 1100, 700, 42)
    render('lucia_ala_render.jpg', 'wing', 1100, 900, ('#26303a', '#0c0f12'), 35, -70)
    chart('lucia_ala_vuelo.jpg', 'speed', 1100, 760, 43)
    chart('marc_maraton_plan.jpg', 'marathon_weeks', 1100, 760, 51)
    route('marc_maraton_ruta.jpg', 'Maratón de Valencia', '42,2 km', '+38 m', '2 h 58 min', 52, color=YELLOW)
    stat_card('marc_maraton_resultado.jpg', 'Maratón de Valencia', 'Primera vez por debajo de 3 horas', [('2:58:41', 'Tiempo oficial'), ('4:14 /km', 'Ritmo medio'), ('1:28:50', 'Media maratón'), ('1:29:51', 'Segunda mitad')])
    blueprint('irene_linebot_plano.jpg', 'linebot', 'Velocista seguidor de línea', 'I. Navarro', 1200, 900, 61)
    pcb('irene_linebot_pcb.jpg', [(380, 330, 160, 160, 'STM32G4'), (620, 380, 120, 70, 'DRV8833'), (200, 220, 120, 60, 'MP1584'), (620, 220, 140, 60, 'QTR-8A')], 'Velocista · placa principal', 1100, 800, 62, '#7a1f2b')
    render('irene_linebot_render.jpg', 'linebot', 1000, 900, ('#2d2a33', '#0f0e12'), 30, -60)
    chart('irene_linebot_tiempos.jpg', 'laps', 1100, 760, 63)
    # --- Pablo Ortega: fabricación digital
    avatar('pablo_avatar.jpg', 'PO', '#f7971e', '#b35a00'); banner('pablo_banner.jpg', 'toolpath', 71)
    blueprint('pablo_cnc_plano.jpg', 'cnc', 'Fresadora CNC 3040', 'P. Ortega', 1200, 900, 72)
    render('pablo_cnc_render.jpg', 'cnc', 1000, 1000, ('#2a2d33', '#0e0f12'), 24, -55)
    kit('pablo_cnc_kit.jpg', 'Kit de la fresadora', [('NEMA 23', 'motor', '#3a3f47', '× 3'), ('Husillo 800 W', 'circle', '#c0c0c0', '× 1'), ('Guías HGR15', 'rod', '#d0d0d0', '× 6'), ('Husillos SFU1605', 'rod', '#9aa0a6', '× 3'), ('Controladora GRBL', 'board', '#1b4d8c', '× 1'), ('Fuente 48 V', 'rect', '#555', '× 1')], 1000, 1250, 73)
    chart('pablo_cnc_precision.jpg', 'accuracy', 1100, 760, 74)
    schematic('pablo_cnc_esquema.jpg', 'Electrónica de la fresadora', [(80, 330, 220, 190, 'DM542 ×3', ['PUL', 'DIR', 'ENA', 'ALM']), (80, 90, 220, 180, 'GRBL 1.1', ['X', 'Y', 'Z'])])
    blueprint('pablo_bici_plano.jpg', 'bike', 'Cuadro de bambú', 'P. Ortega', 1200, 900, 75)
    kit('pablo_bici_kit.jpg', 'Materiales del cuadro', [('Bambú Tonkin', 'rod', '#d9c27a', '× 6'), ('Fibra de lino', 'rect', '#cdbb94', '2 m²'), ('Epoxi', 'circle', '#e8e1c9', '1,5 kg'), ('Pedalier BSA', 'circle', '#9aa0a6', '× 1'), ('Tubo de dirección', 'rod', '#9aa0a6', '× 1'), ('Punteras de acero', 'rect', '#555', '× 2')], 1000, 1250, 76)
    chart('pablo_bici_ensayo.jpg', 'stiffness', 1100, 760, 77)
    route('pablo_bici_ruta.jpg', 'Primera salida · Urdaibai', '64,8 km', '+890 m', '2 h 47 min', 78, color='#d9c27a')
    blueprint('pablo_corexy_plano.jpg', 'corexy', 'Impresora CoreXY', 'P. Ortega', 1200, 1000, 79)
    render('pablo_corexy_render.jpg', 'corexy', 1000, 1100, ('#2a2d33', '#0e0f12'), 18, -50)
    pcb('pablo_corexy_pcb.jpg', [(380, 330, 170, 170, 'STM32H723'), (640, 380, 110, 70, 'TMC5160'), (640, 230, 110, 70, 'TMC2240'), (200, 220, 120, 60, 'USB-C')], 'Placa de control · Klipper', 1100, 800, 80, '#1d1d1d')
    chart('pablo_corexy_calibracion.jpg', 'resonance', 1100, 760, 81)
    # --- Sara Domínguez: telecomunicaciones y montaña
    avatar('sara_avatar.jpg', 'SD', '#8e2de2', '#4a00e0'); banner('sara_banner.jpg', 'topo2', 91)
    blueprint('sara_finger_plano.jpg', 'fingerboard', 'Fingerboard inteligente', 'S. Domínguez', 1200, 900, 92)
    pcb('sara_finger_pcb.jpg', [(380, 330, 160, 160, 'ESP32-S3'), (620, 400, 100, 60, 'HX711'), (620, 300, 100, 60, 'HX711'), (620, 200, 100, 60, 'HX711'), (200, 220, 120, 60, 'BQ24074')], 'Fingerboard · lectura de 4 células', 1100, 800, 93, '#2b1d5c')
    schematic('sara_finger_esquema.jpg', 'Células de carga ×4', [(80, 330, 220, 190, 'HX711 ×4', ['DT1', 'DT2', 'DT3', 'DT4']), (80, 90, 220, 180, 'ESP32-S3', ['GPIO4', 'GPIO5', 'BLE'])])
    chart('sara_finger_fuerza.jpg', 'force', 1100, 760, 94)
    chart('sara_finger_progreso.jpg', 'strength_weeks', 1100, 760, 95)
    blueprint('sara_yagi_plano.jpg', 'yagi', 'Antena Yagi 137 MHz', 'S. Domínguez', 1200, 900, 96)
    chart('sara_noaa_pase.jpg', 'satpass', 1000, 1000, 97)
    waterfall('sara_noaa_espectro.jpg', 'Señal recibida durante el pase', 'Se ve el efecto Doppler: la frecuencia baja al alejarse el satélite')
    noaa('sara_noaa_imagen.jpg')
    route('sara_aneto_ruta.jpg', 'Aneto por el glaciar', '16,4 km', '+1.560 m', '9 h 12 min', 98, color='#6cc4ff')
    stat_card('sara_aneto_resumen.jpg', 'Cima del Aneto · 3.404 m', 'El techo de los Pirineos', [('9:12 h', 'Tiempo total'), ('+1.560 m', 'Desnivel'), ('-8 °C', 'Temperatura en cima'), ('16,4 km', 'Distancia')], accent='#6cc4ff')
    kit('sara_aneto_kit.jpg', 'Material para el glaciar', [('Piolet', 'rod', '#9aa0a6', '× 1'), ('Crampones', 'rect', '#c0c0c0', '× 1'), ('Casco', 'circle', '#ff8a5b', '× 1'), ('Arnés', 'circle', YELLOW, '× 1'), ('Cuerda 30 m', 'circle', '#6cc4ff', '× 1'), ('GPS + baliza', 'board', '#1d1d1d', '× 1')], 1000, 1250, 99)
    chart('sara_aneto_perfil.jpg', 'climb', 1100, 760, 100)
    print('Listo')

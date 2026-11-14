# Solar-farm heatmap feasibility test (2026-11-14). Reuses the Slip Day horizon engine idea.
# One SPICE call per time step (Sun vector in MOON_ME), then vectorised per-pixel az/el.
import numpy as np, time, sys, spiceypy as sp
D = sys.argv[1]  # scratchpad dir with dl/ and kernels/
R = 1737400.0; N = 7600; S = 80.0; OFF = 3799.5
dem = np.fromfile(f'{D}/dl/LDEM_80S_80M.IMG', dtype='<i2').reshape(N, N).astype(np.float32) * 0.5
av = np.fromfile(f'{D}/dl/AVGVISIB_85S_060M_201608.IMG', dtype='<i2').reshape(5058, 5058) * 0.00004
for k in ['naif0012.tls', 'pck00011.tpc', 'moon_pa_de440_200625.bpc', 'moon_de440_250416.tf', 'de440s.bsp']:
    sp.furnsh(f'{D}/kernels/{k}')

def xy(lat, lon):
    r = 2 * R * np.tan(np.pi / 4 + np.radians(lat) / 2)
    return r * np.sin(np.radians(lon)), r * np.cos(np.radians(lon))
def hgt(lat, lon):
    x, y = xy(lat, lon)
    l = np.clip(np.round(OFF - y / S).astype(int), 0, N - 1); s = np.clip(np.round(OFF + x / S).astype(int), 0, N - 1)
    return dem[l, s]
def mazarico(lat, lon):
    x, y = xy(lat, lon); return av[int(round(2528.5 - y / 60.0)), int(round(2528.5 + x / 60.0))]
def xy2ll(x, y):
    r = np.hypot(x, y); lat = -(np.pi / 2 - 2 * np.arctan(r / (2 * R))); return np.degrees(lat), np.degrees(np.arctan2(x, y))

def horizon(lat, lon, h_mast, naz=720, dmax=250e3, step=80.0):
    hs = hgt(lat, lon) + h_mast
    S0 = np.array(sp.latrec(R + hs, np.radians(lon), np.radians(lat)))
    up = S0 / np.linalg.norm(S0); east = np.cross([0, 0, 1], up); east /= np.linalg.norm(east); north = np.cross(up, east)
    az = np.radians(np.arange(naz) * 360 / naz); d = np.arange(step, dmax, step)
    lat1, lon1 = np.radians(lat), np.radians(lon); A, Dd = np.meshgrid(az, d / R, indexing='ij')
    lat2 = np.arcsin(np.sin(lat1) * np.cos(Dd) + np.cos(lat1) * np.sin(Dd) * np.cos(A))
    lon2 = lon1 + np.arctan2(np.sin(A) * np.sin(Dd) * np.cos(lat1), np.cos(Dd) - np.sin(lat1) * np.sin(lat2))
    rr = R + hgt(np.degrees(lat2), np.degrees(lon2))
    P = np.stack([rr * np.cos(lat2) * np.cos(lon2), rr * np.cos(lat2) * np.sin(lon2), rr * np.sin(lat2)], -1) - S0
    el = np.degrees(np.arcsin((P @ up) / np.linalg.norm(P, axis=-1)))
    return el.max(1), S0, up, east, north

# Sun vectors (MOON_ME, from Moon centre; parallax across a few km is negligible at 1 AU) for one year, 2 h steps
t0 = time.time()
ets = np.arange(sp.str2et('2027-01-01'), sp.str2et('2028-01-01'), 7200.0)
SUN = np.array([sp.spkpos('SUN', et, 'MOON_ME', 'CN+S', 'MOON')[0] for et in ets]) * 1000.0
print(f'SPICE year @2h: {len(ets)} steps in {time.time()-t0:.1f}s')
SUNR = 0.2665  # deg, solar angular radius at 1 AU

def site_series(lat, lon, h_mast):
    hz, S0, up, e, n = horizon(lat, lon, h_mast)
    p = SUN - S0
    pn = np.linalg.norm(p, axis=1)
    el = np.degrees(np.arcsin(p @ up / pn)); az = np.degrees(np.arctan2(p @ e, p @ n)) % 360
    hzi = np.interp(az, np.arange(720) * 0.5, hz, period=360)
    # visible fraction of the solar disc (circular-segment area, horizon locally flat)
    x = np.clip((el - hzi) / SUNR, -1, 1)
    frac = (np.arccos(-x) - (-x) * np.sqrt(1 - x * x)) / np.pi
    return el, frac, hz

def longest_dark(frac, thr=0.0, dt_h=2.0):
    dark = frac <= thr; best = cur = 0
    for d in np.concatenate([dark, dark]):  # wrap
        cur = cur + 1 if d else 0; best = max(best, cur)
    return min(best, len(frac)) * dt_h

if __name__ == '__main__':
    # 1) timing + grid: 12x12 points at 500 m spacing around the Shackleton-de Gerlache connecting ridge
    c_lat, c_lon = -89.45, -137.31
    cx, cy = xy(c_lat, c_lon)
    G = 12; sp_m = 500.0
    t0 = time.time(); rows = []
    for i in range(G):
        for j in range(G):
            la, lo = xy2ll(cx + (j - G / 2) * sp_m, cy + (i - G / 2) * sp_m)
            el, f, hz = site_series(la, lo, 2.0)
            rows.append((la, lo, f.mean(), (f > 0.5).mean(), longest_dark(f), mazarico(la, lo)))
    dt = time.time() - t0
    a = np.array(rows)
    print(f'grid {G}x{G} ({G*G} pts) 2 m mast: {dt:.1f}s = {dt/(G*G):.2f}s/pt (horizon + 1 yr @2h)')
    print(f'  mean visible-disc fraction: min {a[:,2].min():.3f} median {np.median(a[:,2]):.3f} max {a[:,2].max():.3f}')
    print(f'  longest dark (h): min {a[:,4].min():.0f} median {np.median(a[:,4]):.0f} max {a[:,4].max():.0f}')
    print(f'  vs Mazarico (disc frac): r={np.corrcoef(a[:,2],a[:,5])[0,1]:.3f} MAE={np.abs(a[:,2]-a[:,5]).mean():.3f} bias={(a[:,2]-a[:,5]).mean():+.3f}'); np.save('grid.npy',a); sys.exit()
    best = a[a[:, 2].argmax()]
    print(f'  best pixel {best[0]:.4f},{best[1]:.3f}: disc frac {best[2]:.3f}, longest dark {best[4]:.0f} h, Mazarico {best[5]:.3f}')
    # 2) mast-height effect at the best pixel and at Mons Mouton (IM-2)
    for name, (la, lo) in {'grid best': (best[0], best[1]), 'Mons Mouton IM-2': (-84.7906, 29.1957),
                           'Shackleton rim': (-89.68, -166.0)}.items():
        for hm in (2.0, 10.0, 20.0):
            el, f, hz = site_series(la, lo, hm)
            P_vert = 1361 * 0.30 * f * np.cos(np.radians(np.clip(el, -5, 90)))  # vertical, az-tracking panel, eta=30%
            print(f'  {name:18s} mast {hm:4.0f} m: disc frac {f.mean():.3f}  longest dark {longest_dark(f):5.0f} h  '
                  f'avg P_vert {P_vert.mean():5.1f} W/m2  annual {P_vert.mean()*8.766:6.0f} kWh/m2  sun el range {el.min():.2f}..{el.max():.2f} deg')

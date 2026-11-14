import spiceypy as sp, numpy as np, sys
K='kernels/'
for k in ['naif0012.tls','pck00011.tpc','moon_pa_de440_200625.bpc','moon_de440_250416.tf','de440s.bsp']: sp.furnsh(K+k)
R=1737.4
def azel(target, lon_e, lat, utc, h_km=0.0, frame='MOON_ME'):
    site = sp.latrec(R+h_km, np.radians(lon_e), np.radians(lat))
    et = sp.str2et(utc)
    # apparent target position as seen from the surface site, in Moon body-fixed frame
    st,_ = sp.spkcpo(target, et, frame, 'OBSERVER', 'CN+S', site, 'MOON', frame)
    pos = np.array(st[:3]); up = site/np.linalg.norm(site)
    east = np.cross([0,0,1], up); east/=np.linalg.norm(east)
    north = np.cross(up, east)
    e,n,u = pos@east, pos@north, pos@up
    return (np.degrees(np.arctan2(e,n))%360, np.degrees(np.arcsin(u/np.linalg.norm(pos))))
for t in ['2027-01-01T00:00','2027-01-01T12:00','2027-01-02T00:00']:
    print(t, 'SUN', np.round(azel('SUN',-129.78,-89.45,t),3), 'EARTH', np.round(azel('EARTH',-129.78,-89.45,t),3))

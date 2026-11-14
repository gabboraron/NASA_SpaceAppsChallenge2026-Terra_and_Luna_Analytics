import numpy as np, time, sys
R=1737400.0; N=7600; S=80.0; OFF=3799.5
dem=np.fromfile('dl/LDEM_80S_80M.IMG',dtype='<i2').reshape(N,N).astype(np.float32)*0.5
def ll2px(lat,lon,sgn):
    r=2*R*np.tan(np.pi/4+np.radians(lat)/2)
    x=r*np.sin(np.radians(lon)); y=r*np.cos(np.radians(lon))
    return OFF+sgn*y/S, OFF+x/S   # line, sample (0-based)
def h(lat,lon,sgn):
    l,s=ll2px(lat,lon,sgn); l=np.clip(np.round(l).astype(int),0,N-1); s=np.clip(np.round(s).astype(int),0,N-1)
    return dem[l,s]
# test convention: Shackleton centre -89.67, 129.78 should be very low; rim ~ -89.45,-129.78? (rim/connecting ridge)
for sgn in (1,-1):
    print('sgn',sgn,'Shackleton floor',h(-89.67,129.78,sgn),'Malapert peak(-86.0,0)?',h(-86.04,2.7,sgn),'deGerlache floor',h(-88.5,-87.1,sgn))

import spiceypy as sp
for k in ['naif0012.tls','pck00011.tpc','moon_pa_de440_200625.bpc','moon_de440_250416.tf','de440s.bsp']: sp.furnsh('kernels/'+k)
av=np.fromfile('dl/AVGVISIB_85S_060M_201608.IMG',dtype='<i2').reshape(5058,5058)*0.00004
def avg_ill(lat,lon):
    r=2*R*np.tan(np.pi/4+np.radians(lat)/2); x=r*np.sin(np.radians(lon)); y=r*np.cos(np.radians(lon))
    return av[int(round(2528.5-y/60.0)), int(round(2528.5+x/60.0))]
def site_vec(lat,lon,hm): return sp.latrec(R+hm, np.radians(lon), np.radians(lat))
def horizon(lat,lon, naz=720, dmax=250e3, step=80.0, h_ant=2.0):
    t0=time.time()
    hs=h(lat,lon,-1)+h_ant
    S0=np.array(site_vec(lat,lon,hs)); up=S0/np.linalg.norm(S0)
    east=np.cross([0,0,1],up); east/=np.linalg.norm(east); north=np.cross(up,east)
    az=np.radians(np.arange(naz)*360/naz); d=np.arange(step,dmax,step)
    # great-circle destination
    lat1,lon1=np.radians(lat),np.radians(lon); ang=d/R
    A,D=np.meshgrid(az,ang,indexing='ij')
    lat2=np.arcsin(np.sin(lat1)*np.cos(D)+np.cos(lat1)*np.sin(D)*np.cos(A))
    lon2=lon1+np.arctan2(np.sin(A)*np.sin(D)*np.cos(lat1),np.cos(D)-np.sin(lat1)*np.sin(lat2))
    ht=h(np.degrees(lat2),np.degrees(lon2),-1)
    rr=R+ht
    P=np.stack([rr*np.cos(lat2)*np.cos(lon2),rr*np.cos(lat2)*np.sin(lon2),rr*np.sin(lat2)],-1)-S0
    el=np.degrees(np.arcsin((P@up)/np.linalg.norm(P,axis=-1)))
    return np.degrees(az), el.max(1), up,east,north, time.time()-t0
def body_azel(body,et,S0,up,east,north):
    st,_=sp.spkcpo(body,et,'MOON_ME','OBSERVER','CN+S',S0/1000.0,'MOON','MOON_ME'); p=np.array(st[:3])
    return np.degrees(np.arctan2(p@east,p@north))%360, np.degrees(np.arcsin((p@up)/np.linalg.norm(p)))
sites={'Shackleton-deGerlache ridge (Site01 approx)':(-89.45,-137.31),'Shackleton rim (Site04 approx)':(-89.68,-166.0),
       'Malapert massif':(-85.99,-0.2),'Mons Mouton (IM-2)':(-84.79,29.20),'Haworth area':(-87.4,-5.0)}
ets=np.arange(sp.str2et('2026-01-01'),sp.str2et('2027-01-01'),3600*2.0)
for name,(la,lo) in sites.items():
    az,hz,up,e,n,dt=horizon(la,lo)
    S0=np.array(site_vec(la,lo,h(la,lo,-1)+2))
    sun=0; earth=0
    for et in ets:
        a,el=body_azel('SUN',et,S0,up,e,n); sun+= el>np.interp(a,az,hz,period=360)
        a,el=body_azel('EARTH',et,S0,up,e,n); earth+= el>np.interp(a,az,hz,period=360)
    print(f"{name:45s} hz_calc {dt:.2f}s  sunlit2026={sun/len(ets):.2f}  earthvis2026={earth/len(ets):.2f}  Mazarico18.6yr_avg={avg_ill(la,lo):.2f}  skyhz_max={hz.max():.1f}")

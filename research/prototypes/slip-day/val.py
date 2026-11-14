exec(open('horizon.py').read().split("sites={")[0])
def avg2(lat,lon,sg):
    r=2*R*np.tan(np.pi/4+np.radians(lat)/2); x=r*np.sin(np.radians(lon)); y=r*np.cos(np.radians(lon))
    return av[int(round(2528.5+sg*y/60.0)), int(round(2528.5+x/60.0))]
rng=np.random.default_rng(1); ets=np.arange(sp.str2et('2026-01-01'),sp.str2et('2027-01-01'),3600*6.0)
mine=[];m1=[];m2=[]
# bias sample toward illuminated places: pick points with high DEM
pts=[]
while len(pts)<40:
    la=-rng.uniform(86,89.8); lo=rng.uniform(-180,180)
    if avg2(la,lo,-1)>0.05 or avg2(la,lo,1)>0.05 or rng.random()<0.3: pts.append((la,lo))
for la,lo in pts:
    az,hz,up,e,n,_=horizon(la,lo); S0=np.array(site_vec(la,lo,h(la,lo,-1)+2))
    f=np.mean([body_azel('SUN',et,S0,up,e,n)[1]>np.interp(body_azel('SUN',et,S0,up,e,n)[0],az,hz,period=360) for et in ets])
    mine.append(f); m1.append(avg2(la,lo,-1)); m2.append(avg2(la,lo,1))
mine,m1,m2=map(np.array,(mine,m1,m2))
print('corr sg-1',np.corrcoef(mine,m1)[0,1],'MAE',np.abs(mine-m1).mean()); print('corr sg+1',np.corrcoef(mine,m2)[0,1],'MAE',np.abs(mine-m2).mean())

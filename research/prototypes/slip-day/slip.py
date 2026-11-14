exec(open('horizon.py').read().split("sites={")[0])
sites={'Mons Mouton (IM-2 actual)':(-84.7906,29.1957),'Malapert area':(-85.99,-0.2),'Shackleton rim pt':(-89.68,-166.0)}
starts=['2027-01-04','2027-02-03','2027-03-05','2027-04-04','2027-05-04','2027-06-03']
for name,(la,lo) in sites.items():
    az,hz,up,e,n,_=horizon(la,lo); S0=np.array(site_vec(la,lo,h(la,lo,-1)+2))
    sky=np.mean(1-np.sin(np.radians(np.clip(hz,0,None))))
    row=[]
    for s in starts:
        et0=sp.str2et(s); ets=et0+np.arange(0,14*86400,3600)
        su=[];ea=[]
        for et in ets:
            a,el=body_azel('SUN',et,S0,up,e,n); su.append(el>np.interp(a,az,hz,period=360))
            a,el=body_azel('EARTH',et,S0,up,e,n); ea.append(el>np.interp(a,az,hz,period=360))
        su=np.array(su); 
        # longest darkness run (h)
        run=m=0
        for v in su: run=0 if v else run+1; m=max(m,run)
        row.append(f"{s[5:]}: sun {su.mean():.0%} earth {np.mean(ea):.0%} maxdark {m}h")
    print(f"{name} | open-sky(hemisphere) {sky:.3f}\n   "+"\n   ".join(row))

import csv,io,subprocess,statistics
B="https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi/data?id=CRaTER&parameters=d1_2_dose_rate&time.min=%sT00:00:00Z&time.max=%sT00:00:00Z"
for n,a,b,qa,qb in [("sep2017","2017-09-04","2017-09-17","2017-08-20","2017-08-30"),("may2024","2024-05-08","2024-05-20","2024-04-20","2024-04-30"),("jun2024","2024-06-08","2024-06-12","2024-04-20","2024-04-30"),("nov2025","2025-11-10","2025-11-19","2025-10-20","2025-10-30"),("jan2012","2012-01-22","2012-02-01","2012-01-01","2012-01-10")]:
    def g(x,y):
        out=subprocess.run(["curl","-s","-m","120",B%(x,y)],capture_output=True,text=True).stdout
        v=[]
        for r in csv.reader(io.StringIO(out)):
            if r and r[0][:2]=='20':
                try:
                    f=float(r[1])
                    if 0<=f<1e5: v.append(f)
                except: pass
        return v
    ev=g(a,b); q=g(qa,qb); qm=statistics.median(q)
    tot=sum(ev)/24.0  # hourly samples, cGy/day -> cGy per hour = /24
    base=qm*len(ev)/24.0
    print(f"{n}: n={len(ev)}h, quiet median {qm:.3f} cGy/d, event integral {tot:.2f} cGy vs quiet-equivalent {base:.2f} cGy -> excess {tot-base:.2f} cGy = {(tot-base)/qm:.0f} quiet-days; peak/quiet {max(ev)/qm:.0f}x")

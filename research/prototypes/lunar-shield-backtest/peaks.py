import csv, io, subprocess, sys
B="https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi/data?id=%s&parameters=%s&time.min=%s&time.max=%s"
evs=[("jan2012","2012-01-22","2012-02-01"),("mar2012","2012-03-07","2012-03-15"),("sep2017","2017-09-04","2017-09-17"),
     ("oct2021","2021-10-28","2021-11-03"),("may2024","2024-05-08","2024-05-20"),("jun2024","2024-06-08","2024-06-12"),("nov2025","2025-11-10","2025-11-19")]
def get(id,par,a,b):
    u=B%(id,par,a+"T00:00:00Z",b+"T00:00:00Z")
    return [r for r in csv.reader(io.StringIO(subprocess.run(["curl","-s","-m","120",u],capture_output=True,text=True).stdout)) if r and r[0][:2]=='20']
def f(x):
    try:
        v=float(x); return v if 0<=v<1e6 else None
    except: return None
for n,a,b in evs:
    rows=get("goesp_part_flux_P5M","P10,P100",a,b)
    p10=[(f(r[1]),r[0]) for r in rows if f(r[1]) is not None]; p100=[(f(r[2]),r[0]) for r in rows if f(r[2]) is not None]
    above=[t for v,t in p10 if v>=10]
    m10=max(p10); m100=max(p100)
    # restart analysis: time from last >=10 crossing; count re-entries
    s=f"{n}: >10MeV peak {m10[0]:.0f} pfu @ {m10[1]}; >100MeV peak {m100[0]:.1f} @ {m100[1]}; >=10pfu {above[0] if above else '-'} .. {above[-1] if above else '-'}"
    # crater
    try:
        cr=get("CRaTER","d1_2_dose_rate",a,b); c=[(f(r[1]),r[0]) for r in cr if f(r[1]) is not None]
        if c: s+=f"; CRaTER d1_2 max {max(c)[0]:.3f} cGy/d @ {max(c)[1]}, min {min(c)[0]:.3f}"
    except Exception as e: s+=f"; CRaTER err {e}"
    print(s, flush=True)

import csv,io,subprocess
from datetime import datetime,timedelta
B="https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi/data?id=goesp_part_flux_P5M&parameters=P10&time.min=%sT00:00:00Z&time.max=%sT00:00:00Z"
evs=[("jan2012","2012-01-20","2012-02-03"),("mar2012","2012-03-04","2012-03-20"),("sep2017","2017-09-02","2017-09-20"),("may2024","2024-05-08","2024-05-22"),("jun2024","2024-06-06","2024-06-14"),("nov2025","2025-11-08","2025-11-20")]
def P(t): return datetime.strptime(t[:19],"%Y-%m-%dT%H:%M:%S")
for n,a,b in evs:
    out=subprocess.run(["curl","-s","-m","120",B%(a,b)],capture_output=True,text=True).stdout
    d=[]
    for r in csv.reader(io.StringIO(out)):
        if r and r[0][:2]=='20':
            try:
                v=float(r[1])
                if 0<=v<1e6: d.append((P(r[0]),v))
            except: pass
    # naive: red when >=10, green as soon as <10 (1 sample). count red->green->red within 24h (premature restarts)
    def sim(enter=10, exitv=10, hold=timedelta(0), nstart=1):
        state='G'; below_since=None; trans=[]; run=0
        for t,v in d:
            run = run+1 if v>=enter else 0
            if state=='G' and run>=nstart: state='R'; trans.append(('R',t)); below_since=None
            elif state=='R':
                if v<exitv:
                    below_since=below_since or t
                    if t-below_since>=hold: state='G'; trans.append(('G',t))
                else: below_since=None
        greens=[t for s,t in trans if s=='G']; reds=[t for s,t in trans if s=='R']
        prem=sum(1 for g in greens if any(timedelta(0)<r-g<=timedelta(hours=24) for r in reds))
        red_h=0; cur=None
        for s,t in trans:
            if s=='R': cur=t
            elif cur: red_h+=(t-cur).total_seconds()/3600; cur=None
        return len(reds),prem,red_h,(greens[-1] if greens else None)
    for lab,args in [("swpc-like 3pts>=10 / exit<10",(10,10,timedelta(0),3)),("exit<10 held 1h",(10,10,timedelta(hours=1),3)),("hyst 10/5 held 6h",(10,5,timedelta(hours=6),3)),("hyst 10/5 held 12h",(10,5,timedelta(hours=12),3))]:
        a=sim(*args); print(f"{n} | {lab}: red_entries={a[0]} premature_restarts_24h={a[1]} red_hours={a[2]:.0f} final_green={a[3]}")

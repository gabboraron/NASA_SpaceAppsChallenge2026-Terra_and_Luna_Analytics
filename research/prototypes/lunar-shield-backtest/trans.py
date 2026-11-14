import csv,io,subprocess
from datetime import datetime,timedelta
B="https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi/data?id=goesp_part_flux_P5M&parameters=P10&time.min=%sT00:00:00Z&time.max=%sT00:00:00Z"
for n,a,b in [("nov2025","2025-11-08","2025-11-20"),("may2024","2024-05-08","2024-05-22")]:
    out=subprocess.run(["curl","-s","-m","120",B%(a,b)],capture_output=True,text=True).stdout
    d=[]
    for r in csv.reader(io.StringIO(out)):
        if r and r[0][:2]=='20':
            try:
                v=float(r[1])
                if 0<=v<1e6: d.append((datetime.strptime(r[0][:19],"%Y-%m-%dT%H:%M:%S"),v))
            except: pass
    for lab,(en,ex,hold) in [("1h hold",(10,10,1)),("hyst 10/5 6h",(10,5,6)),("hyst 10/5 12h",(10,5,12))]:
        st='G';bs=None;run=0;tr=[]
        for t,v in d:
            run=run+1 if v>=en else 0
            if st=='G' and run>=3: st='R';tr.append(('RED',t.strftime('%d %H:%M')));bs=None
            elif st=='R':
                if v<ex:
                    bs=bs or t
                    if t-bs>=timedelta(hours=hold): st='G';tr.append(('GREEN',t.strftime('%d %H:%M')))
                else: bs=None
        print(n,lab,tr)

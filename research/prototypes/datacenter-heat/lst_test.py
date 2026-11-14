# Landsat C2 L2 summer LST: site vs ring, Stargate Abilene area (Planetary Computer STAC)
import pystac_client, planetary_computer as pc, rasterio, numpy as np, sys
from rasterio.warp import transform_bounds, transform
from rasterio.windows import from_bounds
lat, lon = 32.494, -99.801
cat = pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1", modifier=pc.sign_inplace)
bbox=[lon-0.06,lat-0.06,lon+0.06,lat+0.06]
def scenes(y):
    s=cat.search(collections=["landsat-c2-l2"],bbox=bbox,datetime=f"{y}-06-01/{y}-08-31",query={"eo:cloud_cover":{"lt":10},"platform":{"in":["landsat-8","landsat-9"]}})
    return list(s.items())
from rasterio.vrt import WarpedVRT
from rasterio.enums import Resampling
from affine import Affine
CRS="EPSG:32614"; b=transform_bounds("EPSG:4326",CRS,*bbox)
T=Affine(30,0,round(b[0]),0,-30,round(b[3])); W_=int((b[2]-b[0])/30); H_=int((b[3]-b[1])/30)
def read(item, band):
    with rasterio.open(item.assets[band].href) as ds:
        with WarpedVRT(ds,crs=CRS,transform=T,width=W_,height=H_,resampling=Resampling.nearest) as v:
            a=v.read(1).astype(float)
    return a,T,CRS
res={}
for y in [2022,2023,2025,2026]:
    its=scenes(y); print(y,len(its),"scenes",file=sys.stderr)
    stack=[];nir=[]
    for it in its[:8]:
        a,t,crs=read(it,"lwir11"); q,_,_=read(it,"qa_pixel")
        lst=a*0.00341802+149.0-273.15
        bad=(q.astype(int)&(1<<3|1<<4|1<<1))>0
        lst[bad|(a==0)]=np.nan; stack.append(lst)
        r,_,_=read(it,"red"); n,_,_=read(it,"nir08"); nir.append((n-r)/(n+r+1e-9))
    res[y]=(np.nanmedian(np.array(stack),0),np.nanmedian(np.array(nir),0),t,crs,len(stack))
# locate campus = largest NDVI drop 2022->2026 near road
n22=res[2022][1]; n26=res[2026][1]; d=n26-n22
H,W=d.shape; t=res[2026][2]
from scipy.ndimage import uniform_filter
ds=uniform_filter(np.nan_to_num(d),15)
i,j=np.unravel_index(np.argmin(ds),ds.shape)
x,y=t*(j+0.5,i+0.5); lo,la=transform(res[2026][3],"EPSG:4326",[x],[y])
print(f"campus centre (max NDVI loss, 450 m smoothing): {la[0]:.4f}, {lo[0]:.4f}; dNDVI={ds[i,j]:.3f}")
yy,xx=np.mgrid[0:H,0:W]; r=np.hypot(yy-i,xx-j)*30
site=r<400; ring=(r>3000)&(r<5000)
for yr in [2022,2023,2025,2026]:
    L=res[yr][0]
    print(yr, "n=",res[yr][4], f"site {np.nanmean(L[site]):.2f} C  ring {np.nanmean(L[ring]):.2f} C  delta {np.nanmean(L[site])-np.nanmean(L[ring]):+.2f} C  NDVI site {np.nanmean(res[yr][1][site]):.2f}")

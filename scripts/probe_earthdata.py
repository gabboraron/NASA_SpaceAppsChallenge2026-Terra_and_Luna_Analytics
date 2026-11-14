"""Prove remote HLS and SMAP access at one Nyírbátor location."""

import math
from contextlib import closing
from pathlib import Path

import earthaccess
import h5py
import numpy as np
import rasterio
from dotenv import load_dotenv
from pyproj import Transformer
from rasterio.windows import Window

LON, LAT = 22.13, 47.84
JUNE = ("2024-06-01", "2024-06-30")
POINT = (LON, LAT)


def hls_probe() -> None:
    """Read valid B03 pixels from a small window around the target."""
    granules = earthaccess.search_data(
        short_name="HLSS30", version="2.0", point=POINT, temporal=JUNE
    )
    for granule in granules:
        for url in granule.data_links():
            if not url.split("?", 1)[0].endswith(".B03.tif"):
                continue
            (remote,) = earthaccess.open([url])
            with closing(remote), rasterio.open(remote) as band:
                project = Transformer.from_crs("EPSG:4326", band.crs, always_xy=True)
                row, col = band.index(*project.transform(LON, LAT))
                if not (1 <= row < band.height - 1 and 1 <= col < band.width - 1):
                    continue
                pixels = band.read(
                    1, window=Window(col - 1, row - 1, 3, 3), masked=True
                ).compressed()
                if pixels.size:
                    print(f"HLS source: {url.split('?')[0]}")
                    print(f"B03 row={row}, col={col}, raw pixels={pixels.tolist()}")
                    return
    raise RuntimeError(f"No usable B03 window in {len(granules)} HLS granules")


def smap_probe() -> None:
    """Read one root-zone soil-moisture value from the global 9 km grid."""
    granules = earthaccess.search_data(
        short_name="SPL4SMGP",
        temporal=("2024-06-12T12:00:00Z", "2024-06-12T15:00:00Z"),
        count=3,
    )
    # Global 9 km EASE-Grid 2.0 outer edges and pixel spacing, in metres.
    x, y = Transformer.from_crs("EPSG:4326", "EPSG:6933", always_xy=True).transform(
        LON, LAT
    )
    col = math.floor((x + 17_367_530.445161) / 9_008.055210)
    row = math.floor((7_314_540.830638 - y) / 9_008.055210)

    for granule in granules:
        urls = [u for u in granule.data_links() if u.split("?")[0].endswith(".h5")]
        for url in urls:
            (remote,) = earthaccess.open([url])
            with closing(remote), h5py.File(remote, "r") as product:
                moisture = product["Geophysical_Data/sm_rootzone"]
                if moisture.shape != (1624, 3856):
                    raise RuntimeError(f"Unexpected SMAP grid: {moisture.shape}")
                value = float(moisture[row, col])
                fill = moisture.attrs.get("_FillValue")
                if not np.isfinite(value) or (fill is not None and value == float(fill)):
                    continue
                print(f"SMAP source: {url.split('?')[0]}")
                print(f"sm_rootzone row={row}, col={col}, value={value} m³/m³")
                return
    raise RuntimeError(f"No usable SMAP cell in {len(granules)} granules")


if __name__ == "__main__":
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    earthaccess.login(strategy="environment")
    failures = []
    for name, probe in (("HLS", hls_probe), ("SMAP", smap_probe)):
        try:
            probe()
        except Exception as exc:
            failures.append(name)
            print(f"{name} failed: {type(exc).__name__}: {exc}")
    if failures:
        raise SystemExit(f"Access proof incomplete: {', '.join(failures)}")
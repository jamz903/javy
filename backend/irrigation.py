# irrigation_router.py
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import date, datetime, timedelta
import os
import httpx
import numpy as np
import math
from rasterio.io import MemoryFile
import base64
from dotenv import load_dotenv
import json

router = APIRouter(prefix="/irrigation", tags=["irrigation"])

# Config / endpoints (adjust if you use a custom Sentinel Hub instance)
load_dotenv()
SENTINEL_HUB_OAUTH = os.getenv("SENTINEL_HUB_OAUTH", "https://services.sentinel-hub.com/oauth/token")
SENTINEL_HUB_PROCESS = os.getenv("SENTINEL_HUB_PROCESS", "https://services.sentinel-hub.com/api/v1/process")
SENTINEL_CLIENT_ID = os.getenv("SENTINEL_HUB_CLIENT_ID")
SENTINEL_CLIENT_SECRET = os.getenv("SENTINEL_HUB_CLIENT_SECRET")

class BoundingBox(BaseModel):
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float

async def get_sentinel_token() -> str:
    if not SENTINEL_CLIENT_ID or not SENTINEL_CLIENT_SECRET:
        raise RuntimeError("Sentinel Hub credentials not set in environment.")
    data = {
        "grant_type": "client_credentials",
        "client_id": SENTINEL_CLIENT_ID,
        "client_secret": SENTINEL_CLIENT_SECRET
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(SENTINEL_HUB_OAUTH, data=data)
        r.raise_for_status()
        return r.json()["access_token"]

def bbox_to_geojson_polygon(bbox: BoundingBox) -> Dict[str, Any]:
    return {
        "type": "Polygon",
        "coordinates": [[
            [bbox.min_lon, bbox.min_lat],
            [bbox.max_lon, bbox.min_lat],
            [bbox.max_lon, bbox.max_lat],
            [bbox.min_lon, bbox.max_lat],
            [bbox.min_lon, bbox.min_lat]
        ]]
    }

async def post_process_api(evalscript: str, bbox: BoundingBox, from_time: str, to_time: str,
                           width: int = 512, height: int = 512, collection: str = "sentinel-1-grd"):
    """
    Generic Process API call returning numpy array (bands, h, w) and raster profile.
    Logs full payload and headers for debugging.
    """
    token = await get_sentinel_token()
    payload = {
        "input": {
            "bounds": {"geometry": bbox_to_geojson_polygon(bbox)},
            "data": [{"type": collection, "dataFilter": {"timeRange": {"from": from_time, "to": to_time}}}]
        },
        "output": {
            "width": width,
            "height": height,
            "responses": [{"identifier": "default", "format": {"type": "image/tiff"}}]
        },
        "evalscript": evalscript
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(SENTINEL_HUB_PROCESS, json=payload, headers=headers)
            print(f"Response status: {r.status_code}")
            if r.status_code != 200:
                print(f"Response body: {r.text}")
            r.raise_for_status()
            content = r.content
    except httpx.HTTPStatusError as e:
        print(f"HTTP error: {e.response.status_code} - {e.response.text}")
        raise

    with MemoryFile(content) as mem:
        with mem.open() as ds:
            arr = ds.read().astype(np.float32)
            prof = ds.profile
    return arr, prof

# -----------------------
# Evalscript: Sentinel-1 GRD -> return VV and VH as linear backscatter
# -----------------------
S1_EVALSCRIPT = """
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["VV", "VH", "dataMask"] }],  // removed units
    output: { bands: 2, sampleType: "FLOAT32" }
  };
}
function evaluatePixel(sample) {
  return [sample.VV, sample.VH];
}
"""

# -----------------------
# Evalscript: Sentinel-2 -> return Green (B03) and NIR (B08) reflectance
# -----------------------
S2_EVALSCRIPT = """
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B03","B08","dataMask"], units: "REFLECTANCE" }],
    output: { bands: 2, sampleType: "FLOAT32" }
  };
}
function evaluatePixel(sample) {
  return [sample.B03, sample.B08];
}
"""

@router.post("/detect")
async def detect_irrigation(
    bbox: BoundingBox,
    ref_start: date = Query(..., description="Reference period start date"),
    ref_end: date = Query(..., description="Reference period end date"),
    recent_start: date = Query(..., description="Recent period start date"),
    recent_end: date = Query(..., description="Recent period end date"),
    s1_collection: str = Query("sentinel-1-grd"),
    s2_collection: str = Query("sentinel-2-l2a"),
    width: int = Query(512, description="Raster width in pixels"),
    height: int = Query(512, description="Raster height in pixels"),
    ndwi_threshold: float = Query(0.05, description="Min NDWI increase to flag irrigation (tuneable)"),
    vv_db_threshold: float = Query(1.0, description="Min VV dB decrease magnitude to flag irrigation (tuneable)"),
    return_mask: bool = Query(False, description="Return fused mask as base64 GeoTIFF (can be large)")
) -> Dict[str, Any]:
    """
    SAR+optical irrigation detection:
      * Median composite for reference and recent windows for S1 (VV,VH) and S2 (Green,NIR)
      * Compute NDWI change (recent - ref)
      * Compute VV dB change (recent - ref) [dB units]
      * Heuristic fusion: irrigation candidates = (delta_ndwi > ndwi_threshold) & (delta_vv_db < -vv_db_threshold)
      * Returns counts, estimated area (km2), fraction confidence and optional mask (base64 GeoTIFF)
    """
    # build ISO times
    ref_from = datetime.combine(ref_start, datetime.min.time()).isoformat() + "Z"
    ref_to = datetime.combine(ref_end, datetime.max.time()).isoformat() + "Z"
    recent_from = datetime.combine(recent_start, datetime.min.time()).isoformat() + "Z"
    recent_to = datetime.combine(recent_end, datetime.max.time()).isoformat() + "Z"

    # Retrieve S1 (VV,VH) composites for reference and recent
    try:
        s1_ref_arr, s1_ref_prof = await post_process_api(S1_EVALSCRIPT, bbox, ref_from, ref_to, width=width, height=height, collection=s1_collection)
        s1_rec_arr, s1_rec_prof = await post_process_api(S1_EVALSCRIPT, bbox, recent_from, recent_to, width=width, height=height, collection=s1_collection)
        # s1 arrays shape: (2, h, w) -> [VV, VH] as linear values (or dB depending on SH)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Sentinel-1 Process API error: {str(e)}")

    # Retrieve S2 (Green,NIR)
    try:
        s2_ref_arr, s2_ref_prof = await post_process_api(S2_EVALSCRIPT, bbox, ref_from, ref_to, width=width, height=height, collection=s2_collection)
        s2_rec_arr, s2_rec_prof = await post_process_api(S2_EVALSCRIPT, bbox, recent_from, recent_to, width=width, height=height, collection=s2_collection)
        # s2 arrays shape: (2, h, w) -> [Green, NIR] reflectance
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Sentinel-2 Process API error: {str(e)}")

    # Unpack arrays
    vv_ref = s1_ref_arr[0]
    vh_ref = s1_ref_arr[1]
    vv_rec = s1_rec_arr[0]
    vh_rec = s1_rec_arr[1]

    green_ref = s2_ref_arr[0]
    nir_ref = s2_ref_arr[1]
    green_rec = s2_rec_arr[0]
    nir_rec = s2_rec_arr[1]

    # Compute NDWI = (Green - NIR) / (Green + NIR)
    def safe_ndwi(green, nir):
        denom = green + nir
        return np.where(denom == 0, np.nan, (green - nir) / (denom + 1e-9))

    ndwi_ref = safe_ndwi(green_ref, nir_ref)
    ndwi_rec = safe_ndwi(green_rec, nir_rec)
    delta_ndwi = ndwi_rec - ndwi_ref

    # Convert VV to dB if values appear linear (heuristic: if median > 1e-2, assume linear)
    def to_db(arr):
        # avoid log of zeros; small floor
        arr_clipped = np.where(arr <= 0, 1e-6, arr)
        # convert linear to dB: 10 * log10(arr)
        return 10.0 * np.log10(arr_clipped)

    # Heuristic: decide if the S1 values are linear or already in dB.
    # If large majority of values are > 1.0, assume they are linear.
    s1_median = float(np.nanmedian(np.abs(vv_ref)))
    if s1_median > 1.0:
        vv_ref_db = to_db(vv_ref)
        vv_rec_db = to_db(vv_rec)
    else:
        # already small values, treat as linear and convert
        vv_ref_db = to_db(vv_ref)
        vv_rec_db = to_db(vv_rec)

    delta_vv_db = vv_rec_db - vv_ref_db  # positive = increase in dB, negative = decrease in dB

    # Fusion heuristic: irrigation candidate if delta_ndwi increases AND vv dB decreases past threshold
    ndwi_mask = (delta_ndwi > ndwi_threshold)
    vv_mask = (delta_vv_db < -abs(vv_db_threshold))
    fused_mask = np.logical_and(ndwi_mask, vv_mask)

    # Count and area estimation
    h, w = fused_mask.shape
    pixels_count = int(np.count_nonzero(fused_mask))
    avg_lat = (bbox.min_lat + bbox.max_lat) / 2.0
    deg_to_km = 111.32
    width_km = abs(bbox.max_lon - bbox.min_lon) * deg_to_km * math.cos(math.radians(avg_lat))
    height_km = abs(bbox.max_lat - bbox.min_lat) * deg_to_km
    area_km2 = max(1e-9, width_km * height_km)
    pixel_area_km2 = area_km2 / (h * w)
    pixels_area_km2 = pixels_count * pixel_area_km2

    # Confidence: fraction of ndwi_mask pixels that also meet vv_mask
    ndwi_candidates = np.count_nonzero(ndwi_mask)
    confidence_fraction = float(pixels_count / ndwi_candidates) if ndwi_candidates > 0 else 0.0

    response: Dict[str, Any] = {
        "pixels_detected": pixels_count,
        "area_detected_km2": round(float(pixels_area_km2), 6),
        "pixel_area_km2": pixel_area_km2,
        "delta_ndwi_stats": {
            "mean": float(np.nanmean(delta_ndwi)),
            "std": float(np.nanstd(delta_ndwi)),
            "max": float(np.nanmax(delta_ndwi)),
            "min": float(np.nanmin(delta_ndwi))
        },
        "delta_vv_db_stats": {
            "mean": float(np.nanmean(delta_vv_db)),
            "std": float(np.nanstd(delta_vv_db)),
            "max": float(np.nanmax(delta_vv_db)),
            "min": float(np.nanmin(delta_vv_db))
        },
        "ndwi_threshold": ndwi_threshold,
        "vv_db_threshold": vv_db_threshold,
        "confidence_fraction": confidence_fraction,
        "resolution": {"width": w, "height": h}
    }

    if return_mask:
        # Build a simple single-band GeoTIFF in memory and base64 encode it
        # Use a minimal geotransform-less memory GeoTIFF; users who need georeferencing should request full-resolution with coordinates
        from rasterio.enums import Resampling
        import rasterio
        from rasterio.transform import from_bounds
        transform = from_bounds(bbox.min_lon, bbox.min_lat, bbox.max_lon, bbox.max_lat, w, h)
        profile = {
            "driver": "GTiff",
            "dtype": "uint8",
            "count": 1,
            "width": w,
            "height": h,
            "crs": "EPSG:4326",
            "transform": transform,
            "compress": "lzw"
        }
        mask_uint8 = (fused_mask.astype(np.uint8) * 255)
        with MemoryFile() as memfile:
            with memfile.open(**profile) as dst:
                dst.write(mask_uint8, 1)
            mem_bytes = memfile.read()
        response["mask_base64_geotiff"] = base64.b64encode(mem_bytes).decode("ascii")

    return response

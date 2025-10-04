from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict
from datetime import date, timedelta, datetime
import os, httpx, math, numpy as np
import rasterio
from rasterio.io import MemoryFile
from dotenv import load_dotenv
from sentinelhub import DataCollection
import ee
from gee_urban_heat import get_landsat_urban_heat_gee

try:
    ee.Initialize()
except Exception as e:
    print(f"Earth Engine initialization error: {e}")
    print("Run 'earthengine authenticate' in terminal first")

router = APIRouter(prefix="/satellite", tags=["satellite"])

# --- Sentinel Hub config ---
load_dotenv()
SENTINEL_HUB_OAUTH = os.getenv("SENTINEL_HUB_OAUTH", "https://services.sentinel-hub.com/oauth/token")
SENTINEL_HUB_PROCESS = os.getenv("SENTINEL_HUB_PROCESS", "https://services.sentinel-hub.com/api/v1/process")
SENTINEL_CLIENT_ID = os.getenv("SENTINEL_HUB_CLIENT_ID")
SENTINEL_CLIENT_SECRET = os.getenv("SENTINEL_HUB_CLIENT_SECRET")


# === Shared helpers ===
class BoundingBox(BaseModel):
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float

async def get_sentinel_token() -> str:
    if not SENTINEL_CLIENT_ID or not SENTINEL_CLIENT_SECRET:
        raise RuntimeError("Sentinel Hub credentials missing.")
    data = {
        "grant_type": "client_credentials",
        "client_id": SENTINEL_CLIENT_ID,
        "client_secret": SENTINEL_CLIENT_SECRET
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(SENTINEL_HUB_OAUTH, data=data)
        r.raise_for_status()
        return r.json()["access_token"]

def bbox_to_geojson_polygon(bbox: BoundingBox) -> Dict:
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
                           width: int = 512, height: int = 512, collection: str = "sentinel-2-l2a",
                           max_cloud_coverage: int = 30):
    """Generic Process API caller -> returns numpy array"""
    token = await get_sentinel_token()
    payload = {
        "input": {
            "bounds": {"geometry": bbox_to_geojson_polygon(bbox)},
            "data": [{
                "type": collection,
                "dataFilter": {
                    "timeRange": {"from": from_time, "to": to_time},
                    "maxCloudCoverage": max_cloud_coverage
                },
                "processing": {
                    "mosaickingOrder": "leastCC"  # Use least cloudy scenes
                }
            }]
        },
        "output": {
            "width": width,
            "height": height,
            "responses": [{"identifier": "default", "format": {"type": "image/tiff"}}]
        },
        "evalscript": evalscript
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=120) as client:
        try:
            r = await client.post(SENTINEL_HUB_PROCESS, json=payload, headers=headers)
            r.raise_for_status()
            content = r.content
        except httpx.HTTPStatusError as e:
            # Log the error details
            error_detail = e.response.text if hasattr(e.response, 'text') else str(e)
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentinel Hub API error: {error_detail}"
            )
    with MemoryFile(content) as mem:
        with mem.open() as ds:
            arr = ds.read().astype(np.float32)
            prof = ds.profile
    return arr, prof

# -------------------------
# 🌳 1. GLAD-style deforestation (NDVI/NBR differencing)
# -------------------------
@router.post("/deforestation")
async def deforestation_monitor(
    bbox: BoundingBox,
    ref_start: date = Query(...),
    ref_end: date = Query(...),
    recent_start: date = Query(...),
    recent_end: date = Query(...),
    collection: str = "sentinel-2-l2a",
    width: int = 512,
    height: int = 512,
    max_cloud_coverage: int = 30
):
    """
    Detects deforestation by comparing NDVI and NBR between two time periods.
    Uses cloud masking and quality filtering to ensure accurate results.
    """
    evalscript = """
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B04", "B08", "B12", "SCL", "dataMask"],
      units: ["REFLECTANCE", "REFLECTANCE", "REFLECTANCE", "DN", "DN"]
    }],
    output: [{ id: "default", bands: 3, sampleType: "FLOAT32" }]
  };
}

function evaluatePixel(s) {
  // SCL (Scene Classification Layer) values:
  // 3=cloud shadows, 8=cloud medium probability, 9=cloud high probability, 10=thin cirrus, 11=snow
  let isCloud = (s.SCL == 3 || s.SCL == 8 || s.SCL == 9 || s.SCL == 10 || s.SCL == 11);

  if (isCloud || s.dataMask == 0) {
    return [NaN, NaN, 0];
  }

  let ndvi = (s.B08 - s.B04) / (s.B08 + s.B04 + 1e-6);
  let nbr = (s.B08 - s.B12) / (s.B08 + s.B12 + 1e-6);

  return [ndvi, nbr, s.dataMask];
}

    """
    ref_from = f"{ref_start}T00:00:00Z"
    ref_to = f"{ref_end}T23:59:59Z"
    recent_from = f"{recent_start}T00:00:00Z"
    recent_to = f"{recent_end}T23:59:59Z"

    # Fetch data for both periods
    ref_arr, _ = await post_process_api(evalscript, bbox, ref_from, ref_to, width, height, collection, max_cloud_coverage)
    recent_arr, _ = await post_process_api(evalscript, bbox, recent_from, recent_to, width, height, collection, max_cloud_coverage)

    # Extract bands
    ref_ndvi, ref_nbr, ref_mask = ref_arr[0], ref_arr[1], ref_arr[2]
    rec_ndvi, rec_nbr, rec_mask = recent_arr[0], recent_arr[1], recent_arr[2]

    # Create quality masks
    # Valid NDVI range: -1 to 1, but we focus on vegetated areas (NDVI > 0.2)
    ref_valid = (~np.isnan(ref_ndvi)) & (ref_ndvi > 0.2) & (ref_ndvi < 1.0) & (ref_mask > 0)
    rec_valid = (~np.isnan(rec_ndvi)) & (rec_ndvi > -1.0) & (rec_ndvi < 1.0) & (rec_mask > 0)
    
    # Both periods must have valid data
    valid_mask = ref_valid & rec_valid

    # Calculate differences only for valid pixels
    dndvi = np.where(valid_mask, ref_ndvi - rec_ndvi, np.nan)
    dnbr = np.where(valid_mask, ref_nbr - rec_nbr, np.nan)

    # Deforestation detection thresholds
    # dNDVI > 0.3: significant vegetation loss
    # dNBR > 0.2: significant change in burn ratio (vegetation disturbance)
    ndvi_thresh, nbr_thresh = 0.3, 0.2
    
    # FIXED: Use AND instead of OR - both conditions must be met
    deforestation_mask = valid_mask & (dndvi > ndvi_thresh) & (dnbr > nbr_thresh)
    deforested_pixels = int(np.count_nonzero(deforestation_mask))

    # Calculate area
    h, w = deforestation_mask.shape
    avg_lat = (bbox.min_lat + bbox.max_lat) / 2
    deg2km = 111.32
    width_km = abs(bbox.max_lon - bbox.min_lon) * deg2km * math.cos(math.radians(avg_lat))
    height_km = abs(bbox.max_lat - bbox.min_lat) * deg2km
    area_km2 = width_km * height_km
    pixel_area_km2 = area_km2 / (h * w)
    deforested_area = deforested_pixels * pixel_area_km2

    # Calculate statistics only on valid pixels
    valid_pixels_count = int(np.count_nonzero(valid_mask))
    
    return {
        "deforested_pixels": deforested_pixels,
        "deforested_area_km2": round(float(deforested_area), 4),
        "ndvi_mean_ref": float(np.nanmean(ref_ndvi[ref_valid])) if np.any(ref_valid) else 0.0,
        "ndvi_mean_recent": float(np.nanmean(rec_ndvi[rec_valid])) if np.any(rec_valid) else 0.0,
        "dnbr_mean": float(np.nanmean(dnbr[valid_mask])) if np.any(valid_mask) else 0.0,
        "valid_pixels": valid_pixels_count,
        "valid_area_km2": round(float(valid_pixels_count * pixel_area_km2), 4),
        "thresholds": {"dNDVI": ndvi_thresh, "dNBR": nbr_thresh},
        "data_quality": {
            "ref_valid_pixels": int(np.count_nonzero(ref_valid)),
            "recent_valid_pixels": int(np.count_nonzero(rec_valid)),
            "cloud_free_overlap": valid_pixels_count
        }
    }


@router.post("/urban_heat")
async def urban_heat_lst(
    bbox: BoundingBox,
    scene_date: date = Query(...),
    width: int = 512,
    height: int = 512
):
    """
    Calculate Urban Heat Island effect using Landsat 8/9 via Google Earth Engine
    """
    # Convert BoundingBox to dict
    bbox_dict = {
        'min_lon': bbox.min_lon,
        'min_lat': bbox.min_lat,
        'max_lon': bbox.max_lon,
        'max_lat': bbox.max_lat
    }
    
    return await get_landsat_urban_heat_gee(bbox_dict, scene_date, days_before=30)
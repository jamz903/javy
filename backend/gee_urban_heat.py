"""
Google Earth Engine Urban Heat Island Analysis
Add this to your scraper.py or create as a separate module
"""

import ee
import numpy as np
from datetime import datetime, timedelta, date
from typing import Tuple
from fastapi import HTTPException
from irrigation import BoundingBox
from fastapi import APIRouter, Query

# Initialize Earth Engine (call this once when your app starts)
try:
    ee.Initialize()
except Exception as e:
    print(f"Earth Engine initialization error: {e}")
    print("Run 'earthengine authenticate' in terminal first")


def bbox_to_ee_geometry(bbox: dict) -> ee.Geometry.Rectangle:
    """Convert BoundingBox to Earth Engine Geometry"""
    return ee.Geometry.Rectangle([
        bbox['min_lon'],
        bbox['min_lat'],
        bbox['max_lon'],
        bbox['max_lat']
    ])


def calculate_landsat_lst(image: ee.Image) -> ee.Image:
    """
    Calculate Land Surface Temperature from Landsat 8/9
    Using brightness temperature from Band 10
    """
    # Get thermal band (ST_B10 is surface temperature in Kelvin * 0.00341802 + 149.0)
    # For Collection 2 Level 2, use ST_B10 directly (already in Kelvin)
    lst_kelvin = image.select('ST_B10').multiply(0.00341802).add(149.0)
    
    # Convert to Celsius
    lst_celsius = lst_kelvin.subtract(273.15)
    
    # Calculate NDVI for vegetation analysis
    nir = image.select('SR_B5')
    red = image.select('SR_B4')
    ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
    
    return image.addBands([lst_celsius.rename('LST'), ndvi])


async def get_landsat_urban_heat_gee(
    bbox: dict,
    scene_date: date,
    days_before: int = 30
) -> dict:
    """
    Get urban heat data from Landsat using Google Earth Engine
    
    Args:
        bbox: Dictionary with min_lon, min_lat, max_lon, max_lat
        scene_date: Target date
        days_before: Number of days to look back for imagery
    """
    try:
        # Define region of interest
        roi = bbox_to_ee_geometry(bbox)
        
        # Define date range
        end_date = scene_date.strftime('%Y-%m-%d')
        start_date = (scene_date - timedelta(days=days_before)).strftime('%Y-%m-%d')
        
        # Load Landsat 8/9 Collection 2 Level 2
        landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2') \
            .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')) \
            .filterBounds(roi) \
            .filterDate(start_date, end_date) \
            .filter(ee.Filter.lt('CLOUD_COVER', 20))
        
        # Check if we have any images
        count = landsat.size().getInfo()
        if count == 0:
            raise ValueError(
                f"No cloud-free Landsat images found for this location "
                f"between {start_date} and {end_date}"
            )
        
        # Get the most recent image and calculate LST
        image = landsat.sort('system:time_start', False).first()
        image_with_lst = calculate_landsat_lst(image)
        
        # Get image date
        image_date = datetime.fromtimestamp(
            image.get('system:time_start').getInfo() / 1000
        ).strftime('%Y-%m-%d')
        
        # Sample the region to get statistics
        # Reduce region to get mean values
        stats = image_with_lst.select(['LST', 'NDVI']).reduceRegion(
            reducer=ee.Reducer.mean().combine(
                ee.Reducer.stdDev(), '', True
            ).combine(
                ee.Reducer.minMax(), '', True
            ).combine(
                ee.Reducer.count(), '', True
            ),
            geometry=roi,
            scale=30,  # 30m resolution for Landsat
            maxPixels=1e9
        ).getInfo()
        
        # Extract statistics
        mean_temp = stats.get('LST_mean')
        std_temp = stats.get('LST_stdDev')
        min_temp = stats.get('LST_min')
        max_temp = stats.get('LST_max')
        mean_ndvi = stats.get('NDVI_mean')
        valid_pixels = stats.get('LST_count', 0)
        
        # Check for valid data
        if mean_temp is None or np.isnan(mean_temp):
            raise ValueError("Unable to compute valid temperature statistics")
        
        # Calculate urban heat island metrics
        heat_threshold = mean_temp + std_temp
        
        # Get pixel-level data to calculate heat fraction
        # Sample at higher resolution for better accuracy
        sample = image_with_lst.select('LST').sampleRectangle(
            region=roi,
            defaultValue=0
        )
        
        lst_array = np.array(sample.get('LST').getInfo())
        valid_mask = ~np.isnan(lst_array) & (lst_array != 0)
        heat_pixels = np.sum(lst_array[valid_mask] > heat_threshold)
        total_valid = np.sum(valid_mask)
        heat_fraction = float(heat_pixels / total_valid) if total_valid > 0 else 0.0
        
        # Calculate area statistics with safety checks
        bbox_width = abs(bbox['max_lon'] - bbox['min_lon'])
        bbox_height = abs(bbox['max_lat'] - bbox['min_lat'])
        bbox_area = bbox_width * bbox_height
        
        # Calculate estimated total pixels with safety check
        pixel_area = 30 * 30  # 30m x 30m Landsat pixels in m²
        # Convert degrees to meters (approximate)
        meters_per_degree = 111000  # at equator
        bbox_area_m2 = bbox_area * meters_per_degree * meters_per_degree
        estimated_total_pixels = max(1, int(bbox_area_m2 / pixel_area))  # Ensure at least 1
        
        # Calculate coverage percentage with safety check
        coverage_percentage = round(
            (valid_pixels / estimated_total_pixels) * 100, 1
        ) if estimated_total_pixels > 0 else 0.0
        
        # Cap at 100% (can happen due to approximations)
        coverage_percentage = min(coverage_percentage, 100.0)
        
        return {
            "temperature_analysis": {
                "mean_temperature_c": round(float(mean_temp), 2),
                "temperature_std_c": round(float(std_temp), 2),
                "min_temperature_c": round(float(min_temp), 2),
                "max_temperature_c": round(float(max_temp), 2),
                "urban_heat_fraction": round(heat_fraction, 3),
                "heat_threshold_c": round(float(heat_threshold), 2)
            },
            "vegetation_analysis": {
                "mean_ndvi": round(float(mean_ndvi), 3),
                "vegetation_health": (
                    "high" if mean_ndvi > 0.5 else 
                    "medium" if mean_ndvi > 0.3 else 
                    "low"
                )
            },
            "data_quality": {
                "valid_pixels": int(valid_pixels),
                "total_pixels": estimated_total_pixels,
                "coverage_percentage": coverage_percentage,
                "collection": "landsat-8-9-c2-l2",
                "image_date": image_date,
                "cloud_cover": round(float(image.get('CLOUD_COVER').getInfo()), 1)
            },
            "processing_info": {
                "note": "Using Google Earth Engine Landsat Collection 2 Level-2",
                "data_source": "Landsat 8/9 OLI/TIRS Collection 2 Level-2",
                "spatial_resolution": "30 meters"
            }
        }
        
    except ee.EEException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Google Earth Engine error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Urban heat analysis failed: {str(e)}"
        )

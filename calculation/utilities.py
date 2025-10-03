
import os
import requests
import rasterio
from shapely.geometry import Point, mapping
from shapely.ops import transform
import pyproj
import math
from rasterio.mask import mask # Correct import statement

import os
import urllib.request

# -------------------------------
# File paths
# -------------------------------
tif_path = "data/ppp_2020_1km_Aggregated.tif"
pha_json_path = "static/js/pha_positions_async.json"
planet_json_path = "static/js/planet_positions_2025_2100.json"

# -------------------------------
# Dropbox direct download URLs
# -------------------------------
tif_url = "https://www.dropbox.com/scl/fi/zkesvwoui2z1xsqe33yc5/ppp_2020_1km_Aggregated.tif?rlkey=l9nr942fymcftbllmktpyaro2&st=59bsdynt&dl=1"
pha_url = "https://www.dropbox.com/scl/fi/dwiegpor9om0isd7toyou/pha_positions_async.json?rlkey=9iu1kaptrculv86vlpyd2xsqd&st=w1ykciok&dl=1"
planet_url = "https://www.dropbox.com/scl/fi/y37cqdlom7svt6m24qg4p/planet_positions_2025_2100.json?rlkey=czvi9j9jketvy7z3f80kn74p5&st=86m21yat&dl=1"

# -------------------------------
# Download function
# -------------------------------
def download_file(url, path):
    if not os.path.exists(path):
        print(f"Downloading {path}...")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        urllib.request.urlretrieve(url, path)
        print(f"✓ Downloaded: {path}")
    else:
        print(f"✓ File already exists: {path}")

# -------------------------------
# Download all files
# -------------------------------
def download_all_files():
    download_file(tif_url, tif_path)
    download_file(pha_url, pha_json_path)
    download_file(planet_url, planet_json_path)

# Run on startup
download_all_files()



def get_population_in_radius(lat, lon, radius_km):
    # Load raster
    with rasterio.open(tif_path) as src:
        point = Point(lon, lat)

        # Project to meters for accurate buffer
        project = pyproj.Transformer.from_crs("epsg:4326", "epsg:3857", always_xy=True).transform
        point_m = transform(project, point)
        buffer_m = point_m.buffer(radius_km * 1000)  # radius in meters

        # Transform back to lat/lon
        buffer = transform(pyproj.Transformer.from_crs("epsg:3857", "epsg:4326", always_xy=True).transform, buffer_m)

        # Mask raster
        out_image, out_transform = rasterio.mask.mask(src, [mapping(buffer)], crop=True)
        out_image = out_image[0]

        # Sum population ignoring nodata
        nodata = src.nodata
        mask = (out_image != nodata) & (out_image > 0)
        pop_sum = out_image[mask].sum()

    return int(pop_sum)





import geopandas as gpd
from shapely.geometry import Point

# ---------- Load Land Shapefile ----------
# Replace with the path to your downloaded .shp file
land_shp_path = "data/ne_10m_land.shx"
land_gdf = gpd.read_file(land_shp_path)

# ---------- Function to check if a point is on land ----------
def is_on_land(lat, lon):
    point = Point(lon, lat)  # shapely uses (lon, lat)
    # Check if the point is inside any land polygon
    return land_gdf.contains(point).any()


import rasterio
import numpy as np






# Load datasets
land_gdf = gpd.read_file("data/ne_10m_land.shp")
ocean_gdf = gpd.read_file("data/ne_10m_ocean.shp")
lakes_gdf = gpd.read_file("data/ne_10m_lakes.shp")
rivers_gdf = gpd.read_file("data/ne_10m_rivers_lake_centerlines.shp")
coastline_gdf = gpd.read_file("data/ne_10m_coastline.shp")

# Build spatial indexes ONCE at load time
land_sindex = land_gdf.sindex
ocean_sindex = ocean_gdf.sindex
lakes_sindex = lakes_gdf.sindex
rivers_sindex = rivers_gdf.sindex
coastline_sindex = coastline_gdf.sindex

def classify_for_meteor_impact(lat, lon, coastal_distance_km=100):
    """
    Fast classification for meteor impact simulation.
    Returns: 'Ocean', 'Coastal', 'Inland', 'Lake', 'River'
    
    - Ocean: Direct water impact → massive tsunami
    - Coastal: Land near coast → receives tsunami
    - Inland: Far from coast → no tsunami
    - Lake: Lake impact → local flooding
    - River: River impact → downstream flooding
    """
    lon = ((lon + 180) % 360) - 180
    point = Point(lon, lat)
    
    # 1. Check Lakes (high priority)
    lake_candidates = list(lakes_sindex.intersection(point.bounds))
    if lake_candidates and lakes_gdf.iloc[lake_candidates].intersects(point).any():
        return "Lake"
    
    # 2. Check Rivers
    river_candidates = list(rivers_sindex.intersection(point.bounds))
    if river_candidates and rivers_gdf.iloc[river_candidates].intersects(point).any():
        return "River"
    
    # 3. Check if on land
    land_candidates = list(land_sindex.intersection(point.bounds))
    if land_candidates and land_gdf.iloc[land_candidates].intersects(point).any():
        # Check distance to coastline
        buffer_deg = coastal_distance_km / 111.0
        buffered_point = point.buffer(buffer_deg)
        
        coastline_candidates = list(coastline_sindex.intersection(buffered_point.bounds))
        if coastline_candidates and coastline_gdf.iloc[coastline_candidates].intersects(buffered_point).any():
            return "Coastal"
        else:
            return "Inland"
    
    # 4. Must be ocean
    return "Ocean"

def tsunami_risk_flag(lat, lon, coastal_distance_km=100):
    """
    Return 1 if the location is at risk of tsunami (Ocean or Coastal),
    otherwise return 0.
    """
    classification = classify_for_meteor_impact(lat, lon, coastal_distance_km)
    
    if classification in ["Ocean", "Coastal"]:
        return 1
    else:
        return 0

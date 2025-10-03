
import os
import requests
import rasterio
from shapely.geometry import Point, mapping
from shapely.ops import transform
import pyproj
import math
from rasterio.mask import mask # Correct import statement

import gdown

# -------------------------------
# File paths
# -------------------------------
tif_path = "data/ppp_2020_1km_Aggregated.tif"
pha_json_path = "static/js/pha_positions_async.json"
planet_json_path = "static/js/planet_positions_2025_2100.json"

# -------------------------------
# Google Drive file IDs
# -------------------------------
tif_id = "1wGJp2HlgmLNueAWEFP4VGNv1RvEaxFZK"
pha_id = "1tiGxzxLO95ZN3wjhT7h6Buo4EIRbUPtx"
planet_id = "181nkB6yWPF3MV9hG-UFQ9URVIW0voLfg"

# -------------------------------
# Helper function to download files via gdown
# -------------------------------
def download_file(file_id, path):
    if not os.path.exists(path):
        print(f"Downloading {path} from Google Drive...")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        url = f"https://drive.google.com/uc?id={file_id}"
        gdown.download(url, path, quiet=False)
        print(f"Download complete: {path}")

# -------------------------------
# Download all necessary files
# -------------------------------
def download_all_files():
    download_file(tif_id, tif_path)
    download_file(pha_id, pha_json_path)
    download_file(planet_id, planet_json_path)

# Run immediately when imported
download_all_files()



def get_population_in_radius(lat, lon, radius_km):
    # Load raster
    with rasterio.open(raster_path) as src:
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




def effective_ke(density, radius, velocity, angle):
    mass = mass_from_density_radius(density, radius)
    KE_total = 0.5 * mass * (velocity*1000)**2
    angle_rad = math.radians(angle)
    return KE_total * math.sin(angle_rad)

def format_large_number(num):
    if num >= 1_00_00_00_000:
        return f"{num/1_00_00_00_000:.2f}B"
    elif num >= 1_000_000:
        return f"{num/1_000_000:.2f}M"
    elif num >= 1_000:
        return f"{num/1_000:.1f}K"
    else:
        return str(num)

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

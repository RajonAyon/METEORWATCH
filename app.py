from flask import Flask, jsonify, render_template, request, session
import json

from shapely.geometry import Point

import geopandas as gpd
from shapely.geometry import Point
from calculation.utilities import *









app = Flask(__name__)
app.secret_key = "Ayon1234#"  # session must have secret_key

# Example planet data (can be empty)
planet_data = []

@app.route("/")
def solar_system():
    return render_template("index.html")

@app.route("/mitigation")
def earth_asteroid():
    return render_template("mitigation.html")

@app.route("/asteroid-click", methods=["POST"])
def asteroid_click():
    data = request.get_json()
    session['asteroid_data'] = data  # store in session
    return jsonify({"status": "success"})

@app.route("/impact-map")
def impact_map():
    return render_template("impact_map.html")

@app.route("/get-asteroid-data", methods=["GET", "POST"])
def get_asteroid_data():
    if request.method == "POST":
        # Parse JSON from request
        params = request.get_json()
        if not params:
            return jsonify({"status": "error", "message": "No JSON sent"}), 400
        
        # Save to session
        session['asteroid_data'] = params
        return jsonify({"status": "success", "message": "Asteroid data saved"}), 200

    # Default GET behavior
    data = session.get("asteroid_data")
    if not data:
        return jsonify({"status": "error", "message": "No asteroid data in session"}), 404

    # compute land/water again
    lat = float(data.get("lat"))
    lon = float(data.get("lon"))
    lon = ((lon + 180) % 360) - 180
    point = Point(lon, lat)

    # Determine if it's on land
    is_land_flag = 1 if any(land_gdf.contains(point)) else 0

    # Determine tsunami risk using classification
    classification = classify_for_meteor_impact(lat, lon, coastal_distance_km=100)
    is_tsunami = 1 if classification in ["Ocean", "Coastal"] else 0

    return jsonify({
        "status": "success",
        "data": data,
        "impact_target": "land" if is_land_flag else "water",
        "is_land": is_land_flag,
        "is_tsunami": is_tsunami
    })




@app.route("/custom")
def custom():
    return render_template("custom.html")


@app.route("/customcalculate", methods=["POST"])
def customcalculate():
    # 1️⃣ Parse JSON payload
    
    payload = request.get_json()
    
    if not payload:
        return jsonify({"status": "error", "message": "No payload received!"}), 400

    asteroid = payload.get("asteroid", {})

    # 2️⃣ Flatten data for easier handling
    lat = float(payload.get("lat", 0))
    lon = float(payload.get("lon", 0))
    lon_wrapped = ((lon + 180) % 360) - 180
    point = Point(lon_wrapped, lat)

    flattened_data = {
        "angle": asteroid.get("inclination_deg", 90),
        "asteroidType": payload.get("typeName", "C-type")[0],
        "density": payload.get("density", asteroid.get("assumed_density_kg_m3", 1500)),
        "materialStrength": payload.get("materialStrength", 1_000_000),
        "radius": round(asteroid.get("avg_radius_m", 50), 2),
        "velocity": round(asteroid.get("avg_relative_velocity_earth_kms", 10), 2),
        "lat": lat,
        "lon": lon
    }

    # 3️⃣ Determine if impact is on land
    is_land_flag = 1 if any(land_gdf.contains(point)) else 0

    # 4️⃣ Determine tsunami risk
    classification = classify_for_meteor_impact(lat, lon, coastal_distance_km=100)
    is_tsunami = 1 if classification in ["Ocean", "Coastal"] else 0

    # 5️⃣ Build session result
    result = {
        "status": "success",
        "data": flattened_data,
        "impact_target": "land" if is_land_flag else "water",
        "is_land": is_land_flag,
        "is_tsunami": is_tsunami
    }

    # 6️⃣ Store in session
    session['custom_calculation'] = result
    session.modified = True

    # 7️⃣ Return JSON for frontend
    return jsonify(result), 200



# NEW ROUTE to retrieve session data
@app.route("/get-custom-data", methods=["GET"])
def get_custom_data():
    data = session.get('custom_calculation')
    if not data:
        return jsonify({"status": "error", "message": "No data in session"}), 404
    return jsonify(data)




@app.route("/estimate_population", methods=["POST"])
def api_estimate_population():
    
    data = request.get_json()
    lat = data["lat"]
    lon = data["lon"]
    radius = data["radius"]

    pop = get_population_in_radius(lat, lon, radius)


    return jsonify({"population": pop})    



@app.route("/customresult")
def customresult_page():
    return render_template("customresult.html")



@app.route("/calculation")
def calculation_page():
    return render_template("calculation.html")  # map + sidebar page

if __name__ == "__main__":
    app.run(debug=True)

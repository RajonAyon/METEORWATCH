document.addEventListener("DOMContentLoaded", function () {
    const asteroidData = JSON.parse(localStorage.getItem("calculationData"));

    if (!asteroidData) {
        alert("No asteroid data found. Go back and click on an asteroid first!");
        return;
    }

    console.log("Asteroid data received:", asteroidData);

    const defaultLat = 20;
    const defaultLon = 0;

    const map = L.map('map').setView([defaultLat, defaultLon], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.marker([defaultLat, defaultLon]).addTo(map)
        .bindPopup(`<b>Asteroid Impact Simulation</b><br>
        Radius: ${asteroidData.avg_radius_m} m<br>
        Density: ${asteroidData.assumed_density_kg_m3} kg/m³<br>
        Velocity: ${asteroidData.avg_relative_velocity_earth_kms} km/s`)
        .openPopup();
});

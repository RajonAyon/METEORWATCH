# Asteroid Impact Simulator

An interactive 3D visualization system for tracking potentially hazardous asteroids (PHAs), simulating impact scenarios, and demonstrating planetary defense mitigation strategies.

## Overview

This project combines NASA's Near-Earth Object data with advanced geospatial analysis to create an educational tool for understanding asteroid threats and planetary defense strategies. Users can explore real asteroid orbits, select impact locations, analyze consequences, and test various deflection methods.

## Features

### 3D Solar System Visualization
- Real-time orbital visualization of planets (Mercury through Saturn)
- Heliocentric coordinate system with logarithmic scaling
- Track up to 5 potentially hazardous asteroids simultaneously
- Time controls (play/pause, adjustable speed)
- Interactive camera controls (orbit, zoom, pan)
- Date range: 2025-2036

### Impact Analysis
- Click any location on Earth to simulate asteroid impact
- Geographic classification (Ocean, Coastal, Inland, Lake, River)
- Population density estimation within impact radius
- Tsunami risk assessment for coastal/ocean impacts
- Customizable asteroid parameters (size, velocity, density, angle)
- Support for multiple asteroid types (C, S, M, D, V, E, P, Q, R, T-type)

### Mitigation Strategies
Four scientifically-grounded deflection methods:
1. **Kinetic Impactor** - Based on NASA's DART mission
2. **Gravity Tractor** - Long-duration gravitational pull
3. **Laser Ablation** - Surface vaporization for thrust
4. **Nuclear Deflection** - High-energy impulse transfer

### Data Integration
- **NASA NEO API**: Real asteroid orbital data
- **Astropy**: Precise heliocentric position calculations
- **WorldPop PPP 2020**: 1km resolution population density
- **Natural Earth**: Geographic boundaries (land, ocean, lakes, rivers, coastlines)

## Technology Stack

### Backend
- **Flask** - Web framework
- **Astropy** - Astronomical calculations
- **GeoPandas** - Geospatial operations
- **Shapely** - Geometric computations
- **Rasterio** - Raster data processing
- **PyProj** - Coordinate transformations

### Frontend
- **Three.js (r128)** - 3D graphics rendering
- **Leaflet.js** - 2D map visualization
- **Vanilla JavaScript** - Core application logic
- **HTML5/CSS3** - User interface

### Data Formats
- **JSON** - Orbital positions, asteroid metadata
- **GeoTIFF** - Population density raster
- **Shapefile** - Vector geographic boundaries

## Installation

### Prerequisites
```bash
Python 3.8+
pip
Modern web browser with WebGL support
```

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/RajonAyon/METEORWATCH
cd METEORWATCH

```

2. **Install Python dependencies**
```bash
pip install flask astropy geopandas shapely rasterio pyproj requests
```

3. **Download required datasets**

The application automatically downloads necessary files on first run:
- `ppp_2020_1km_Aggregated.tif` - Population data
- `pha_positions_async.json` - Asteroid positions
- `planet_positions_2025_2100.json` - Planet positions
- Natural Earth shapefiles (land, ocean, lakes, rivers, coastlines)

4. **Run the application**
```bash
python app.py
```

5. **Open browser**
```
http://localhost:5000
```

## Project Structure

```
asteroid-impact-simulator/
├── app.py                          # Flask backend
├── calculation/
│   └── utilities.py                # Geospatial & population analysis
├── static/
│   ├── js/
│   │   ├── main.js                 # 3D solar system visualization
│   │   ├── mitigation.js           # Deflection simulation
│   │   ├── impact_map.js           # Impact location selector
│   │   ├── planet_positions_*.json # Orbital data
│   │   └── pha_positions_*.json    # Asteroid data
│   └── videos/
│       ├── opening.mp4             # Loading animation
│       └── asteroidimpact.mp4      # Impact transition
├── templates/
│   ├── index.html                  # Main solar system page
│   ├── mitigation.html             # Deflection strategies
│   ├── custom.html                 # Custom asteroid creator
│   ├── impact_map.html             # Impact location picker
│   ├── calculation.html            # Results page
│   └── customresult.html           # Custom results
├── data/
│   ├── ppp_2020_1km_Aggregated.tif # Population raster
│   └── ne_10m_*.shp                # Natural Earth shapefiles
└── README.md
```

## Usage

### 1. Explore the Solar System
- Navigate to the main page
- Select up to 5 asteroids from the left panel
- Use sorting options (diameter, velocity, impact probability)
- Click on an asteroid to focus and view details
- Right-click to exit focus mode

### 2. Analyze Asteroid Details
- View orbital parameters
- Check close approach dates (2025-2036)
- Navigate between multiple close approaches
- Review impact probability calculations

### 3. Choose Impact Simulation
Two options:
- **Show Impact Simulation**: Use the asteroid's actual parameters
- **Create Custom Asteroid**: Define your own asteroid properties

### 4. Select Impact Location
- Click anywhere on the 2D map
- Automatic classification (Ocean/Coastal/Inland/Lake/River)
- View population density estimates
- Adjust asteroid parameters if using custom mode

### 5. Review Impact Results
- Blast radius and energy calculations
- Population affected estimates
- Tsunami risk assessment
- Environmental consequences

### 6. Test Mitigation Strategies
- Select a deflection method
- Adjust mission parameters
- Apply mitigation and view new trajectory
- Compare before/after impact probabilities

## Data Sources

### NASA Near-Earth Object Program
- **URL**: https://cneos.jpl.nasa.gov/
- **API**: https://api.nasa.gov/
- **Data**: Orbital elements, close approaches, physical parameters

### Astropy
- **URL**: https://www.astropy.org/
- **Usage**: Heliocentric coordinate calculations (2025-2036)
- **Coordinate System**: J2000.0 ecliptic

### WorldPop
- **URL**: https://www.worldpop.org/
- **Dataset**: PPP 2020 1km Aggregated
- **Resolution**: 1 kilometer
- **Coverage**: Global

### Natural Earth
- **URL**: https://www.naturalearthdata.com/
- **Scale**: 1:10 million
- **Datasets Used**:
  - `ne_10m_land.shp` - Land polygons
  - `ne_10m_ocean.shp` - Ocean boundaries
  - `ne_10m_lakes.shp` - Lake features
  - `ne_10m_rivers_lake_centerlines.shp` - River systems
  - `ne_10m_coastline.shp` - Coastal boundaries

## Scientific Accuracy

### Strengths
- NASA-verified orbital data
- Professional astronomy calculations (Astropy)
- High-resolution population data (1km)
- Accurate geographic boundaries
- Scientifically-grounded mitigation physics

### Limitations
- Simplified orbital mechanics (no perturbations)
- Population data from 2020 (not current)
- Asteroid composition assumptions
- Simplified atmospheric entry effects
- Approximate tsunami modeling

### Intended Use
This tool is designed for **educational and visualization purposes**. For actual planetary defense planning, NASA and ESA use more sophisticated models with additional variables and higher precision.

## Mitigation Methods - Scientific Basis

### Kinetic Impactor
Based on NASA's DART mission (2022), which successfully altered asteroid Dimorphos's orbit by 32 minutes.
- **Momentum Enhancement Factor (β)**: 1.5-4.0
- **Proven Technology**: TRL 9 (flight proven)

### Gravity Tractor
Proposed by NASA astronauts Edward Lu and Stanley Love (2005).
- **Duration**: Years to decades
- **Advantages**: No contact, no fragmentation risk
- **Disadvantages**: Very slow, requires early detection

### Laser Ablation
Based on DE-STAR (Directed Energy System for Targeting Asteroids) research.
- **Power Requirements**: 10-500 MW
- **Conversion Efficiency**: ~5%
- **Status**: Theoretical (TRL 2-3)

### Nuclear Deflection
From NASA's 2007 Near-Earth Object Survey and Deflection Analysis.
- **Yield Range**: 0.1-100 megatons
- **Coupling Efficiency**: 1-30% (depends on standoff distance)
- **Status**: Last resort option

## Performance Optimizations

- **Spatial Indexing**: R-tree structures for fast geographic queries
- **Pre-computed Positions**: Orbital calculations done offline
- **Logarithmic Scaling**: Efficient 3D visualization of vast distances
- **WebGL Acceleration**: Hardware-accelerated graphics rendering
- **Cached Raster Queries**: Optimized population lookups

## Browser Compatibility

- Chrome 90+ (Recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

**Note**: Requires WebGL 2.0 support

## Known Issues

- Large asteroid datasets may take time to load initially
- Performance may degrade with >5 asteroids tracked simultaneously
- Mobile devices may experience reduced frame rates
- Older browsers without WebGL support will not work

## Future Enhancements

- [ ] Add more planets (Uranus, Neptune, Pluto)
- [ ] Include comets and NEOs beyond PHAs
- [ ] Implement n-body gravitational simulation
- [ ] Real-time data updates from NASA API
- [ ] Advanced tsunami propagation modeling
- [ ] Multi-language support
- [ ] VR/AR support

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Acknowledgments

- **NASA Center for Near-Earth Object Studies (CNEOS)** - Asteroid data
- **Astropy Project** - Astronomical calculations library
- **WorldPop** - Population density data
- **Natural Earth** - Geographic vector data
- **Three.js Community** - 3D visualization framework
- **NASA DART Mission Team** - Kinetic impactor validation

## Citation

If you use this project in research or publications, please cite:

```
@software{asteroid_impact_simulator,
  title={METEORWATCH: Interactive Visualization of Planetary Defense},
  author={Rajon Ahmed},
  year={2025},
  url={https://github.com/RajonAyon/METEORWATCH}
}
```

## Contact

Project Creator - rajonayon143@gmail.com

Project Link: https://github.com/RajonAyon/METEORWATCH

## Disclaimer

This software is provided for educational purposes only. Impact predictions and mitigation simulations are simplified models and should not be used for actual emergency planning or scientific research without proper validation. Always refer to official NASA and ESA sources for authoritative information on asteroid threats.

---

**Made with science and code to protect Planet Earth**

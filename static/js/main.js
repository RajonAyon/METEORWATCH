import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.153.0/examples/jsm/controls/OrbitControls.js';


// =======================
// Scene Setup
// =======================
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.0002);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 50;
controls.maxDistance = 3000;

// =======================
// Lights
// =======================
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const pointLight = new THREE.PointLight(0xffffff, 1.5);
scene.add(pointLight);

// =======================
// Sun with Glow
// =======================
const SUN_RADIUS = 20;
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(SUN_RADIUS, 64, 64),
  new THREE.MeshBasicMaterial({ color: 0xffaa00 })
);
scene.add(sun);

// Sun glow effect
const sunGlow = new THREE.Mesh(
  new THREE.SphereGeometry(SUN_RADIUS * 1.3, 32, 32),
  new THREE.MeshBasicMaterial({ 
    color: 0xffaa00, 
    transparent: true, 
    opacity: 0.3,
    side: THREE.BackSide
  })
);
sun.add(sunGlow);

// =======================
// Stars Background
// =======================
function createStars(count) {
  const g = new THREE.BufferGeometry();
  const pos = [];
  for (let i = 0; i < count; i++) {
    const r = 1500 + Math.random() * 500;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    pos.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2 }));
  scene.add(stars);
}
createStars(2000);

// =======================
// Planets Definition
// =======================
const planetDefs = {
  Mercury: { color: 0xaaaaaa, radius: 3 },
  Venus: { color: 0xffddaa, radius: 4 },
  Earth: { color: 0x3399ff, radius: 4 },
  Mars: { color: 0xff3300, radius: 3.5 },
  Jupiter: { color: 0xffaa55, radius: 8 },
  Saturn: { color: 0xffcc77, radius: 7 }
};

let planetPositions = {};
let planetsMeshes = {};
let phaData = [];
let phaMeshes = {};
let asteroidInfoData = [];
let currentDate = new Date(2025, 0, 1);
let focusedAsteroid = null;
let focusMode = false;
let focusedPHA = null;
let selectedAsteroidIds = [];
let currentApproachIndex = 0;

// =======================
// Inject Enhanced CSS Styles
// =======================
const style = document.createElement('style');
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Space+Mono&display=swap');
  
  body { 
    margin: 0; 
    overflow: hidden; 
    font-family: 'Space Mono', monospace;
    background: #000;
  }
  
  .ui-panel {
    background: linear-gradient(135deg, rgba(15,15,35,0.95), rgba(25,25,50,0.95));
    backdrop-filter: blur(10px);
    border: 1px solid rgba(100,150,255,0.3);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
    color: #fff;
    font-family: 'Space Mono', monospace;
    border-radius: 12px;
    animation: slideIn 0.5s ease-out;
  }
  
  @keyframes slideIn {
    from { 
      opacity: 0; 
      transform: translateY(-20px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.05); opacity: 1; }
  }
  
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 10px rgba(100,150,255,0.5); }
    50% { box-shadow: 0 0 20px rgba(100,150,255,0.8); }
  }
  
  .ui-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-family: 'Orbitron', sans-serif;
    font-weight: 700;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102,126,234,0.4);
  }
  
  .ui-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102,126,234,0.6);
  }
  
  .ui-button:active {
    transform: translateY(0);
  }
  
  .asteroid-item {
    transition: all 0.3s ease;
    cursor: pointer;
  }
  
  .asteroid-item:hover {
    background: rgba(100,100,150,0.9) !important;
    transform: translateX(5px);
  }
  
  .info-card {
    background: linear-gradient(135deg, rgba(30,30,60,0.95), rgba(40,40,70,0.95));
    border-left: 3px solid #667eea;
    padding: 15px;
    margin: 10px 0;
    border-radius: 8px;
    transition: all 0.3s ease;
  }
  
  .info-card:hover {
    transform: translateX(-5px);
    border-left-color: #764ba2;
  }
  
  .control-btn {
    background: rgba(50,50,80,0.9);
    border: 1px solid rgba(100,150,255,0.5);
    color: #fff;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-family: 'Orbitron', sans-serif;
    transition: all 0.3s ease;
  }
  
  .control-btn:hover {
    background: rgba(100,150,255,0.3);
    border-color: rgba(100,150,255,0.8);
  }
  
  .danger-button {
    background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
    animation: pulse 2s infinite;
  }
  
  .success-button {
    background: linear-gradient(135deg, #44ff44 0%, #00cc00 100%);
  }
  
  select {
    background: rgba(30,30,50,0.9);
    color: #fff;
    border: 1px solid rgba(100,150,255,0.3);
    padding: 8px;
    border-radius: 6px;
    font-family: 'Space Mono', monospace;
    cursor: pointer;
  }
  
  select:focus {
    outline: none;
    border-color: rgba(100,150,255,0.8);
  }
  
  .header-text {
    font-family: 'Orbitron', sans-serif;
    font-weight: 900;
    letter-spacing: 2px;
    text-transform: uppercase;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #667eea;
  }
  
  ::-webkit-scrollbar {
    width: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(20,20,40,0.5);
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 10px;
  }
`;
document.head.appendChild(style);

// =======================
// Scaling function for 3D coordinates
// =======================
function scale3D(x, y, z) {
  const dist = Math.sqrt(x*x + y*y + z*z);
  const r = Math.log10(dist + 1.5) * 800;
  const theta = Math.atan2(y, x);
  const phi = Math.acos(z / dist);
  return { x: r * Math.sin(phi) * Math.cos(theta), y: r * Math.sin(phi) * Math.sin(theta), z: r * Math.cos(phi) };
}

// =======================
// Create Label Function
// =======================
function createLabel(name, position, planetRadius = 50) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; 
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "Bold 120px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position).add(new THREE.Vector3(0, planetRadius * 1.5, 0));

  sprite.userData.canvas = canvas; // Store canvas for future reuse

  // Scale only once per frame in render loop
  sprite.onBeforeRender = (renderer, scene, camera) => {
      const distance = sprite.position.distanceTo(camera.position);
      const size = distance * 0.19; 
      sprite.scale.set(size, size * (canvas.height / canvas.width), 1);
  };

  return sprite;
}



// =======================
// Create Planets and Orbits
// =======================
function createPlanetsAndOrbits() {
  for (const name in planetDefs) {
    const def = planetDefs[name];
    const SCALE = 6;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(def.radius * SCALE, 32, 32),
      new THREE.MeshStandardMaterial({ color: def.color, metalness: 0.3, roughness: 0.7 })
    );
    const orbitLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true })
    );

    scene.add(mesh);
    scene.add(orbitLine);
    planetsMeshes[name] = { mesh, orbitLine };
  }
}

function drawOrbits() {
  for (const name in planetsMeshes) {
    const points = [];
    for (const dateKey in planetPositions) {
      if (planetPositions[dateKey][name]) {
        const p = planetPositions[dateKey][name];
        const pos = scale3D(p.x, p.y, p.z);
        points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
      }
    }
    if (points.length === 0) continue;
    planetsMeshes[name].orbitLine.geometry.dispose();
    planetsMeshes[name].orbitLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
  }
}

function updatePlanets() {
  const key = currentDate.toISOString().split('T')[0];
  const data = planetPositions[key];
  if (!data) return;
  for (const name in data) {
    if (!planetsMeshes[name]) continue;
    const p = data[name];
    const pos = scale3D(p.x, p.y, p.z);
    planetsMeshes[name].mesh.position.set(pos.x, pos.y, pos.z);

    if (!planetsMeshes[name].label) {
      const label = createLabel(name, planetsMeshes[name].mesh.position);
      scene.add(label);
      planetsMeshes[name].label = label;
    } else {
      planetsMeshes[name].label.position.copy(planetsMeshes[name].mesh.position);
    }
  }
}

// =======================
// PHAs
// =======================
function julianDay(date) {
  return Math.floor(2451545.0 + (date - new Date(2000,0,1,12,0,0))/86400000);
}

function createPHAs() {
  selectedAsteroidIds.forEach(id => {
    if (phaMeshes[id]) return;
    
    const pha = phaData.find(p => p.id == id);
    if (!pha) return;

    const ASTEROID_SCALE = 10;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(ASTEROID_SCALE, 16, 16),
      new THREE.MeshStandardMaterial({ 
        color: 0xff8888,
        emissive: 0xff4444,
        emissiveIntensity: 0.3
      })
    );

    const points = pha.positions.map(p => {
      const pos = scale3D(p.x, p.y, p.z);
      return new THREE.Vector3(pos.x, pos.y, pos.z);
    });

    const orbitLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0xffaa66, opacity: 0.15, transparent: true })
    );

    scene.add(mesh);
    scene.add(orbitLine);

    phaMeshes[pha.id] = { mesh, orbitLine, data: pha };
  });
  updatePHAs();
}

function updatePHAs() {
  const jd = julianDay(currentDate);
  for (const phaId in phaMeshes) {
    const pha = phaMeshes[phaId];
    const posEntry = pha.data.positionsMap?.[jd] || pha.data.positions.find(p => Math.floor(p.time_jd) === jd);
    if (!posEntry) continue;

    const pos = scale3D(posEntry.x, posEntry.y, posEntry.z);
    pha.mesh.position.set(pos.x, pos.y, pos.z);

    if (!pha.label) {
      const label = createLabel(pha.data.id, pha.mesh.position);
      scene.add(label);
      pha.label = label;
    } else {
      pha.label.position.copy(pha.mesh.position);
    }
  }
}


function removePHA(id) {
  if (phaMeshes[id]) {
    const { mesh, orbitLine, label } = phaMeshes[id];

    [mesh, orbitLine].forEach(obj => {
      scene.remove(obj);
      obj.geometry.dispose();
      obj.material.dispose();
    });

    if (label) {
      scene.remove(label);
      if (label.material.map) label.material.map.dispose();
      label.material.dispose();
    }

    delete phaMeshes[id];
    selectedAsteroidIds = selectedAsteroidIds.filter(x => x !== id);
  }
}


// =======================
// Enhanced Asteroid Selection UI
// =======================
function createAsteroidSelectionUI() {
  const panel = document.createElement("div");
  panel.id = "asteroidSelectionPanel";
  panel.className = "ui-panel";
  Object.assign(panel.style, {
    position: "fixed",
    left: "20px",
    top: "20px",
    width: "300px",
    maxHeight: "400px",
    padding: "20px",
    zIndex: "1000",
    overflowY: "auto"
  });

  const header = document.createElement("div");
  header.className = "header-text";
  header.innerHTML = "🚀 Asteroid Tracker";
  header.style.marginBottom = "15px";
  header.style.fontSize = "18px";
  panel.appendChild(header);

  const sortSelect = document.createElement("select");
  sortSelect.innerHTML = `
    <option value="diameter_desc">💎 Diameter ↓</option>
    <option value="diameter_asc">💎 Diameter ↑</option>
    <option value="velocity_desc">⚡ Velocity ↓</option>
    <option value="velocity_asc">⚡ Velocity ↑</option>
    <option value="impact_desc">⚠️ Impact Prob ↓</option>
    <option value="impact_asc">⚠️ Impact Prob ↑</option>
  `;
  sortSelect.style.marginBottom = "15px";
  sortSelect.style.width = "100%";
  panel.appendChild(sortSelect);

  const counter = document.createElement("div");
  counter.id = "asteroidCounter";
  counter.style.marginBottom = "10px";
  counter.style.fontSize = "12px";
  counter.style.opacity = "0.8";
  counter.innerHTML = `Selected: <strong>0/5</strong>`;
  panel.appendChild(counter);

  const listContainer = document.createElement("div");
  listContainer.id = "asteroidList";
  panel.appendChild(listContainer);

  document.body.appendChild(panel);

  function renderAsteroidList() {
    const sortBy = sortSelect.value;
    let sorted = [...asteroidInfoData];

    switch(sortBy) {
      case "diameter_desc":
        sorted.sort((a, b) => b.avg_diameter_m - a.avg_diameter_m);
        break;
      case "diameter_asc":
        sorted.sort((a, b) => a.avg_diameter_m - b.avg_diameter_m);
        break;
      case "velocity_desc":
        sorted.sort((a, b) => b.avg_relative_velocity_earth_kms - a.avg_relative_velocity_earth_kms);
        break;
      case "velocity_asc":
        sorted.sort((a, b) => a.avg_relative_velocity_earth_kms - b.avg_relative_velocity_earth_kms);
        break;
      case "impact_desc":
        sorted.sort((a, b) => parseFloat(b.avg_impact_probability_percent) - parseFloat(a.avg_impact_probability_percent));
        break;
      case "impact_asc":
        sorted.sort((a, b) => parseFloat(a.avg_impact_probability_percent) - parseFloat(b.avg_impact_probability_percent));
        break;
    }

    listContainer.innerHTML = "";

    sorted.forEach(asteroid => {
      const item = document.createElement("div");
      item.className = "asteroid-item";
      Object.assign(item.style, {
        padding: "12px",
        marginBottom: "8px",
        background: "rgba(50,50,90,0.7)",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        fontSize: "12px",
        border: "1px solid rgba(100,150,255,0.2)"
      });

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selectedAsteroidIds.includes(asteroid.id);
      checkbox.style.marginRight = "12px";
      
      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          if (selectedAsteroidIds.length >= 5) {
            alert("⚠️ Maximum 5 asteroids can be tracked");
            e.target.checked = false;
            return;
          }
          selectedAsteroidIds.push(asteroid.id);
          createPHAs();
        } else {
          selectedAsteroidIds = selectedAsteroidIds.filter(id => id !== asteroid.id);
          removePHA(asteroid.id);
        }
        document.getElementById("asteroidCounter").innerHTML = 
          `Selected: <strong>${selectedAsteroidIds.length}/5</strong>`;
      });

      const label = document.createElement("span");
      label.innerHTML = `
        <strong style="color: #667eea;">${asteroid.name || asteroid.id}</strong><br>
        <small style="opacity: 0.8;">💎 ${asteroid.avg_diameter_m.toFixed(0)}m | ⚡ ${asteroid.avg_relative_velocity_earth_kms.toFixed(1)} km/s</small>
      `;

      item.appendChild(checkbox);
      item.appendChild(label);
      listContainer.appendChild(item);
    });
  }

  sortSelect.addEventListener("change", renderAsteroidList);
  renderAsteroidList();
}

// =======================
// Enhanced Control Panel
// =======================
function createControlPanel() {
  // Remove old elements if they exist
  const oldPanel = document.getElementById("controlPanel");
  if (oldPanel) oldPanel.remove();
  
  const panel = document.createElement("div");
  panel.id = "controlPanel";
  panel.className = "ui-panel";
  Object.assign(panel.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "15px 30px",
    display: "flex",
    gap: "15px",
    alignItems: "center",
    zIndex: "1000"
  });

  const dateDisplay = document.createElement("div");
  dateDisplay.id = "dateDisplay";
  dateDisplay.style.fontFamily = "'Orbitron', sans-serif";
  dateDisplay.style.fontSize = "14px";
  dateDisplay.style.fontWeight = "700";
  dateDisplay.style.minWidth = "150px";
  dateDisplay.style.textAlign = "center";
  dateDisplay.textContent = `📅 ${currentDate.toISOString().split('T')[0]}`;
  panel.appendChild(dateDisplay);

  const playBtn = document.createElement("button");
  playBtn.id = "playBtn";
  playBtn.className = "ui-button";
  playBtn.textContent = "▶ Play";
  playBtn.addEventListener("click", () => {
    playing = !playing;
    playBtn.textContent = playing ? "⏸ Pause" : "▶ Play";
  });
  panel.appendChild(playBtn);

  const speedBtn = document.createElement("button");
  speedBtn.id = "speedBtn";
  speedBtn.className = "ui-button";
  speedBtn.textContent = "⚡ Speed x1";
  speedBtn.addEventListener("click", () => {
    speed *= 2; 
    if (speed > 16) speed = 1;
    speedBtn.textContent = "⚡ Speed x" + speed;
  });
  panel.appendChild(speedBtn);

  document.body.appendChild(panel);
}

// Call this after the page loads
window.addEventListener('DOMContentLoaded', () => {
  createControlPanel();
});

// =======================
// Close Approach Navigation
// =======================
function jumpToCloseApproach(direction) {
  if (!focusedAsteroid || !focusedAsteroid.close_approach_data) return;

  const approaches = focusedAsteroid.close_approach_data
    .filter(a => {
      const year = new Date(a.close_approach_date).getFullYear();
      return year >= 2025 && year <= 2100;
    })
    .sort((a, b) => new Date(a.close_approach_date) - new Date(b.close_approach_date));

  if (approaches.length === 0) return;

  currentApproachIndex += direction;
  if (currentApproachIndex < 0) currentApproachIndex = approaches.length - 1;
  if (currentApproachIndex >= approaches.length) currentApproachIndex = 0;

  const approach = approaches[currentApproachIndex];
  currentDate = new Date(approach.close_approach_date);
  
  updateAll();
  updateCloseApproachDisplay(approach, approaches.length);
}

function updateCloseApproachDisplay(approach, totalApproaches) {
  let tab = document.getElementById("closeApproachTab");
  if (!tab) {
    tab = document.createElement("div");
    tab.id = "closeApproachTab";
    tab.className = "ui-panel";
    document.body.appendChild(tab);
    Object.assign(tab.style, {
      position: "fixed",
      right: "20px",
      top: "20px",
      width: "300px",
      padding: "20px",
      zIndex: "999"
    });
  }

  const missKm = Number(approach.miss_distance.kilometers);
  const orbitUncertainty = focusedAsteroid.orbital_data?.orbit_uncertainty || 0;
  
  function calculateImpactProbability(missKm, orbitUncertainty, R_Earth = 6371) {
    if (orbitUncertainty === 0) {
      return missKm < R_Earth ? 1 : 1e-5;
    }
    const U = orbitUncertainty / 10;
    return Math.min(1, Math.max(1e-5, (R_Earth / missKm) * U));
  }

  const impactProb = calculateImpactProbability(missKm, orbitUncertainty);

  tab.innerHTML = `
    <div class="header-text" style="margin-bottom: 15px; font-size: 16px;">📍 Close Approach</div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <button class="control-btn" id="prevApproach">◀</button>
      <strong style="font-family: 'Orbitron', sans-serif;">${currentApproachIndex + 1}/${totalApproaches}</strong>
      <button class="control-btn" id="nextApproach">▶</button>
    </div>
    <div class="info-card">
      <strong>🌌 Asteroid:</strong> ${focusedAsteroid.name || focusedAsteroid.id}<br>
      <strong>📅 Date:</strong> ${approach.close_approach_date}<br>
      <strong>🌍 Body:</strong> ${approach.orbiting_body || "N/A"}<br>
      <strong>📏 Miss Distance:</strong> ${Number(approach.miss_distance.kilometers).toFixed(0)} km<br>
      <strong>⚠️ Impact Prob:</strong> <span style="color: ${impactProb > 0.01 ? '#ff4444' : '#44ff44'}">${(impactProb*100).toFixed(5)}%</span>
    </div>
  `;

  document.getElementById("prevApproach").onclick = () => jumpToCloseApproach(-1);
  document.getElementById("nextApproach").onclick = () => jumpToCloseApproach(1);
}

// =======================
// Enhanced Asteroid Info Tab
// =======================
function showAsteroidInfoTab(asteroid) {
  if (!asteroid) return;

  function formatTwoDecimals(val) {
    const num = Number(val);
    return isNaN(num) ? "N/A" : num.toFixed(2);
  }

  let panel = document.getElementById("asteroidLeftTab");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "asteroidLeftTab";
    panel.className = "ui-panel";
    document.body.appendChild(panel);

    Object.assign(panel.style, {
      position: "fixed",
      right: "20px",
      bottom: "20px",
      width: "300px",
      padding: "20px",
      zIndex: "999"
    });

    const header = document.createElement("div");
    header.className = "header-text";
    header.innerText = "ℹ️ Asteroid Info";
    header.style.fontSize = "16px";
    header.style.marginBottom = "15px";
    panel.appendChild(header);

    const content = document.createElement("div");
    content.id = "asteroidTabContent";
    content.className = "info-card";
    Object.assign(content.style, {
      minHeight: "60px",
      transition: "opacity 0.3s ease"
    });
    panel.appendChild(content);

    const btnContainer = document.createElement("div");
    Object.assign(btnContainer.style, {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "15px",
      gap: "10px"
    });
    panel.appendChild(btnContainer);

    const prevBtn = document.createElement("button");
    prevBtn.className = "control-btn";
    prevBtn.innerText = "◀ Previous";
    prevBtn.style.flex = "1";
    btnContainer.appendChild(prevBtn);

    const nextBtn = document.createElement("button");
    nextBtn.className = "control-btn";
    nextBtn.innerText = "Next ▶";
    nextBtn.style.flex = "1";
    btnContainer.appendChild(nextBtn);
  }

  const keys = [
    ["💎 Avg Diameter (m)", formatTwoDecimals(asteroid.avg_diameter_m)],
    ["⚖️ Density (kg/m³)", formatTwoDecimals(asteroid.assumed_density_kg_m3)],
    ["⚡ Avg Velocity (km/s)", formatTwoDecimals(asteroid.avg_relative_velocity_earth_kms)],
    ["🔭 First Observed", asteroid.orbital_data.first_observation_date],
    ["📅 Last Observed", asteroid.orbital_data.last_observation_date],
    ["🎯 Orbit Uncertainty", formatTwoDecimals(asteroid.orbital_data.orbit_uncertainty)],
    ["🌀 Eccentricity", formatTwoDecimals(asteroid.orbital_data.eccentricity)],
    ["📐 Semi-Major Axis (AU)", formatTwoDecimals(asteroid.orbital_data.semi_major_axis)],
    ["🛸 Inclination (°)", formatTwoDecimals(asteroid.orbital_data.inclination)],
    ["🔻 Perihelion Dist (AU)", formatTwoDecimals(asteroid.orbital_data.perihelion_distance)],
    ["🔺 Aphelion Dist (AU)", formatTwoDecimals(asteroid.orbital_data.aphelion_distance)],
    ["🌑 Mean Anomaly (°)", formatTwoDecimals(asteroid.orbital_data.mean_anomaly)],
    ["🔄 Mean Motion (°/day)", formatTwoDecimals(asteroid.orbital_data.mean_motion)],
    ["⚠️ Hazardous", "Yes"]
  ];

  let currentIndex = 0;
  const content = document.getElementById("asteroidTabContent");
  const prevBtn = panel.querySelector("button:first-of-type");
  const nextBtn = panel.querySelector("button:last-of-type");

  function updateContent() {
    const [label, value] = keys[currentIndex];
    content.style.opacity = 0;
    setTimeout(() => {
      content.innerHTML = `<strong>${label}:</strong><br><span style="font-size: 16px; color: #667eea;">${value}</span>`;
      content.style.opacity = 1;
    }, 150);
  }

  prevBtn.onclick = () => {
    currentIndex = (currentIndex - 1 + keys.length) % keys.length;
    updateContent();
  };

  nextBtn.onclick = () => {
    currentIndex = (currentIndex + 1) % keys.length;
    updateContent();
  };

  currentIndex = 0;
  updateContent();
}

// =======================
// Enhanced Impact Query UI
// =======================
function showImpactQueryUI(focusedAsteroid) {
  if (!focusedAsteroid) return;

  const existing = document.getElementById("impactQueryPanel");
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = "impactQueryPanel";
  panel.className = "ui-panel";
  Object.assign(panel.style, {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "350px",
    padding: "25px",
    zIndex: "1001",
    textAlign: "center"
  });

  const message = document.createElement("div");
  message.className = "header-text";
  message.innerHTML = `🌍 What's Your Mission?`;
  message.style.marginBottom = "20px";
  message.style.fontSize = "20px";
  panel.appendChild(message);

  const subtitle = document.createElement("div");
  subtitle.innerHTML = `Asteroid <strong style="color: #667eea;">${focusedAsteroid.name || focusedAsteroid.id}</strong> detected!`;
  subtitle.style.marginBottom = "20px";
  subtitle.style.fontSize = "14px";
  panel.appendChild(subtitle);

  const btnImpact = document.createElement("button");
  btnImpact.className = "ui-button danger-button";
  btnImpact.innerText = "💥 Show Impact Simulation";
  Object.assign(btnImpact.style, {
    width: "100%",
    padding: "15px",
    marginBottom: "12px",
    fontSize: "14px"
  });

  btnImpact.onclick = () => {
    const asteroidData = {
      avg_radius_m: focusedAsteroid.avg_diameter_m / 2,
      assumed_density_kg_m3: focusedAsteroid.assumed_density_kg_m3,
      avg_relative_velocity_earth_kms: focusedAsteroid.avg_relative_velocity_earth_kms,
      inclination_deg: 45
    };
    localStorage.setItem("Tocalculatecustom", JSON.stringify(asteroidData));
    window.location.href = "/custom";
  };
  panel.appendChild(btnImpact);

  const btnCustom = document.createElement("button");
  btnCustom.className = "ui-button success-button";
  btnCustom.innerText = "🛠️ Create Custom Asteroid";
  Object.assign(btnCustom.style, {
    width: "100%",
    padding: "15px",
    fontSize: "14px"
  });

  btnCustom.onclick = () => {
    window.location.href = "/impact-map";
  };
  panel.appendChild(btnCustom);

  const closeBtn = document.createElement("button");
  closeBtn.className = "control-btn";
  closeBtn.innerText = "✕ Close";
  Object.assign(closeBtn.style, {
    width: "100%",
    marginTop: "15px",
    padding: "10px"
  });
  closeBtn.onclick = () => panel.remove();
  panel.appendChild(closeBtn);

  document.body.appendChild(panel);
}

// =======================
// Enhanced Save Earth Button
// =======================
function createAsteroidPagePanelButton(asteroid, buttonText = "🛡️ Save the Earth!") {
  if (!asteroid) return;

  const existingBtn = document.getElementById("viewAsteroidPageBtn");
  const existingMsg = document.getElementById("asteroidMessage");
  if (existingBtn) existingBtn.remove();
  if (existingMsg) existingMsg.remove();

  const message = document.createElement("div");
  message.id = "asteroidMessage";
  message.className = "ui-panel";
  message.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 24px; animation: pulse 1s infinite;">⚠️</span>
      <div>
        <strong style="color: #ff4444;">Asteroid Alert!</strong><br>
        <small>An asteroid is approaching Earth!</small>
      </div>
    </div>
  `;
  Object.assign(message.style, {
    position: "fixed",
    left: "20px",
    bottom: "100px",
    width: "280px",
    padding: "15px",
    zIndex: "1000",
    animation: "slideIn 0.5s ease-out, glow 2s infinite"
  });
  document.body.appendChild(message);

  const btn = document.createElement("button");
  btn.id = "viewAsteroidPageBtn";
  btn.className = "ui-button";
  btn.innerText = buttonText;

  Object.assign(btn.style, {
    position: "fixed",
    left: "20px",
    bottom: "30px",
    width: "280px",
    padding: "15px",
    fontSize: "16px",
    fontWeight: "900",
    zIndex: "1000",
    background: "linear-gradient(135deg, #ff8c00 0%, #ff4444 100%)",
    animation: "pulse 2s infinite"
  });

  btn.addEventListener("click", () => {
    localStorage.setItem("selectedAsteroid", JSON.stringify(asteroid));
    window.location.href = "/mitigation";
  });

  document.body.appendChild(btn);
}

// =======================
// Focus Mode
// =======================
function toggleFocusMode(phaToFocus = null) {
  focusMode = !!phaToFocus;
  focusedPHA = phaToFocus || null;

  for (const name in planetsMeshes) {
    const isEarth = name.toLowerCase() === 'earth';
    const visible = !focusMode || isEarth;
    const { mesh, orbitLine, label } = planetsMeshes[name];
    mesh.visible = visible;
    orbitLine.visible = visible;
    if (label) label.visible = visible;
  }

  sun.visible = true;

  for (const phaId in phaMeshes) {
    const isFocused = phaToFocus && phaId === String(phaToFocus.data.id);
    const { mesh, orbitLine, label } = phaMeshes[phaId];
    mesh.visible = !focusMode || isFocused;
    orbitLine.visible = !focusMode || isFocused;
    if (label) label.visible = !focusMode || isFocused;
  }

  const targetPos = phaToFocus ? phaToFocus.mesh.position : new THREE.Vector3(0, 0, 0);
  controls.target.copy(targetPos);
  camera.position.set(targetPos.x + 200, targetPos.y + 200, targetPos.z + 200);
  controls.update();
}


// =======================
// Raycaster for Interaction
// =======================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("click", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(Object.values(phaMeshes).map(p => p.mesh));

  if (intersects.length > 0) {
    const clickedMesh = intersects[0].object;
    const clickedPHA = Object.values(phaMeshes).find(p => p.mesh === clickedMesh);
    if (clickedPHA) {
      toggleFocusMode(clickedPHA);

      if (asteroidInfoData.length > 0) {
        const asteroid = asteroidInfoData.find(a => a.id == clickedPHA.data.id);
        if (asteroid) {
          focusedAsteroid = asteroid;
          currentApproachIndex = 0;
          showAsteroidInfoTab(focusedAsteroid);
          createAsteroidPagePanelButton(focusedAsteroid);
          showImpactQueryUI(focusedAsteroid);

          if (asteroid.close_approach_data && asteroid.close_approach_data.length > 0) {
            const validApproaches = asteroid.close_approach_data.filter(a => {
              const year = new Date(a.close_approach_date).getFullYear();
              return year >= 2025 && year <= 2100;
            }).sort((a, b) => new Date(a.close_approach_date) - new Date(b.close_approach_date));
            
            if (validApproaches.length > 0) {
              updateCloseApproachDisplay(validApproaches[0], validApproaches.length);
            }
          }
        }
      }
    }
  }
});

window.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  if (focusMode) {
    toggleFocusMode(null);
    const impactPanel = document.getElementById("impactQueryPanel");
    if (impactPanel) impactPanel.remove();
  }
});

// =======================
// Play / Pause & Speed Controls - REMOVED (now in createControlPanel)
// =======================
let playing = false, speed = 1;

// =======================
// Update loop
// =======================
function updateAll() {
  updatePlanets();
  updatePHAs();
  const dateEl = document.getElementById("dateDisplay");
  if (dateEl) {
    dateEl.innerText = `📅 ${currentDate.toISOString().split('T')[0]}`;
  }
}

// =======================
// Animation Loop with Sun Rotation
// =======================
function animate() {
  requestAnimationFrame(animate);
  
  // Rotate sun for visual effect
  sun.rotation.y += 0.001;
  
  if (playing) {
    for (let i = 0; i < speed; i++) {
      currentDate.setDate(currentDate.getDate() + 1);
      if (currentDate.getFullYear() > 2100) currentDate = new Date(2025, 0, 1);
      updateAll();
    }
  } else {
    updateAll();
  }
  controls.update();
  renderer.render(scene, camera);
}

// =======================
// Load Data
// =======================
fetch("static/js/planet_positions_2025_2100.json").then(r => r.json()).then(data => {
  planetPositions = data;
  createPlanetsAndOrbits();
  drawOrbits();
  updatePlanets();
  animate();
});

function disposeObject(obj) {
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach(mat => mat.dispose());
    } else {
      if (obj.material.map) obj.material.map.dispose();
      obj.material.dispose();
    }
  }
}


fetch("static/js/pha_positions_async.json").then(r => r.json()).then(data => {
  phaData = data;
});

fetch("static/js/asteroid_inf_final_updated.json").then(r => r.json()).then(data => {
  asteroidInfoData = data;
  createAsteroidSelectionUI();
});

// =======================
// Camera Setup & Resize
// =======================
camera.position.set(0, 500, 500);
controls.target.set(0, 0, 0);
controls.update();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
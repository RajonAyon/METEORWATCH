import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.153.0/examples/jsm/controls/OrbitControls.js';

    // Scene setup
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

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pointLight = new THREE.PointLight(0xffffff, 1.5);
    scene.add(pointLight);

    // Sun
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(20, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0xffaa00 })
    );
    scene.add(sun);

    // Earth
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(24, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0x3399ff })
    );
    scene.add(earth);

    // Stars
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

    // Coordinate scaling
    function scale3D(x, y, z) {
      const dist = Math.sqrt(x*x + y*y + z*z);
      const r = Math.log10(dist + 1.5) * 800;
      const theta = Math.atan2(y, x);
      const phi = Math.acos(z / dist);
      return { 
        x: r * Math.sin(phi) * Math.cos(theta), 
        y: r * Math.sin(phi) * Math.sin(theta), 
        z: r * Math.cos(phi) 
      };
    }

    // Global state
    let asteroidData = null;
    let selectedApproach = null;
    let selectedMethod = null;
    let asteroidMesh = null;
    let originalOrbitLine = null;
    let newOrbitLine = null;
    let currentDate = new Date(2025, 0, 1);
    let playing = false;
    let speed = 1;
    let mitigationApplied = false;
    let newOrbitData = null;

    // Physics constants
    const G = 6.674e-11;
    const M_SUN = 1.989e30;
    const AU = 1.496e11;
    const EARTH_RADIUS_KM = 6371;

    // Load asteroid data
    try {
      const stored = JSON.stringify(asteroidData);
      asteroidData = stored ? JSON.parse(stored) : null;
    } catch(e) {
      console.log("No asteroid data in memory");
    }

    if (!asteroidData) {
      document.getElementById('asteroidName').textContent = "No asteroid selected";
    } else {
      displayAsteroidInfo();
      loadApproaches();
      createAsteroidMesh();
    }

    // Display asteroid information
    function displayAsteroidInfo() {
      document.getElementById('asteroidName').textContent = asteroidData.name || asteroidData.id;
      document.getElementById('asteroidDiameter').textContent = `${asteroidData.avg_diameter_m.toFixed(0)} m`;
      document.getElementById('asteroidVelocity').textContent = `${asteroidData.avg_relative_velocity_earth_kms.toFixed(2)} km/s`;
      
      const mass = calculateMass(asteroidData.avg_diameter_m / 2, asteroidData.assumed_density_kg_m3);
      document.getElementById('asteroidMass').textContent = `${(mass / 1e9).toFixed(2)} × 10⁹ kg`;
      document.getElementById('asteroidDensity').textContent = `${asteroidData.assumed_density_kg_m3} kg/m³`;
    }

    function calculateMass(radius, density) {
      const volume = (4/3) * Math.PI * Math.pow(radius, 3);
      return volume * density;
    }

    // Load close approaches
    function loadApproaches() {
      const approachList = document.getElementById('approachList');
      const approaches = asteroidData.close_approach_data
        .filter(a => {
          const year = new Date(a.close_approach_date).getFullYear();
          return year >= 2025 && year <= 2100;
        })
        .sort((a, b) => new Date(a.close_approach_date) - new Date(b.close_approach_date))
        .slice(0, 10);

      approachList.innerHTML = '';
      approaches.forEach((approach, idx) => {
        const div = document.createElement('div');
        div.className = 'approach-item';
        const missKm = Number(approach.miss_distance.kilometers);
        const lunarDist = (missKm / 384400).toFixed(2);
        
        div.innerHTML = `
          <strong>${approach.close_approach_date}</strong><br>
          <small>Miss: ${missKm.toFixed(0)} km (${lunarDist} LD)</small><br>
          <small>Body: ${approach.orbiting_body}</small>
        `;
        
        div.onclick = () => {
          document.querySelectorAll('.approach-item').forEach(el => el.classList.remove('selected'));
          div.classList.add('selected');
          selectedApproach = approach;
          document.getElementById('approachSelection').style.display = 'none';
          document.getElementById('methodSelection').style.display = 'block';
        };
        
        approachList.appendChild(div);
      });
    }

    // Create asteroid mesh and orbit
    function createAsteroidMesh() {
      // Create asteroid
      asteroidMesh = new THREE.Mesh(
        new THREE.SphereGeometry(10, 16, 16),
        new THREE.MeshStandardMaterial({ 
          color: 0xff8888,
          emissive: 0xff4444,
          emissiveIntensity: 0.3
        })
      );
      scene.add(asteroidMesh);

      // Draw original orbit (if position data available)
      if (asteroidData.positions && asteroidData.positions.length > 0) {
        const points = asteroidData.positions.map(p => {
          const pos = scale3D(p.x, p.y, p.z);
          return new THREE.Vector3(pos.x, pos.y, pos.z);
        });
        
        originalOrbitLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: 0xffaa66, opacity: 0.5, transparent: true })
        );
        scene.add(originalOrbitLine);
      }
    }

    // Mitigation methods with scientific calculations
    const mitigationMethods = {
      kinetic: {
        title: "Kinetic Impactor",
        description: "Launch a spacecraft to collide with the asteroid at high velocity. NASA's DART mission (2022) successfully demonstrated this method, changing asteroid Dimorphos's orbital period by 32 minutes. Momentum transfer efficiency (β) typically 1.5-4.0.",
        params: [
          { id: "impactorMass", label: "Impactor Mass (kg)", min: 300, max: 10000, default: 500, step: 100 },
          { id: "impactVelocity", label: "Impact Velocity (km/s)", min: 5, max: 30, default: 6.6, step: 0.5 },
          { id: "beta", label: "Momentum Enhancement (β)", min: 1, max: 5, default: 3.6, step: 0.1 }
        ],
        calculate: (params, approach) => {
          const mass = calculateMass(asteroidData.avg_diameter_m / 2, asteroidData.assumed_density_kg_m3);
          const m_impactor = params.impactorMass;
          const v_impact = params.impactVelocity * 1000;
          const beta = params.beta;
          
          const deltaV = (beta * m_impactor * v_impact) / mass;
          const missChange = calculateMissDistanceChange(deltaV, approach);
          
          return {
            deltaV: deltaV,
            missChange: missChange,
            facts: [
              `Momentum transfer: ${(m_impactor * v_impact / 1e6).toFixed(2)} × 10⁶ kg⋅m/s`,
              `Impact energy: ${((0.5 * m_impactor * v_impact**2) / 4.184e9).toFixed(3)} tons TNT equivalent`,
              `β factor of ${beta} indicates ${beta > 2 ? 'excellent' : 'moderate'} ejecta contribution`,
              `Mission duration: ~${(150 / 365.25).toFixed(1)} years transit time`,
              `Deflection at impact: ${(deltaV * 1000).toFixed(2)} mm/s`
            ]
          };
        }
      },
      
      gravity: {
        title: "Gravity Tractor",
        description: "A spacecraft hovers near the asteroid using mutual gravitational attraction for gentle trajectory modification. Requires long lead time but avoids fragmentation risk. Ideal for asteroids discovered decades before impact.",
        params: [
          { id: "spacecraftMass", label: "Spacecraft Mass (kg)", min: 5000, max: 50000, default: 20000, step: 1000 },
          { id: "distance", label: "Hovering Distance (m)", min: 50, max: 500, default: 200, step: 10 },
          { id: "duration", label: "Operation Duration (years)", min: 1, max: 20, default: 10, step: 1 }
        ],
        calculate: (params, approach) => {
          const mass = calculateMass(asteroidData.avg_diameter_m / 2, asteroidData.assumed_density_kg_m3);
          const m_sc = params.spacecraftMass;
          const d = params.distance;
          const t_years = params.duration;
          const t_seconds = t_years * 365.25 * 24 * 3600;
          
          const F = G * m_sc * mass / (d * d);
          const a = F / mass;
          const deltaV = a * t_seconds;
          const missChange = calculateMissDistanceChange(deltaV, approach);
          
          return {
            deltaV: deltaV,
            missChange: missChange,
            facts: [
              `Gravitational force: ${(F * 1e6).toFixed(3)} micronewtons`,
              `Acceleration: ${(a * 1e9).toFixed(3)} nm/s²`,
              `Total thrust time: ${(t_years * 365.25 * 24).toFixed(0)} hours continuous`,
              `Fuel mass (ion propulsion): ~${(m_sc * 0.3).toFixed(0)} kg xenon`,
              `Cumulative deflection: ${(deltaV * 1000).toFixed(4)} mm/s`
            ]
          };
        }
      },
      
      laser: {
        title: "Laser Ablation",
        description: "High-powered lasers vaporize surface material, creating thrust from ejected gas. The DE-STAR concept proposes space-based laser arrays. Provides continuous, adjustable thrust with no physical contact.",
        params: [
          { id: "laserPower", label: "Laser Power (MW)", min: 10, max: 500, default: 100, step: 10 },
          { id: "efficiency", label: "Conversion Efficiency (%)", min: 1, max: 10, default: 5, step: 0.5 },
          { id: "duration", label: "Operation Duration (years)", min: 1, max: 15, default: 5, step: 1 }
        ],
        calculate: (params, approach) => {
          const mass = calculateMass(asteroidData.avg_diameter_m / 2, asteroidData.assumed_density_kg_m3);
          const P = params.laserPower * 1e6;
          const eta = params.efficiency / 100;
          const t_years = params.duration;
          const t_seconds = t_years * 365.25 * 24 * 3600;
          
          const v_exhaust = 1000;
          const mdot = (2 * eta * P) / (v_exhaust * v_exhaust);
          const m_ejected = mdot * t_seconds;
          const deltaV = v_exhaust * Math.log(mass / (mass - m_ejected));
          const missChange = calculateMissDistanceChange(deltaV, approach);
          
          return {
            deltaV: deltaV,
            missChange: missChange,
            facts: [
              `Material ablation rate: ${(mdot * 3600).toFixed(2)} kg/hour`,
              `Total mass removed: ${(m_ejected / 1000).toFixed(1)} metric tons`,
              `Thrust force: ${(mdot * v_exhaust * 1000).toFixed(1)} millinewtons`,
              `Power requirement: ${params.laserPower} MW (area of ~10 football fields of solar panels)`,
              `Surface temperature: ~3000K during ablation`
            ]
          };
        }
      },
      
      nuclear: {
        title: "Nuclear Deflection",
        description: "Nuclear device detonated near (standoff) or on (subsurface) the asteroid. X-ray energy vaporizes surface material creating thrust. 2007 NASA study showed this is most effective for large asteroids with short warning times.",
        params: [
          { id: "yieldMT", label: "Nuclear Yield (Megatons)", min: 0.1, max: 100, default: 1, step: 0.1 },
          { id: "standoff", label: "Standoff Distance (m)", min: 0, max: 1000, default: 100, step: 50 },
          { id: "coupling", label: "Energy Coupling (%)", min: 1, max: 30, default: 10, step: 1 }
        ],
        calculate: (params, approach) => {
          const mass = calculateMass(asteroidData.avg_diameter_m / 2, asteroidData.assumed_density_kg_m3);
          const Y = params.yieldMT * 4.184e15;
          const d = params.standoff;
          const eta_coupling = params.coupling / 100;
          
          const E_eff = Y * eta_coupling;
          const v_exhaust = 10000;
          const m_ejected = Math.sqrt(2 * E_eff * mass) / v_exhaust;
          const deltaV = (m_ejected * v_exhaust) / mass;
          const missChange = calculateMissDistanceChange(deltaV, approach);
          
          return {
            deltaV: deltaV,
            missChange: missChange,
            facts: [
              `X-ray energy: ${(Y * 0.7 / 4.184e15).toFixed(2)} MT (70% of total yield)`,
              `Impulse delivered: ${(m_ejected * v_exhaust / 1e9).toFixed(1)} × 10⁹ N⋅s`,
              `Crater depth: ${d === 0 ? '~' + (Math.pow(Y/4.184e15, 0.33) * 50).toFixed(0) + ' m' : 'Surface blast only'}`,
              `Warning time needed: minimum ${(0.5 + Math.random() * 1).toFixed(1)} years for mission prep`,
              `Deflection: ${(deltaV).toFixed(3)} m/s instantaneous`
            ]
          };
        }
      }
    };

    // Calculate miss distance change
    function calculateMissDistanceChange(deltaV, approach) {
      const missKm = Number(approach.miss_distance.kilometers);
      const approachDate = new Date(approach.close_approach_date);
      const yearsUntil = (approachDate - currentDate) / (365.25 * 24 * 3600 * 1000);
      
      // Simple approximation: deflection = deltaV * time_until_approach
      const deflection_m = deltaV * yearsUntil * 365.25 * 24 * 3600;
      const deflection_km = deflection_m / 1000;
      
      return {
        original: missKm,
        new: missKm + deflection_km,
        change: deflection_km,
        safe: (missKm + deflection_km) > (EARTH_RADIUS_KM * 3)
      };
    }

    // Calculate new orbit after mitigation
    function calculateNewOrbit(position, velocity, deltaV_ms, method) {
      const newPositions = [];
      const AU_M = 1.496e11;
      
      // Convert position to meters
      let x = position.x * AU_M;
      let y = position.y * AU_M;
      let z = position.z * AU_M;
      
      // Convert velocity to m/s (approximate from orbital mechanics)
      const r = Math.sqrt(x*x + y*y + z*z);
      const v_orbital = Math.sqrt(G * M_SUN / r);
      
      // Apply delta-V in velocity direction
      const v_factor = (v_orbital + deltaV_ms) / v_orbital;
      let vx = velocity.vx * v_factor;
      let vy = velocity.vy * v_factor;
      let vz = velocity.vz * v_factor;
      
      // Propagate orbit for 1 year using simple numerical integration
      const dt = 86400; // 1 day
      const days = 365;
      
      for (let day = 0; day < days; day++) {
        newPositions.push({
          x: x / AU_M,
          y: y / AU_M,
          z: z / AU_M,
          day: day
        });
        
        // Calculate gravitational acceleration
        const r_current = Math.sqrt(x*x + y*y + z*z);
        const acc_mag = -G * M_SUN / (r_current * r_current);
        
        const ax = acc_mag * x / r_current;
        const ay = acc_mag * y / r_current;
        const az = acc_mag * z / r_current;
        
        // Update velocity and position (Euler integration)
        vx += ax * dt;
        vy += ay * dt;
        vz += az * dt;
        
        x += vx * dt;
        y += vy * dt;
        z += vz * dt;
      }
      
      return newPositions;
    }

    // Method selection UI
    document.querySelectorAll('.method-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const method = btn.dataset.method;
        selectedMethod = method;
        showMethodDetails(method);
      });
    });

    function showMethodDetails(method) {
      const methodData = mitigationMethods[method];
      const details = document.getElementById('methodDetails');
      
      document.getElementById('methodTitle').textContent = methodData.title;
      document.getElementById('methodDescription').textContent = methodData.description;
      
      const paramsDiv = document.getElementById('methodParams');
      paramsDiv.innerHTML = '';
      
      methodData.params.forEach(param => {
        const control = document.createElement('div');
        control.className = 'param-control';
        control.innerHTML = `
          <label>
            ${param.label}
            <span class="param-value" id="${param.id}_value">${param.default}</span>
          </label>
          <input type="range" 
                 id="${param.id}" 
                 min="${param.min}" 
                 max="${param.max}" 
                 value="${param.default}" 
                 step="${param.step}">
        `;
        paramsDiv.appendChild(control);
        
        const slider = control.querySelector('input');
        const valueSpan = control.querySelector('.param-value');
        slider.addEventListener('input', (e) => {
          valueSpan.textContent = e.target.value;
        });
      });
      
      details.classList.add('visible');
    }

    // Apply mitigation
    document.getElementById('applyBtn').addEventListener('click', () => {
      if (!selectedMethod || !selectedApproach) return;
      
      const methodData = mitigationMethods[selectedMethod];
      const params = {};
      
      methodData.params.forEach(param => {
        params[param.id] = parseFloat(document.getElementById(param.id).value);
      });
      
      const result = methodData.calculate(params, selectedApproach);
      
      // Calculate new orbit
      if (asteroidData.positions && asteroidData.positions.length > 0) {
        const currentPos = asteroidData.positions[0];
        
        // Estimate velocity from positions
        const nextPos = asteroidData.positions[1] || currentPos;
        const velocity = {
          vx: (nextPos.x - currentPos.x) * AU / 86400,
          vy: (nextPos.y - currentPos.y) * AU / 86400,
          vz: (nextPos.z - currentPos.z) * AU / 86400
        };
        
        newOrbitData = calculateNewOrbit(currentPos, velocity, result.deltaV, selectedMethod);
        
        // Draw new orbit
        if (newOrbitLine) {
          scene.remove(newOrbitLine);
        }
        
        const newPoints = newOrbitData.map(p => {
          const pos = scale3D(p.x, p.y, p.z);
          return new THREE.Vector3(pos.x, pos.y, pos.z);
        });
        
        newOrbitLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(newPoints),
          new THREE.LineBasicMaterial({ color: 0x44ff44, opacity: 0.8, transparent: true, linewidth: 2 })
        );
        scene.add(newOrbitLine);
        
        // Make original orbit dimmer
        if (originalOrbitLine) {
          originalOrbitLine.material.opacity = 0.2;
        }
      }
      
      mitigationApplied = true;
      displayResults(result);
    });

    function displayResults(result) {
      const panel = document.getElementById('resultPanel');
      const details = document.getElementById('resultDetails');
      
      const missStatus = result.missChange.safe ? 
        '<span style="color: #44ff44;">SAFE</span>' : 
        '<span style="color: #ff4444;">REQUIRES ADDITIONAL MITIGATION</span>';
      
      details.innerHTML = `
        <div style="margin-bottom: 15px; padding: 10px; background: rgba(50,50,90,0.5); border-radius: 6px;">
          <strong>Mission Status:</strong> ${missStatus}
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
          <div>
            <strong>Delta-V Applied:</strong><br>
            ${result.deltaV.toFixed(4)} m/s
          </div>
          <div>
            <strong>Mission Date:</strong><br>
            ${selectedApproach.close_approach_date}
          </div>
        </div>
        
        <div style="margin-bottom: 15px; padding: 10px; background: rgba(50,50,90,0.5); border-radius: 6px;">
          <strong>Original Miss Distance:</strong> ${result.missChange.original.toFixed(0)} km<br>
          <strong>New Miss Distance:</strong> ${result.missChange.new.toFixed(0)} km<br>
          <strong>Change:</strong> <span style="color: #44ff44;">+${result.missChange.change.toFixed(0)} km</span>
        </div>
        
        <div style="border-top: 1px solid rgba(100,150,255,0.3); padding-top: 15px;">
          <strong style="color: #667eea;">Scientific Facts:</strong>
          <ul style="margin-top: 10px; padding-left: 20px; line-height: 1.8;">
            ${result.facts.map(fact => `<li>${fact}</li>`).join('')}
          </ul>
        </div>
      `;
      
      panel.classList.add('visible');
    }

    // Animation and controls
    let animationId;
    
    function animate() {
      animationId = requestAnimationFrame(animate);
      
      sun.rotation.y += 0.001;
      
      if (playing && asteroidData.positions) {
        for (let i = 0; i < speed; i++) {
          currentDate.setDate(currentDate.getDate() + 1);
          updateAsteroidPosition();
        }
      } else {
        updateAsteroidPosition();
      }
      
      controls.update();
      renderer.render(scene, camera);
    }

    function updateAsteroidPosition() {
      if (!asteroidData.positions) return;
      
      const jd = julianDay(currentDate);
      const positions = mitigationApplied && newOrbitData ? newOrbitData : asteroidData.positions;
      
      const posEntry = positions.find(p => Math.abs(Math.floor(p.time_jd || jd) - jd) < 1);
      
      if (posEntry && asteroidMesh) {
        const pos = scale3D(posEntry.x, posEntry.y, posEntry.z);
        asteroidMesh.position.set(pos.x, pos.y, pos.z);
      }
      
      // Update Earth position (simplified - circular orbit)
      const earthAngle = (currentDate - new Date(2025, 0, 1)) / (365.25 * 24 * 3600 * 1000) * 2 * Math.PI;
      const earthDist = 800;
      earth.position.set(
        earthDist * Math.cos(earthAngle),
        0,
        earthDist * Math.sin(earthAngle)
      );
      
      document.getElementById('dateDisplay').textContent = currentDate.toISOString().split('T')[0];
    }

    function julianDay(date) {
      return Math.floor(2451545.0 + (date - new Date(2000,0,1,12,0,0))/86400000);
    }

    // Controls
    document.getElementById('playBtn').addEventListener('click', () => {
      playing = !playing;
      document.getElementById('playBtn').textContent = playing ? '⏸ Pause' : '▶ Play';
    });

    document.getElementById('speedBtn').addEventListener('click', () => {
      speed *= 2;
      if (speed > 16) speed = 1;
      document.getElementById('speedBtn').textContent = `⚡ x${speed}`;
    });

    document.getElementById('backBtn').addEventListener('click', () => {
      window.history.back();
    });

    // Camera setup
    camera.position.set(0, 500, 800);
    controls.target.set(0, 0, 0);
    controls.update();

    // Handle resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Start animation
    animate();

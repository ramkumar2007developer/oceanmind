/* ==========================================================================
   OCEANMIND - LIVE TAMIL NADU LEAFLET MARITIME MAP MODULE (js/map.js)
   Full Tamil Nadu Coastline (1,076 km) Mapping & Vessel Telemetry System
   - International Maritime Boundary Line (IMBL India - Sri Lanka)
   - Tamil Nadu Coastal Quick-Jump Sectors (Rameshwaram, Tuticorin, Nagapattinam, Chennai, Kanyakumari)
   - Indian Coast Guard Bases & Lighthouse Overlays
   - Multi-Vessel Fleet Tracking with Dynamic Rotational Markers & Movement Trails
   - Map Tile Switcher (Dark Marine, Esri Satellite, Ocean Topography)
   - Real-time Haversine Geofence Distance Calculator
   ========================================================================== */

class MaritimeMapManager {
  constructor(elementId) {
    this.elementId = elementId;
    this.map = null;
    this.currentTileLayer = null;
    this.tileLayers = {};
    
    // Primary Active Vessel (Ocean Sentinel IX - Rameshwaram)
    this.activeBoatId = 1;
    this.boatMarkers = {}; // boat_id -> L.marker
    this.trailPolylines = {}; // boat_id -> L.polyline
    this.trailCoordsMap = {}; // boat_id -> array of [lat, lng]

    // Tamil Nadu Coastal Sector Viewports & Bounds
    this.tnSectors = {
      rameshwaram: {
        name: "Rameshwaram & Palk Strait",
        center: [9.2885, 79.3129],
        zoom: 11,
        bounds: [[9.10, 79.05], [9.45, 79.60]]
      },
      tuticorin: {
        name: "Gulf of Mannar & Thoothukudi",
        center: [8.7642, 78.1348],
        zoom: 11,
        bounds: [[8.50, 77.90], [9.00, 78.50]]
      },
      nagapattinam: {
        name: "Nagapattinam Coast",
        center: [10.7672, 79.8449],
        zoom: 11,
        bounds: [[10.50, 79.70], [11.00, 80.05]]
      },
      chennai: {
        name: "Chennai Port Sector",
        center: [13.0827, 80.2707],
        zoom: 11,
        bounds: [[12.90, 80.15], [13.25, 80.45]]
      },
      kanyakumari: {
        name: "Kanyakumari Waters",
        center: [8.0883, 77.5385],
        zoom: 11,
        bounds: [[7.90, 77.35], [8.25, 77.75]]
      },
      full_tn: {
        name: "Full Tamil Nadu Coastline",
        center: [10.2000, 79.2000],
        zoom: 7,
        bounds: [[7.80, 76.80], [13.50, 80.80]]
      }
    };

    // Fleet of Registered Tamil Nadu Fishing Vessels
    this.fleetState = {
      1: { id: 1, name: "Ocean Sentinel IX", reg: "IND-TN-10-MM-884", port: "Rameshwaram", lat: 9.2845, lng: 79.3120, heading: 115, speed: 12.4, status: "SAFE ZONE" },
      2: { id: 2, name: "Kadal Kani II", reg: "IND-TN-01-CP-102", port: "Chennai Port", lat: 13.0900, lng: 80.2950, heading: 85, speed: 10.2, status: "SAFE ZONE" },
      3: { id: 3, name: "Pearl Fisher V", reg: "IND-TN-06-TT-505", port: "Thoothukudi", lat: 8.7800, lng: 78.1800, heading: 140, speed: 14.1, status: "SAFE ZONE" },
      4: { id: 4, name: "Velankanni Star", reg: "IND-TN-08-NG-304", port: "Nagapattinam", lat: 10.7600, lng: 79.8600, heading: 95, speed: 11.0, status: "SAFE ZONE" },
      5: { id: 5, name: "Kumari Breeze", reg: "IND-TN-12-KK-201", port: "Kanyakumari", lat: 8.0750, lng: 77.5600, heading: 175, speed: 9.5, status: "SAFE ZONE" }
    };

    // International Maritime Boundary Line (IMBL) - India / Sri Lanka Palk Strait & Gulf of Mannar
    this.imblCoords = [
      [9.4000, 79.2000], // Point 1: North Palk Bay
      [9.3500, 79.3500], // Point 2: Near Kachchatheevu Island
      [9.2500, 79.5000], // Point 3: Palk Strait Channel
      [9.1200, 79.6800], // Point 4: Adam's Bridge / Pamban Gap East
      [8.9500, 79.8500], // Point 5: North Gulf of Mannar
      [8.6000, 79.2000], // Point 6: Mid Gulf of Mannar
      [8.3000, 78.8000], // Point 7: South Gulf of Mannar
      [8.0000, 78.4000]  // Point 8: Deep Indian Ocean Approach
    ];

    // Geofence Danger Zone (0 - 1.5 NM from IMBL)
    this.dangerZonePolygon = [
      [9.4000, 79.2000],
      [9.3500, 79.3500],
      [9.2500, 79.5000],
      [9.1200, 79.6800],
      [8.9500, 79.8500],
      [8.6000, 79.2000],
      [8.3000, 78.8000],
      [8.0000, 78.4000],
      [7.9500, 78.3000],
      [8.2500, 78.7000],
      [8.5500, 79.1000],
      [8.9000, 79.7500],
      [9.0800, 79.6000],
      [9.2100, 79.4400],
      [9.3100, 79.2900],
      [9.3600, 79.1500]
    ];

    // Geofence Warning Buffer Zone (1.5 NM - 3.5 NM from IMBL)
    this.warningZonePolygon = [
      [9.3600, 79.1500],
      [9.3100, 79.2900],
      [9.2100, 79.4400],
      [9.0800, 79.6000],
      [8.9000, 79.7500],
      [8.5500, 79.1000],
      [8.2500, 78.7000],
      [7.9500, 78.3000],
      [7.8800, 78.1500],
      [8.1800, 78.5500],
      [8.4800, 78.9500],
      [8.8200, 79.6500],
      [9.0000, 79.5000],
      [9.1500, 79.3000],
      [9.2600, 79.1500],
      [9.3000, 79.0500]
    ];

    // Indian Coast Guard Bases & Maritime Stations in Tamil Nadu
    this.cgStations = [
      { name: "ICGS Mandapam (Rameshwaram)", lat: 9.2778, lng: 79.1245, ch: "VHF CH 16 / 08", status: "OPERATIONAL" },
      { name: "ICGS HQ Chennai", lat: 13.0850, lng: 80.2910, ch: "VHF CH 16 / 12", status: "OPERATIONAL" },
      { name: "ICGS Thoothukudi", lat: 8.7520, lng: 78.1610, ch: "VHF CH 16 / 06", status: "OPERATIONAL" },
      { name: "ICGS Karaikal", lat: 10.9210, lng: 79.8420, ch: "VHF CH 16 / 14", status: "OPERATIONAL" }
    ];

    this.initMap();
  }

  initMap() {
    const container = document.getElementById(this.elementId);
    if (!container || typeof L === 'undefined') {
      console.warn('Leaflet map container or library missing');
      return;
    }

    const initialCenter = this.fleetState[1] ? [this.fleetState[1].lat, this.fleetState[1].lng] : [9.2885, 79.3129];

    // Initialize Leaflet Map
    this.map = L.map(this.elementId, {
      center: initialCenter,
      zoom: 11,
      zoomControl: false,
      attributionControl: false
    });

    // Define Tile Layers
    this.tileLayers = {
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 18, subdomains: 'abcd' }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18 }),
      ocean: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 })
    };

    // Default to Dark Marine mode
    this.currentTileLayer = this.tileLayers.dark;
    this.currentTileLayer.addTo(this.map);

    // Zoom Controls on Top Right
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    // Render Tamil Nadu Layers
    this.drawTamilNaduGeofences();
    this.drawCoastGuardStations();
    this.initFleetMarkers();
  }

  // Switch Tile Layer (Dark / Satellite / Ocean)
  switchTileLayer(layerKey) {
    if (!this.tileLayers[layerKey] || !this.map) return;
    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }
    this.currentTileLayer = this.tileLayers[layerKey];
    this.currentTileLayer.addTo(this.map);
  }

  // Zoom map to specific Tamil Nadu sector
  zoomToSector(sectorKey) {
    const sector = this.tnSectors[sectorKey];
    if (!sector || !this.map) return;

    if (sector.bounds) {
      this.map.fitBounds(sector.bounds, { padding: [30, 30], animate: true, duration: 1.2 });
    } else {
      this.map.flyTo(sector.center, sector.zoom, { animate: true, duration: 1.2 });
    }
  }

  drawTamilNaduGeofences() {
    // 1. International Maritime Boundary Line (IMBL - India/Sri Lanka)
    L.polyline(this.imblCoords, {
      color: '#FF3B5C',
      weight: 3.5,
      dashArray: '9, 9',
      opacity: 0.95
    }).addTo(this.map).bindTooltip('Demo Maritime Boundary — India-Sri Lanka maritime boundary visualization', {
      permanent: true,
      direction: 'center',
      className: 'leaflet-tooltip-border'
    });

    // 2. Danger Geofence Zone (Flashing Red)
    L.polygon(this.dangerZonePolygon, {
      color: '#FF3B5C',
      weight: 1,
      fillColor: '#FF3B5C',
      fillOpacity: 0.20
    }).addTo(this.map).bindPopup('<strong>DANGER ZONE</strong>: Sri Lanka IMBL Border Proximity (< 1.5 NM)');

    // 3. Warning Buffer Zone (Amber)
    L.polygon(this.warningZonePolygon, {
      color: '#FFB020',
      weight: 1,
      fillColor: '#FFB020',
      fillOpacity: 0.12
    }).addTo(this.map).bindPopup('<strong>WARNING ZONE</strong>: Approaching IMBL Proximity Buffer (2.5 NM)');
  }

  drawCoastGuardStations() {
    this.cgStations.forEach(st => {
      const cgHtml = `
        <div class="cg-station-marker" title="${st.name}">
          <div class="cg-pulse-ring"></div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFB020" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
      `;

      const icon = L.divIcon({
        html: cgHtml,
        className: 'cg-leaflet-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      L.marker([st.lat, st.lng], { icon: icon }).addTo(this.map).bindPopup(`
        <div class="map-popup-card">
          <h4 style="color: #FFB020; margin-bottom: 4px;">🛡️ ${st.name}</h4>
          <p style="font-size: 0.82rem;"><strong>Comms:</strong> ${st.ch}</p>
          <p style="font-size: 0.82rem;"><strong>Status:</strong> <span style="color:#12D18E;">${st.status}</span></p>
        </div>
      `);
    });
  }

  initFleetMarkers() {
    Object.values(this.fleetState).forEach(boat => {
      this.createOrUpdateVesselMarker(boat);
    });
  }

  createOrUpdateVesselMarker(boat) {
    const isMain = boat.id === this.activeBoatId;
    const strokeColor = isMain ? "#00B4FF" : "#12D18E";
    const fillColor = isMain ? "#1DE9FF" : "#12D18E";

    const boatSvg = `
      <div class="custom-boat-marker" id="boat-marker-icon-${boat.id}" style="transform: rotate(${boat.heading}deg);">
        <svg width="34" height="34" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="18" r="16" fill="rgba(0, 180, 255, 0.2)" stroke="${strokeColor}" stroke-width="1.5"/>
          <path d="M18 4L26 28L18 22L10 28L18 4Z" fill="${fillColor}" stroke="#041221" stroke-width="1.5"/>
        </svg>
      </div>
    `;

    const icon = L.divIcon({
      html: boatSvg,
      className: `boat-leaflet-icon ${isMain ? 'active-vessel' : ''}`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    if (this.boatMarkers[boat.id]) {
      this.boatMarkers[boat.id].setLatLng([boat.lat, boat.lng]);
      this.boatMarkers[boat.id].setIcon(icon);
    } else {
      const marker = L.marker([boat.lat, boat.lng], { icon: icon }).addTo(this.map);
      marker.bindPopup(`
        <div class="map-popup-card">
          <h4 style="color: #1DE9FF; margin-bottom: 4px;">⛵ Vessel: ${boat.name}</h4>
          <p style="font-size: 0.85rem;"><strong>Reg:</strong> ${boat.reg}</p>
          <p style="font-size: 0.85rem;"><strong>Port:</strong> ${boat.port}</p>
          <p style="font-size: 0.85rem;"><strong>Speed:</strong> ${boat.speed} kts | Heading: ${boat.heading}°</p>
          <p style="font-size: 0.85rem;"><strong>Status:</strong> <span class="badge badge-success">${boat.status}</span></p>
        </div>
      `);
      this.boatMarkers[boat.id] = marker;
    }

    // Initialize or update trail
    if (!this.trailCoordsMap[boat.id]) {
      this.trailCoordsMap[boat.id] = [[boat.lat, boat.lng]];
      this.trailPolylines[boat.id] = L.polyline(this.trailCoordsMap[boat.id], {
        color: fillColor,
        weight: 2,
        opacity: 0.75,
        dashArray: '4, 6'
      }).addTo(this.map);
    }
  }

  selectActiveVessel(boatId) {
    if (!this.fleetState[boatId]) return;
    this.activeBoatId = boatId;
    const boat = this.fleetState[boatId];

    // Re-render markers to update active vessel visual styling
    Object.values(this.fleetState).forEach(b => this.createOrUpdateVesselMarker(b));

    // Pan map to vessel
    if (this.map) {
      this.map.panTo([boat.lat, boat.lng], { animate: true, duration: 0.8 });
    }
  }

  updateBoatPosition(lat, lng, heading, speed, targetBoatId = null) {
    const boatId = targetBoatId || this.activeBoatId;
    const boat = this.fleetState[boatId];
    if (!boat) return;

    boat.lat = lat;
    boat.lng = lng;
    boat.heading = heading;
    boat.speed = speed;

    this.createOrUpdateVesselMarker(boat);

    // Append to movement trail
    if (!this.trailCoordsMap[boatId]) {
      this.trailCoordsMap[boatId] = [[lat, lng]];
    } else {
      const trail = this.trailCoordsMap[boatId];
      trail.push([lat, lng]);
      if (trail.length > 60) trail.shift();
      if (this.trailPolylines[boatId]) {
        this.trailPolylines[boatId].setLatLngs(trail);
      }
    }

    // Active vessel panning & compass rose update
    if (boatId === this.activeBoatId) {
      const compassEl = document.getElementById('compass-rose-icon');
      if (compassEl) {
        compassEl.style.transform = `rotate(${heading}deg)`;
      }
      if (this.map) {
        this.map.panTo([lat, lng], { animate: true, duration: 0.6 });
      }
    }
  }

  // Calculate Haversine Distance in Nautical Miles (NM) to nearest Tamil Nadu IMBL point
  calculateDistanceToBorder() {
    const activeBoat = this.fleetState[this.activeBoatId];
    if (!activeBoat) return "5.82";

    let minDistanceNM = 999;
    const R = 3440.065; // Earth radius in Nautical Miles

    const lat1 = activeBoat.lat * Math.PI / 180;
    const lon1 = activeBoat.lng * Math.PI / 180;

    for (let i = 0; i < this.imblCoords.length; i++) {
      const lat2 = this.imblCoords[i][0] * Math.PI / 180;
      const lon2 = this.imblCoords[i][1] * Math.PI / 180;

      const dlat = lat2 - lat1;
      const dlon = lon2 - lon1;

      const a = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c;

      if (dist < minDistanceNM) minDistanceNM = dist;
    }

    return minDistanceNM.toFixed(2);
  }
}

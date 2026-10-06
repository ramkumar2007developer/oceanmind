/* ==========================================================================
   OCEANMIND - COMMAND CENTER DASHBOARD CONTROLLER (js/dashboard.js)
   Controls telemetry cards, real-time clock, border simulator, alert search/pagination,
   SOS emergency distress workflow, and connects to FastAPI backend endpoints.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  let mapManager = null;
  let isSimulating = false;
  let simInterval = null;
  let currentSimStep = 0;
  let alertLogCount = 0;

  // 0. AUTH CHECK & USER PROFILE UPDATE
  const token = localStorage.getItem("access_token");
  const storedUser = JSON.parse(
    localStorage.getItem("oceanmind_user") || "null",
  );
  const nameEl = document.querySelector(".user-profile-badge span:first-child");
  const roleEl = document.querySelector(".user-profile-badge span:last-child");
  const avatarEl = document.querySelector(".user-profile-badge .avatar");

  function updateProfileBadge(user) {
    if (!user) return;
    const displayName =
      `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email;
    if (nameEl) nameEl.innerText = displayName;
    if (roleEl) roleEl.innerText = (user.role || "Fisherman").toUpperCase();
    if (avatarEl)
      avatarEl.innerText = (
        user.first_name ? user.first_name[0] : user.email ? user.email[0] : "U"
      ).toUpperCase();
  }

  if (storedUser) {
    updateProfileBadge(storedUser);
  }

  if (token && typeof authApi !== "undefined") {
    try {
      const me = await authApi.getMe();
      const userProfile = me || storedUser;
      if (userProfile) {
        updateProfileBadge(userProfile);
        localStorage.setItem(
          "oceanmind_user",
          JSON.stringify({
            email: userProfile.email,
            role: userProfile.role,
            first_name: userProfile.first_name,
            last_name: userProfile.last_name,
            user_id: userProfile.user_id,
          }),
        );
      }
    } catch (e) {
      if (storedUser) {
        updateProfileBadge(storedUser);
      }
      console.warn("Auth check warning:", e);
    }
  }

  // Logout button handler
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn && typeof authApi !== "undefined") {
    logoutBtn.addEventListener("click", () => {
      authApi.logout();
    });
  }

  // Mobile Sidebar Drawer Toggle
  const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
  const sidebar = (id) => document.getElementById(id);
  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener("click", () => {
      const sidebarEl = sidebar("dashboard-sidebar");
      if (sidebarEl) sidebarEl.classList.toggle("show");
    });
  }

  // Initialize Leaflet Map
  if (
    document.getElementById("leaflet-map") &&
    typeof MaritimeMapManager !== "undefined"
  ) {
    mapManager = new MaritimeMapManager("leaflet-map");
  }

  // TAMIL NADU COASTAL SECTOR QUICK-JUMP BUTTON HANDLERS
  const sectorBtns = document.querySelectorAll(".tn-sector-btn");
  sectorBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      sectorBtns.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");

      const sectorKey = btn.getAttribute("data-sector");
      if (mapManager && sectorKey) {
        mapManager.zoomToSector(sectorKey);
        // Allow Leaflet to repaint after zoom animation
        setTimeout(() => { if (mapManager.map) mapManager.map.invalidateSize(); }, 450);
        if (typeof showToast === "function") {
          showToast(`Zoomed map to ${btn.innerText.trim()}`, "info");
        }
      }
    });
  });

  // MAP LAYER SWITCHER HANDLERS (Dark / Satellite / Standard)
  const layerBtns = document.querySelectorAll(".map-layer-btn");
  layerBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      layerBtns.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");

      const layerKey = btn.getAttribute("data-layer");
      if (mapManager && layerKey) {
        mapManager.switchTileLayer(layerKey);
      }
    });
  });

  // WINDOW RESIZE → Leaflet invalidateSize()
  window.addEventListener("resize", () => {
    if (mapManager && mapManager.map) {
      clearTimeout(window._omResizeTimer);
      window._omResizeTimer = setTimeout(() => mapManager.map.invalidateSize(), 200);
    }
  });

  // VESSEL DROPDOWN SELECTION HANDLER
  const vesselDropdown = document.getElementById("vessel-select-dropdown");
  if (vesselDropdown) {
    vesselDropdown.addEventListener("change", (e) => {
      const boatId = parseInt(e.target.value, 10);
      if (mapManager && boatId) {
        mapManager.selectActiveVessel(boatId);
        const boat = mapManager.fleetState[boatId];
        if (boat) {
          updateTelemetryUI(boat.lat, boat.lng, boat.speed, boat.heading, mapManager.calculateDistanceToBorder());
          
          // Update boat name card & reg card
          const boatCardVal = document.querySelector(".telemetry-card:nth-child(1) .telemetry-value");
          const regCardVal = document.querySelector(".telemetry-card:nth-child(2) .telemetry-value");
          if (boatCardVal) boatCardVal.innerText = boat.name;
          if (regCardVal) regCardVal.innerText = boat.reg;
          
          if (typeof showToast === "function") {
            showToast(`Tracking Vessel: ${boat.name} (${boat.port})`, "success");
          }
        }
      }
    });
  }

  // 1. REAL-TIME CLOCK (IST & UTC)
  function updateClock() {
    const clockEl = document.getElementById("live-clock");
    if (!clockEl) return;

    const now = new Date();
    const istTime = now.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
    });
    const utcTime = now.toISOString().substring(11, 19) + " UTC";
    clockEl.innerText = `${istTime} IST | ${utcTime}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // 2. ADD BOAT MODAL HANDLER
  const addBoatModal = document.getElementById("add-boat-modal");
  const openAddBoatBtn = document.getElementById("open-add-boat-modal-btn");
  const closeAddBoatBtn = document.getElementById("close-add-boat-modal");
  const addBoatForm = document.getElementById("add-boat-form");

  if (openAddBoatBtn && addBoatModal) {
    openAddBoatBtn.addEventListener("click", () =>
      addBoatModal.classList.add("show"),
    );
  }
  if (closeAddBoatBtn && addBoatModal) {
    closeAddBoatBtn.addEventListener("click", () =>
      addBoatModal.classList.remove("show"),
    );
  }

  if (addBoatForm) {
    addBoatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const boat_id = document.getElementById("new-boat-id").value.trim();
      const fisherman_name = document
        .getElementById("new-fisherman-name")
        .value.trim();
      const latitude = parseFloat(
        document.getElementById("new-latitude").value,
      );
      const longitude = parseFloat(
        document.getElementById("new-longitude").value,
      );

      if (typeof showToast === "function")
        showToast("Adding boat to FastAPI backend...", "info");

      try {
        await boatApi.addBoat({ boat_id, fisherman_name, latitude, longitude });
        if (typeof showToast === "function") {
          showToast(`Boat ${boat_id} registered successfully!`, "success");
        }
        if (addBoatModal) addBoatModal.classList.remove("show");
        loadBackendData();
      } catch (err) {
        if (typeof showToast === "function") {
          showToast(err.message || "Failed to add boat", "danger");
        }
      }
    });
  }

  // 3. FETCH AND DISPLAY REAL FASTAPI BACKEND DATA
  async function loadBackendData() {
    // A. PostgreSQL Alerts (GET /alerts)
    try {
      if (typeof alertApi !== "undefined") {
        const alerts = await alertApi.getAlerts();
        renderAlertsTable(alerts);
      }
    } catch (err) {
      console.warn("Backend /alerts error:", err);
    }

    // B. PostgreSQL Boats (GET /boats) & In-memory Boats (GET /api/boats)
    try {
      if (typeof boatApi !== "undefined") {
        const dbBoats = await boatApi.getBoatsDB().catch(() => []);
        const apiBoatsRes = await boatApi
          .getBoats()
          .catch(() => ({ boats: [] }));
        const apiBoats =
          apiBoatsRes && apiBoatsRes.boats ? apiBoatsRes.boats : [];

        const totalFleetCount = (dbBoats && dbBoats.length > 0) ? dbBoats.length : apiBoats.length;

        const boatCardVal = document.querySelector(
          ".telemetry-card:nth-child(1) .telemetry-value",
        );
        const boatCardSub = document.querySelector(
          ".telemetry-card:nth-child(1) .telemetry-subtext",
        );
        const regCardVal = document.querySelector(
          ".telemetry-card:nth-child(2) .telemetry-value",
        );
        const regCardSub = document.querySelector(
          ".telemetry-card:nth-child(2) .telemetry-subtext",
        );

        if (dbBoats && dbBoats.length > 0) {
          if (boatCardVal) boatCardVal.innerText = dbBoats[0].boat_name;
          if (boatCardSub)
            boatCardSub.innerText = `Type: ${dbBoats[0].boat_type || "Vessel"} (Fleet: ${totalFleetCount})`;
          if (regCardVal) regCardVal.innerText = dbBoats[0].registration_number;
          if (regCardSub) regCardSub.innerText = `DB ID: ${dbBoats[0].boat_id}`;
        } else if (apiBoats.length > 0) {
          if (boatCardVal) boatCardVal.innerText = apiBoats[0].fisherman_name;
          if (boatCardSub)
            boatCardSub.innerText = `ID: ${apiBoats[0].boat_id} (Fleet: ${totalFleetCount})`;
        }
      }
    } catch (err) {
      console.warn("Backend /boats error:", err);
    }

    // C. GPS Locations (GET /gps-locations)
    try {
      if (typeof gpsApi !== "undefined") {
        const gpsRes = await gpsApi.getLocations();
        if (gpsRes && gpsRes.gps_locations && gpsRes.gps_locations.length > 0) {
          const firstGps = gpsRes.gps_locations[0];
          updateTelemetryUI(
            firstGps.latitude,
            firstGps.longitude,
            12.4,
            115,
            5.82,
          );
          if (mapManager) {
            mapManager.updateBoatPosition(
              firstGps.latitude,
              firstGps.longitude,
              115,
              12.4,
            );
          }
        }
      }
    } catch (err) {
      console.warn("Backend /gps-locations error:", err);
    }

    // D. Maritime Borders (GET /maritime-borders)
    try {
      if (typeof maritimeApi !== "undefined") {
        const borderRes = await maritimeApi.getBorders();
        console.log("Loaded Maritime Borders:", borderRes);
      }
    } catch (err) {
      console.warn("Backend /maritime-borders error:", err);
    }

    // E. SOS Requests (GET /sos-requests)
    try {
      if (typeof sosApi !== "undefined") {
        const sosRes = await sosApi.getRequests();
        if (sosRes && sosRes.sos_requests && sosRes.sos_requests.length > 0) {
          const sosStatusEl = document.getElementById("sos-status-val");
          if (sosStatusEl) {
            sosStatusEl.innerText = `${sosRes.sos_requests[0].status.toUpperCase()}`;
          }
        }
      }
    } catch (err) {
      console.warn("Backend /sos-requests error:", err);
    }
  }

  function renderAlertsTable(alerts) {
    const tbody = document.getElementById("alerts-table-body");
    const countEl = document.getElementById("alert-count-val");
    if (!tbody) return;

    if (!alerts || alerts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No alert records found in PostgreSQL database.</td></tr>`;
      if (countEl) countEl.innerText = "0 Logs";
      return;
    }

    alertLogCount = alerts.length;
    if (countEl) countEl.innerText = `${alerts.length} Logs`;
    tbody.innerHTML = "";

    alerts.forEach((alert) => {
      const row = document.createElement("tr");
      const type = (alert.alert_type || "INFO").toUpperCase();
      const badgeClass =
        type === "DANGER" || type === "CRITICAL"
          ? "badge-danger"
          : type === "WARNING"
            ? "badge-warning"
            : "badge-success";

      const formattedTime = alert.created_at
        ? new Date(alert.created_at).toLocaleTimeString()
        : "N/A";
      const distance =
        alert.distance_from_border != null
          ? `${alert.distance_from_border} NM`
          : "N/A";

      row.innerHTML = `
        <td><span class="badge ${badgeClass}">${type}</span></td>
        <td>${alert.message || "Border status check"}</td>
        <td>${distance}</td>
        <td>${formattedTime}</td>
        <td><span class="status-dot ${type === "DANGER" ? "danger" : "active"}"></span> LOGGED</td>
      `;
      tbody.appendChild(row);
    });
  }

  // Load initial backend data
  loadBackendData();

  // 4. SIMULATION CONTROLLER (Approaching & Crossing Maritime Border)
  const simToggleBtn = document.getElementById("sim-toggle-btn");
  if (simToggleBtn && mapManager) {
    simToggleBtn.addEventListener("click", () => {
      if (!isSimulating) {
        startSimulation();
      } else {
        stopSimulation();
      }
    });
  }

  // 4B. LIVE MULTI-VESSEL TELEMETRY STREAM CONTROLLER (Phase 3B)
  let isTelemetryStreaming = false;
  let telemetryInterval = null;
  const liveTelemetryBtn = document.getElementById("live-telemetry-toggle-btn");

  if (liveTelemetryBtn) {
    liveTelemetryBtn.addEventListener("click", () => {
      if (!isTelemetryStreaming) {
        startTelemetryStream();
      } else {
        stopTelemetryStream();
      }
    });
  }

  function startTelemetryStream() {
    if (isTelemetryStreaming || telemetryInterval) return;
    isTelemetryStreaming = true;
    if (liveTelemetryBtn) {
      liveTelemetryBtn.innerHTML = "⏸ Pause Live Telemetry Stream";
      liveTelemetryBtn.classList.remove("btn-secondary");
      liveTelemetryBtn.classList.add("btn-primary");
    }
    if (typeof showToast === "function") {
      showToast("Live Multi-Vessel Telemetry Stream Active (1.5s interval)", "info");
    }

    fetchAndApplyTelemetry();
    telemetryInterval = setInterval(fetchAndApplyTelemetry, 1500);
  }

  function stopTelemetryStream() {
    isTelemetryStreaming = false;
    if (telemetryInterval) {
      clearInterval(telemetryInterval);
      telemetryInterval = null;
    }
    if (liveTelemetryBtn) {
      liveTelemetryBtn.innerHTML = "▶ Start Live Telemetry Stream";
      liveTelemetryBtn.classList.remove("btn-primary");
      liveTelemetryBtn.classList.add("btn-secondary");
    }
    if (typeof showToast === "function") {
      showToast("Live Telemetry Stream Paused.", "info");
    }
  }

  async function fetchAndApplyTelemetry() {
    if (typeof telemetryApi === "undefined") return;
    try {
      const res = await telemetryApi.getLiveTelemetry();
      if (res && res.vessels && Array.isArray(res.vessels)) {
        res.vessels.forEach((v) => {
          const boatId = v.boat_id;
          if (mapManager) {
            mapManager.updateBoatPosition(v.latitude, v.longitude, v.heading, v.speed, boatId);
          }

          if (mapManager && boatId === mapManager.activeBoatId) {
            const distanceNM = mapManager.calculateDistanceToBorder();
            updateTelemetryUI(v.latitude, v.longitude, v.speed, v.heading, distanceNM);
          }
        });
      }
    } catch (err) {
      console.warn("Live Telemetry Stream notice:", err);
    }
  }

  // Telemetry stream is initially paused on load for manual demonstration control

  function startSimulation() {
    isSimulating = true;
    currentSimStep = 0;
    if (simToggleBtn) {
      simToggleBtn.innerHTML = "🛑 Stop Simulation";
      simToggleBtn.classList.remove("btn-secondary");
      simToggleBtn.classList.add("btn-danger");
    }
    if (typeof showToast === "function") {
      showToast(
        "Border Crossing Simulation Active: Vessel heading East toward Maritime Boundary Line",
        "warning",
      );
    }

    const path = [
      { lat: 9.2845, lng: 79.312, heading: 115, speed: 14.2 },
      { lat: 9.278, lng: 79.345, heading: 118, speed: 15.0 },
      { lat: 9.271, lng: 79.38, heading: 120, speed: 15.5 },
      { lat: 9.264, lng: 79.42, heading: 122, speed: 16.0 },
      { lat: 9.257, lng: 79.46, heading: 124, speed: 16.8 },
      { lat: 9.248, lng: 79.51, heading: 126, speed: 17.2 },
    ];

    simInterval = setInterval(() => {
      if (currentSimStep >= path.length) {
        stopSimulation();
        return;
      }

      const point = path[currentSimStep];
      if (mapManager) {
        mapManager.updateBoatPosition(
          point.lat,
          point.lng,
          point.heading,
          point.speed,
        );
      }

      const distanceNM = mapManager
        ? mapManager.calculateDistanceToBorder()
        : 5.0;
      updateTelemetryUI(
        point.lat,
        point.lng,
        point.speed,
        point.heading,
        distanceNM,
      );

      if (distanceNM < 0.5 || point.lng > 79.49) {
        triggerEmergencyAlert(point.lat, point.lng, distanceNM);
      } else if (distanceNM < 2.5) {
        triggerWarningAlert(distanceNM);
      }

      currentSimStep++;
    }, 3000);
  }

  function stopSimulation() {
    isSimulating = false;
    clearInterval(simInterval);
    if (simToggleBtn) {
      simToggleBtn.innerHTML = "⚡ Demo: Simulate Border Approach";
      simToggleBtn.classList.remove("btn-danger");
      simToggleBtn.classList.add("btn-secondary");
    }
    if (typeof showToast === "function") {
      showToast(
        "Simulation Paused. Vessel track reset to nominal safe position.",
        "info",
      );
    }
  }

  // 5. TELEMETRY UI UPDATER
  function updateTelemetryUI(lat, lng, speed, heading, distanceNM) {
    const latEl = document.getElementById("telemetry-lat");
    const lngEl = document.getElementById("telemetry-lng");
    const speedEl = document.getElementById("telemetry-speed");
    const headingEl = document.getElementById("telemetry-heading");
    const distanceEl = document.getElementById("telemetry-distance");
    const statusBadge = document.getElementById("telemetry-status-badge");

    if (latEl)
      latEl.innerText =
        (typeof lat === "number" ? lat.toFixed(4) : lat) + "° N";
    if (lngEl)
      lngEl.innerText =
        (typeof lng === "number" ? lng.toFixed(4) : lng) + "° E";
    if (speedEl)
      speedEl.innerText =
        (typeof speed === "number" ? speed.toFixed(1) : speed) + " kts";
    if (headingEl) headingEl.innerText = heading + "°";
    if (distanceEl) distanceEl.innerText = distanceNM + " NM";

    if (statusBadge) {
      if (distanceNM < 0.5) {
        statusBadge.className = "badge badge-danger";
        statusBadge.innerText = "BORDER CROSSING";
      } else if (distanceNM < 2.5) {
        statusBadge.className = "badge badge-warning";
        statusBadge.innerText = "APPROACHING BORDER";
      } else {
        statusBadge.className = "badge badge-success";
        statusBadge.innerText = "SAFE ZONE";
      }
    }
  }

  // 6. ALERTS LOGGING & BANNER
  function triggerWarningAlert(distanceNM) {
    if (typeof showToast === "function") {
      showToast(
        `⚠️ WARNING: Vessel is ${distanceNM} NM from International Boundary! Turn Back!`,
        "warning",
      );
    }
    addAlertToTable(
      "WARNING",
      `Approaching International Boundary (${distanceNM} NM)`,
      `${distanceNM} NM`,
      "Just Now",
      "ACTIVE",
    );
  }

  function triggerEmergencyAlert(lat, lng, distanceNM) {
    if (typeof showToast === "function") {
      showToast(
        `🚨 DANGER: BORDER CROSSING DETECTED at Lat ${lat.toFixed(3)}, Lng ${lng.toFixed(3)}! Coast Guard Alerted!`,
        "danger",
      );
    }

    const banner = document.getElementById("emergency-banner");
    if (banner) banner.style.display = "flex";

    addAlertToTable(
      "DANGER",
      `CRITICAL BORDER VIOLATION! Vessel crossed boundary.`,
      `0.00 NM`,
      "Just Now",
      "CRITICAL",
    );
  }

  function addAlertToTable(type, message, distance, time, status) {
    const tbody = document.getElementById("alerts-table-body");
    if (!tbody) return;

    alertLogCount++;
    const countEl = document.getElementById("alert-count-val");
    if (countEl) countEl.innerText = `${alertLogCount} Logs`;

    const row = document.createElement("tr");
    const badgeClass =
      type === "DANGER"
        ? "badge-danger"
        : type === "WARNING"
          ? "badge-warning"
          : "badge-success";

    row.innerHTML = `
      <td><span class="badge ${badgeClass}">${type}</span></td>
      <td>${message}</td>
      <td>${distance}</td>
      <td>${time}</td>
      <td><span class="status-dot ${type === "DANGER" ? "danger" : "warning"}"></span> ${status}</td>
    `;

    tbody.insertBefore(row, tbody.firstChild);
  }

  // 7. SOS EMERGENCY DISTRESS WORKFLOW
  const sosBtn = document.getElementById("sos-trigger-btn");
  if (sosBtn) {
    sosBtn.addEventListener("click", () => {
      if (
        confirm(
          "CONFIRM EMERGENCY SOS: Transmit distress beacon and vessel coordinates to Coast Guard Command?",
        )
      ) {
        triggerSOSWorkflow();
      }
    });
  }

  function triggerSOSWorkflow() {
    if (typeof showToast === "function") {
      showToast(
        "🚨 SOS DISTRESS BROADCAST SENT! Emergency Beacon Active.",
        "danger",
      );
    }

    const sosStatusEl = document.getElementById("sos-status-val");
    if (sosStatusEl) {
      sosStatusEl.innerText = "SIGNAL ACTIVE";
      sosStatusEl.style.color = "#FF3B5C";
    }

    const timelineItems = document.querySelectorAll(".timeline-item");
    if (timelineItems.length >= 3) {
      timelineItems[0].className = "timeline-item completed";
      timelineItems[1].className = "timeline-item active";

      setTimeout(() => {
        timelineItems[1].className = "timeline-item completed";
        timelineItems[2].className = "timeline-item active";
        if (typeof showToast === "function") {
          showToast(
            "Coast Guard Interceptor Dispatched. Estimated Arrival: 14 Mins",
            "success",
          );
        }
      }, 4000);
    }
  }

  // 8. SEARCH & FILTER FOR ALERTS TABLE
  const searchInput = document.getElementById("alert-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      const rows = document.querySelectorAll("#alerts-table-body tr");
      rows.forEach((row) => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(term) ? "" : "none";
      });
    });
  }
});

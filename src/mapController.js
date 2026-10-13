/**
 * ResQAI Interactive Emergency Map Controller
 * Manages Leaflet mapping, custom tactical pins, pulsing radar circles, and route visuals.
 */

export class MapController {
  constructor(elementId) {
    this.elementId = elementId;
    this.map = null;
    this.userMarker = null;
    this.accuracyCircle = null;
    this.hospitalMarkers = [];
    this.policeMarkers = [];
    this.routeLine = null;
    this.isMapLoaded = false;
  }

  init(initialLocation = { lat: 28.6139, lng: 77.2090 }) {
    if (typeof L === 'undefined') {
      console.warn('Leaflet L is not loaded yet');
      return;
    }

    const container = document.getElementById(this.elementId);
    if (!container) return;

    try {
      this.map = L.map(this.elementId, {
        zoomControl: false,
        attributionControl: false
      }).setView([initialLocation.lat, initialLocation.lng], 14);

      // Add modern dark matter tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(this.map);

      // Add customized zoom control at top right
      L.control.zoom({ position: 'topright' }).addTo(this.map);

      this.isMapLoaded = true;
      this.updateUserMarker(initialLocation);
    } catch (e) {
      console.error('Error initializing Leaflet map:', e);
    }
  }

  updateUserMarker(location) {
    if (!this.map) return;

    const latLng = [location.lat, location.lng];

    const userIcon = L.divIcon({
      className: 'custom-user-pin',
      html: `
        <div class="radar-pulse-ring"></div>
        <div class="user-core-dot">
          <div class="inner-dot"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    if (!this.userMarker) {
      this.userMarker = L.marker(latLng, { icon: userIcon }).addTo(this.map);
      this.userMarker.bindPopup(`
        <div class="map-popup-card">
          <div class="popup-tag tag-user">YOUR LIVE LOCATION</div>
          <h4>Victim Telemetry Active</h4>
          <p><strong>GPS:</strong> ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}</p>
          <p><strong>Accuracy:</strong> ±${location.accuracy || 10}m</p>
        </div>
      `);
    } else {
      this.userMarker.setLatLng(latLng);
    }

    if (!this.accuracyCircle) {
      this.accuracyCircle = L.circle(latLng, {
        radius: location.accuracy || 35,
        color: '#00f090',
        fillColor: '#00f090',
        fillOpacity: 0.12,
        weight: 1.5
      }).addTo(this.map);
    } else {
      this.accuracyCircle.setLatLng(latLng);
      this.accuracyCircle.setRadius(location.accuracy || 35);
    }
  }

  renderEmergencyServices(hospitals, policeStations, userLocation) {
    if (!this.map) return;

    // Clear previous markers
    this.hospitalMarkers.forEach(m => this.map.removeLayer(m));
    this.policeMarkers.forEach(m => this.map.removeLayer(m));
    this.hospitalMarkers = [];
    this.policeMarkers = [];

    // Add Hospital Markers
    hospitals.forEach((h, index) => {
      const isNearest = index === 0;
      const hospitalIcon = L.divIcon({
        className: 'custom-service-pin pin-hospital ' + (isNearest ? 'pin-nearest' : ''),
        html: `
          <div class="service-pin-box">
            <span class="service-icon">🏥</span>
            ${isNearest ? '<span class="nearest-badge">CLOSEST</span>' : ''}
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const marker = L.marker([h.lat, h.lng], { icon: hospitalIcon }).addTo(this.map);
      marker.bindPopup(`
        <div class="map-popup-card">
          <div class="popup-tag tag-hospital">${h.type}</div>
          <h4>${h.name}</h4>
          <div class="popup-stat-row">
            <span>📍 <strong>${h.distanceText}</strong> away</span>
            <span>⚡ ETA: <strong>${h.etaText}</strong></span>
          </div>
          <div class="popup-stat-row">
            <span>🛏️ ICU Beds: <strong>${h.icuBeds} free</strong></span>
            <span>🚑 Ambulances: <strong>${h.ambulancesAvailable}</strong></span>
          </div>
          <div class="popup-actions">
            <a href="tel:${h.phone}" class="btn-popup-call">📞 Call Emergency (${h.phone})</a>
            <a href="https://maps.google.com/?daddr=${h.lat},${h.lng}" target="_blank" class="btn-popup-nav">🗺️ Navigate</a>
          </div>
        </div>
      `);

      this.hospitalMarkers.push(marker);
    });

    // Add Police Station Markers
    policeStations.forEach(p => {
      const policeIcon = L.divIcon({
        className: 'custom-service-pin pin-police',
        html: `
          <div class="service-pin-box">
            <span class="service-icon">🚓</span>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const marker = L.marker([p.lat, p.lng], { icon: policeIcon }).addTo(this.map);
      marker.bindPopup(`
        <div class="map-popup-card">
          <div class="popup-tag tag-police">${p.type}</div>
          <h4>${p.name}</h4>
          <div class="popup-stat-row">
            <span>📍 <strong>${p.distanceText}</strong> away</span>
            <span>⚡ ETA: <strong>${p.etaText}</strong></span>
          </div>
          <div class="popup-stat-row">
            <span>🚔 PCR Vans: <strong>${p.pcrVansOnDuty} on duty</strong></span>
            <span>🛡️ ${p.jurisdiction}</span>
          </div>
          <div class="popup-actions">
            <a href="tel:${p.phone}" class="btn-popup-call">📞 Call PCR (${p.phone})</a>
            <a href="https://maps.google.com/?daddr=${p.lat},${p.lng}" target="_blank" class="btn-popup-nav">🗺️ Navigate</a>
          </div>
        </div>
      `);

      this.policeMarkers.push(marker);
    });

    // Draw route line to nearest hospital
    if (hospitals.length > 0 && userLocation) {
      const nearest = hospitals[0];
      const routePoints = [
        [userLocation.lat, userLocation.lng],
        [nearest.lat, nearest.lng]
      ];

      if (this.routeLine) {
        this.map.removeLayer(this.routeLine);
      }

      this.routeLine = L.polyline(routePoints, {
        color: '#ff2e51',
        weight: 3.5,
        dashArray: '8, 8',
        lineCap: 'round',
        opacity: 0.85
      }).addTo(this.map);
    }
  }

  panToUser(location) {
    if (this.map && location) {
      this.map.flyTo([location.lat, location.lng], 15, { duration: 1.2 });
    }
  }

  fitAll() {
    if (!this.map) return;
    const group = [];
    if (this.userMarker) group.push(this.userMarker);
    this.hospitalMarkers.forEach(m => group.push(m));
    this.policeMarkers.forEach(m => group.push(m));

    if (group.length > 0) {
      const featureGroup = L.featureGroup(group);
      this.map.fitBounds(featureGroup.getBounds().pad(0.2));
    }
  }
}

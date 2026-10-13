/**
 * ResQAI — Main Application Controller
 * Orchestrates sensory fusion, AI detection, real-time canvas waveforms,
 * 5-family member emergency dispatch, and nearby hospital/police radar.
 */

import { SensorEngine } from './sensorEngine.js';
import { AIDetector } from './aiDetector.js';
import { EmergencyManager } from './emergencyManager.js';
import { ContactManager } from './contactManager.js';
import { MedicalIdManager } from './medicalId.js';
import { LocationService } from './locationService.js';
import { MapController } from './mapController.js';
import { SIMULATION_SCENARIOS } from './simulationData.js';

class ResQApp {
  constructor() {
    this.sensorEngine = new SensorEngine();
    this.contactManager = new ContactManager();
    this.medicalIdManager = new MedicalIdManager();
    this.locationService = new LocationService();
    this.mapController = new MapController('leafletMap');

    this.maxRecordedG = 1.0;
    this.activeScenario = null;
    this.currentLocationData = null;

    this.aiDetector = new AIDetector({
      sensitivity: 'MEDIUM',
      onStatusChange: this.handleAIStatusChange.bind(this),
      onAnalysisUpdate: this.handleAIAnalysisUpdate.bind(this),
      onAccidentDetected: this.handleAccidentDetected.bind(this)
    });

    this.emergencyManager = new EmergencyManager({
      countdownDuration: 15,
      onCountdownTick: this.handleCountdownTick.bind(this),
      onEmergencyTriggered: this.handleEmergencyTriggered.bind(this),
      onEmergencyCancelled: this.handleEmergencyCancelled.bind(this)
    });

    this.initCanvas();
    this.initEventListeners();
    this.initSensors();
    this.initUI();
    this.initMap();
  }

  // --- Canvas Waveform Setup & Loop ---
  initCanvas() {
    this.canvas = document.getElementById('telemetryCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    const resize = () => {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.canvas.width = rect.width * (window.devicePixelRatio || 1);
      this.canvas.height = rect.height * (window.devicePixelRatio || 1);
      this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    };

    window.addEventListener('resize', resize);
    setTimeout(resize, 50);

    // Continuous 60fps render loop
    const renderLoop = () => {
      this.drawWaveform();
      requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);
  }

  drawWaveform() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const width = this.canvas.parentElement.clientWidth;
    const height = this.canvas.parentElement.clientHeight;

    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const history = this.sensorEngine.getRecentHistory();
    if (history.length < 2) return;

    const stepX = width / (this.sensorEngine.maxHistory - 1);
    const midY = height / 2;
    const scaleG = height / 8; // 8G vertical span

    // 1. Draw Vector Components (X/Y/Z) in subtle red/purple
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 46, 81, 0.35)';
    ctx.lineWidth = 1.2;
    history.forEach((pt, i) => {
      const x = i * stepX;
      const y = midY - (pt.ay / 9.81) * (scaleG * 0.8);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 2. Draw Total G-Force (Cyan glowing line)
    ctx.beginPath();
    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = 'rgba(0, 210, 255, 0.6)';
    ctx.shadowBlur = 6;

    history.forEach((pt, i) => {
      const x = i * stepX;
      const y = height - (pt.totalG / 7) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // 3. Peak Shock markers if G > 3.0
    history.forEach((pt, i) => {
      if (pt.totalG >= 3.0) {
        const x = i * stepX;
        const y = height - (pt.totalG / 7) * height;
        ctx.fillStyle = '#ff2e51';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // --- Sensor Listeners & Data Feed ---
  initSensors() {
    this.sensorEngine.subscribe((data) => {
      this.updateTelemetryHUD(data);
      this.aiDetector.processSample(data, this.sensorEngine.getRecentHistory());
    });
  }

  updateTelemetryHUD(data) {
    // 1. Metric values
    const valTotalG = document.getElementById('valTotalG');
    const valPeakG = document.getElementById('valPeakG');
    const valJerk = document.getElementById('valJerk');
    const valAngular = document.getElementById('valAngular');

    if (valTotalG) valTotalG.textContent = data.totalG.toFixed(2);
    if (data.totalG > this.maxRecordedG) {
      this.maxRecordedG = data.totalG;
      if (valPeakG) valPeakG.textContent = this.maxRecordedG.toFixed(2);
    }
    if (valJerk) valJerk.textContent = data.jerk.toFixed(1);
    if (valAngular) valAngular.textContent = data.angularVelocity.toFixed(1);

    // 2. Fill progress bars
    const barTotalG = document.getElementById('barTotalG');
    const barPeakG = document.getElementById('barPeakG');
    const barJerk = document.getElementById('barJerk');
    const barAngular = document.getElementById('barAngular');

    if (barTotalG) {
      const pct = Math.min(100, Math.max(5, (data.totalG / 6.0) * 100));
      barTotalG.style.width = `${pct}%`;
      barTotalG.style.background = data.totalG > 3.5 ? 'var(--red-alert)' : (data.totalG > 2.0 ? 'var(--amber-warn)' : 'var(--cyan-telemetry)');
    }
    if (barPeakG) {
      const pctPeak = Math.min(100, (this.maxRecordedG / 6.0) * 100);
      barPeakG.style.width = `${pctPeak}%`;
    }
    if (barJerk) {
      const pctJerk = Math.min(100, (data.jerk / 50) * 100);
      barJerk.style.width = `${pctJerk}%`;
    }
    if (barAngular) {
      const pctAng = Math.min(100, (data.angularVelocity / 180) * 100);
      barAngular.style.width = `${pctAng}%`;
    }

    // 3. 3D Phone Tilt
    const phoneModel = document.getElementById('phone3dModel');
    const valRoll = document.getElementById('valRoll');
    const valPitch = document.getElementById('valPitch');
    const valYaw = document.getElementById('valYaw');
    const phoneSpeedText = document.getElementById('phoneSpeedText');

    const roll = data.gamma || 0;
    const pitch = data.beta || 0;
    const yaw = data.alpha || 0;

    if (phoneModel) {
      phoneModel.style.transform = `rotateX(${Math.max(-60, Math.min(60, pitch))}deg) rotateY(${Math.max(-60, Math.min(60, roll))}deg) rotateZ(${Math.max(-45, Math.min(45, yaw * 0.2))}deg)`;
    }
    if (valRoll) valRoll.textContent = `${roll.toFixed(0)}°`;
    if (valPitch) valPitch.textContent = `${pitch.toFixed(0)}°`;
    if (valYaw) valYaw.textContent = `${yaw.toFixed(0)}°`;
    if (phoneSpeedText) phoneSpeedText.textContent = `${(data.speed || 0).toFixed(0)} km/h`;
  }

  // --- AI State Handling & Callbacks ---
  handleAIStatusChange({ state, message, incident, analysis }) {
    const banner = document.getElementById('guardianBanner');
    const title = document.getElementById('guardianStatusTitle');
    const msg = document.getElementById('guardianStatusMsg');
    const iconRing = document.getElementById('guardianIconRing');
    const topBadge = document.getElementById('topStatusBadge');
    const topBadgeText = document.getElementById('topStatusText');

    banner.className = 'glass-panel ai-guardian-banner';

    if (state === 'MONITORING') {
      banner.classList.add('state-monitoring');
      title.textContent = 'Active Guardian: Monitoring Live Kinematics';
      msg.textContent = message || 'Continuous AI sensor fusion checking for crash shockwaves and disorientation.';
      iconRing.textContent = '🛡️';
      iconRing.style.color = 'var(--emerald-safe)';
      iconRing.style.borderColor = 'rgba(0, 240, 144, 0.3)';
      if (topBadgeText) topBadgeText.textContent = 'AI GUARDIAN: ACTIVE';
      if (topBadge) {
        topBadge.style.background = 'var(--emerald-dim)';
        topBadge.style.borderColor = 'rgba(0, 240, 144, 0.3)';
        topBadge.style.color = 'var(--emerald-safe)';
      }
    } else if (state === 'ANALYZING') {
      banner.classList.add('state-analyzing');
      title.textContent = '⚠️ Kinetic Impact Detected — AI Analyzing Anomaly...';
      msg.textContent = message || 'Checking post-impact rotation, immobility variance, and false-positive criteria.';
      iconRing.textContent = '⚡';
      iconRing.style.color = 'var(--amber-warn)';
      iconRing.style.borderColor = 'rgba(255, 176, 32, 0.4)';
      if (topBadgeText) topBadgeText.textContent = 'VERIFYING IMPACT';
      if (topBadge) {
        topBadge.style.background = 'var(--amber-dim)';
        topBadge.style.borderColor = 'rgba(255, 176, 32, 0.4)';
        topBadge.style.color = 'var(--amber-warn)';
      }
    } else if (state === 'CONFIRMED') {
      banner.classList.add('state-confirmed');
      title.textContent = '🚨 SEVERE ACCIDENT CONFIRMED BY AI SENSOR CORE!';
      msg.textContent = `Crash confidence: ${incident.confidence}% (Peak Force: ${incident.peakG.toFixed(1)}G). Initiating emergency protocol.`;
      iconRing.textContent = '💥';
      iconRing.style.color = 'var(--red-alert)';
      iconRing.style.borderColor = 'rgba(255, 46, 81, 0.4)';
      if (topBadgeText) topBadgeText.textContent = 'CRITICAL SOS ACTIVE';
      if (topBadge) {
        topBadge.style.background = 'var(--red-dim)';
        topBadge.style.borderColor = 'rgba(255, 46, 81, 0.4)';
        topBadge.style.color = 'var(--red-alert)';
      }
    } else if (state === 'DISMISSED') {
      title.textContent = '✅ False Alarm Filtered by AI Engine';
      msg.textContent = message;
      iconRing.textContent = '🛡️';
      iconRing.style.color = 'var(--cyan-telemetry)';
      iconRing.style.borderColor = 'var(--border-active)';
    }
  }

  handleAIAnalysisUpdate({ elapsedMs, progress, confidence, reasons }) {
    const msg = document.getElementById('guardianStatusMsg');
    if (msg) {
      msg.innerHTML = `AI Analyzing (${progress}%): Confidence: <strong>${confidence}%</strong> — ${reasons.join(', ')}`;
    }
  }

  handleAccidentDetected(incident) {
    this.emergencyManager.triggerCountdown(incident);
  }

  // --- Emergency Countdown & SOS ---
  handleCountdownTick({ remainingSeconds, totalSeconds, incident }) {
    const modal = document.getElementById('emergencyModal');
    modal.classList.add('is-open');

    const secText = document.getElementById('countdownSecText');
    if (secText) secText.textContent = remainingSeconds;

    const confText = document.getElementById('emgConfidence');
    if (confText && incident) confText.textContent = `${incident.confidence}%`;

    // Animate SVG stroke circle (circumference = 2 * PI * 70 ≈ 440)
    const circle = document.getElementById('countdownCircle');
    if (circle) {
      const offset = 440 - (remainingSeconds / totalSeconds) * 440;
      circle.style.strokeDashoffset = offset;
    }
  }

  handleEmergencyCancelled({ reason }) {
    const modal = document.getElementById('emergencyModal');
    modal.classList.remove('is-open');
    this.aiDetector.reset();

    // Show toast
    const toast = document.createElement('div');
    toast.className = 'dispatch-success-toast';
    toast.innerHTML = `
      <div style="font-size: 24px;">🛡️</div>
      <div>
        <h4 style="color: var(--emerald-safe); font-size: 0.9rem;">Alert Aborted — Marked Safe</h4>
        <p style="font-size: 0.75rem; color: var(--text-muted);">${reason}</p>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  handleEmergencyTriggered({ incident, dispatchedAt }) {
    const modal = document.getElementById('emergencyModal');
    modal.classList.remove('is-open');

    const nearestHospitals = this.locationService.getNearbyHospitals();
    const nearestHospital = nearestHospitals[0] || { name: 'Apex Trauma Center', phone: '108', distanceText: '1.4 km' };
    const medicalProfile = this.medicalIdManager.getProfile();

    const sosPayload = {
      victimName: medicalProfile.fullName || 'Ujjwal Tiwari',
      location: this.locationService.currentLocation,
      incident: incident || { confidence: 95, peakG: 5.6, preCrashSpeed: 52 },
      batteryLevel: this.locationService.batteryLevel,
      nearestHospital: {
        name: nearestHospital.name,
        phone: nearestHospital.phone,
        distance: nearestHospital.distanceText
      },
      medicalId: {
        bloodGroup: medicalProfile.bloodGroup,
        allergies: medicalProfile.allergies
      }
    };

    const sosMessage = this.contactManager.generateSOSMessage(sosPayload);

    // Open SOS Summary Modal
    const summaryModal = document.getElementById('sosSummaryModal');
    const summaryIncidentId = document.getElementById('summaryIncidentId');
    const sosSummaryText = document.getElementById('sosSummaryText');

    if (summaryIncidentId) summaryIncidentId.textContent = incident?.id || 'INC-889412';
    if (sosSummaryText) sosSummaryText.value = sosMessage;
    if (summaryModal) summaryModal.classList.add('is-open');

    // Auto-open primary contact WhatsApp in new tab
    const contacts = this.contactManager.getContacts();
    const primaryContact = contacts.find(c => c.isPrimary) || contacts[0];
    if (primaryContact && primaryContact.notifyWhatsApp) {
      const waLink = this.contactManager.getWhatsAppLink(primaryContact.phone, sosMessage);
      window.open(waLink, '_blank');
    }
  }

  // --- UI Initialization & Events ---
  initUI() {
    this.renderContactsList();
    this.renderMedicalSummary();
    this.renderEmergencyServices();

    // Location Service Watcher
    this.locationService.subscribe((loc) => {
      this.currentLocationData = loc;
      const addrEl = document.getElementById('mapLocationAddr');
      if (addrEl) addrEl.textContent = loc.address || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;

      const gpsStatus = document.getElementById('valGpsStatus');
      if (gpsStatus) gpsStatus.textContent = loc.isSimulated ? `SIMULATED (±${loc.accuracy}m)` : `GPS LOCKED (±${loc.accuracy}m)`;

      const batteryEl = document.getElementById('valBattery');
      if (batteryEl) batteryEl.textContent = `${this.locationService.batteryLevel}%`;

      if (this.mapController && this.mapController.isMapLoaded) {
        this.mapController.updateUserMarker(loc);
        this.renderEmergencyServices();
      }
    });
  }

  initMap() {
    setTimeout(() => {
      this.mapController.init(this.locationService.currentLocation);
      this.renderEmergencyServices();
    }, 200);
  }

  renderEmergencyServices() {
    const hospitals = this.locationService.getNearbyHospitals();
    const policeStations = this.locationService.getNearbyPoliceStations();

    const servicesContainer = document.getElementById('servicesList');
    if (!servicesContainer) return;

    servicesContainer.innerHTML = '';

    // Render Nearest Hospital Badge
    const nearestBadge = document.getElementById('nearestHospitalBadge');
    if (nearestBadge && hospitals.length > 0) {
      nearestBadge.textContent = `Closest: ${hospitals[0].name.slice(0, 24)}... (${hospitals[0].distanceText} • ${hospitals[0].etaText})`;
    }

    // Combine into single sorted list
    const combined = [
      ...hospitals.map(h => ({ ...h, category: 'hospital' })),
      ...policeStations.map(p => ({ ...p, category: 'police' }))
    ].sort((a, b) => a.distanceKm - b.distanceKm);

    combined.forEach((item, index) => {
      const isNearest = index === 0;
      const card = document.createElement('div');
      card.className = `service-card ${isNearest ? 'card-nearest' : ''}`;

      const icon = item.category === 'hospital' ? '🏥' : '🚓';
      const badgeClass = item.category === 'hospital' ? 'badge-hospital' : 'badge-police';
      const detailText = item.category === 'hospital'
        ? `🛏️ ${item.icuBeds} ICU Beds • 🚑 ${item.ambulancesAvailable} Ambulances`
        : `🚔 ${item.pcrVansOnDuty} PCR Vans Active • 🛡️ ${item.jurisdiction}`;

      card.innerHTML = `
        <div class="service-main-info">
          <div class="service-icon-badge ${badgeClass}">
            ${icon}
          </div>
          <div class="service-details">
            <h4>
              ${item.name}
              ${isNearest ? '<span class="nearest-badge" style="position:static; margin-left:4px;">CLOSEST</span>' : ''}
            </h4>
            <p><strong>${item.distanceText} away</strong> • ETA: ${item.etaText} • ${item.openStatus}</p>
            <p style="color: var(--text-dim); margin-top: 2px;">${detailText}</p>
          </div>
        </div>
        <div class="service-quick-actions">
          <a href="tel:${item.phone}" class="btn-icon-action" title="Call Emergency Line (${item.phone})">📞</a>
          <a href="https://maps.google.com/?daddr=${item.lat},${item.lng}" target="_blank" class="btn-icon-action" title="Navigate on Google Maps">🗺️</a>
        </div>
      `;

      servicesContainer.appendChild(card);
    });

    // Update map pins
    if (this.mapController && this.mapController.isMapLoaded) {
      this.mapController.renderEmergencyServices(hospitals, policeStations, this.locationService.currentLocation);
    }
  }

  renderContactsList() {
    const container = document.getElementById('contactsList');
    if (!container) return;

    const contacts = this.contactManager.getContacts();
    const countChip = document.getElementById('chipContactsCount');
    if (countChip) {
      countChip.innerHTML = `SOS Contacts: <strong>${contacts.length}/5 Active</strong>`;
    }

    container.innerHTML = '';

    if (contacts.length === 0) {
      container.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.82rem;">
          No emergency contacts added yet. Click "Add Contact" above to add up to 5 family members.
        </div>
      `;
      return;
    }

    contacts.forEach((contact, idx) => {
      const row = document.createElement('div');
      row.className = 'contact-item-row';

      const avatarEmoji = contact.relation.includes('Mother') ? '👩'
        : (contact.relation.includes('Father') ? '👨'
        : (contact.relation.includes('Doctor') ? '👨‍⚕️' : '👤'));

      const testMessage = this.contactManager.generateSOSMessage({
        victimName: this.medicalIdManager.getProfile().fullName || 'Ujjwal Tiwari',
        location: this.locationService.currentLocation,
        incident: { confidence: 95, peakG: 5.4, preCrashSpeed: 50 },
        batteryLevel: this.locationService.batteryLevel
      });

      const waLink = this.contactManager.getWhatsAppLink(contact.phone, testMessage);

      row.innerHTML = `
        <div class="contact-left">
          <div class="contact-avatar">${avatarEmoji}</div>
          <div>
            <div class="contact-name-row">
              <span class="contact-name">${contact.name}</span>
              <span class="contact-relation-badge">${contact.relation}</span>
              ${contact.isPrimary ? '<span class="nearest-badge" style="position:static;">PRIMARY</span>' : ''}
            </div>
            <div class="contact-phone">${contact.phone} • ${contact.notifyWhatsApp ? 'WhatsApp' : ''} ${contact.notifySMS ? '• SMS' : ''}</div>
          </div>
        </div>
        <div class="contact-actions">
          <a href="${waLink}" target="_blank" class="btn-whatsapp-test" title="Send test SOS dispatch on WhatsApp">
            💬 Test SOS
          </a>
          <button class="btn-hud btn-edit-contact" data-id="${contact.id}" style="padding: 4px 8px; font-size: 0.72rem;">
            ✏️
          </button>
          <button class="btn-hud btn-danger btn-delete-contact" data-id="${contact.id}" style="padding: 4px 8px; font-size: 0.72rem;">
            🗑️
          </button>
        </div>
      `;

      container.appendChild(row);
    });

    // Attach row events
    container.querySelectorAll('.btn-edit-contact').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        this.openContactModal(id);
      });
    });

    container.querySelectorAll('.btn-delete-contact').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('Remove this emergency contact?')) {
          this.contactManager.deleteContact(id);
          this.renderContactsList();
        }
      });
    });
  }

  renderMedicalSummary() {
    const profile = this.medicalIdManager.getProfile();
    const medName = document.getElementById('medFullName');
    const medBlood = document.getElementById('medBloodGroup');
    const medAllergies = document.getElementById('medAllergies');
    const medDonor = document.getElementById('medOrganDonor');
    const medIns = document.getElementById('medInsurance');

    if (medName) medName.textContent = profile.fullName;
    if (medBlood) medBlood.textContent = profile.bloodGroup;
    if (medAllergies) medAllergies.textContent = profile.allergies || 'None listed';
    if (medDonor) medDonor.textContent = profile.organDonor ? 'YES (Registered)' : 'NO';
    if (medIns) medIns.textContent = `${profile.insuranceProvider} — #${profile.insurancePolicyNumber}`;
  }

  initEventListeners() {
    // 1. Enable Real Device Sensors Button
    const btnSensors = document.getElementById('btnEnableSensors');
    if (btnSensors) {
      btnSensors.addEventListener('click', async () => {
        const result = await this.sensorEngine.requestPermission();
        if (result.success) {
          btnSensors.textContent = '🟢 Real Sensors Active';
          btnSensors.classList.remove('btn-cyan');
          btnSensors.classList.add('btn-emerald');
          const sourcePill = document.getElementById('liveSourcePill');
          if (sourcePill) sourcePill.textContent = 'DEVICE SENSOR (LIVE)';
        } else {
          alert('Could not activate device motion: ' + result.message);
        }
      });
    }

    // 2. Manual SOS Button
    const btnManualSos = document.getElementById('btnManualSos');
    if (btnManualSos) {
      btnManualSos.addEventListener('click', () => {
        this.emergencyManager.triggerCountdown({
          id: 'MANUAL-' + Math.floor(100000 + Math.random() * 900000),
          confidence: 100,
          peakG: this.maxRecordedG || 3.8,
          preCrashSpeed: 0,
          reasons: ['User manually activated Panic SOS trigger']
        });
      });
    }

    // 3. Scenario Simulation Buttons
    document.querySelectorAll('.btn-scenario').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const scenarioKey = e.currentTarget.getAttribute('data-scenario');
        const scenario = SIMULATION_SCENARIOS[scenarioKey];
        if (!scenario) return;

        this.activeScenario = scenario;
        const sourcePill = document.getElementById('liveSourcePill');
        if (sourcePill) sourcePill.textContent = `SIM: ${scenario.name.slice(0, 20)}`;

        const stopBtn = document.getElementById('btnStopSim');
        if (stopBtn) stopBtn.style.display = 'inline-flex';

        this.sensorEngine.startSimulation(scenario);
      });
    });

    const stopSimBtn = document.getElementById('btnStopSim');
    if (stopSimBtn) {
      stopSimBtn.addEventListener('click', () => {
        this.sensorEngine.stopSimulation();
        stopSimBtn.style.display = 'none';
        const sourcePill = document.getElementById('liveSourcePill');
        if (sourcePill) sourcePill.textContent = 'IDLE';
        this.aiDetector.reset();
      });
    }

    // 4. Emergency Modal Buttons
    const btnCancelEmergency = document.getElementById('btnCancelEmergency');
    if (btnCancelEmergency) {
      btnCancelEmergency.addEventListener('click', () => {
        this.emergencyManager.cancelEmergency('User clicked I AM SAFE button');
      });
    }

    const btnInstantBroadcast = document.getElementById('btnInstantBroadcast');
    if (btnInstantBroadcast) {
      btnInstantBroadcast.addEventListener('click', () => {
        this.emergencyManager.executeEmergencyDispatch();
      });
    }

    const btnToggleSiren = document.getElementById('btnToggleSiren');
    if (btnToggleSiren) {
      btnToggleSiren.addEventListener('click', () => {
        const isMuted = this.emergencyManager.toggleMute();
        btnToggleSiren.textContent = isMuted ? '🔇 Siren OFF' : '🔊 Siren ON';
      });
    }

    // 5. SOS Summary Modal Buttons
    const btnCloseSummary = document.getElementById('btnCloseSosSummary');
    if (btnCloseSummary) {
      btnCloseSummary.addEventListener('click', () => {
        document.getElementById('sosSummaryModal').classList.remove('is-open');
        this.aiDetector.reset();
      });
    }

    const btnSummaryShareWhatsapp = document.getElementById('btnSummaryShareWhatsapp');
    if (btnSummaryShareWhatsapp) {
      btnSummaryShareWhatsapp.addEventListener('click', () => {
        const msg = document.getElementById('sosSummaryText').value;
        const contacts = this.contactManager.getContacts();
        if (contacts.length > 0) {
          const link = this.contactManager.getWhatsAppLink(contacts[0].phone, msg);
          window.open(link, '_blank');
        }
      });
    }

    const btnSummaryWebShare = document.getElementById('btnSummaryWebShare');
    if (btnSummaryWebShare) {
      btnSummaryWebShare.addEventListener('click', async () => {
        await this.contactManager.shareViaWebShare({
          victimName: this.medicalIdManager.getProfile().fullName,
          location: this.locationService.currentLocation
        });
      });
    }

    // 6. Contact Management Form & Modal
    const btnAddContact = document.getElementById('btnAddContact');
    if (btnAddContact) {
      btnAddContact.addEventListener('click', () => this.openContactModal());
    }

    const btnCloseContact = document.getElementById('btnCloseContactModal');
    const btnCancelContact = document.getElementById('btnCancelContactModal');
    if (btnCloseContact) btnCloseContact.addEventListener('click', () => this.closeContactModal());
    if (btnCancelContact) btnCancelContact.addEventListener('click', () => this.closeContactModal());

    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('editContactId').value;
        const name = document.getElementById('contactInputName').value;
        const phone = document.getElementById('contactInputPhone').value;
        const relation = document.getElementById('contactInputRelation').value;
        const notifyWhatsApp = document.getElementById('contactInputWhatsapp').checked;
        const notifySMS = document.getElementById('contactInputSms').checked;

        if (editId) {
          this.contactManager.updateContact(editId, { name, phone, relation, notifyWhatsApp, notifySMS });
        } else {
          try {
            this.contactManager.addContact({ name, phone, relation, notifyWhatsApp, notifySMS });
          } catch (err) {
            alert(err.message);
            return;
          }
        }

        this.closeContactModal();
        this.renderContactsList();
      });
    }

    // 7. Medical ID Form & Modal
    const btnEditMedical = document.getElementById('btnEditMedical');
    const btnViewCard = document.getElementById('btnViewMedicalCard');
    const btnCloseMed = document.getElementById('btnCloseMedicalModal');
    const btnCancelMed = document.getElementById('btnCancelMedicalModal');

    if (btnEditMedical || btnViewCard) {
      const openMed = () => this.openMedicalModal();
      if (btnEditMedical) btnEditMedical.addEventListener('click', openMed);
      if (btnViewCard) btnViewCard.addEventListener('click', openMed);
    }
    if (btnCloseMed) btnCloseMed.addEventListener('click', () => this.closeMedicalModal());
    if (btnCancelMed) btnCancelMed.addEventListener('click', () => this.closeMedicalModal());

    const medicalForm = document.getElementById('medicalForm');
    if (medicalForm) {
      medicalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const updated = {
          fullName: document.getElementById('medInputName').value,
          bloodGroup: document.getElementById('medInputBlood').value,
          age: parseInt(document.getElementById('medInputAge').value) || 25,
          allergies: document.getElementById('medInputAllergies').value,
          medicalConditions: document.getElementById('medInputConditions').value,
          insuranceProvider: document.getElementById('medInputInsurance').value
        };
        this.medicalIdManager.saveProfile(updated);
        this.closeMedicalModal();
        this.renderMedicalSummary();
      });
    }

    // 8. Map Controls
    const btnRecenter = document.getElementById('btnRecenterMap');
    const btnFit = document.getElementById('btnFitMap');
    if (btnRecenter) {
      btnRecenter.addEventListener('click', () => {
        this.mapController.panToUser(this.locationService.currentLocation);
      });
    }
    if (btnFit) {
      btnFit.addEventListener('click', () => {
        this.mapController.fitAll();
      });
    }
  }

  openContactModal(editId = null) {
    const modal = document.getElementById('contactModal');
    const title = document.getElementById('contactModalTitle');
    const form = document.getElementById('contactForm');
    form.reset();

    if (editId) {
      title.textContent = 'Edit Emergency Contact';
      const contact = this.contactManager.getContacts().find(c => c.id === editId);
      if (contact) {
        document.getElementById('editContactId').value = contact.id;
        document.getElementById('contactInputName').value = contact.name;
        document.getElementById('contactInputPhone').value = contact.phone;
        document.getElementById('contactInputRelation').value = contact.relation;
        document.getElementById('contactInputWhatsapp').checked = contact.notifyWhatsApp !== false;
        document.getElementById('contactInputSms').checked = contact.notifySMS !== false;
      }
    } else {
      title.textContent = 'Add Emergency Contact (Max 5)';
      document.getElementById('editContactId').value = '';
    }

    modal.classList.add('is-open');
  }

  closeContactModal() {
    document.getElementById('contactModal').classList.remove('is-open');
  }

  openMedicalModal() {
    const modal = document.getElementById('medicalModal');
    const profile = this.medicalIdManager.getProfile();

    document.getElementById('medInputName').value = profile.fullName || '';
    document.getElementById('medInputBlood').value = profile.bloodGroup || 'B+';
    document.getElementById('medInputAge').value = profile.age || 22;
    document.getElementById('medInputAllergies').value = profile.allergies || '';
    document.getElementById('medInputConditions').value = profile.medicalConditions || '';
    document.getElementById('medInputInsurance').value = profile.insuranceProvider || '';

    modal.classList.add('is-open');
  }

  closeMedicalModal() {
    document.getElementById('medicalModal').classList.remove('is-open');
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new ResQApp();
});

# 🚨 ResQAI — AI-Powered Accident Detection & Emergency Response System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-00f090.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Version](https://img.shields.io/badge/Core%20Engine-v2.4-00d2ff.svg)]()
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Android%20%7C%20iOS-blueviolet.svg)]()

> **ResQAI** is a life-saving, client-side emergency response platform that transforms any smartphone into an intelligent crash and fall detector. Leveraging real-time sensor telemetry, kinematic AI models, and automated dispatch workflows, ResQAI helps bridge the critical **"Golden Hour"** to save accident victims.

---

## 📌 The Problem & Mission

Every year, thousands of accident victims succumb to injuries simply because emergency medical services (EMS) and family members are not notified in time. The first **60 minutes** following a traumatic injury—known as the **Golden Hour**—are crucial:
- Traditional crash detection systems either require expensive dedicated vehicle hardware (OBD dongles, telematics boxes).
- Smartphone-based solutions often trigger excessive false alarms from simple bumps or dropped phones.

**ResQAI** solves this with a zero-cost, privacy-first web application that runs directly on any smartphone using standard web APIs, pairing multi-stage kinematic analysis with instant live emergency dispatch.

---

## ✨ Key Features

### 🤖 1. Multi-Stage AI Accident & Fall Detection
- **Continuous Kinematic Analysis**: Evaluates 3-axis accelerometer G-force, angular velocity (gyroscope), and jerk shock rate ($da/dt$).
- **Multi-Vector Threat Detection**: Specifically tuned to classify severe car collisions, motorcycle high-sides, and high-altitude falls.
- **Smart False-Alarm Filtering**: Differentiates between real life-threatening collisions and harmless events (e.g., dropping the phone on the floor, walking, speed bumps, and harsh braking) by analyzing post-event immobility windows.

### ⏱️ 2. 15-Second Emergency Countdown HUD
- When an accident is detected, a high-urgency audio-visual alarm triggers with a 15-second abort timer.
- Synthesizes realistic alert sirens using the **Web Audio API** (no external audio files needed).
- If the user is uninjured, they can cancel the alert with a single tap, eliminating accidental distress calls.

### 📍 3. Live GPS & Interactive Emergency Radar
- Tracks real-time latitude, longitude, altitude, and precision radius.
- Embedded interactive **Leaflet & OpenStreetMap** showing the user's live position.
- Instant locator for nearest hospitals, police stations, and trauma care facilities with direct 1-tap routing.

### 📲 4. Multi-Channel Emergency Dispatch
- **Automated WhatsApp & SMS Alert Generators**: Pre-formats structured emergency messages containing exact GPS coordinates and clickable Google Maps links.
- **5-Contact SOS Network**: Saves up to 5 family or emergency contacts locally with persistent storage.
- **Quick-Dial Bar**: 1-tap direct calling to national emergency numbers:
  - 🚨 `112` (National Emergency SOS)
  - 🚑 `108` / `102` (Ambulance)
  - 🚓 `100` (Police)

### 🏥 5. Digital Medical ID Card
- Displays vital medical details right during the emergency screen:
  - Full Name & Age
  - Blood Group (e.g. O+, A+, B+, AB-)
  - Known Allergies & Pre-existing Conditions
  - Current Medications & Organ Donor status
  - Emergency Notes for first responders

### 📲 6. Progressive Web App (PWA) Offline-Ready
- Installable directly to home screens on Android (Chrome) and iOS (Safari).
- Equipped with a Service Worker (`sw.js`) for lightning-fast caching and offline reliability.

### 🧪 7. Interactive Scenario Test Bench
- Built-in simulation suite allowing instant testing and demonstration of detection algorithms without needing physical crashes:
  - 🤸‍♂️ *Severe Fall from Height (Roof / Stairs)* ➜ Triggers SOS
  - 💥 *Severe Car Crash (55 km/h)* ➜ Triggers SOS
  - 🏍️ *Motorcycle High-Side Skid* ➜ Triggers SOS
  - 📱 *Phone Dropped on Floor* ➜ Filtered out (Normal Motion)
  - 🕳️ *Deep Pothole / Speed Bump* ➜ Filtered out (Harmless Bump)
  - 🛑 *Sudden Hard Braking* ➜ Filtered out (Normal Vehicle Handling)

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Core** | Vanilla JavaScript (ES6+), HTML5, CSS3 | Zero-dependency, ultra-lightweight performance |
| **Styling** | Cyber-Glassmorphism Dark HUD | High contrast, emergency-grade readability |
| **Sensors** | `DeviceMotionEvent`, `DeviceOrientationEvent` | Accelerometer & Gyroscope hardware interface |
| **Geolocation** | HTML5 Geolocation API | High-accuracy GPS positioning |
| **Mapping** | [Leaflet.js](https://leafletjs.com/) + OpenStreetMap | Interactive spatial radar & nearby service markers |
| **Sound** | HTML5 Web Audio API | Low-latency algorithmic emergency siren synthesis |
| **PWA** | Web App Manifest + Service Worker | Offline support and homescreen installation |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (optional, for local static serving) OR Python 3 (built-in on macOS/Linux)
- A modern web browser (Google Chrome, Safari, Edge, or Firefox)

### 1. Clone the Repository
```bash
git clone https://github.com/ujjwal403/ResQAI---AI-Accident-Detection-Emergency-Response.git
cd ResQAI---AI-Accident-Detection-Emergency-Response
```

### 2. Run the Local Development Server

You can start the server using either method:

**Using npm:**
```bash
npm start
```

**Using Python:**
```bash
python3 -m http.server 8000
```

### 3. Open in Browser
Visit [http://localhost:8000](http://localhost:8000) in your browser.

> 💡 **Tip for Mobile Sensor Testing**: Modern mobile browsers require an **HTTPS** connection (or `localhost`) to access accelerometer and gyroscope sensors. To test live hardware sensors on a physical smartphone, use a tunneling tool like [ngrok](https://ngrok.com/):
> ```bash
> npx ngrok http 8000
> ```
> Open the generated HTTPS URL on your smartphone and tap **"📡 Sensors"** or **"📲 Install"**.

---

## 📂 Project Structure

```text
ResQAI/
├── index.html              # Main application entry point & HUD layout
├── style.css               # Design system, glassmorphism, responsive styles
├── app.js                  # Complete application bundle & interactive logic
├── manifest.json           # PWA metadata configuration
├── sw.js                   # Service Worker for offline asset caching
├── package.json            # Project manifest & start scripts
├── .gitignore              # Ignored files (node_modules, logs, OS files)
├── create_icons.py         # Utility script for PWA icon generation
├── icons/
│   ├── icon-192.png        # PWA home screen icon (192x192)
│   └── icon-512.png        # PWA splash screen icon (512x512)
└── src/                    # Modular engine source components
    ├── aiDetector.js       # Kinematic classification and filtering models
    ├── contactManager.js   # Emergency contacts manager (localStorage)
    ├── emergencyManager.js # Siren, countdown timer, and dispatch workflow
    ├── locationService.js  # Geolocation query and address resolution
    ├── mapController.js    # Leaflet map manager & service markers
    ├── medicalId.js        # Medical profile state manager
    ├── sensorEngine.js     # Real-time accelerometer & gyroscope pipeline
    └── simulationData.js   # Realistic test bench kinematic waveforms
```

---

## 🧪 Testing the Detection Engine

1. Open the app and ensure **"AI GUARDIAN: ACTIVE"** is displayed in the top bar.
2. In the **AI Scenario Test Bench**:
   - Click **💥 Severe Car Crash (55 km/h)**: Observe the 3-axis oscilloscope spike past 5.5G, followed by rotational tumbling and immobility detection. The 15-second emergency countdown modal will activate with audible sirens.
   - Click **📱 Phone Dropped on Floor**: Observe an initial sharp impact spike, but the AI identifies subsequent normal handling motions and suppresses the alarm with a **"False Alarm Filtered"** notification.

---

## 🔒 Privacy & Security

- **100% Client-Side Processing**: Sensor data, motion vectors, and telemetry calculations are computed in real time entirely inside your device's browser sandbox. No continuous sensor streams or background telemetry are transmitted to any remote server.
- **Local Storage Only**: Medical ID details and emergency contact numbers remain on your device's `localStorage` and are dispatched only during an actual SOS trigger.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

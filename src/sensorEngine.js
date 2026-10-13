/**
 * ResQAI Sensor Engine
 * Handles real-time DeviceMotion / DeviceOrientation API telemetry and simulation streaming.
 */

export class SensorEngine {
  constructor() {
    this.subscribers = [];
    this.isRunning = false;
    this.isSimulating = false;
    this.simulationTimer = null;
    this.simIndex = 0;
    this.currentScenario = null;

    // Rolling telemetry history buffer (last 60 samples ~ 3s at 20Hz)
    this.history = [];
    this.maxHistory = 80;

    // Current instant values
    this.currentData = {
      ax: 0,
      ay: 0,
      az: 9.81,
      totalG: 1.0,
      jerk: 0,
      alpha: 0,
      beta: 0,
      gamma: 0,
      angularVelocity: 0,
      speed: 0,
      timestamp: Date.now(),
      isRealSensor: false
    };

    this.lastTimestamp = null;
    this.lastTotalA = 9.81;

    // Bound listeners
    this.handleDeviceMotion = this.handleDeviceMotion.bind(this);
    this.handleDeviceOrientation = this.handleDeviceOrientation.bind(this);
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify(data) {
    for (const callback of this.subscribers) {
      try {
        callback(data);
      } catch (err) {
        console.error('Sensor subscriber error:', err);
      }
    }
  }

  async requestPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const response = await DeviceMotionEvent.requestPermission();
        if (response === 'granted') {
          this.startRealSensors();
          return { success: true, message: 'Sensor access granted' };
        } else {
          return { success: false, message: 'Permission denied by user' };
        }
      } catch (e) {
        console.warn('Sensor permission error:', e);
        return { success: false, message: e.message };
      }
    } else {
      // Non-iOS 13+ devices or desktop
      this.startRealSensors();
      return { success: true, message: 'Sensor listening started' };
    }
  }

  startRealSensors() {
    if (this.isSimulating) {
      this.stopSimulation();
    }
    this.isRunning = true;
    window.addEventListener('devicemotion', this.handleDeviceMotion, true);
    window.addEventListener('deviceorientation', this.handleDeviceOrientation, true);
  }

  stopRealSensors() {
    this.isRunning = false;
    window.removeEventListener('devicemotion', this.handleDeviceMotion, true);
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation, true);
  }

  handleDeviceMotion(event) {
    if (!this.isRunning || this.isSimulating) return;

    const now = Date.now();
    const dt = this.lastTimestamp ? Math.max((now - this.lastTimestamp) / 1000, 0.01) : 0.05;
    this.lastTimestamp = now;

    // Use accelerationIncludingGravity if available, fallback to acceleration + 9.81
    let ax = 0, ay = 0, az = 9.81;
    if (event.accelerationIncludingGravity) {
      ax = event.accelerationIncludingGravity.x || 0;
      ay = event.accelerationIncludingGravity.y || 0;
      az = event.accelerationIncludingGravity.z || 9.81;
    } else if (event.acceleration) {
      ax = event.acceleration.x || 0;
      ay = event.acceleration.y || 0;
      az = (event.acceleration.z || 0) + 9.81;
    }

    const totalA = Math.sqrt(ax * ax + ay * ay + az * az);
    const totalG = +(totalA / 9.80665).toFixed(2);
    const jerk = +((Math.abs(totalA - this.lastTotalA) / dt)).toFixed(2);
    this.lastTotalA = totalA;

    // Rotation rate (deg/sec)
    let rotAlpha = 0, rotBeta = 0, rotGamma = 0;
    if (event.rotationRate) {
      rotAlpha = event.rotationRate.alpha || 0;
      rotBeta = event.rotationRate.beta || 0;
      rotGamma = event.rotationRate.gamma || 0;
    }
    const angularVelocity = +(Math.sqrt(rotAlpha * rotAlpha + rotBeta * rotBeta + rotGamma * rotGamma)).toFixed(2);

    this.currentData = {
      ...this.currentData,
      ax: +ax.toFixed(2),
      ay: +ay.toFixed(2),
      az: +az.toFixed(2),
      totalG,
      jerk,
      rotAlpha: +rotAlpha.toFixed(1),
      rotBeta: +rotBeta.toFixed(1),
      rotGamma: +rotGamma.toFixed(1),
      angularVelocity,
      timestamp: now,
      isRealSensor: true
    };

    this.pushHistory(this.currentData);
    this.notify(this.currentData);
  }

  handleDeviceOrientation(event) {
    if (!this.isRunning || this.isSimulating) return;

    this.currentData.alpha = +(event.alpha || 0).toFixed(1); // Compass/Yaw (0-360)
    this.currentData.beta = +(event.beta || 0).toFixed(1);   // Pitch (-180 to 180)
    this.currentData.gamma = +(event.gamma || 0).toFixed(1); // Roll (-90 to 90)
  }

  pushHistory(point) {
    this.history.push({ ...point });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  // Simulation Playback Engine
  startSimulation(scenario) {
    this.stopRealSensors();
    this.stopSimulation();

    this.isSimulating = true;
    this.currentScenario = scenario;
    this.simIndex = 0;
    this.history = [];

    const intervalMs = 50; // 20Hz sample rate

    this.simulationTimer = setInterval(() => {
      if (!this.isSimulating || !this.currentScenario) return;

      const data = this.currentScenario.data;
      if (this.simIndex >= data.length) {
        // Loop stillness phase or stay in final state
        const lastPt = data[data.length - 1];
        const point = {
          ax: +(lastPt.ax + (Math.random() - 0.5) * 0.05).toFixed(2),
          ay: +(lastPt.ay + (Math.random() - 0.5) * 0.05).toFixed(2),
          az: +(lastPt.az + (Math.random() - 0.5) * 0.05).toFixed(2),
          alpha: +(lastPt.alpha || 0).toFixed(1),
          beta: +(lastPt.beta || 0).toFixed(1),
          gamma: +(lastPt.gamma || 0).toFixed(1),
          speed: 0,
          totalG: +(Math.sqrt(lastPt.ax * lastPt.ax + lastPt.ay * lastPt.ay + lastPt.az * lastPt.az) / 9.81).toFixed(2),
          jerk: 0.1,
          angularVelocity: 0.1,
          timestamp: Date.now(),
          isSimulation: true,
          phase: lastPt.phase || 'STILLNESS',
          scenarioId: this.currentScenario.id
        };
        this.currentData = point;
        this.pushHistory(point);
        this.notify(point);
        return;
      }

      const currentPt = data[this.simIndex];
      const totalA = Math.sqrt(currentPt.ax * currentPt.ax + currentPt.ay * currentPt.ay + currentPt.az * currentPt.az);
      const totalG = +(totalA / 9.80665).toFixed(2);
      const dt = 0.05;
      const jerk = +((Math.abs(totalA - this.lastTotalA) / dt)).toFixed(2);
      this.lastTotalA = totalA;

      const angVel = +(Math.sqrt(
        (currentPt.alpha || 0) ** 2 +
        (currentPt.beta || 0) ** 2 +
        (currentPt.gamma || 0) ** 2
      )).toFixed(2);

      const point = {
        ax: +currentPt.ax.toFixed(2),
        ay: +currentPt.ay.toFixed(2),
        az: +currentPt.az.toFixed(2),
        totalG,
        jerk,
        alpha: +(currentPt.alpha || 0).toFixed(1),
        beta: +(currentPt.beta || 0).toFixed(1),
        gamma: +(currentPt.gamma || 0).toFixed(1),
        angularVelocity: angVel,
        speed: +(currentPt.speed || 0).toFixed(1),
        timestamp: Date.now(),
        isSimulation: true,
        phase: currentPt.phase,
        scenarioId: this.currentScenario.id
      };

      this.currentData = point;
      this.pushHistory(point);
      this.notify(point);
      this.simIndex++;
    }, intervalMs);
  }

  stopSimulation() {
    this.isSimulating = false;
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  getRecentHistory() {
    return this.history;
  }
}

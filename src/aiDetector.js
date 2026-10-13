/**
 * ResQAI Intelligent Accident Classifier & False-Alarm Filter
 * Implements multi-feature sensory fusion analysis:
 * - Shockwave Peak G-Force Vector
 * - Dynamic Jerk Rate (da/dt)
 * - Rotational Shock & Tumbling
 * - Pre/Post Impact Velocity Delta
 * - Post-Impact Immobility / Incapacitation Variance
 */

export class AIDetector {
  constructor(options = {}) {
    this.sensitivity = options.sensitivity || 'MEDIUM'; // 'HIGH', 'MEDIUM', 'LOW'
    this.onAccidentDetected = options.onAccidentDetected || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onAnalysisUpdate = options.onAnalysisUpdate || (() => {});

    this.state = 'MONITORING'; // 'MONITORING', 'ANALYZING', 'CONFIRMED', 'DISMISSED'
    this.impactWindow = [];
    this.impactStartTime = 0;
    this.candidateImpact = null;
    this.lastTriggerTime = 0;

    // Tuning thresholds based on sensitivity
    this.thresholds = this.getThresholds(this.sensitivity);
  }

  setSensitivity(level) {
    this.sensitivity = level;
    this.thresholds = this.getThresholds(level);
  }

  getThresholds(level) {
    switch (level) {
      case 'HIGH':
        return { impactG: 2.8, jerk: 28, rotSpeed: 60, immobilityVar: 0.20, minConfidence: 65 };
      case 'LOW':
        return { impactG: 4.5, jerk: 50, rotSpeed: 100, immobilityVar: 0.10, minConfidence: 85 };
      case 'MEDIUM':
      default:
        return { impactG: 3.4, jerk: 35, rotSpeed: 75, immobilityVar: 0.15, minConfidence: 75 };
    }
  }

  processSample(sample, history) {
    const now = sample.timestamp || Date.now();

    // Prevent immediate re-triggering if already in active emergency or cooldown (10s)
    if (this.state === 'CONFIRMED' || (now - this.lastTriggerTime < 10000 && this.state !== 'ANALYZING')) {
      return;
    }

    // State 1: In Monitoring mode, look for sudden impact shock or extreme jerk
    if (this.state === 'MONITORING') {
      const isImpactG = sample.totalG >= this.thresholds.impactG;
      const isExtremeJerk = sample.jerk >= this.thresholds.jerk;

      if (isImpactG || isExtremeJerk) {
        this.state = 'ANALYZING';
        this.impactStartTime = now;
        this.impactWindow = [{ ...sample }];
        this.candidateImpact = {
          peakG: sample.totalG,
          peakJerk: sample.jerk,
          initialSpeed: sample.speed || 0,
          peakRotSpeed: sample.angularVelocity || 0,
          timestamp: now
        };

        this.onStatusChange({
          state: 'ANALYZING',
          message: 'Potential high-G event detected. AI verifying anomaly...',
          sample
        });
      }
      return;
    }

    // State 2: In Analyzing mode, collect 1.5s - 2.5s post-impact behavior to filter false alarms
    if (this.state === 'ANALYZING') {
      this.impactWindow.push({ ...sample });

      // Track peak values during the impact shockwave
      if (sample.totalG > this.candidateImpact.peakG) {
        this.candidateImpact.peakG = sample.totalG;
      }
      if (sample.jerk > this.candidateImpact.peakJerk) {
        this.candidateImpact.peakJerk = sample.jerk;
      }
      if (sample.angularVelocity > this.candidateImpact.peakRotSpeed) {
        this.candidateImpact.peakRotSpeed = sample.angularVelocity;
      }

      const elapsedMs = now - this.impactStartTime;

      // Provide live AI confidence estimation during analysis
      const interimMetrics = this.evaluateMetrics(this.impactWindow, this.candidateImpact);
      this.onAnalysisUpdate({
        elapsedMs,
        progress: Math.min(100, Math.round((elapsedMs / 2000) * 100)),
        confidence: interimMetrics.confidence,
        reasons: interimMetrics.reasons
      });

      // After 2.0 seconds of post-impact window, reach final verdict
      if (elapsedMs >= 2000) {
        this.finalizeDecision(this.impactWindow, this.candidateImpact);
      }
    }
  }

  evaluateMetrics(windowData, impactMeta) {
    if (windowData.length < 5) {
      return { confidence: 50, reasons: ['Gathering sensor window...'], isCrash: false };
    }

    // 1. Impact G-Force Score (0-30 points)
    const peakG = impactMeta.peakG;
    let gScore = 0;
    if (peakG >= 5.0) gScore = 30;
    else if (peakG >= 3.8) gScore = 25;
    else if (peakG >= 3.0) gScore = 18;
    else gScore = 10;

    // 2. Rotational Tumbling Score (0-25 points)
    const rotSpeed = impactMeta.peakRotSpeed;
    let rotScore = 0;
    if (rotSpeed >= 120) rotScore = 25;
    else if (rotSpeed >= 70) rotScore = 18;
    else if (rotSpeed >= 40) rotScore = 10;
    else rotScore = 2;

    // 3. Post-impact stillness vs user movement (0-25 points)
    // Take the last 1.0s of the window
    const recentSamples = windowData.slice(-15);
    const gValues = recentSamples.map(s => s.totalG);
    const avgG = gValues.reduce((a, b) => a + b, 0) / gValues.length;
    const variance = gValues.reduce((sum, g) => sum + Math.pow(g - avgG, 2), 0) / gValues.length;
    
    // Check if user is gesturing/moving or completely still
    const rotValues = recentSamples.map(s => s.angularVelocity || 0);
    const avgRot = rotValues.reduce((a, b) => a + b, 0) / rotValues.length;

    let immobilityScore = 0;
    let isUserActive = false;
    let isBump = false;
    let isBrake = false;

    if (variance < 0.08 && avgRot < 5) {
      // Complete stillness / victim incapacitation
      immobilityScore = 25;
    } else if (variance < 0.15 && avgRot < 12) {
      immobilityScore = 18;
    } else if (avgRot > 20 || variance > 0.4) {
      // High user movement -> Likely picked phone back up or walking
      isUserActive = true;
      immobilityScore = -20;
    }

    // 4. Velocity Drop / Road Kinematics (0-20 points)
    const initSpeed = impactMeta.initialSpeed;
    const finalSpeed = recentSamples[recentSamples.length - 1].speed || 0;
    let speedScore = 0;
    if (initSpeed > 30 && finalSpeed < 5) {
      // Rapid vehicle stop
      speedScore = 20;
    } else if (initSpeed > 20 && finalSpeed < 10) {
      speedScore = 12;
    } else if (initSpeed > 30 && finalSpeed > 25) {
      // Continuous driving at speed -> Road bump or pothole!
      isBump = true;
      speedScore = -25;
    }

    // False Alarm Filter Checks
    const reasons = [];
    if (peakG >= 3.5) reasons.push(`Severe shock wave (${peakG.toFixed(1)}G)`);
    if (rotSpeed >= 70) reasons.push(`High angular tumbling (${rotSpeed.toFixed(0)}°/s)`);
    if (immobilityScore >= 18) reasons.push('Post-impact motionlessness / Incapacitation signature');
    if (speedScore >= 15) reasons.push(`Rapid kinetic energy drop (${initSpeed.toFixed(0)} → ${finalSpeed.toFixed(0)} km/h)`);

    if (isUserActive) reasons.push('Active user gestures detected (Phone drop signature)');
    if (isBump) reasons.push('Continuous velocity maintained (Road pothole/bump signature)');

    let rawScore = gScore + rotScore + immobilityScore + speedScore;
    let confidence = Math.max(5, Math.min(99, rawScore));

    // Decisive overrides for distinct false alarm patterns:
    if (isUserActive && peakG < 3.5) {
      confidence = Math.min(confidence, 35);
    }
    if (isBump) {
      confidence = Math.min(confidence, 25);
    }

    return {
      confidence,
      gScore,
      rotScore,
      immobilityScore,
      speedScore,
      variance,
      avgRot,
      isUserActive,
      isBump,
      reasons
    };
  }

  finalizeDecision(windowData, impactMeta) {
    const analysis = this.evaluateMetrics(windowData, impactMeta);
    const passedConfidence = analysis.confidence >= this.thresholds.minConfidence;

    if (passedConfidence) {
      this.state = 'CONFIRMED';
      this.lastTriggerTime = Date.now();

      const incidentReport = {
        id: 'INC-' + Math.floor(100000 + Math.random() * 900000),
        timestamp: new Date().toISOString(),
        confidence: analysis.confidence,
        severity: analysis.confidence > 85 ? 'CRITICAL' : 'HIGH',
        peakG: impactMeta.peakG,
        peakJerk: impactMeta.peakJerk,
        peakAngularVelocity: impactMeta.peakRotSpeed,
        preCrashSpeed: impactMeta.initialSpeed,
        reasons: analysis.reasons,
        telemetrySnapshot: windowData.slice(-20)
      };

      this.onStatusChange({
        state: 'CONFIRMED',
        message: 'Accident confirmed by AI Sensor Fusion Engine!',
        incident: incidentReport
      });

      this.onAccidentDetected(incidentReport);
    } else {
      this.state = 'MONITORING';
      let dismissalReason = 'Minor bump or normal user handling.';
      if (analysis.isUserActive) dismissalReason = 'Phone drop filtered: immediate natural user motion detected.';
      if (analysis.isBump) dismissalReason = 'Road pothole filtered: constant driving speed maintained.';

      this.onStatusChange({
        state: 'DISMISSED',
        message: `False Alarm Filtered (${analysis.confidence}% confidence). ${dismissalReason}`,
        analysis
      });

      // Return to monitoring after short toast
      setTimeout(() => {
        if (this.state === 'DISMISSED') {
          this.state = 'MONITORING';
          this.onStatusChange({
            state: 'MONITORING',
            message: 'Active Guardian: Monitoring sensors for impact anomalies...',
            sample: null
          });
        }
      }, 3500);
    }
  }

  reset() {
    this.state = 'MONITORING';
    this.impactWindow = [];
    this.candidateImpact = null;
    this.onStatusChange({
      state: 'MONITORING',
      message: 'Active Guardian: Monitoring sensors for impact anomalies...',
      sample: null
    });
  }
}

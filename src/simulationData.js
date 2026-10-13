/**
 * Realistic sensor simulation datasets for AI Accident Detection Engine
 * Each scenario contains time-series telemetry sampled at 20Hz (50ms intervals)
 * ax, ay, az in m/s^2 (includes 9.81m/s^2 gravity)
 * alpha, beta, gamma in deg/sec
 * speed in km/h
 */

export const SIMULATION_SCENARIOS = {
  car_crash: {
    id: 'car_crash',
    name: 'Severe Car Crash (55 km/h)',
    type: 'CRASH',
    expectedClassification: 'SEVERE_ACCIDENT',
    description: 'Frontal high-speed collision with 5.8G peak impact, rotational tumbling, and victim immobility.',
    data: generateCarCrashData()
  },
  motorcycle_skid: {
    id: 'motorcycle_skid',
    name: 'Motorcycle High-Side Skid',
    type: 'CRASH',
    expectedClassification: 'SEVERE_ACCIDENT',
    description: 'High-side flip with severe angular rotation, 4.3G road impact, and post-crash motionless state.',
    data: generateMotorcycleSkidData()
  },
  phone_drop: {
    id: 'phone_drop',
    name: 'Phone Dropped on Floor',
    type: 'FALSE_ALARM',
    expectedClassification: 'NORMAL_MOTION',
    description: 'Brief freefall and 2.2G impact followed by immediate user pickup and natural hand gestures.',
    data: generatePhoneDropData()
  },
  pothole_bump: {
    id: 'pothole_bump',
    name: 'Speed Bump / Deep Pothole',
    type: 'FALSE_ALARM',
    expectedClassification: 'NORMAL_MOTION',
    description: 'Vertical Z-axis shock without rotational tumbling or loss of vehicle momentum.',
    data: generatePotholeData()
  },
  hard_brake: {
    id: 'hard_brake',
    name: 'Emergency Hard Braking',
    type: 'FALSE_ALARM',
    expectedClassification: 'NORMAL_MOTION',
    description: 'Sustained 1.3G longitudinal deceleration with vehicle coming to a controlled stop.',
    data: generateHardBrakeData()
  }
};

function generateCarCrashData() {
  const points = [];
  let t = 0;
  
  // Phase 1: Normal Driving (0.0s - 2.0s) @ 55 km/h
  for (let i = 0; i < 40; i++) {
    points.push({
      t: +(t).toFixed(2),
      ax: (Math.random() - 0.5) * 0.4,
      ay: (Math.random() - 0.5) * 0.4,
      az: 9.81 + (Math.random() - 0.5) * 0.6,
      alpha: (Math.random() - 0.5) * 4,
      beta: (Math.random() - 0.5) * 3,
      gamma: (Math.random() - 0.5) * 3,
      speed: 55 + (Math.random() - 0.5) * 2,
      phase: 'DRIVING'
    });
    t += 0.05;
  }

  // Phase 2: Instant of Collision (2.0s - 2.4s) - Catastrophic deceleration & shockwave
  const impactG = [2.2, 4.5, 5.8, 5.4, 3.8, 2.1, 1.4, 1.1];
  for (let i = 0; i < impactG.length; i++) {
    const g = impactG[i];
    points.push({
      t: +(t).toFixed(2),
      ax: (Math.random() - 0.5) * 15 + (g * 9.81 * 0.6),
      ay: -1 * (g * 9.81 * 0.8), // Massive forward deceleration
      az: 9.81 + (g * 9.81 * 0.4),
      alpha: 180 + (Math.random() - 0.5) * 60,
      beta: 220 + (Math.random() - 0.5) * 80,
      gamma: 140 + (Math.random() - 0.5) * 50,
      speed: Math.max(0, 55 - (i * 8)),
      phase: 'IMPACT'
    });
    t += 0.05;
  }

  // Phase 3: Secondary recoil & vehicle rest (2.4s - 3.2s)
  for (let i = 0; i < 16; i++) {
    points.push({
      t: +(t).toFixed(2),
      ax: (Math.random() - 0.5) * 1.5,
      ay: (Math.random() - 0.5) * 1.5,
      az: 9.81 + (Math.random() - 0.5) * 1.0,
      alpha: (Math.random() - 0.5) * 15,
      beta: (Math.random() - 0.5) * 15,
      gamma: (Math.random() - 0.5) * 15,
      speed: 0,
      phase: 'RECOIL'
    });
    t += 0.05;
  }

  // Phase 4: Post-crash stillness / incapacitation (3.2s - 6.0s)
  for (let i = 0; i < 56; i++) {
    points.push({
      t: +(t).toFixed(2),
      ax: (Math.random() - 0.5) * 0.05,
      ay: (Math.random() - 0.5) * 0.05,
      az: 9.81 + (Math.random() - 0.5) * 0.05,
      alpha: (Math.random() - 0.5) * 0.5,
      beta: (Math.random() - 0.5) * 0.5,
      gamma: (Math.random() - 0.5) * 0.5,
      speed: 0,
      phase: 'STILLNESS'
    });
    t += 0.05;
  }

  return points;
}

function generateMotorcycleSkidData() {
  const points = [];
  let t = 0;

  // Phase 1: Cruising (0 - 1.5s) @ 62 km/h
  for (let i = 0; i < 30; i++) {
    points.push({
      t: +(t).toFixed(2),
      ax: (Math.random() - 0.5) * 0.8,
      ay: (Math.random() - 0.5) * 0.8,
      az: 9.81 + (Math.random() - 0.5) * 1.2,
      alpha: (Math.random() - 0.5) * 8,
      beta: 12 + (Math.random() - 0.5) * 4,
      gamma: 15 + (Math.random() - 0.5) * 4,
      speed: 62 + (Math.random() - 0.5) * 2,
      phase: 'DRIVING'
    });
    t += 0.05;
  }

  // Phase 2: Loss of traction & violent lean (1.5s - 2.0s)
  for (let i = 0; i < 10; i++) {
    points.push({
      t: +(t).toFixed(2),
      ax: (i + 1) * 3.5,
      ay: -12.0,
      az: 4.5,
      alpha: 120 + i * 25,
      beta: 180 + i * 30,
      gamma: 250 + i * 40,
      speed: 55 - i * 4,
      phase: 'SKID'
    });
    t += 0.05;
  }

  // Phase 3: Ground Impact & slide (2.0s - 2.6s)
  const impacts = [4.3, 3.8, 3.1, 2.4, 1.8, 1.2];
  for (let i = 0; i < impacts.length; i++) {
    const g = impacts[i];
    points.push({
      t: +(t).toFixed(2),
      ax: (Math.random() - 0.5) * 8 + (g * 9.81 * 0.7),
      ay: -1 * (g * 9.81 * 0.6),
      az: (g * 9.81 * 0.5),
      alpha: 150 - i * 20,
      beta: 90 - i * 15,
      gamma: 80 - i * 10,
      speed: Math.max(0, 20 - i * 4),
      phase: 'IMPACT'
    });
    t += 0.05;
  }

  // Phase 4: Stationary post-accident (2.6s - 6.0s)
  for (let i = 0; i < 68; i++) {
    points.push({
      t: +(t).toFixed(2),
      ax: 1.2 + (Math.random() - 0.5) * 0.04,
      ay: 4.5 + (Math.random() - 0.5) * 0.04,
      az: 8.5 + (Math.random() - 0.5) * 0.04,
      alpha: 0,
      beta: 0,
      gamma: 0,
      speed: 0,
      phase: 'STILLNESS'
    });
    t += 0.05;
  }

  return points;
}

function generatePhoneDropData() {
  const points = [];
  let t = 0;

  for (let i = 0; i < 30; i++) {
    points.push({
      t: +(t).toFixed(2),
      ax: (Math.random() - 0.5) * 0.5,
      ay: (Math.random() - 0.5) * 0.5,
      az: 9.81 + (Math.random() - 0.5) * 0.4,
      alpha: (Math.random() - 0.5) * 5,
      beta: (Math.random() - 0.5) * 5,
      gamma: (Math.random() - 0.5) * 5,
      speed: 0,
      phase: 'HANDHELD'
    });
    t += 0.05;
  }

  for (let i = 0; i < 4; i++) {
    points.push({
      t: +(t).toFixed(2),
      ax: 0.1,
      ay: 0.1,
      az: 0.8,
      alpha: 40,
      beta: 60,
      gamma: 30,
      speed: 0,
      phase: 'FREEFALL'
    });
    t += 0.05;
  }

  points.push({
    t: +(t).toFixed(2),
    ax: 2.1 * 9.81 * 0.5,
    ay: 2.1 * 9.81 * 0.5,
    az: 2.1 * 9.81 * 0.9,
    alpha: 95,
    beta: 120,
    gamma: 70,
    speed: 0,
    phase: 'DROP_IMPACT'
  });
  t += 0.05;

  for (let i = 0; i < 50; i++) {
    points.push({
      t: +(t).toFixed(2),
      ax: 1.5 * Math.sin(i * 0.3),
      ay: 1.2 * Math.cos(i * 0.3),
      az: 9.81 + 1.1 * Math.sin(i * 0.2),
      alpha: 25 * Math.sin(i * 0.4),
      beta: 20 * Math.cos(i * 0.4),
      gamma: 15 * Math.sin(i * 0.3),
      speed: 0,
      phase: 'USER_ACTIVITY'
    });
    t += 0.05;
  }

  return points;
}

function generatePotholeData() {
  const points = [];
  let t = 0;

  for (let i = 0; i < 40; i++) {
    points.push({
      t: +(t).toFixed(2),
      ax: (Math.random() - 0.5) * 0.3,
      ay: (Math.random() - 0.5) * 0.3,
      az: 9.81 + (Math.random() - 0.5) * 0.4,
      alpha: (Math.random() - 0.5) * 3,
      beta: (Math.random() - 0.5) * 3,
      gamma: (Math.random() - 0.5) * 3,
      speed: 42 + (Math.random() - 0.5) * 1.5,
      phase: 'DRIVING'
    });
    t += 0.05;
  }

  const joltZ = [14.5, 17.8, 5.2, 11.2, 9.81];
  for (let i = 0; i < joltZ.length; i++) {
    points.push({
      t: +(t).toFixed(2),
      ax: (Math.random() - 0.5) * 1.5,
      ay: (Math.random() - 0.5) * 1.5,
      az: joltZ[i],
      alpha: (Math.random() - 0.5) * 10,
      beta: (Math.random() - 0.5) * 12,
      gamma: (Math.random() - 0.5) * 6,
      speed: 38 - i * 0.5,
      phase: 'BUMP'
    });
    t += 0.05;
  }

  for (let i = 0; i < 40; i++) {
    points.push({
      t: +(t).toFixed(2),
      ax: (Math.random() - 0.5) * 0.4,
      ay: (Math.random() - 0.5) * 0.4,
      az: 9.81 + (Math.random() - 0.5) * 0.5,
      alpha: (Math.random() - 0.5) * 3,
      beta: (Math.random() - 0.5) * 3,
      gamma: (Math.random() - 0.5) * 3,
      speed: 40 + (Math.random() - 0.5) * 1.5,
      phase: 'DRIVING'
    });
    t += 0.05;
  }

  return points;
}

function generateHardBrakeData() {
  const points = [];
  let t = 0;

  for (let i = 0; i < 30; i++) {
    points.push({
      t: +(t).toFixed(2),
      ax: 0.1,
      ay: 0.1,
      az: 9.81,
      alpha: 1,
      beta: 1,
      gamma: 1,
      speed: 65,
      phase: 'DRIVING'
    });
    t += 0.05;
  }

  for (let i = 0; i < 40; i++) {
    const currentSpeed = Math.max(0, 65 - (i * 1.65));
    points.push({
      t: +(t).toFixed(2),
      ax: (Math.random() - 0.5) * 0.4,
      ay: -12.5 + (Math.random() - 0.5) * 0.8,
      az: 9.81 + 0.8,
      alpha: (Math.random() - 0.5) * 4,
      beta: -6.0 + (Math.random() - 0.5) * 1.5,
      gamma: (Math.random() - 0.5) * 2,
      speed: currentSpeed,
      phase: 'BRAKING'
    });
    t += 0.05;
  }

  for (let i = 0; i < 30; i++) {
    points.push({
      t: +(t).toFixed(2),
      ax: 0,
      ay: 0,
      az: 9.81,
      alpha: 0,
      beta: 0,
      gamma: 0,
      speed: 0,
      phase: 'STOPPED'
    });
    t += 0.05;
  }

  return points;
}

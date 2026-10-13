/**
 * ResQAI Emergency Response Manager
 * Controls the 15-second incapacitation countdown, Web Audio distress siren,
 * Web Speech voice alerts & speech recognition safety abort.
 */

export class EmergencyManager {
  constructor(options = {}) {
    this.countdownDuration = options.countdownDuration || 15;
    this.onCountdownTick = options.onCountdownTick || (() => {});
    this.onEmergencyTriggered = options.onEmergencyTriggered || (() => {});
    this.onEmergencyCancelled = options.onEmergencyCancelled || (() => {});

    this.timer = null;
    this.remainingSeconds = this.countdownDuration;
    this.isActive = false;
    this.currentIncident = null;

    // Web Audio Synthesizer
    this.audioCtx = null;
    this.sirenOsc1 = null;
    this.sirenOsc2 = null;
    this.sirenGain = null;
    this.sirenLfo = null;
    this.sirenLfoGain = null;
    this.isAudioMuted = false;

    // Speech Recognition for hands-free "Cancel"
    this.recognition = null;
    this.initVoiceRecognition();
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  startSiren() {
    if (this.isAudioMuted) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      this.stopSiren(); // ensure clean state

      const now = this.audioCtx.currentTime;

      // Master Gain
      this.sirenGain = this.audioCtx.createGain();
      this.sirenGain.gain.setValueAtTime(0.01, now);
      this.sirenGain.gain.exponentialRampToValueAtTime(0.35, now + 0.3);
      this.sirenGain.connect(this.audioCtx.destination);

      // Main distress oscillator (Sweeping wail 750Hz to 1250Hz)
      this.sirenOsc1 = this.audioCtx.createOscillator();
      this.sirenOsc1.type = 'sawtooth';
      this.sirenOsc1.frequency.setValueAtTime(850, now);

      // LFO for periodic pitch wail (1.5Hz cycle)
      this.sirenLfo = this.audioCtx.createOscillator();
      this.sirenLfo.frequency.setValueAtTime(1.5, now);
      this.sirenLfoGain = this.audioCtx.createGain();
      this.sirenLfoGain.gain.setValueAtTime(350, now); // ±350Hz sweep

      this.sirenLfo.connect(this.sirenLfoGain);
      this.sirenLfoGain.connect(this.sirenOsc1.frequency);

      this.sirenOsc1.connect(this.sirenGain);

      // Second harmonic oscillator for sharp piercing tone (1700Hz)
      this.sirenOsc2 = this.audioCtx.createOscillator();
      this.sirenOsc2.type = 'sine';
      this.sirenOsc2.frequency.setValueAtTime(1700, now);
      const subGain = this.audioCtx.createGain();
      subGain.gain.setValueAtTime(0.12, now);
      this.sirenOsc2.connect(subGain);
      subGain.connect(this.sirenGain);

      this.sirenOsc1.start();
      this.sirenOsc2.start();
      this.sirenLfo.start();
    } catch (e) {
      console.warn('Web Audio Siren error:', e);
    }
  }

  stopSiren() {
    try {
      if (this.sirenGain && this.audioCtx) {
        this.sirenGain.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.1);
      }
      setTimeout(() => {
        if (this.sirenOsc1) {
          try { this.sirenOsc1.stop(); this.sirenOsc1.disconnect(); } catch (e) {}
          this.sirenOsc1 = null;
        }
        if (this.sirenOsc2) {
          try { this.sirenOsc2.stop(); this.sirenOsc2.disconnect(); } catch (e) {}
          this.sirenOsc2 = null;
        }
        if (this.sirenLfo) {
          try { this.sirenLfo.stop(); this.sirenLfo.disconnect(); } catch (e) {}
          this.sirenLfo = null;
        }
      }, 120);
    } catch (e) {
      console.warn('Stop siren error:', e);
    }
  }

  speakAlert(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  startVibration() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([400, 200, 400, 200, 600, 200, 800]);
      } catch (e) {}
    }
  }

  stopVibration() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch (e) {}
    }
  }

  initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
          const lastResult = event.results[event.results.length - 1];
          if (lastResult && lastResult[0]) {
            const transcript = lastResult[0].transcript.toLowerCase().trim();
            console.log('Voice heard:', transcript);
            if (
              transcript.includes('cancel') ||
              transcript.includes('safe') ||
              transcript.includes('stop') ||
              transcript.includes('okay') ||
              transcript.includes('false')
            ) {
              this.cancelEmergency('Voice command detected: "' + transcript + '"');
            }
          }
        };

        this.recognition.onerror = (err) => {
          console.log('Voice recognition notice:', err.error);
        };
      } catch (e) {
        console.warn('SpeechRecognition initialization error:', e);
      }
    }
  }

  startVoiceListening() {
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {}
    }
  }

  stopVoiceListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
  }

  triggerCountdown(incident) {
    if (this.isActive) return;

    this.isActive = true;
    this.currentIncident = incident;
    this.remainingSeconds = this.countdownDuration;

    this.startSiren();
    this.startVibration();
    this.startVoiceListening();

    this.speakAlert(
      `Warning! Accident detected with ${incident.confidence}% confidence. Emergency SOS will dispatch in ${this.countdownDuration} seconds. Tap safe or say cancel to abort.`
    );

    this.onCountdownTick({
      remainingSeconds: this.remainingSeconds,
      totalSeconds: this.countdownDuration,
      incident: this.currentIncident
    });

    this.timer = setInterval(() => {
      this.remainingSeconds--;
      this.startVibration();

      this.onCountdownTick({
        remainingSeconds: this.remainingSeconds,
        totalSeconds: this.countdownDuration,
        incident: this.currentIncident
      });

      if (this.remainingSeconds === 5) {
        this.speakAlert('5 seconds remaining. Dispatching emergency telemetry.');
      }

      if (this.remainingSeconds <= 0) {
        this.executeEmergencyDispatch();
      }
    }, 1000);
  }

  cancelEmergency(reason = 'User cancelled alert') {
    if (!this.isActive) return;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.isActive = false;
    this.stopSiren();
    this.stopVibration();
    this.stopVoiceListening();

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('Emergency alert cancelled. You are safe.');
      window.speechSynthesis.speak(utterance);
    }

    this.onEmergencyCancelled({
      reason,
      incident: this.currentIncident
    });

    this.currentIncident = null;
  }

  executeEmergencyDispatch() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.isActive = false;
    this.stopSiren();
    this.stopVibration();
    this.stopVoiceListening();

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        'Incapacitation timeout reached. Emergency SOS broadcasted to family and emergency services.'
      );
      window.speechSynthesis.speak(utterance);
    }

    this.onEmergencyTriggered({
      incident: this.currentIncident,
      dispatchedAt: new Date().toISOString()
    });
  }

  toggleMute() {
    this.isAudioMuted = !this.isAudioMuted;
    if (this.isAudioMuted) {
      this.stopSiren();
    } else if (this.isActive) {
      this.startSiren();
    }
    return this.isAudioMuted;
  }
}

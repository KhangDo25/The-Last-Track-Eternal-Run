class SoundManager {
  private ctx: AudioContext | null = null;
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private clatterTimer: number | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.engineGain) {
      this.engineGain.gain.value = muted ? 0 : 0.15;
    }
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public getContext(): AudioContext | null {
    this.initContext();
    return this.ctx;
  }

  public startEngineSound() {
    try {
      this.initContext();
      if (!this.ctx || this.engineOsc) return;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(32, this.ctx.currentTime); // low train engine idle

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, this.ctx.currentTime);

      gain.gain.setValueAtTime(this.isMuted ? 0 : 0.15, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      this.engineOsc = osc;
      this.engineGain = gain;
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  public updateEnginePitch(speedRatio: number) {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    try {
      // speedRatio: 0 to 1+
      const targetFreq = 28 + speedRatio * 52;
      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
      const targetVol = this.isMuted ? 0 : Math.min(0.28, 0.12 + speedRatio * 0.15);
      this.engineGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.1);
    } catch {
      // ignore
    }
  }

  public playHorn() {
    try {
      this.initContext();
      if (!this.ctx || this.isMuted) return;

      const freqs = [311.13, 370.0, 470.0]; // D#4, F#4, A#4 classic locomotive triad
      freqs.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);

        gain.gain.setValueAtTime(0, this.ctx!.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, this.ctx!.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 1.4);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start();
        osc.stop(this.ctx!.currentTime + 1.4);
      });
    } catch {
      // ignore
    }
  }

  public playTurretShot() {
    try {
      this.initContext();
      if (!this.ctx || this.isMuted) return;

      // Heavy Gatling shot: noise burst + low kick
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.Q.setValueAtTime(2, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      // Low punch
      const kick = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kick.frequency.setValueAtTime(140, this.ctx.currentTime);
      kick.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.07);

      kickGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      kickGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.07);

      kick.connect(kickGain);
      kickGain.connect(this.ctx.destination);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();
      kick.start();
      kick.stop(this.ctx.currentTime + 0.08);
    } catch {
      // ignore
    }
  }

  public playHitImpact() {
    try {
      this.initContext();
      if (!this.ctx || this.isMuted) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {
      // ignore
    }
  }

  public playLootSound() {
    try {
      this.initContext();
      if (!this.ctx || this.isMuted) return;

      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.07);

        gain.gain.setValueAtTime(0, this.ctx!.currentTime + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.15, this.ctx!.currentTime + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.07 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + idx * 0.07);
        osc.stop(this.ctx!.currentTime + idx * 0.07 + 0.25);
      });
    } catch {
      // ignore
    }
  }

  public playAlarm() {
    try {
      this.initContext();
      if (!this.ctx || this.isMuted) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(550, this.ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch {
      // ignore
    }
  }

  public playClick() {
    try {
      this.initContext();
      if (!this.ctx || this.isMuted) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // ignore
    }
  }

  public playExplosion() {
    try {
      this.initContext();
      if (!this.ctx || this.isMuted) return;

      const bufferSize = this.ctx.sampleRate * 0.45;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.45);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.45);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      whiteNoise.start();
    } catch {
      // ignore
    }
  }

  public playThunder() {
    try {
      this.initContext();
      if (!this.ctx || this.isMuted) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 1.2);

      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 1.2);
    } catch {
      // ignore
    }
  }


  // ==========================================
  // Weather Foley Soundscapes & Audio Triggers
  // ==========================================

  /**
   * Specific foley soundscape when a blizzard strikes:
   * Subsonic pressure rumble, howling arctic wind screech, and freezing ice pellets rattling train hull
   */
  public playBlizzardOnsetSoundscape() {
    try {
      this.initContext();
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;

      // 1. Deep Subsonic Pressure Drop & Arctic Rumble (45Hz -> 24Hz)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(52, t);
      subOsc.frequency.exponentialRampToValueAtTime(24, t + 1.6);
      subGain.gain.setValueAtTime(0.01, t);
      subGain.gain.linearRampToValueAtTime(0.25, t + 0.35);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(t);
      subOsc.stop(t + 1.65);

      // 2. Screaming Arctic Gale Noise Sweep (250Hz -> 1150Hz -> 300Hz with high resonance)
      const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(280, t);
      bandpass.frequency.exponentialRampToValueAtTime(1150, t + 0.65);
      bandpass.frequency.exponentialRampToValueAtTime(320, t + 1.5);
      bandpass.Q.setValueAtTime(5.5, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, t);
      noiseGain.gain.linearRampToValueAtTime(0.24, t + 0.5);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

      noise.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(t);

      // 3. Ice Pellet Foley Rattle on Train Hull (Rapid high-frequency crunches)
      for (let k = 0; k < 6; k++) {
        const delay = 0.15 + k * 0.12 + Math.random() * 0.05;
        const pelletOsc = this.ctx.createOscillator();
        const pelletGain = this.ctx.createGain();
        pelletOsc.type = 'square';
        pelletOsc.frequency.setValueAtTime(2800 + Math.random() * 1200, t + delay);
        pelletOsc.frequency.exponentialRampToValueAtTime(800, t + delay + 0.04);
        pelletGain.gain.setValueAtTime(0.04, t + delay);
        pelletGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.04);
        pelletOsc.connect(pelletGain);
        pelletGain.connect(this.ctx.destination);
        pelletOsc.start(t + delay);
        pelletOsc.stop(t + delay + 0.045);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Specific foley soundscape when rain downpour begins:
   * Heavy rolling thunder, wet misty whoosh, and raindrops pattering on steel carriage roof
   */
  public playRainOnsetSoundscape() {
    try {
      this.initContext();
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;

      // 1. Rolling Thunderclap (Twin oscillators with sub-bass envelope)
      const thunder1 = this.ctx.createOscillator();
      const thunder2 = this.ctx.createOscillator();
      const thunderFilter = this.ctx.createBiquadFilter();
      const thunderGain = this.ctx.createGain();

      thunder1.type = 'sawtooth';
      thunder1.frequency.setValueAtTime(95, t);
      thunder1.frequency.exponentialRampToValueAtTime(32, t + 1.4);

      thunder2.type = 'sine';
      thunder2.frequency.setValueAtTime(65, t);
      thunder2.frequency.exponentialRampToValueAtTime(26, t + 1.4);

      thunderFilter.type = 'lowpass';
      thunderFilter.frequency.setValueAtTime(180, t);
      thunderFilter.frequency.exponentialRampToValueAtTime(55, t + 1.4);

      thunderGain.gain.setValueAtTime(0.02, t);
      thunderGain.gain.linearRampToValueAtTime(0.26, t + 0.18);
      thunderGain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

      thunder1.connect(thunderFilter);
      thunder2.connect(thunderFilter);
      thunderFilter.connect(thunderGain);
      thunderGain.connect(this.ctx.destination);

      thunder1.start(t);
      thunder2.start(t);
      thunder1.stop(t + 1.45);
      thunder2.stop(t + 1.45);

      // 2. Raindrops Pattering on Steel Roof (Staggered droplet sine pings)
      const dropPitches = [1650, 1980, 1420, 2200, 1750, 2100, 1850];
      dropPitches.forEach((freq, idx) => {
        const dropTime = t + 0.1 + idx * 0.08 + Math.random() * 0.04;
        const dropOsc = this.ctx!.createOscillator();
        const dropGain = this.ctx!.createGain();
        dropOsc.type = 'sine';
        dropOsc.frequency.setValueAtTime(freq, dropTime);
        dropOsc.frequency.exponentialRampToValueAtTime(freq * 0.75, dropTime + 0.035);
        dropGain.gain.setValueAtTime(0.06, dropTime);
        dropGain.gain.exponentialRampToValueAtTime(0.001, dropTime + 0.035);
        dropOsc.connect(dropGain);
        dropGain.connect(this.ctx!.destination);
        dropOsc.start(dropTime);
        dropOsc.stop(dropTime + 0.04);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Specific foley soundscape when rain clears:
   * Heavy rain subsiding into gentle water drips and a crystalline aurora chime arpeggio
   */
  public playClearingRainSoundscape() {
    try {
      this.initContext();
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;

      // 1. Delicately dripping water drops from train carriage eaves (realistic pitch drop)
      const dripNotes = [1850, 1520, 2150, 1680, 1950];
      dripNotes.forEach((pitch, i) => {
        const dripTime = t + 0.05 + i * 0.14 + (Math.random() - 0.5) * 0.03;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, dripTime);
        osc.frequency.exponentialRampToValueAtTime(pitch * 0.82, dripTime + 0.06);

        gain.gain.setValueAtTime(0.001, dripTime);
        gain.gain.linearRampToValueAtTime(0.12, dripTime + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, dripTime + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(dripTime);
        osc.stop(dripTime + 0.07);
      });

      // 2. Harmonic Aurora Chime Chord Progression (E5, G#5, B5, E6, G#6) celebrating clouds parting
      const chordNotes = [659.25, 830.61, 987.77, 1318.51, 1661.22];
      chordNotes.forEach((freq, idx) => {
        const noteTime = t + 0.35 + idx * 0.11;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.001, noteTime);
        gain.gain.linearRampToValueAtTime(0.09, noteTime + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.95);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(noteTime);
        osc.stop(noteTime + 1.0);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Soundscape for calm clear sky & aurora
   */
  public playClearSkySoundscape() {
    this.playClearingRainSoundscape();
  }

  /**
   * Main weather transition audio event router
   */
  public triggerWeatherTransition(
    toWeather: 'clear' | 'rain' | 'blizzard',
    fromWeather?: 'clear' | 'rain' | 'blizzard' | null
  ) {
    if (fromWeather === 'rain' && toWeather === 'clear') {
      this.playClearingRainSoundscape();
    } else if (toWeather === 'blizzard') {
      this.playBlizzardOnsetSoundscape();
    } else if (toWeather === 'rain') {
      this.playRainOnsetSoundscape();
    } else {
      this.playClearingRainSoundscape();
    }
  }

  public playWeatherTransition(weather: 'clear' | 'rain' | 'blizzard') {
    this.triggerWeatherTransition(weather, null);
  }

  public cleanup() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {}
      this.engineOsc = null;
    }
    if (this.clatterTimer) {
      window.clearInterval(this.clatterTimer);
      this.clatterTimer = null;
    }
  }
}

export const soundManager = new SoundManager();

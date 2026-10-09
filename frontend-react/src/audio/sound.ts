class RetroSoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('click', unlock, { once: true, passive: true });
      window.addEventListener('touchstart', unlock, { once: true, passive: true });
    }
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playTone(freq: number, duration: number, type: OscillatorType = 'sine', startGain = 0.15, endGain = 0.001) {
    if (this.muted || typeof window === 'undefined') return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), now);

      gain.gain.setValueAtTime(Math.max(0.0001, startGain), now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, endGain), now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Audio playback warning suppressed
    }
  }

  public playJoin() {
    this.playTone(440, 0.08, 'sine', 0.2);
    setTimeout(() => this.playTone(659, 0.12, 'sine', 0.2), 70);
  }

  public playLeave() {
    this.playTone(550, 0.08, 'sine', 0.2);
    setTimeout(() => this.playTone(330, 0.15, 'sine', 0.2), 70);
  }

  public playStart() {
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.18, 'triangle', 0.25), idx * 80);
    });
  }

  public playTick() {
    this.playTone(850, 0.03, 'square', 0.05);
  }

  public playDing() {
    this.playTone(880, 0.25, 'sine', 0.25);
  }

  public playGavel() {
    this.playTone(150, 0.25, 'sawtooth', 0.35, 0.001);
  }

  public playBuzzer() {
    this.playTone(160, 0.25, 'sawtooth', 0.25);
  }

  public playVictory() {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.25, 'triangle', 0.25), idx * 100);
    });
  }

  public playHonk() {
    this.playTone(320, 0.15, 'square', 0.2);
    setTimeout(() => this.playTone(480, 0.2, 'square', 0.2), 60);
  }
}

export const soundEngine = new RetroSoundEngine();

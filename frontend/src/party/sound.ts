/** Web Audio API retro synth for sound effects. */
class SoundManager {
    private ctx: AudioContext | null = null;
    private muted: boolean = false;

    constructor() {
        const unlock = () => {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
        };
        window.addEventListener('click', unlock, { once: true, passive: true });
        window.addEventListener('touchstart', unlock, { once: true, passive: true });
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
        if (this.muted) return;
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
            console.warn('Audio playback error', e);
        }
    }

    public playJoin() {
        this.playTone(440, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(659, 0.15, 'sine', 0.2), 80);
    }

    public playLeave() {
        this.playTone(550, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(330, 0.2, 'sine', 0.2), 80);
    }

    public playStart() {
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 0.2, 'triangle', 0.25), idx * 100);
        });
    }

    public playTick() {
        this.playTone(800, 0.04, 'square', 0.08);
    }

    public playDing() {
        this.playTone(880, 0.3, 'sine', 0.3);
    }

    public playGong() {
        this.playTone(110, 1.2, 'sawtooth', 0.4, 0.001);
    }

    public playVictory() {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 0.3, 'triangle', 0.3), idx * 120);
        });
    }

    public playBuzzer() {
        this.playTone(180, 0.3, 'sawtooth', 0.3);
    }
}

export const soundManager = new SoundManager();

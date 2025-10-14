/**
 * Centralized Audio Bus for Circuit Simulation
 * Manages WebAudio context and multiple audio sources (buzzers, etc.)
 */

export interface AudioContext {
  context: AudioContext | null;
  initialized: boolean;
  muted: boolean;
  volume: number;
}

export interface AudioSource {
  id: string;
  oscillator: OscillatorNode | null;
  gainNode: GainNode | null;
  frequency: number;
  volume: number;
  playing: boolean;
}

export class AudioBus {
  private audioContext: AudioContext | null = null;
  private sources: Map<string, AudioSource> = new Map();
  private globalVolume: number = 0.5;
  private muted: boolean = false;
  private initialized: boolean = false;
  private userGestureReceived: boolean = false;

  constructor() {
    this.setupUserGestureHandlers();
  }

  /**
   * Setup user gesture handlers for WebAudio
   */
  private setupUserGestureHandlers(): void {
    const initAudio = () => {
      if (!this.userGestureReceived) {
        this.userGestureReceived = true;
        this.initializeAudioContext();
      }
    };

    // Listen for user gestures
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });
  }

  /**
   * Initialize WebAudio context
   */
  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.initialized = true;
      console.log('Audio context initialized');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  /**
   * Ensure audio context is initialized
   */
  private ensureAudioContext(): boolean {
    if (!this.initialized && this.userGestureReceived) {
      this.initializeAudioContext();
    }
    return this.initialized && this.audioContext !== null;
  }

  /**
   * Resume audio context if suspended
   */
  private async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.error('Failed to resume audio context:', error);
      }
    }
  }

  /**
   * Create a new audio source
   */
  createSource(id: string, frequency: number = 1000, volume: number = 0.1): AudioSource {
    const source: AudioSource = {
      id,
      oscillator: null,
      gainNode: null,
      frequency,
      volume,
      playing: false
    };

    this.sources.set(id, source);
    return source;
  }

  /**
   * Start playing a tone
   */
  async startTone(id: string, frequency: number = 1000, volume: number = 0.1): Promise<void> {
    if (!this.ensureAudioContext() || this.muted) return;

    await this.resumeAudioContext();

    let source = this.sources.get(id);
    if (!source) {
      source = this.createSource(id, frequency, volume);
    }

    // Stop existing tone if playing
    if (source.playing) {
      this.stopTone(id);
    }

    try {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext!.currentTime);
      oscillator.type = 'square'; // Buzzer-like sound

      gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        volume * this.globalVolume,
        this.audioContext!.currentTime + 0.01
      );

      oscillator.start();

      source.oscillator = oscillator;
      source.gainNode = gainNode;
      source.frequency = frequency;
      source.volume = volume;
      source.playing = true;

    } catch (error) {
      console.error('Failed to start tone:', error);
    }
  }

  /**
   * Stop playing a tone
   */
  stopTone(id: string): void {
    const source = this.sources.get(id);
    if (!source || !source.playing) return;

    try {
      if (source.oscillator) {
        source.oscillator.stop();
        source.oscillator.disconnect();
      }
      if (source.gainNode) {
        source.gainNode.disconnect();
      }

      source.oscillator = null;
      source.gainNode = null;
      source.playing = false;

    } catch (error) {
      console.error('Failed to stop tone:', error);
    }
  }

  /**
   * Update tone frequency
   */
  updateToneFrequency(id: string, frequency: number): void {
    const source = this.sources.get(id);
    if (source && source.playing && source.oscillator && this.audioContext) {
      source.oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      source.frequency = frequency;
    }
  }

  /**
   * Update tone volume
   */
  updateToneVolume(id: string, volume: number): void {
    const source = this.sources.get(id);
    if (source && source.playing && source.gainNode && this.audioContext) {
      const targetVolume = volume * this.globalVolume;
      source.gainNode.gain.setValueAtTime(targetVolume, this.audioContext.currentTime);
      source.volume = volume;
    }
  }

  /**
   * Play a beep (short tone)
   */
  async playBeep(id: string, frequency: number = 1000, duration: number = 100): Promise<void> {
    await this.startTone(id, frequency, 0.1);
    setTimeout(() => {
      this.stopTone(id);
    }, duration);
  }

  /**
   * Play a sequence of beeps
   */
  async playBeepSequence(id: string, pattern: number[], frequency: number = 1000, duration: number = 100): Promise<void> {
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === 1) {
        await this.startTone(id, frequency, 0.1);
        await new Promise(resolve => setTimeout(resolve, duration));
        this.stopTone(id);
      } else {
        await new Promise(resolve => setTimeout(resolve, duration));
      }
    }
  }

  /**
   * Set global volume
   */
  setGlobalVolume(volume: number): void {
    this.globalVolume = Math.max(0, Math.min(1, volume));
    
    // Update all playing sources
    for (const source of this.sources.values()) {
      if (source.playing) {
        this.updateToneVolume(source.id, source.volume);
      }
    }
  }

  /**
   * Get global volume
   */
  getGlobalVolume(): number {
    return this.globalVolume;
  }

  /**
   * Mute/unmute all audio
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    
    if (muted) {
      // Stop all tones
      for (const source of this.sources.values()) {
        if (source.playing) {
          this.stopTone(source.id);
        }
      }
    }
  }

  /**
   * Check if muted
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Get audio source info
   */
  getSource(id: string): AudioSource | undefined {
    return this.sources.get(id);
  }

  /**
   * Get all audio sources
   */
  getAllSources(): Map<string, AudioSource> {
    return new Map(this.sources);
  }

  /**
   * Remove audio source
   */
  removeSource(id: string): void {
    this.stopTone(id);
    this.sources.delete(id);
  }

  /**
   * Clear all audio sources
   */
  clearAllSources(): void {
    for (const id of this.sources.keys()) {
      this.stopTone(id);
    }
    this.sources.clear();
  }

  /**
   * Handle page visibility change
   */
  handleVisibilityChange(): void {
    if (document.hidden) {
      // Pause audio when tab is hidden
      this.setMuted(true);
    } else {
      // Resume audio when tab becomes visible
      this.setMuted(false);
    }
  }

  /**
   * Get audio context state
   */
  getAudioContextState(): string {
    return this.audioContext?.state || 'not-initialized';
  }

  /**
   * Check if audio is supported
   */
  isAudioSupported(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  /**
   * Get audio statistics
   */
  getStats(): {
    initialized: boolean;
    muted: boolean;
    globalVolume: number;
    activeSources: number;
    totalSources: number;
    audioContextState: string;
  } {
    const activeSources = Array.from(this.sources.values()).filter(s => s.playing).length;
    
    return {
      initialized: this.initialized,
      muted: this.muted,
      globalVolume: this.globalVolume,
      activeSources,
      totalSources: this.sources.size,
      audioContextState: this.getAudioContextState()
    };
  }
}

// Global audio bus instance
let globalAudioBus: AudioBus | null = null;

/**
 * Get global audio bus instance
 */
export function getAudioBus(): AudioBus {
  if (!globalAudioBus) {
    globalAudioBus = new AudioBus();
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      globalAudioBus?.handleVisibilityChange();
    });
  }
  return globalAudioBus;
}

/**
 * Initialize audio bus
 */
export function initAudioBus(): AudioBus {
  globalAudioBus = new AudioBus();
  return globalAudioBus;
}

/**
 * Convenience functions
 */
export const audioBus = {
  startTone: (id: string, frequency?: number, volume?: number) => getAudioBus().startTone(id, frequency, volume),
  stopTone: (id: string) => getAudioBus().stopTone(id),
  playBeep: (id: string, frequency?: number, duration?: number) => getAudioBus().playBeep(id, frequency, duration),
  playBeepSequence: (id: string, pattern: number[], frequency?: number, duration?: number) => 
    getAudioBus().playBeepSequence(id, pattern, frequency, duration),
  setGlobalVolume: (volume: number) => getAudioBus().setGlobalVolume(volume),
  setMuted: (muted: boolean) => getAudioBus().setMuted(muted),
  getStats: () => getAudioBus().getStats()
};

// Voice Recognition and Synthesis Service (pt-BR)

export interface VoiceServiceCallbacks {
  onListeningStateChange?: (isListening: boolean) => void;
  onTranscriptChange?: (text: string, isFinal: boolean) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (error: string) => void;
  onAudioLevel?: (level: number) => void;
}

class VoiceService {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private callbacks: VoiceServiceCallbacks = {};
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private animFrameId: number | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'pt-BR';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.callbacks.onListeningStateChange?.(true);
        this.callbacks.onSpeechStart?.();
        this.startAudioVisualizer();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          this.callbacks.onTranscriptChange?.(finalTranscript.trim(), true);
        } else if (interimTranscript) {
          this.callbacks.onTranscriptChange?.(interimTranscript.trim(), false);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          this.callbacks.onError?.(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.callbacks.onListeningStateChange?.(false);
        this.callbacks.onSpeechEnd?.();
        this.stopAudioVisualizer();
      };
    }
  }

  public setCallbacks(callbacks: VoiceServiceCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  public startListening(): boolean {
    if (!this.recognition) {
      this.initRecognition();
    }
    if (!this.recognition) {
      this.callbacks.onError?.('Reconhecimento de voz não suportado neste navegador.');
      return false;
    }

    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    try {
      this.recognition.start();
      return true;
    } catch (e: any) {
      console.warn('Recognition start exception:', e);
      return false;
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.stopAudioVisualizer();
  }

  public toggleListening(): boolean {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      return this.startListening();
    }
  }

  public speak(text: string, onEnd?: () => void): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        onEnd?.();
        resolve();
        return;
      }

      this.stopSpeaking();

      // Clean markdown symbols from spoken text
      const cleanText = text
        .replace(/[*_#`~[\]()]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\bR\$\s*/g, 'reais ')
        .replace(/m²/g, 'metros quadrados')
        .replace(/\+/g, 'mais ');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05; // Slightly faster natural mobile pace
      utterance.pitch = 1.0;

      // Select Brazilian voice if available
      const voices = window.speechSynthesis.getVoices();
      const ptBrVoice = voices.find(v => v.lang === 'pt-BR' || v.lang === 'pt_BR' || v.name.includes('Brazil') || v.name.includes('Brasil'));
      if (ptBrVoice) {
        utterance.voice = ptBrVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        onEnd?.();
        resolve();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        onEnd?.();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
  }

  private async startAudioVisualizer() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.micStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!this.analyser || !this.isListening) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 80);
        this.callbacks.onAudioLevel?.(normalized);
        this.animFrameId = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      // Audio stream fallback: simulate pulsing
    }
  }

  private stopAudioVisualizer() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.callbacks.onAudioLevel?.(0);
  }
}

export const voiceService = new VoiceService();

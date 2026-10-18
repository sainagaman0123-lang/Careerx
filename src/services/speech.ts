import { SUPPORTED_LANGUAGES, LanguageCode } from '../i18n/translations';

export class VoiceAssistantService {
  private recognition: any = null;
  private isListeningState: boolean = false;
  private isSpeakingState: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-IN';
      }
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && ('speechSynthesis' in window || !!this.recognition);
  }

  public startListening(
    langCode: string = 'en',
    onResult: (transcript: string) => void,
    onError?: (error: any) => void
  ) {
    if (!this.recognition) {
      if (onError) onError('Speech Recognition is not supported in this browser.');
      return;
    }

    try {
      const match = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
      const bcpCode = match?.speechCode || 'en-IN';

      this.recognition.lang = bcpCode;
      this.isListeningState = true;

      this.recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        this.isListeningState = false;
        onResult(text);
      };

      this.recognition.onerror = (event: any) => {
        this.isListeningState = false;
        if (onError) onError(event.error);
      };

      this.recognition.onend = () => {
        this.isListeningState = false;
      };

      this.recognition.start();
    } catch (err) {
      this.isListeningState = false;
      if (onError) onError(err);
    }
  }

  public stopListening() {
    if (this.recognition && this.isListeningState) {
      this.recognition.stop();
      this.isListeningState = false;
    }
  }

  public speak(text: string, langCode: string = 'en', onComplete?: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/₹/g, 'Rupees ')
      .trim();

    const match = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
    const bcpCode = match?.speechCode || 'en-IN';

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = bcpCode;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Pick matching browser voice if available
    try {
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(
        (v) =>
          v.lang.toLowerCase() === bcpCode.toLowerCase() ||
          v.lang.toLowerCase().replace('_', '-').startsWith(langCode.toLowerCase())
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    } catch (e) {
      // Ignore voice lookup errors and fallback to default utterance.lang
    }

    utterance.onend = () => {
      this.isSpeakingState = false;
      if (onComplete) onComplete();
    };

    utterance.onerror = () => {
      this.isSpeakingState = false;
    };

    this.isSpeakingState = true;
    window.speechSynthesis.speak(utterance);

  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeakingState = false;
    }
  }
}

export const voiceService = new VoiceAssistantService();

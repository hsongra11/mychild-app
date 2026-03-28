/**
 * Text-to-Speech (TTS) support for mychild-engine.
 *
 * Provides a provider abstraction over the Web Speech API with locale mapping
 * for Indian languages, plus a no-op fallback for server-side environments.
 *
 * This module is designed to work in both Node.js (engine package) and browser
 * (demo app) environments. DOM types are declared locally to avoid requiring
 * the "dom" lib in the engine's tsconfig.
 */

import type { Locale } from './i18n.js';

// ---------------------------------------------------------------------------
// Minimal DOM type declarations for Web Speech API
// (avoids adding "dom" to tsconfig lib for a Node-first package)
// ---------------------------------------------------------------------------

declare global {
  interface SpeechSynthesisUtterance {
    text: string;
    lang: string;
    rate: number;
    pitch: number;
    onend: (() => void) | null;
    onerror: ((event: { error: string }) => void) | null;
  }

  interface SpeechSynthesis {
    speak(utterance: SpeechSynthesisUtterance): void;
    cancel(): void;
  }

  // eslint-disable-next-line no-var
  var speechSynthesis: SpeechSynthesis | undefined;
  // eslint-disable-next-line no-var
  var SpeechSynthesisUtterance:
    | { new (text: string): SpeechSynthesisUtterance }
    | undefined;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TTSOptions {
  locale: Locale;
  /** Speech rate (default 0.9 for clarity). */
  rate?: number;
  /** Speech pitch. */
  pitch?: number;
}

export interface TTSProvider {
  speak(text: string, options: TTSOptions): Promise<void>;
  stop(): void;
  isSupported(): boolean;
}

/** Maps engine locales to BCP 47 language tags for Indian speech synthesis. */
const LOCALE_TO_BCP47: Record<Locale, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
};

// ---------------------------------------------------------------------------
// Web Speech API provider
// ---------------------------------------------------------------------------

/**
 * TTS provider backed by the Web Speech API (`speechSynthesis` global).
 */
export class WebSpeechTTSProvider implements TTSProvider {
  isSupported(): boolean {
    return typeof globalThis.speechSynthesis !== 'undefined';
  }

  speak(text: string, options: TTSOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (
        !this.isSupported() ||
        typeof globalThis.SpeechSynthesisUtterance === 'undefined'
      ) {
        reject(new Error('Web Speech API is not available'));
        return;
      }

      globalThis.speechSynthesis!.cancel();

      const utterance = new globalThis.SpeechSynthesisUtterance(text);
      utterance.lang = LOCALE_TO_BCP47[options.locale] ?? 'en-IN';
      utterance.rate = options.rate ?? 0.9;
      if (options.pitch !== undefined) {
        utterance.pitch = options.pitch;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) =>
        reject(new Error(`Speech synthesis error: ${event.error}`));

      globalThis.speechSynthesis!.speak(utterance);
    });
  }

  stop(): void {
    if (this.isSupported()) {
      globalThis.speechSynthesis!.cancel();
    }
  }
}

// ---------------------------------------------------------------------------
// No-op provider (server-side fallback)
// ---------------------------------------------------------------------------

/**
 * No-op TTS provider for server-side / Node.js environments
 * where the Web Speech API is not available.
 */
export class NoopTTSProvider implements TTSProvider {
  isSupported(): boolean {
    return false;
  }

  speak(_text: string, _options: TTSOptions): Promise<void> {
    return Promise.resolve();
  }

  stop(): void {
    // no-op
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Factory that returns a WebSpeechTTSProvider if the Web Speech API is
 * available, otherwise falls back to NoopTTSProvider.
 */
export function createTTSProvider(): TTSProvider {
  const webProvider = new WebSpeechTTSProvider();
  if (webProvider.isSupported()) {
    return webProvider;
  }
  return new NoopTTSProvider();
}

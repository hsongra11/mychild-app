/**
 * Internationalization (i18n) framework for mychild-engine.
 *
 * Supports multiple Indian languages with English fallback.
 */

export type Locale = 'en' | 'hi' | 'kn' | 'ta' | 'te';

export interface TranslatedQuestion {
  questionId: string;
  locale: Locale;
  text: string;
  subtext?: string;
}

export interface TranslationBundle {
  locale: Locale;
  questions: TranslatedQuestion[];
  probes: Record<string, string>;
  ui: Record<string, string>;
}

export class TranslationRegistry {
  private bundles = new Map<Locale, TranslationBundle>();

  /**
   * Register a translation bundle for a locale.
   * Replaces any existing bundle for that locale.
   */
  register(bundle: TranslationBundle): void {
    this.bundles.set(bundle.locale, bundle);
  }

  /**
   * Get a translated question by ID and locale.
   * Falls back to English if the requested locale is not available.
   */
  getQuestion(questionId: string, locale: Locale): TranslatedQuestion | undefined {
    const bundle = this.bundles.get(locale) ?? this.bundles.get('en');
    if (!bundle) return undefined;
    return bundle.questions.find((q) => q.questionId === questionId);
  }

  /**
   * Get a translated probe string by probe ID and locale.
   * Falls back to English if the requested locale is not available.
   */
  getProbe(probeId: string, locale: Locale): string | undefined {
    const bundle = this.bundles.get(locale) ?? this.bundles.get('en');
    if (!bundle) return undefined;
    return bundle.probes[probeId];
  }

  /**
   * Get a translated UI string by key and locale.
   * Falls back to English if the requested locale is not available.
   */
  getUIString(key: string, locale: Locale): string | undefined {
    const bundle = this.bundles.get(locale) ?? this.bundles.get('en');
    if (!bundle) return undefined;
    return bundle.ui[key];
  }

  /**
   * Return all locales that have registered translation bundles.
   */
  getAvailableLocales(): Locale[] {
    return Array.from(this.bundles.keys());
  }
}

/** Singleton translation registry instance. */
export const translationRegistry = new TranslationRegistry();

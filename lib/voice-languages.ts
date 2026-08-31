export interface VoiceLanguage {
  code: string;       // BCP 47 language code
  label: string;      // Display name
  flag: string;       // Flag emoji
  ttsPrefix: string[] // Voice name patterns to prefer
}

export const VOICE_LANGUAGES: VoiceLanguage[] = [
  {
    code: "en-US",
    label: "English",
    flag: "🇺🇸",
    ttsPrefix: ["Google US English Female", "Microsoft Zira", "Samantha", "Victoria", "Karen"],
  },
  {
    code: "en-GB",
    label: "English (UK)",
    flag: "🇬🇧",
    ttsPrefix: ["Google UK English Female", "Microsoft UK English", "Victoria", "Kate"],
  },
  {
    code: "hi-IN",
    label: "Hindi",
    flag: "🇮🇳",
    ttsPrefix: ["Google Hindi Female", "Microsoft Hindi", "हिन्दी", "Neelam"],
  },
  {
    code: "es-ES",
    label: "Spanish",
    flag: "🇪🇸",
    ttsPrefix: ["Google Español", "Microsoft Spanish", "Helena", "Paloma"],
  },
  {
    code: "fr-FR",
    label: "French",
    flag: "🇫🇷",
    ttsPrefix: ["Google Français", "Microsoft French", "Marie", "Thomas"],
  },
  {
    code: "de-DE",
    label: "German",
    flag: "🇩🇪",
    ttsPrefix: ["Google Deutsch", "Microsoft German", "Anna", "Petra"],
  },
  {
    code: "ja-JP",
    label: "Japanese",
    flag: "🇯🇵",
    ttsPrefix: ["Google 日本語", "Microsoft Japanese", "Kyoko", "Haruka"],
  },
  {
    code: "ko-KR",
    label: "Korean",
    flag: "🇰🇷",
    ttsPrefix: ["Google 한국의", "Microsoft Korean", "Yuna", "Seoyeon"],
  },
  {
    code: "pt-BR",
    label: "Portuguese (BR)",
    flag: "🇧🇷",
    ttsPrefix: ["Google Português", "Microsoft Portuguese", "Francisca", "Helena"],
  },
  {
    code: "ar-SA",
    label: "Arabic",
    flag: "🇸🇦",
    ttsPrefix: ["Google العربية", "Microsoft Arabic", "Fatima", "Laila"],
  },
];

export function getLanguageByCode(code: string): VoiceLanguage {
  return VOICE_LANGUAGES.find((l) => l.code === code) || VOICE_LANGUAGES[0];
}

export function getPreferredVoice(
  voices: SpeechSynthesisVoice[],
  lang: VoiceLanguage
): SpeechSynthesisVoice | null {
  const langPrefix = lang.code.split("-")[0].toLowerCase();

  // 1. Exact match by name patterns + language
  for (const pattern of lang.ttsPrefix) {
    const match = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith(langPrefix) &&
        v.name.toLowerCase().includes(pattern.toLowerCase())
    );
    if (match) return match;
  }

  // 2. Any voice with matching language code (most reliable fallback)
  const langMatch = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
  if (langMatch) return langMatch;

  // 3. Try exact BCP 47 code match
  const exactMatch = voices.find((v) => v.lang.toLowerCase() === lang.code.toLowerCase());
  if (exactMatch) return exactMatch;

  // 4. Return null — browser will use its default for the utterance.lang
  return null;
}

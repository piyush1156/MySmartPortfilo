// Language detection based on character ranges and common words
// This is a lightweight client-side detector — no external API needed

interface LanguagePattern {
  code: string;
  label: string;
  flag: string;
  // Unicode ranges for this script
  ranges: [number, number][];
  // Common words/phrases to boost confidence
  commonWords: string[];
}

const LANGUAGES: LanguagePattern[] = [
  {
    code: "hi-IN",
    label: "Hindi",
    flag: "🇮🇳",
    // Devanagari script
    ranges: [[0x0900, 0x097f]],
    commonWords: [
      "mera", "hai", "kya", "aap", "mai", "ho", "se", "ko", "ka", "ki",
      "naam", "kaise", "ho", "yah", "woh", "acha", "theek", "haan", "nahi",
      "dikha", "bata", "project", "skill", "kaam",
    ],
  },
  {
    code: "ja-JP",
    label: "Japanese",
    flag: "🇯🇵",
    // Hiragana + Katakana
    ranges: [[0x3040, 0x309f], [0x30a0, 0x30ff]],
    commonWords: ["desu", "masu", "wa", "ga", "no", "wo", "ni", "de", "kudasai"],
  },
  {
    code: "ko-KR",
    label: "Korean",
    flag: "🇰🇷",
    // Hangul
    ranges: [[0xac00, 0xd7af], [0x1100, 0x11ff]],
    commonWords: ["annyeong", "yo", "ne", "eul", "reul", "nim"],
  },
  {
    code: "ar-SA",
    label: "Arabic",
    flag: "🇸🇦",
    // Arabic script
    ranges: [[0x0600, 0x06ff]],
    commonWords: ["marhaba", "shukran", "min", "fi", "ala", "wa"],
  },
  {
    code: "zh-CN",
    label: "Chinese",
    flag: "🇨🇳",
    // CJK Unified Ideographs
    ranges: [[0x4e00, 0x9fff]],
    commonWords: ["ni", "hao", "wo", "de", "shi", "le", "zai", "you"],
  },
  {
    code: "es-ES",
    label: "Spanish",
    flag: "🇪🇸",
    ranges: [],
    commonWords: [
      "hola", "como", "esta", "que", "es", "un", "una", "por", "para",
      "con", "sin", "sobre", "desde", "hasta", "mostrar", "proyecto",
    ],
  },
  {
    code: "fr-FR",
    label: "French",
    flag: "🇫🇷",
    ranges: [],
    commonWords: [
      "bonjour", "comment", "est", "que", "c'est", "un", "une", "pour",
      "avec", "dans", "sur", "montrer", "projet", "merci",
    ],
  },
  {
    code: "de-DE",
    label: "German",
    flag: "🇩🇪",
    ranges: [],
    commonWords: [
      "hallo", "wie", "ist", "was", "ein", "eine", "fur", "mit", "auf",
      "zeigen", "projekt", "danke", "bitte", "gut",
    ],
  },
  {
    code: "pt-BR",
    label: "Portuguese",
    flag: "🇧🇷",
    ranges: [],
    commonWords: [
      "ola", "como", "esta", "que", "um", "uma", "para", "com", "em",
      "mostrar", "projeto", "obrigado", "por favor",
    ],
  },
  // English is fallback
];

/**
 * Detect the language of a text string
 * Returns the BCP 47 language code and confidence
 */
export function detectLanguage(text: string): {
  code: string;
  confidence: number;
  label: string;
  flag: string;
} {
  if (!text || text.trim().length === 0) {
    return { code: "en-US", confidence: 0, label: "English", flag: "🇺🇸" };
  }

  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/);

  // Check for script-based detection (most reliable)
  for (const lang of LANGUAGES) {
    if (lang.ranges.length === 0) continue;

    let charCount = 0;
    for (const char of normalized) {
      const codePoint = char.codePointAt(0) || 0;
      for (const [start, end] of lang.ranges) {
        if (codePoint >= start && codePoint <= end) {
          charCount++;
          break;
        }
      }
    }

    if (charCount > 0) {
      const ratio = charCount / normalized.length;
      if (ratio > 0.3) {
        return { code: lang.code, confidence: ratio, label: lang.label, flag: lang.flag };
      }
    }
  }

  // Word-based detection (for Latin-script languages)
  const scores: Record<string, number> = {};

  for (const lang of LANGUAGES) {
    if (lang.ranges.length > 0) continue; // Skip script-based languages
    if (lang.code === "en-US") continue; // Skip English (default)

    let score = 0;
    for (const word of words) {
      if (lang.commonWords.includes(word)) {
        score += 1;
      }
    }

    if (score > 0) {
      scores[lang.code] = score / words.length;
    }
  }

  // Find best match above threshold
  let bestCode = "en-US";
  let bestScore = 0;
  let bestLabel = "English";
  let bestFlag = "🇺🇸";

  for (const [code, score] of Object.entries(scores)) {
    if (score > bestScore && score > 0.15) {
      bestScore = score;
      bestCode = code;
      const lang = LANGUAGES.find((l) => l.code === code);
      if (lang) {
        bestLabel = lang.label;
        bestFlag = lang.flag;
      }
    }
  }

  return { code: bestCode, confidence: bestScore, label: bestLabel, flag: bestFlag };
}

/**
 * Get the SpeechRecognition language that best matches detected language
 */
export function getSTTLanguage(code: string): string {
  // Map our codes to STT codes
  const sttMap: Record<string, string> = {
    "hi-IN": "hi-IN",
    "ja-JP": "ja-JP",
    "ko-KR": "ko-KR",
    "ar-SA": "ar-SA",
    "zh-CN": "zh-CN",
    "es-ES": "es-ES",
    "fr-FR": "fr-FR",
    "de-DE": "de-DE",
    "pt-BR": "pt-BR",
    "en-US": "en-US",
    "en-GB": "en-GB",
  };
  return sttMap[code] || "en-US";
}

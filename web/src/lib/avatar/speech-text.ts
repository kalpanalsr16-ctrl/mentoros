/**
 * Speech-only view of a MentorOS answer, sent to Tavus. The stored and
 * displayed answer is never changed here. This module only decides how the
 * text sounds: notation becomes words, markup and emoji are dropped, and a
 * long answer is condensed to a short spoken summary.
 */

const SPOKEN_WORD_BUDGET = 45;
const FULL_ANSWER_HINT = "The full explanation is on your screen.";

const FRACTION_NAMES: Record<number, [singular: string, plural: string]> = {
  2: ["half", "halves"],
  3: ["third", "thirds"],
  4: ["fourth", "fourths"],
  5: ["fifth", "fifths"],
  6: ["sixth", "sixths"],
  7: ["seventh", "sevenths"],
  8: ["eighth", "eighths"],
  9: ["ninth", "ninths"],
  10: ["tenth", "tenths"],
};

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];

function numberToWord(value: number): string {
  return value >= 0 && value < NUMBER_WORDS.length ? NUMBER_WORDS[value] : String(value);
}

function fractionToWords(numerator: number, denominator: number): string {
  const names = FRACTION_NAMES[denominator];
  if (!names) return `${numerator} over ${denominator}`;
  const numeratorWord = numberToWord(numerator);
  return `${numeratorWord} ${numerator === 1 ? names[0] : names[1]}`;
}

export function toSpeechText(answer: string): string {
  const spoken = answer
    .replace(/\\frac\{(\d+)\}\{(\d+)\}/g, (_, n, d) => ` ${fractionToWords(Number(n), Number(d))} `)
    .replace(/\$\$?([^$]+)\$\$?/g, "$1")
    .replace(/\\times|×/g, " times ")
    .replace(/\\div|÷/g, " divided by ")
    .replace(/\\cdot/g, " times ")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, " ")
    .replace(/(\d+)\s*\/\s*(\d+)/g, (_, n, d) => ` ${fractionToWords(Number(n), Number(d))} `)
    .replace(/(\d)\s*%/g, "$1 percent")
    .replace(/(\d)\s*[*x]\s*(?=\d)/g, "$1 times ")
    .replace(/≠/g, " is not equal to ")
    .replace(/≤/g, " is less than or equal to ")
    .replace(/≥/g, " is greater than or equal to ")
    .replace(/<=/g, " is less than or equal to ")
    .replace(/>=/g, " is greater than or equal to ")
    .replace(/\s\+\s|\+(?=\d)|(?<=\d)\+/g, " plus ")
    .replace(/(?<=\d)\s*[-−]\s*(?=\d)/g, " minus ")
    .replace(/[ \t][-−][ \t]/g, " minus ")
    .replace(/\s*=\s*/g, " equals ")
    .replace(/[*_`#>]+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/[—–]/g, ", ")
    .replace(/\p{Extended_Pictographic}️?/gu, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .replace(/\n{2,}/g, "\n")
    .trim();

  return condenseForSpeech(spoken);
}

/**
 * Keeps whole sentences up to a word budget (about 15-20 seconds of speech).
 * Only the spoken version is shortened; the full answer stays on screen.
 */
export function condenseForSpeech(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const kept: string[] = [];
  let words = 0;

  for (const sentence of sentences) {
    const count = sentence.split(/\s+/).length;
    if (words + count > SPOKEN_WORD_BUDGET) break;
    kept.push(sentence);
    words += count;
  }

  if (kept.length === sentences.length) return kept.join(" ");
  if (kept.length === 0) {
    const firstWords = sentences[0].split(/\s+/).slice(0, SPOKEN_WORD_BUDGET).join(" ");
    return `${firstWords}. ${FULL_ANSWER_HINT}`;
  }
  return `${kept.join(" ")} ${FULL_ANSWER_HINT}`;
}

/**
 * Plain-Language Reading Level Checker Script.
 * Uses Flesch-Kincaid Grade Level analysis to flag complex sentences above a target grade level (default Grade 8).
 */

export interface ReadingLevelAnalysis {
  text: string;
  wordCount: number;
  sentenceCount: number;
  syllableCount: number;
  gradeLevel: number;
  isCompliant: boolean;
  flaggedSentences: { sentence: string; gradeLevel: number; reason: string }[];
}

export function countSyllables(word: string): number {
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleanWord) return 0;
  if (cleanWord.length <= 3) return 1;

  const syllables = cleanWord
    .replace(/(?:[aeiouy]{2,})/g, "a")
    .replace(/(?:[^laeiouy]es|[^laeiouy]e)$/g, "")
    .match(/[aeiouy]/g);

  return syllables ? Math.max(1, syllables.length) : 1;
}

export function calculateFleschKincaid(words: number, sentences: number, syllables: number): number {
  if (words === 0 || sentences === 0) return 0;
  const fkgl = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
  return Math.max(0, Math.round(fkgl * 10) / 10);
}

export function analyzeReadingLevel(
  text: string,
  maxGradeLevel: number = 8
): ReadingLevelAnalysis {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let totalWords = 0;
  let totalSyllables = 0;
  const flaggedSentences: { sentence: string; gradeLevel: number; reason: string }[] = [];

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    let sentenceSyllables = 0;

    for (const word of words) {
      sentenceSyllables += countSyllables(word);
    }

    totalWords += wordCount;
    totalSyllables += sentenceSyllables;

    if (wordCount > 0) {
      const sentenceGrade = calculateFleschKincaid(wordCount, 1, sentenceSyllables);
      if (sentenceGrade > maxGradeLevel) {
        flaggedSentences.push({
          sentence,
          gradeLevel: sentenceGrade,
          reason: `Sentence FKGL (${sentenceGrade}) exceeds maximum target grade level (${maxGradeLevel})`,
        });
      }
    }
  }

  const overallGradeLevel = calculateFleschKincaid(totalWords, sentences.length, totalSyllables);

  return {
    text,
    wordCount: totalWords,
    sentenceCount: sentences.length,
    syllableCount: totalSyllables,
    gradeLevel: overallGradeLevel,
    isCompliant: flaggedSentences.length === 0,
    flaggedSentences,
  };
}

// CLI runner when executed directly
if (require.main === module) {
  const sampleText =
    "Tell us about your business once. AI Business Passport tracks your CAC, FIRS, and regulatory deadlines automatically. Keep your business compliant and ready for tenders without legal headaches.";

  const result = analyzeReadingLevel(sampleText, 8);
  console.log("=== Plain-Language Reading Level Report ===");
  console.log(`Word Count: ${result.wordCount}`);
  console.log(`Sentence Count: ${result.sentenceCount}`);
  console.log(`Overall Grade Level: Grade ${result.gradeLevel}`);
  console.log(`Compliant (<= Grade 8): ${result.isCompliant ? "YES" : "NO"}`);

  if (!result.isCompliant) {
    console.log("\nFlagged Sentences:");
    result.flaggedSentences.forEach((f) => console.log(`- [Grade ${f.gradeLevel}] ${f.sentence}`));
  }
}

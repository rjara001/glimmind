import { calculateSimilarity, levenshteinDistance, normalize } from './similarity';

export type WordStatus = 'correct' | 'similar' | 'wrong';

export interface CharDiff {
  type: 'match' | 'missing' | 'extra' | 'diff';
  char: string;
  userChar?: string;
  systemChar?: string;
  index: number;
}

export interface AlignedWord {
  index: number;
  userWord: string;
  systemWord: string;
  status: WordStatus;
  similarity: number;
  charDiff: CharDiff[];
  hint: string;
}

export interface AlignmentResult {
  words: AlignedWord[];
  stats: {
    correct: number;
    similar: number;
    wrong: number;
    total: number;
  };
}

export { calculateSimilarity, levenshteinDistance, normalize };

export function alignWords(userInput: string, expectedAnswer: string): AlignmentResult {
  const userNormalized = normalize(userInput);
  const systemNormalized = normalize(expectedAnswer);

  const userWords = userNormalized.split(/\s+/).filter((w) => w.length > 0);
  const systemWords = systemNormalized.split(/\s+/).filter((w) => w.length > 0);

  const maxLen = Math.max(userWords.length, systemWords.length);
  const words: AlignedWord[] = [];

  let correct = 0;
  let similar = 0;
  let wrong = 0;

  for (let i = 0; i < maxLen; i++) {
    const userWord = userWords[i] || '';
    const systemWord = systemWords[i] || '';

    const similarity = userWord && systemWord
      ? calculateSimilarity(userWord, systemWord)
      : 0;

    let status: WordStatus;
    if (similarity === 1.0) {
      status = 'correct';
      correct++;
    } else if (similarity >= 0.8) {
      status = 'similar';
      similar++;
    } else {
      status = 'wrong';
      wrong++;
    }

    const charDiff = (status === 'similar' || status === 'wrong') && (userWord || systemWord)
      ? diffChars(userWord, systemWord)
      : [];

    const hint = charDiff.length > 0 ? getHint(charDiff) : '';

    words.push({
      index: i + 1,
      userWord,
      systemWord,
      status,
      similarity,
      charDiff,
      hint,
    });
  }

  return {
    words,
    stats: {
      correct,
      similar,
      wrong,
      total: maxLen,
    },
  };
}

export function diffChars(userWord: string, systemWord: string): CharDiff[] {
  const m = userWord.length;
  const n = systemWord.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, (_, j) => j)
  );

  for (let i = 1; i <= m; i++) {
    dp[i][0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = userWord[i - 1] === systemWord[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  const ops: CharDiff[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] && userWord[i - 1] === systemWord[j - 1]) {
      ops.push({ type: 'match', char: userWord[i - 1], index: i - 1 });
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.push({
        type: 'diff',
        char: `${userWord[i - 1]}→${systemWord[j - 1]}`,
        userChar: userWord[i - 1],
        systemChar: systemWord[j - 1],
        index: i - 1,
      });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push({ type: 'extra', char: userWord[i - 1], index: i - 1 });
      i--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      ops.push({ type: 'missing', char: systemWord[j - 1], index: j - 1 });
      j--;
    }
  }

  return ops.reverse();
}

export function getHint(charDiff: CharDiff[]): string {
  const missing = charDiff.filter((d) => d.type === 'missing');
  const extra = charDiff.filter((d) => d.type === 'extra');
  const diff = charDiff.filter((d) => d.type === 'diff');

  const missingCount = missing.length;
  const extraCount = extra.length;
  const diffCount = diff.length;
  const total = missingCount + extraCount + diffCount;

  if (total === 0) return '';

  if (total === 1) {
    if (missingCount === 1) {
      return `Falta la letra '${missing[0].char}' en posición ${missing[0].index + 1}`;
    }
    if (extraCount === 1) {
      return `Letra extra '${extra[0].char}' en posición ${extra[0].index + 1}`;
    }
    if (diffCount === 1) {
      return `Letra '${diff[0].userChar}' → '${diff[0].systemChar}' en posición ${diff[0].index + 1}`;
    }
  }

  const sameType =
    (missingCount > 0 && extraCount === 0 && diffCount === 0) ||
    (extraCount > 0 && missingCount === 0 && diffCount === 0) ||
    (diffCount > 0 && missingCount === 0 && extraCount === 0);

  if (sameType) {
    if (missingCount > 1) {
      const details = missing.map((m) => `'${m.char}' en posición ${m.index + 1}`).join(', ');
      return `Faltan ${missingCount} letras: ${details}`;
    }
    if (extraCount > 1) {
      const details = extra.map((e) => `'${e.char}' en posición ${e.index + 1}`).join(', ');
      return `Letras extra: ${details}`;
    }
    if (diffCount > 1) {
      const details = diff.map((d) => `'${d.userChar}'→'${d.systemChar}' en posición ${d.index + 1}`).join(', ');
      return `${diffCount} sustituciones: ${details}`;
    }
  }

  if (total > 3) {
    return 'Demasiadas diferencias. Ver detalle abajo.';
  }

  return 'Múltiples diferencias. Ver detalle abajo.';
}
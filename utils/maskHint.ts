export function maskHint(text: string | undefined, mode: 'masked' | 'firstLetter' | 'firstLast' | 'firstLast2' | false): string {
  if (!text) return '***';
  if (mode === false || mode === 'masked') return text.replace(/\S/g, '*');
  if (mode === 'firstLetter') {
    return text
      .split(' ')
      .map(word => {
        if (word.length === 0) return word;
        return word[0] + '*'.repeat(word.length - 1);
      })
      .join(' ');
  }
  if (mode === 'firstLast') {
    return text
      .split(' ')
      .map(word => {
        if (word.length === 0) return word;
        if (word.length === 1) return word;
        return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
      })
      .join(' ');
  }
  if (mode === 'firstLast2') {
    return text
      .split(' ')
      .map(word => {
        if (word.length === 0) return word;
        if (word.length <= 3) return word;
        return word[0] + '*'.repeat(word.length - 3) + word.slice(-2);
      })
      .join(' ');
  }
  return text.replace(/\S/g, '*');
}

export function getAutoHintMode(currentCycle: number): 'masked' | 'firstLetter' | 'firstLast' | 'firstLast2' {
  if (currentCycle <= 1) return 'firstLetter';
  if (currentCycle === 2) return 'firstLast';
  if (currentCycle === 3) return 'firstLast';
  return 'firstLast2';
}

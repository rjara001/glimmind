export type DictionarySourceKey =
  | 'cambridge'
  | 'wordreference'
  | 'urbandictionary'
  | 'youglish';

export interface DictionaryLink {
  key: DictionarySourceKey;
  label: string;
  icon: string;
  href: string;
}

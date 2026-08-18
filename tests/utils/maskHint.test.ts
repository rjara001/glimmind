import { describe, it, expect } from 'vitest';
import { maskHint, getAutoHintMode } from '@/utils/maskHint';

describe('maskHint', () => {
  it('returns fallback when text is undefined', () => {
    expect(maskHint(undefined, 'firstLetter')).toBe('***');
  });

  it('masks all letters preserving spaces', () => {
    expect(maskHint('table', 'masked')).toBe('*****');
    expect(maskHint('it pays', 'masked')).toBe('** ****');
  });

  it('shows first letter of each word preserving spaces', () => {
    expect(maskHint('table', 'firstLetter')).toBe('t****');
    expect(maskHint('it pays', 'firstLetter')).toBe('i* p***');
  });

  it('shows first and last letter of each word preserving spaces', () => {
    expect(maskHint('table', 'firstLast')).toBe('t***e');
    expect(maskHint('it pays', 'firstLast')).toBe('it p**s');
  });

  it('shows first and last 2 letters of each word preserving spaces', () => {
    expect(maskHint('table', 'firstLast2')).toBe('t**le');
    expect(maskHint('testing', 'firstLast2')).toBe('t****ng');
    expect(maskHint('hello world', 'firstLast2')).toBe('h**lo w**ld');
    expect(maskHint('international', 'firstLast2')).toBe('i**********al');
  });

  it('returns masked when mode is false', () => {
    expect(maskHint('table', false)).toBe('*****');
  });
});

describe('getAutoHintMode', () => {
  it('returns firstLetter for cycle 1', () => {
    expect(getAutoHintMode(1)).toBe('firstLetter');
  });

  it('returns firstLast for cycle 2', () => {
    expect(getAutoHintMode(2)).toBe('firstLast');
  });

  it('returns firstLast for cycle 3', () => {
    expect(getAutoHintMode(3)).toBe('firstLast');
  });

  it('returns firstLast2 for cycle 4', () => {
    expect(getAutoHintMode(4)).toBe('firstLast2');
  });

  it('returns firstLast2 for cycle 5', () => {
    expect(getAutoHintMode(5)).toBe('firstLast2');
  });
});

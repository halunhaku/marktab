import { describe, expect, it } from 'vitest';
import { atWordBoundary, indexOfHit, subsequenceHit, tokenize } from '@/core/util/fuzzy';

describe('tokenize', () => {
  it('lower-cases and splits on every kind of whitespace the matcher supports', () => {
    expect(tokenize('  Foo\tBar\nBaz\u3000Quz ')).toEqual(['foo', 'bar', 'baz', 'quz']);
  });

  it('returns no tokens for blank input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize(' \t\n\u3000 ')).toEqual([]);
  });

  it('keeps punctuation inside a token so urls stay addressable', () => {
    expect(tokenize('GitHub.com/react Router')).toEqual(['github.com/react', 'router']);
  });
});

describe('indexOfHit', () => {
  it('reports the offset of a substring', () => {
    expect(indexOfHit('github.com/react', 'react')).toBe(11);
  });

  it('reports -1 for a miss or for empty input', () => {
    expect(indexOfHit('github.com', 'react')).toBe(-1);
    expect(indexOfHit('', 'react')).toBe(-1);
    expect(indexOfHit('github.com', '')).toBe(-1);
  });
});

describe('atWordBoundary', () => {
  it('treats the string start as a boundary', () => {
    expect(atWordBoundary('react', 0)).toBe(true);
  });

  it('reports a boundary after punctuation but not inside a word', () => {
    expect(atWordBoundary('github.com/react', 11)).toBe(true);
    expect(atWordBoundary('github-react', 7)).toBe(true);
    expect(atWordBoundary('myreact', 2)).toBe(false);
  });
});

describe('subsequenceHit', () => {
  it('scores an abbreviation by how tightly its characters are packed', () => {
    expect(subsequenceHit('github.com/react', 'ghr')).toBeCloseTo(3 / 12, 5);
    expect(subsequenceHit('abcd', 'ad')).toBeCloseTo(0.5, 5);
    expect(subsequenceHit('react', 'react')).toBe(1);
  });

  it('reports -1 when the characters are out of order or missing', () => {
    expect(subsequenceHit('react', 'rcr')).toBe(-1);
    expect(subsequenceHit('abc', 'd')).toBe(-1);
  });

  it('reports -1 for empty input and for tokens longer than the haystack', () => {
    expect(subsequenceHit('', 'ab')).toBe(-1);
    expect(subsequenceHit('ab', '')).toBe(-1);
    expect(subsequenceHit('ab', 'abc')).toBe(-1);
  });
});

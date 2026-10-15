/**
 * Matching primitives used by the search engine.
 *
 * Two strategies per field:
 *  - `indexOfHit`   — plain substring, exact and cheap;
 *  - `subsequenceHit` — ordered character match with a compactness score so
 *    abbreviations like `ghr` still find `github.com/react`.
 *
 * Both are allocation-free (no regex, no normalisation beyond the caller's
 * pre-lowered fields), which is what keeps a 20k-bookmark index searchable
 * inside a single frame.
 */

export function tokenize(query: string): string[] {
  const tokens: string[] = [];
  let current = '';
  for (const char of query.toLowerCase()) {
    if (char === ' ' || char === '\t' || char === '\n' || char === '\u3000') {
      if (current) tokens.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

/** Position of `token` in `hay`, or -1. */
export function indexOfHit(hay: string, token: string): number {
  if (!hay || !token) return -1;
  return hay.indexOf(token);
}

const BOUNDARY = /[^a-z0-9]/;

/** True when `hay[index]` starts a word (start of string or after punctuation). */
export function atWordBoundary(hay: string, index: number): boolean {
  if (index <= 0) return true;
  const previous = hay[index - 1] ?? '';
  return BOUNDARY.test(previous);
}

/**
 * Ordered subsequence match. Returns a 0..1 compactness score (higher is a
 * tighter match) or -1 when `token` is not a subsequence of `hay`.
 */
export function subsequenceHit(hay: string, token: string): number {
  if (!hay || !token) return -1;
  if (token.length > hay.length) return -1;
  let hayIndex = 0;
  let firstIndex = -1;
  let lastIndex = -1;
  for (let tokenIndex = 0; tokenIndex < token.length; tokenIndex += 1) {
    const char = token[tokenIndex] as string;
    let found = -1;
    while (hayIndex < hay.length) {
      if (hay[hayIndex] === char) {
        found = hayIndex;
        hayIndex += 1;
        break;
      }
      hayIndex += 1;
    }
    if (found === -1) return -1;
    if (firstIndex === -1) firstIndex = found;
    lastIndex = found;
  }
  const span = lastIndex - firstIndex + 1;
  return token.length / span;
}

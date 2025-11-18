/**
 * Perform a simple fuzzy match where query characters must appear in order.
 * Case-insensitive, ignores whitespace differences by trimming the query.
 *
 * @param {string} query - User-provided search string.
 * @param {string | null | undefined} target - Text to match against.
 * @returns {boolean} True if all query characters appear in order in the target.
 * @example
 * fuzzyMatch("agt", "Agent"); // true
 */
export function fuzzyMatch(query: string, target?: string | null): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  if (!target) return false;

  const normalizedTarget = target.toLowerCase();
  let queryIndex = 0;

  for (let i = 0; i < normalizedTarget.length; i += 1) {
    if (normalizedTarget[i] === normalizedQuery[queryIndex]) {
      queryIndex += 1;
      if (queryIndex === normalizedQuery.length) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if the query fuzzy matches any provided target strings.
 *
 * @param {string} query - User-provided search string.
 * @param {Array<string | null | undefined>} targets - Collection of target strings.
 * @returns {boolean} True if the query matches at least one target.
 */
export function fuzzyMatchAny(
  query: string,
  targets: Array<string | null | undefined>,
): boolean {
  return targets.some((target) => fuzzyMatch(query, target));
}


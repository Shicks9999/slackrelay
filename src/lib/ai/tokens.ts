/**
 * Rough token estimation for context budget management.
 * Uses the ~4 chars per token heuristic for English text.
 * For precise counting, swap in tiktoken or similar.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within a token budget.
 * Preserves complete sentences where possible.
 */
export function truncateToTokenBudget(
  text: string,
  maxTokens: number
): { text: string; truncated: boolean } {
  const estimated = estimateTokens(text);
  if (estimated <= maxTokens) {
    return { text, truncated: false };
  }

  const maxChars = maxTokens * 4;
  let truncated = text.slice(0, maxChars);

  // Try to break at the last sentence boundary
  const lastPeriod = truncated.lastIndexOf(". ");
  if (lastPeriod > maxChars * 0.5) {
    truncated = truncated.slice(0, lastPeriod + 1);
  }

  return { text: truncated, truncated: true };
}

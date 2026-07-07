import { buildSemanticSearch, type SearchResult } from "@/lib/ai/search-engine";

/**
 * Normalize a raw speech-to-text transcript into a clean search query.
 * Trims filler, collapses whitespace, and strips leading command phrases
 * people naturally say ("search for", "find me", "show me").
 */
export function normalizeTranscript(transcript: string) {
  return transcript
    .replace(/^\s*(search for|search|find me|find|show me|look for|i want|i need)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Run the shared semantic search engine over a voice transcript so voice and
 * text search return identical, consistent results.
 */
export function searchByVoice(transcript: string, products: any[]): { query: string; result: SearchResult } {
  const query = normalizeTranscript(transcript);
  return { query, result: buildSemanticSearch(query, products) };
}

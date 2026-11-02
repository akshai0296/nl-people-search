// Runs once when the server starts. Warms the brief interpreter in the background so the first
// search a recruiter runs is as fast as the rest. Failure is harmless: searches still work cold.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.ANTHROPIC_API_KEY) return;
  void import("./server/search/warm-up")
    .then(({ warmUpSearch }) => warmUpSearch())
    .catch((error) => console.warn("Search warm-up skipped:", error?.message ?? error));
}

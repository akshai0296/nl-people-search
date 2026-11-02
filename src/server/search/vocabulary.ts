import "server-only";
import type { Vocabulary } from "@/lib/filters";
import { check } from "../http";
import { adminDb } from "../supabase";

// The vocabulary only changes when candidates are reloaded, so it is cached in memory.
const TTL_MS = 10 * 60 * 1000;
let cached: { value: Promise<Vocabulary>; expires: number } | undefined;

async function load(): Promise<Vocabulary> {
  return check(await adminDb().rpc("search_vocabulary"), "search_vocabulary") as unknown as Vocabulary;
}

export function getVocabulary(): Promise<Vocabulary> {
  if (!cached || cached.expires < Date.now()) {
    const entry = { value: load(), expires: Date.now() + TTL_MS };
    // Don't keep a failed load around.
    entry.value.catch(() => {
      if (cached === entry) cached = undefined;
    });
    cached = entry;
  }
  return cached.value;
}

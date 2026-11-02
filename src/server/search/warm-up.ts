import { warmUp } from "./interpret-brief";
import { getVocabulary } from "./vocabulary";

export async function warmUpSearch(): Promise<void> {
  const started = Date.now();
  await warmUp(await getVocabulary());
  console.info(`[search] interpreter warmed up in ${Date.now() - started}ms`);
}

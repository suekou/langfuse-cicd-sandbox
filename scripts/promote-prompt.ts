import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { LangfuseClient } from "@langfuse/client";

const PROMPT_NAME = "country-classifier";
const PROMOTE_LABEL = "latest";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROMPT_FILE = resolve(REPO_ROOT, "prompts", `${PROMPT_NAME}.md`);

async function main() {
  const body = (await readFile(PROMPT_FILE, "utf-8")).trim();
  if (!body) {
    throw new Error(`Prompt file is empty: ${PROMPT_FILE}`);
  }

  const subject = process.env.GIT_COMMIT_MESSAGE?.split("\n")[0]?.trim();
  const sha = process.env.GIT_COMMIT_SHA?.slice(0, 7);
  const actor = process.env.GIT_ACTOR;
  const commitMessage =
    subject && sha
      ? `${subject} (${sha})${actor ? ` by @${actor}` : ""}`
      : "manual promote";

  const langfuse = new LangfuseClient();

  const created = await langfuse.prompt.create({
    name: PROMPT_NAME,
    type: "text",
    prompt: body,
    labels: [PROMOTE_LABEL],
    commitMessage,
  });

  console.log(
    `Promoted prompt "${PROMPT_NAME}" v${created.version} with labels=[${PROMOTE_LABEL}]`,
  );
  console.log(`commitMessage: ${commitMessage}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

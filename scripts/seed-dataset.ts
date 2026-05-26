import { LangfuseClient } from "@langfuse/client";

const DATASET_NAME = "country-from-image-dataset";

type Item = {
  input: { question: string; imagePath: string };
  expectedOutput: string;
};

const QUESTION =
  "この画像はどの国を表していますか?国名のみを日本語で簡潔に答えてください。";

const items: Item[] = [
  {
    input: { question: QUESTION, imagePath: "assets/japan.png" },
    expectedOutput: "日本",
  },
  {
    input: { question: QUESTION, imagePath: "assets/usa.png" },
    expectedOutput: "アメリカ",
  },
  {
    input: { question: QUESTION, imagePath: "assets/france.png" },
    expectedOutput: "フランス",
  },
];

async function main() {
  const langfuse = new LangfuseClient();

  await langfuse.api.datasets.create({
    name: DATASET_NAME,
    description:
      "画像から国を当てさせるマルチモーダルQAデータセット (CI/CD実験用)",
  });
  console.log(`Dataset ensured: ${DATASET_NAME}`);

  for (const item of items) {
    await langfuse.api.datasetItems.create({
      datasetName: DATASET_NAME,
      input: item.input,
      expectedOutput: item.expectedOutput,
    });
    console.log(`  + item: ${item.input.imagePath} -> ${item.expectedOutput}`);
  }

  console.log(`Seeded ${items.length} items into ${DATASET_NAME}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

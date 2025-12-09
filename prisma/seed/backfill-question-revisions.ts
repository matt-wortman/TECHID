import { PrismaClient } from "@prisma/client";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

type BackfillResult = {
  created: number;
  linked: number;
  reused: number;
};

export async function backfillQuestionRevisions(prisma: PrismaClient): Promise<BackfillResult> {
  const dictionaries = await prisma.questionDictionary.findMany();

  let created = 0;
  let linked = 0;
  let reused = 0;

  for (const dictionary of dictionaries) {
    const versionNumber = dictionary.currentVersion ?? 1;

    let revision = await prisma.questionRevision.findFirst({
      where: {
        dictionaryId: dictionary.id,
        questionKey: dictionary.key,
        versionNumber,
      },
    });

    if (!revision) {
      revision = await prisma.questionRevision.create({
        data: {
          dictionaryId: dictionary.id,
          questionKey: dictionary.key,
          versionNumber,
          label: dictionary.label,
          helpText: dictionary.helpText,
          options: dictionary.options ?? undefined,
          validation: dictionary.validation ?? undefined,
          createdBy: "system-backfill",
          changeReason: "Initial backfill from QuestionDictionary baseline.",
          significantChange: false,
        },
      });
      created += 1;
    } else {
      reused += 1;
    }

    if (dictionary.currentRevisionId !== revision.id || dictionary.currentVersion !== versionNumber) {
      await prisma.questionDictionary.update({
        where: { id: dictionary.id },
        data: {
          currentRevisionId: revision.id,
          currentVersion: versionNumber,
        },
      });
      linked += 1;
    }
  }

  return { created, linked, reused };
}

async function runStandalone() {
  const prisma = new PrismaClient();

  try {
    console.info("Running question revision backfill...");
    const { created, linked, reused } = await backfillQuestionRevisions(prisma);
    console.info(
      `Question revision backfill complete: ${created} created, ${reused} pre-existing, ${linked} dictionaries synchronized.`
    );
  } catch (error) {
    console.error("Failed to backfill question revisions:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectExecution = fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "");

if (isDirectExecution) {
  runStandalone();
}

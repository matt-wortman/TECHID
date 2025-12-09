import { seedFormStructure } from './form-structure';
import { seedDemoSubmissions } from './demo-submissions';
import { getPrismaClient } from './prisma-factory';
import { seedQuestionDictionary } from './question-dictionary';
import { backfillQuestionRevisions } from './backfill-question-revisions';

const prisma = getPrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Check environment variables
  const runPrismaSeed = process.env.RUN_PRISMA_SEED !== 'false';
  const seedDemoData = process.env.SEED_DEMO_DATA !== 'false'; // Default to true

  if (!runPrismaSeed) {
    console.log('⏭️  Skipping database seed (RUN_PRISMA_SEED=false)');
    return;
  }

  const allowPurge = process.env.SEED_ALLOW_PURGE === 'true';
  console.log(`   SEED_ALLOW_PURGE=${allowPurge}`);

  try {
    // Seed question dictionary entries (idempotent)
    console.log('📚 Seeding question dictionary...');
    await seedQuestionDictionary(prisma);
    console.log('🧾 Backfilling question revisions...');
    const revisionResult = await backfillQuestionRevisions(prisma);
    console.log(
      `   Backfill summary → created: ${revisionResult.created}, reused: ${revisionResult.reused}, linked: ${revisionResult.linked}`
    );

    let templateId: string | null = null;

    if (allowPurge) {
      console.log('🧹 Clearing existing dynamic form data (SEED_ALLOW_PURGE=true)...');
      await prisma.formSubmission.deleteMany();
      await prisma.questionOption.deleteMany();
      await prisma.scoringConfig.deleteMany();
      await prisma.formQuestion.deleteMany();
      await prisma.formSection.deleteMany();
      await prisma.formTemplate.deleteMany();

      console.log('📝 Seeding form structure...');
      const template = await seedFormStructure(prisma);
      templateId = template.id;

      console.log(`✅ Successfully seeded form template: ${template.name} (${template.id})`);
    } else {
      console.log('⚠️  SEED_ALLOW_PURGE is not true; skipping destructive reset of form templates.');
      console.log('📝 Creating a new form template version without purging existing records.');
      const template = await seedFormStructure(prisma);
      templateId = template.id;
      console.log(`   Activated new template ${template.name} (${template.id}). Previous templates remain archived.`);
    }

    // Conditionally seed demo data
    if (seedDemoData && templateId) {
      console.log('🎭 Seeding demo data...');
      await seedDemoSubmissions(templateId, prisma);
      console.log('✨ Demo data seeded successfully!');
    } else if (seedDemoData && !templateId) {
      console.warn('⚠️  Demo data requested, but no template is available. Demo submissions were skipped.');
    } else {
      console.log('⏭️  Skipping demo data seed (SEED_DEMO_DATA=false)');
    }

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

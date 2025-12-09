import { PrismaClient, SubmissionStatus, Prisma } from '@prisma/client';
import { getPrismaClient } from './prisma-factory';
import { getOptionValues, OptionMapping } from './option-mapper';

// Demo submissions data using dictionaryKeys as question identifiers
const demoSubmissions = [
  {
    submittedBy: 'Dr. Jennifer Martinez',
    status: SubmissionStatus.SUBMITTED,
    responses: {
      'tech.techId': 'TECH-2025-002',
      'tech.technologyName': 'Smart Insulin Pump with Predictive Analytics',
      'tech.reviewerName': 'Dr. Jennifer Martinez',
      'triage.submissionDate': '2025-09-20',
      'tech.domainAssetClass': 'medical_device',
      'triage.technologyOverview': 'An intelligent insulin delivery system that uses machine learning to predict glucose trends and automatically adjust insulin delivery rates. The system integrates continuous glucose monitoring with advanced algorithms to prevent dangerous highs and lows in pediatric diabetic patients.',
      'triage.targetUsers': 'Pediatric endocrinologists, diabetes nurses, children with Type 1 diabetes (ages 6-18), parents and caregivers of diabetic children.',
      'triage.howItWorks': 'The system uses a closed-loop algorithm that analyzes CGM data, meal inputs, exercise patterns, and historical glucose trends to predict future glucose levels and automatically adjust basal insulin rates and deliver correction boluses.',
      'triage.licensableAssetTypes': ['device', 'software_algorithm'],
      'triage.developmentStage': 'validated_prototype',
      'triage.reducedToPractice': 'yes',
      'triage.proofOfConcept': 'yes',
      'triage.workingPrototype': 'yes',
      'triage.manufacturingFeasibility': 'yes',
      'triage.missionAlignmentText': 'This technology directly supports our mission to improve outcomes for children with chronic conditions. It addresses the critical need for better diabetes management in pediatric populations, potentially reducing hospitalizations and improving quality of life.',
      'triage.missionAlignmentScore': 3,
      'triage.unmetNeedText': 'Type 1 diabetes affects approximately 200,000 children in the US. Current insulin pumps require significant manual intervention and often result in suboptimal glucose control. This system could dramatically improve time-in-range and reduce diabetes-related complications.',
      'triage.unmetNeedScore': 3,
      'triage.stateOfArtText': 'Existing insulin pumps (Medtronic 780G, Tandem Control-IQ, Omnipod 5) offer some automation but lack predictive capabilities specific to pediatric physiology. Our system uses pediatric-specific algorithms and integrates more comprehensive data inputs.',
      'triage.stateOfArtScore': 2,
      'triage.marketOverview': 'The global insulin pump market is valued at $4.5B and growing at 8% CAGR. Pediatric segment represents 15% of market. Insurance coverage is improving with proven clinical outcomes.',
      'triage.marketScore': 3,
      'triage.reimbursementPath': 3,
      'triage.regulatoryPath': 2,
    },
    repeatGroups: {
      'tech.inventorName': [
        { name: 'Dr. Robert Kim, MD', title: 'MD', department: 'Endocrinology' },
        { name: 'Sarah Chen, PhD', title: 'PhD', department: 'Computer Science' },
      ],
      'triage.competitiveLandscape': [
        { company: 'Medtronic', product: 'MiniMed 780G', revenue: '$2.8B annually', contact: 'Available through sales team' },
        { company: 'Tandem Diabetes', product: 'Control-IQ', revenue: '$600M annually', contact: 'Partnership opportunities exist' },
        { company: 'Insulet', product: 'Omnipod 5', revenue: '$1.2B annually', contact: 'Competitive landscape' }
      ]
    },
    calculatedScores: {
      missionAlignment: 3,
      unmetNeed: 3,
      ipStrength: 2,
      marketSize: 3,
      patientPopulation: 3,
      competitors: 2,
      impactScore: 3.0,
      valueScore: 2.33,
      marketScore: 2.67
    }
  },
  {
    submittedBy: 'Dr. Michael Thompson',
    status: SubmissionStatus.SUBMITTED,
    responses: {
      'tech.techId': 'TECH-2025-003',
      'tech.technologyName': 'VR Pain Distraction Therapy System',
      'tech.reviewerName': 'Dr. Michael Thompson',
      'triage.submissionDate': '2025-09-18',
      'tech.domainAssetClass': 'digital_health',
      'triage.technologyOverview': 'A virtual reality system specifically designed for pediatric patients undergoing painful procedures. Uses immersive environments and biometric feedback to reduce perceived pain and anxiety during medical treatments.',
      'triage.targetUsers': 'Pediatric patients ages 4-16, child life specialists, nurses, physicians performing procedures, hospital administrators.',
      'triage.howItWorks': 'The system uses VR headsets with custom pediatric content, real-time biometric monitoring to adjust immersion levels, and integrated with hospital systems to track pain scores and treatment outcomes.',
      'triage.licensableAssetTypes': ['software_algorithm', 'database', 'device'],
      'triage.developmentStage': 'pilot_humans',
      'triage.reducedToPractice': 'yes',
      'triage.proofOfConcept': 'yes',
      'triage.workingPrototype': 'yes',
      'triage.manufacturingFeasibility': 'partially',
      'triage.missionAlignmentText': 'Aligns with our mission to provide family-centered care and improve patient experience. Addresses the significant issue of procedural pain and anxiety in children, supporting our goal of holistic pediatric care.',
      'triage.missionAlignmentScore': 2,
      'triage.unmetNeedText': 'Millions of pediatric patients undergo painful procedures annually. Current pain management often relies heavily on pharmacological interventions. This technology offers a non-pharmacological alternative that could reduce medication side effects.',
      'triage.unmetNeedScore': 2,
      'triage.stateOfArtText': 'Several VR pain management systems exist (AppliedVR, KindVR) but few are specifically designed for pediatric populations with age-appropriate content and adaptive features based on child development stages.',
      'triage.stateOfArtScore': 2,
      'triage.marketOverview': 'Digital therapeutics market is projected to reach $32B by 2030. VR in healthcare specifically valued at $2.4B. Hospital adoption increasing with proven ROI through reduced medication costs and improved patient satisfaction scores.',
      'triage.marketScore': 2,
      'triage.reimbursementPath': 2,
      'triage.regulatoryPath': 3,
    },
    repeatGroups: {
      'tech.inventorName': [
        { name: 'Dr. Alex Rivera, MD', title: 'MD', department: 'Pain Management' },
        { name: 'Jamie Park, MS', title: 'MS', department: 'Game Design' },
      ],
      'triage.competitiveLandscape': [
        { company: 'AppliedVR', product: 'RelieVRx', revenue: '$50M annually', contact: 'FDA-cleared VR therapeutic' },
        { company: 'KindVR', product: 'Pediatric VR Suite', revenue: '$25M annually', contact: 'Direct competitor' },
        { company: 'Oxford VR', product: 'Medical VR Platform', revenue: '$30M annually', contact: 'Partnership potential' }
      ]
    },
    calculatedScores: {
      missionAlignment: 2,
      unmetNeed: 2,
      ipStrength: 2,
      marketSize: 2,
      patientPopulation: 2,
      competitors: 3,
      impactScore: 2.0,
      valueScore: 2.17,
      marketScore: 2.33
    }
  },
  {
    submittedBy: 'Dr. Lisa Chang',
    status: SubmissionStatus.SUBMITTED,
    responses: {
      'tech.techId': 'TECH-2025-004',
      'tech.technologyName': 'Rapid Genetic Screening for Newborns',
      'tech.reviewerName': 'Dr. Lisa Chang',
      'triage.submissionDate': '2025-09-15',
      'tech.domainAssetClass': 'diagnostic',
      'triage.technologyOverview': 'A rapid genetic screening platform that can identify over 500 genetic conditions in newborns within 6 hours using next-generation sequencing and AI-powered analysis algorithms.',
      'triage.targetUsers': 'Neonatologists, genetic counselors, NICU staff, laboratory technicians, parents of newborns with suspected genetic conditions.',
      'triage.howItWorks': 'Uses proprietary library preparation methods, accelerated sequencing protocols, and machine learning algorithms trained on large datasets of pediatric genetic variants to provide rapid, accurate genetic screening results.',
      'triage.licensableAssetTypes': ['method', 'software_algorithm', 'database'],
      'triage.developmentStage': 'lab_proof',
      'triage.reducedToPractice': 'partially',
      'triage.proofOfConcept': 'yes',
      'triage.workingPrototype': 'partially',
      'triage.manufacturingFeasibility': 'no',
      'triage.missionAlignmentText': 'Directly supports our mission of providing world-class care for children. Early genetic diagnosis is crucial for optimal treatment planning and family counseling, particularly in our NICU population.',
      'triage.missionAlignmentScore': 3,
      'triage.unmetNeedText': 'Current genetic testing for newborns can take weeks, during which time critical treatment decisions may be delayed. Faster results could dramatically improve outcomes for children with treatable genetic conditions.',
      'triage.unmetNeedScore': 3,
      'triage.stateOfArtText': 'Current rapid genetic tests (Illumina TruSight, Invitae) still take 24-48 hours. Our 6-hour turnaround would be industry-leading. However, validation and regulatory approval will be challenging.',
      'triage.stateOfArtScore': 1,
      'triage.marketOverview': 'Genetic testing market expected to reach $30B by 2030. Newborn screening specifically is a $2B market. All US states mandate some newborn screening, creating guaranteed demand.',
      'triage.marketScore': 3,
      'triage.reimbursementPath': 2,
      'triage.regulatoryPath': 1,
    },
    repeatGroups: {
      'tech.inventorName': [
        { name: 'Dr. Lisa Chang, MD, PhD', title: 'MD, PhD', department: 'Genetics' },
        { name: 'Dr. Peter Walsh, PhD', title: 'PhD', department: 'Bioinformatics' },
      ],
      'triage.competitiveLandscape': [
        { company: 'Illumina', product: 'NovaSeq Series', revenue: '$3.5B annually', contact: 'Sequencing platform leader' },
        { company: 'Thermo Fisher', product: 'Ion Torrent', revenue: '$2.1B annually', contact: 'Rapid sequencing focus' },
        { company: 'Roche', product: 'AVENIO Platform', revenue: '$1.8B annually', contact: 'Clinical genomics' }
      ]
    },
    calculatedScores: {
      missionAlignment: 3,
      unmetNeed: 3,
      ipStrength: 1,
      marketSize: 3,
      patientPopulation: 2,
      competitors: 1,
      impactScore: 3.0,
      valueScore: 1.5,
      marketScore: 2.0
    }
  },
  {
    // Draft submission - partially completed
    submittedBy: 'Dr. Sarah Johnson',
    status: SubmissionStatus.DRAFT,
    responses: {
      'tech.techId': 'TECH-2025-005',
      'tech.technologyName': 'AI-Powered Pediatric Radiology Assistant',
      'tech.reviewerName': 'Dr. Sarah Johnson',
      'triage.submissionDate': '2025-09-22',
      'tech.domainAssetClass': 'other',
      'triage.technologyOverview': 'An AI system that assists radiologists in detecting abnormalities in pediatric imaging studies, with special focus on rare conditions that are often missed in initial readings.',
      'triage.targetUsers': 'Pediatric radiologists, general radiologists reviewing pediatric cases, emergency physicians.',
      // Partial responses - this is a draft
      'triage.missionAlignmentScore': 2,
      'triage.unmetNeedScore': 3,
    },
    repeatGroups: {
      'tech.inventorName': [
        { name: 'Dr. Sarah Johnson, MD', title: 'MD', department: 'Radiology' },
        { name: 'Tom Chen, MS', title: 'MS', department: 'Machine Learning' },
      ],
    },
    calculatedScores: {} // No calculations for draft
  }
];

/**
 * Seeds demo form submissions into the database
 * Idempotent: clears existing demo submissions before inserting
 */
export async function seedDemoSubmissions(
  templateId: string,
  injectedPrisma?: PrismaClient
): Promise<void> {
  const prisma = getPrismaClient(injectedPrisma);
  const optionCache = new Map<string, OptionMapping>();

  const normalizeResponseValue = async (dictionaryKey: string, value: unknown): Promise<unknown> => {
    if (typeof value !== 'string' && !Array.isArray(value)) {
      return value;
    }

    let mapping = optionCache.get(dictionaryKey);
    if (!mapping) {
      mapping = await getOptionValues(prisma, dictionaryKey);
      optionCache.set(dictionaryKey, mapping);
    }

    if (!mapping || Object.keys(mapping).length === 0) {
      return value;
    }

    if (typeof value === 'string') {
      return mapping[value] ?? value;
    }

    return value.map((item) => (typeof item === 'string' && mapping![item] ? mapping![item] : item));
  };

  console.log('🎭 Seeding demo form submissions...');

  try {
    // Clear existing submissions to ensure idempotency
    // We identify demo submissions by specific submittedBy patterns
    const demoSubmitterPatterns = [
      'Dr. Jennifer Martinez',
      'Dr. Michael Thompson',
      'Dr. Lisa Chang',
      'Dr. Sarah Johnson'
    ];

    // Delete existing demo submissions
    const deletedSubmissions = await prisma.formSubmission.deleteMany({
      where: {
        submittedBy: {
          in: demoSubmitterPatterns
        }
      }
    });

    if (deletedSubmissions.count > 0) {
      console.log(`  ↻ Cleared ${deletedSubmissions.count} existing demo submissions`);
    }

    // Create new demo submissions
    let createdCount = 0;
    for (const submission of demoSubmissions) {
      const formSubmission = await prisma.formSubmission.create({
        data: {
          templateId,
          submittedBy: submission.submittedBy,
          status: submission.status,
          submittedAt: submission.status === SubmissionStatus.SUBMITTED
            ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last week
            : null,
        },
      });

      // Note: Demo submissions no longer create TechnologyAnswer records directly.
      // The form engine writes to TechnologyAnswer via applyBindingWrites().
      // Demo data is intended for UI demonstration only.
      // TODO: Update demo seeding to create Technology + TechnologyAnswer records
      // for full integration with the shared answer architecture.
      void normalizeResponseValue; // Suppress unused variable warning

      // Create calculated scores (only for submitted forms)
      if (submission.calculatedScores && Object.keys(submission.calculatedScores).length > 0) {
        const scoreEntries = Object.entries(submission.calculatedScores)
          .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
          .map(([scoreType, value]) => ({
            submissionId: formSubmission.id,
            scoreType,
            value: Number(value),
          }));

        if (scoreEntries.length > 0) {
          await prisma.calculatedScore.createMany({
            data: scoreEntries,
          });
        }
      }

      createdCount++;
      const statusIcon = submission.status === SubmissionStatus.SUBMITTED ? '✅' : '📝';
      console.log(`  ${statusIcon} Created ${submission.status.toLowerCase()} submission: ${submission.responses['tech.technologyName']} (${formSubmission.id})`);
    }

    console.log(`✨ Successfully seeded ${createdCount} demo submissions!`);
    console.log(`   - ${demoSubmissions.filter(s => s.status === SubmissionStatus.SUBMITTED).length} submitted`);
    console.log(`   - ${demoSubmissions.filter(s => s.status === SubmissionStatus.DRAFT).length} draft`);

  } catch (error) {
    console.error('❌ Error seeding demo submissions:', error);
    throw error;
  }
}

/**
 * Verify demo data was seeded correctly
 * Returns submission counts for testing
 */
export async function verifyDemoData(injectedPrisma?: PrismaClient): Promise<{
  total: number;
  submitted: number;
  drafts: number;
}> {
  const prisma = getPrismaClient(injectedPrisma);
  const demoSubmitterPatterns = [
    'Dr. Jennifer Martinez',
    'Dr. Michael Thompson',
    'Dr. Lisa Chang',
    'Dr. Sarah Johnson'
  ];

  const submissions = await prisma.formSubmission.findMany({
    where: {
      submittedBy: {
        in: demoSubmitterPatterns
      }
    },
    select: {
      id: true,
      status: true,
      submittedBy: true,
    },
  });

  return {
    total: submissions.length,
    submitted: submissions.filter((s) => s.status === SubmissionStatus.SUBMITTED).length,
    drafts: submissions.filter((s) => s.status === SubmissionStatus.DRAFT).length,
  };
}

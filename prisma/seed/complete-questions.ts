import { FieldType } from '@prisma/client';
import { FormTemplateSeed } from './types';

// Complete question structure for CCHMC Technology Triage Form
// Uses dictionaryKey as the primary identifier for all questions

export const completeFormStructure: FormTemplateSeed = {
  name: "CCHMC Technology Triage Form",
  version: "2.0.0",
  description: "Cincinnati Children's Hospital Medical Center technology triage evaluation form - Complete version",
  isActive: true,
  sections: [
    {
      code: "S0",
      title: "Header and Identifiers",
      description: "Basic information about the technology and reviewer",
      order: 0,
      isRequired: true,
      questions: [
        {
          dictionaryKey: "tech.techId",
          label: "Technology ID",
          type: FieldType.SHORT_TEXT,
          helpText: "Unique identifier for this technology",
          placeholder: "Enter technology ID",
          order: 1,
          isRequired: true,
        },
        {
          dictionaryKey: "tech.technologyName",
          label: "Invention Title",
          type: FieldType.SHORT_TEXT,
          helpText: "The name or title of the technology/invention",
          placeholder: "Enter invention title",
          order: 2,
          isRequired: true,
        },
        {
          dictionaryKey: "tech.reviewerName",
          label: "Reviewer",
          type: FieldType.SHORT_TEXT,
          helpText: "Name of the person reviewing this technology",
          placeholder: "Enter reviewer name",
          order: 3,
          isRequired: true,
        },
        {
          dictionaryKey: "triage.submissionDate",
          label: "Date",
          type: FieldType.DATE,
          helpText: "Date of this evaluation",
          order: 4,
          isRequired: true,
        },
        {
          dictionaryKey: "tech.inventorName",
          label: "Inventor Info",
          type: FieldType.REPEATABLE_GROUP,
          helpText: "Add each inventor's details",
          order: 5,
          isRequired: true,
          repeatableConfig: {
            rowLabel: "Inventor",
            columns: [
              { key: "name", label: "Name", type: "text", required: true },
              { key: "title", label: "Title", type: "text", required: false },
              { key: "department", label: "Department", type: "text", required: false },
              { key: "email", label: "Email", type: "text", required: false },
            ],
          },
        },
        {
          dictionaryKey: "tech.domainAssetClass",
          label: "Domain or Asset Class",
          type: FieldType.SINGLE_SELECT,
          helpText: "Select the primary domain for this technology",
          order: 6,
          isRequired: true,
          options: [
            { value: "medical_device", label: "Medical Device", order: 1 },
            { value: "therapeutic", label: "Therapeutic", order: 2 },
            { value: "diagnostic", label: "Diagnostic", order: 3 },
            { value: "digital_health", label: "Digital Health", order: 4 },
            { value: "research_tool", label: "Research Tool", order: 5 },
            { value: "other", label: "Other", order: 6 },
          ],
        },
      ],
    },
    {
      code: "S1",
      title: "Technology Overview and Readiness",
      description: "Detailed description and development status of the technology",
      order: 1,
      isRequired: true,
      questions: [
        {
          dictionaryKey: "triage.technologyOverview",
          label: "Provide a concise summary of the technology and the problem it solves",
          type: FieldType.LONG_TEXT,
          helpText: "Describe what the technology does and what problem it addresses",
          placeholder: "Explain the technology and its purpose...",
          order: 1,
          isRequired: true,
        },
        {
          dictionaryKey: "triage.targetUsers",
          label: "Identify the primary target users",
          type: FieldType.LONG_TEXT,
          helpText: "Who will use this technology?",
          placeholder: "Describe the target users...",
          order: 2,
          isRequired: false,
        },
        {
          dictionaryKey: "triage.howItWorks",
          label: "Describe how it works at a high level",
          type: FieldType.LONG_TEXT,
          helpText: "High-level technical explanation of how the technology functions",
          placeholder: "Explain how the technology works...",
          order: 3,
          isRequired: false,
        },
        {
          dictionaryKey: "triage.licensableAssetTypes",
          label: "List the licensable asset type(s)",
          type: FieldType.MULTI_SELECT,
          helpText: "Select all applicable asset types",
          order: 4,
          isRequired: false,
          options: [
            { value: "composition_matter", label: "Composition of Matter", order: 1 },
            { value: "method", label: "Method", order: 2 },
            { value: "device", label: "Device", order: 3 },
            { value: "software_algorithm", label: "Software Algorithm", order: 4 },
            { value: "database", label: "Database", order: 5 },
            { value: "trademark", label: "Trademark", order: 6 },
            { value: "copyright", label: "Copyright", order: 7 },
            { value: "other", label: "Other", order: 8 },
          ],
        },
        {
          dictionaryKey: "triage.developmentStage",
          label: "Current stage of development",
          type: FieldType.SINGLE_SELECT,
          helpText: "Select the current development stage",
          order: 5,
          isRequired: true,
          options: [
            { value: "idea_only", label: "Idea only", order: 1 },
            { value: "lab_proof", label: "Lab proof of concept", order: 2 },
            { value: "prototype", label: "Prototype", order: 3 },
            { value: "validated_prototype", label: "Validated prototype", order: 4 },
            { value: "pilot_humans", label: "Pilot in humans", order: 5 },
            { value: "on_market", label: "On market", order: 6 },
          ],
        },
        {
          dictionaryKey: "triage.reducedToPractice",
          label: "Has it been reduced to practice",
          type: FieldType.SINGLE_SELECT,
          helpText: "Has the invention been physically implemented or demonstrated?",
          order: 6,
          isRequired: false,
          options: [
            { value: "yes", label: "Yes", order: 1 },
            { value: "no", label: "No", order: 2 },
            { value: "partially", label: "Partially", order: 3 },
            { value: "unsure", label: "Unsure", order: 4 },
          ],
        },
        {
          dictionaryKey: "triage.proofOfConcept",
          label: "Is there proof-of-concept data",
          type: FieldType.SINGLE_SELECT,
          helpText: "Do you have data demonstrating the concept works?",
          order: 7,
          isRequired: false,
          options: [
            { value: "yes", label: "Yes", order: 1 },
            { value: "no", label: "No", order: 2 },
            { value: "in_progress", label: "In progress", order: 3 },
          ],
        },
        {
          dictionaryKey: "triage.workingPrototype",
          label: "Is there a working prototype",
          type: FieldType.SINGLE_SELECT,
          helpText: "Has a functional prototype been built?",
          order: 8,
          isRequired: false,
          options: [
            { value: "yes", label: "Yes", order: 1 },
            { value: "no", label: "No", order: 2 },
            { value: "in_progress", label: "In progress", order: 3 },
          ],
        },
        {
          dictionaryKey: "triage.manufacturingFeasibility",
          label: "Manufacturing feasibility known",
          type: FieldType.SINGLE_SELECT,
          helpText: "Is it clear how this would be manufactured?",
          order: 9,
          isRequired: false,
          options: [
            { value: "yes", label: "Yes", order: 1 },
            { value: "no", label: "No", order: 2 },
            { value: "not_applicable", label: "Not applicable", order: 3 },
          ],
        },
      ],
    },
    {
      code: "S2",
      title: "Strategic Alignment and Unmet Need",
      description: "Assessment of mission alignment and market need",
      order: 2,
      isRequired: true,
      questions: [
        {
          dictionaryKey: "triage.missionAlignmentText",
          label: "Describe alignment with institutional mission or strategic goals",
          type: FieldType.LONG_TEXT,
          helpText: "Explain how this technology aligns with CCHMC's mission for child health",
          placeholder: "Describe mission alignment...",
          order: 1,
          isRequired: true,
        },
        {
          dictionaryKey: "triage.missionAlignmentInfo",
          label: "Key Alignment Areas:",
          type: FieldType.SHORT_TEXT,
          helpText: "• **Improves Child Health:** Direct impact on pediatric health outcomes\n• **Transforms Delivery of Care:** Changes how care is provided or accessed\n• **POPT Goals:** Aligns with Portfolio of the Future strategic objectives",
          order: 2,
          isRequired: false,
          validation: {
            isInfoBox: true,
            infoBoxStyle: "blue"
          }
        },
        {
          dictionaryKey: "triage.missionAlignmentScore",
          label: "Mission Alignment Score",
          type: FieldType.SCORING_0_3,
          helpText: "0 = not aligned, 1 = aligns with one dimension, 2 = aligns with two, 3 = aligns with all",
          order: 3,
          isRequired: true,
          scoringConfig: {
            minScore: 0,
            maxScore: 3,
            weight: 1.0,
            criteria: {
              "0": "Not aligned with institutional mission",
              "1": "Aligns with one dimension of mission",
              "2": "Aligns with two dimensions of mission",
              "3": "Aligns with all dimensions of mission"
            }
          }
        },
        {
          dictionaryKey: "triage.unmetNeedText",
          label: "Describe the unmet clinical or market need and potential impact",
          type: FieldType.LONG_TEXT,
          helpText: "What need does this technology address and what impact could it have?",
          placeholder: "Describe the unmet need and potential impact...",
          order: 4,
          isRequired: true,
        },
        {
          dictionaryKey: "triage.clinicalUtility",
          label: "For diagnostics, state the clinical utility",
          type: FieldType.LONG_TEXT,
          helpText: "How will this diagnostic improve clinical decision-making?",
          placeholder: "Describe clinical utility for diagnostics...",
          order: 5,
          isRequired: false,
          conditional: {
            showIf: [
              { field: "tech.domainAssetClass", operator: "equals", value: "diagnostic" }
            ]
          }
        },
        {
          dictionaryKey: "triage.unmetNeedScore",
          label: "Unmet Need Score",
          type: FieldType.SCORING_0_3,
          helpText: "Use late-stage competitor count and differentiation to anchor the score",
          order: 6,
          isRequired: true,
          scoringConfig: {
            minScore: 0,
            maxScore: 3,
            weight: 1.0,
            criteria: {
              "0": "No significant unmet need or many solutions exist",
              "1": "Some unmet need with several competing solutions",
              "2": "Clear unmet need with few competing solutions",
              "3": "Significant unmet need with minimal competition"
            }
          }
        },
      ],
    },
    {
      code: "S3",
      title: "State of the Art and IP Position",
      description: "Analysis of prior art and intellectual property strength",
      order: 3,
      isRequired: true,
      questions: [
        {
          dictionaryKey: "triage.stateOfArtText",
          label: "Summarize relevant prior art and publications",
          type: FieldType.LONG_TEXT,
          helpText: "What existing technologies or research are relevant?",
          placeholder: "Describe relevant prior art...",
          order: 1,
          isRequired: true,
        },
        {
          dictionaryKey: "triage.differentiators",
          label: "Explain differentiators and why novel and non-obvious",
          type: FieldType.LONG_TEXT,
          helpText: "What makes this technology different and patentable?",
          placeholder: "Explain key differentiators...",
          order: 2,
          isRequired: true,
        },
        {
          dictionaryKey: "triage.digitalSoftwareNotes",
          label: "For digital or software, note open source use, key algorithms or UI or databases, and protectability beyond patents",
          type: FieldType.LONG_TEXT,
          helpText: "Additional IP considerations for digital technologies",
          placeholder: "Describe digital/software IP considerations...",
          order: 3,
          isRequired: false,
          conditional: {
            showIf: [
              { field: "tech.domainAssetClass", operator: "equals", value: "digital_health" }
            ]
          }
        },
        {
          dictionaryKey: "triage.ipProtectability",
          label: "Assess IP protectability and claim strength",
          type: FieldType.LONG_TEXT,
          helpText: "How strong are the potential patent claims?",
          placeholder: "Assess IP strength...",
          order: 4,
          isRequired: true,
        },
        {
          dictionaryKey: "triage.infringementDetectable",
          label: "Is infringement detectable",
          type: FieldType.SINGLE_SELECT,
          helpText: "Would it be easy to detect if someone infringed the patent?",
          order: 5,
          isRequired: false,
          options: [
            { value: "yes", label: "Yes", order: 1 },
            { value: "no", label: "No", order: 2 },
            { value: "unclear", label: "Unclear", order: 3 },
          ],
        },
        {
          dictionaryKey: "triage.designAround",
          label: "Ease of design-around",
          type: FieldType.SINGLE_SELECT,
          helpText: "How easy would it be for competitors to design around the patent?",
          order: 6,
          isRequired: false,
          options: [
            { value: "hard", label: "Hard", order: 1 },
            { value: "moderate", label: "Moderate", order: 2 },
            { value: "easy", label: "Easy", order: 3 },
            { value: "unclear", label: "Unclear", order: 4 },
          ],
        },
        {
          dictionaryKey: "triage.publicDisclosures",
          label: "Any public disclosures that may limit patentability",
          type: FieldType.LONG_TEXT,
          helpText: "Have there been any publications or public disclosures?",
          placeholder: "Describe any public disclosures...",
          order: 7,
          isRequired: false,
        },
        {
          dictionaryKey: "triage.stateOfArtScore",
          label: "IP Strength and Protectability Score",
          type: FieldType.SCORING_0_3,
          helpText: "Overall assessment of IP strength",
          order: 8,
          isRequired: true,
          scoringConfig: {
            minScore: 0,
            maxScore: 3,
            weight: 1.0,
            criteria: {
              "0": "Weak or no IP protection possible",
              "1": "Some IP protection with limitations",
              "2": "Good IP protection with moderate strength",
              "3": "Strong IP protection with broad claims"
            }
          }
        },
      ],
    },
    {
      code: "S4",
      title: "Market and Commercial Viability",
      description: "Analysis of market opportunity and competitive landscape",
      order: 4,
      isRequired: true,
      questions: [
        {
          dictionaryKey: "triage.marketOverview",
          label: "Target market overview with TAM, patient counts, key trends, regulatory path, and reimbursement notes",
          type: FieldType.LONG_TEXT,
          helpText: "Comprehensive market analysis including size, trends, and commercialization path",
          placeholder: "Provide market overview including TAM, patient population, trends...",
          order: 1,
          isRequired: true,
          validation: {
            allowHyperlinks: true
          }
        },
        {
          dictionaryKey: "triage.competitiveLandscape",
          label: "Competitive Landscape",
          type: FieldType.REPEATABLE_GROUP,
          helpText: "Add information about competing companies and their products",
          order: 2,
          isRequired: false,
        },
        {
          dictionaryKey: "triage.stakeholders",
          label: "Stakeholders",
          type: FieldType.CHECKBOX_GROUP,
          helpText: "Select all relevant stakeholders for this technology",
          order: 3,
          isRequired: false,
          options: [
            { value: "payers", label: "Payers", order: 1 },
            { value: "providers", label: "Providers", order: 2 },
            { value: "patients", label: "Patients", order: 3 },
            { value: "policymakers", label: "Policymakers", order: 4 },
            { value: "employers", label: "Employers", order: 5 },
            { value: "health_systems", label: "Health systems", order: 6 },
            { value: "other", label: "Other", order: 7 },
          ],
        },
        {
          dictionaryKey: "triage.competitionNotes",
          label: "Value proposition for each selected stakeholder",
          type: FieldType.LONG_TEXT,
          helpText: "Explain the value this technology provides to each stakeholder group",
          placeholder: "Describe value proposition for selected stakeholders...",
          order: 4,
          isRequired: false,
          conditional: {
            showIf: [
              { field: "triage.stakeholders", operator: "not_empty", value: "" }
            ]
          }
        },
        {
          dictionaryKey: "triage.marketScore",
          label: "Market Size Score",
          type: FieldType.SCORING_0_3,
          helpText: "Use the scoring table by asset class",
          order: 5,
          isRequired: true,
          scoringConfig: {
            minScore: 0,
            maxScore: 3,
            weight: 1.0,
            criteria: {
              "0": "Very small market (<$100M TAM)",
              "1": "Small market ($100M-$500M TAM)",
              "2": "Medium market ($500M-$2B TAM)",
              "3": "Large market (>$2B TAM)"
            }
          }
        },
        {
          dictionaryKey: "triage.reimbursementPath",
          label: "Patient Population or Procedural Volume Score",
          type: FieldType.SCORING_0_3,
          helpText: "0 = <200k, 1 = 200k–1M, 2 = 1M–2.5M, 3 = >2.5M",
          order: 6,
          isRequired: true,
          scoringConfig: {
            minScore: 0,
            maxScore: 3,
            weight: 1.0,
            criteria: {
              "0": "Very small population (<200k patients)",
              "1": "Small population (200k-1M patients)",
              "2": "Medium population (1M-2.5M patients)",
              "3": "Large population (>2.5M patients)"
            }
          }
        },
        {
          dictionaryKey: "triage.regulatoryPath",
          label: "Number of Competitors Score",
          type: FieldType.SCORING_0_3,
          helpText: "0 = >15 competitors, 1 = 11–15, 2 = 5–10, 3 = <5",
          order: 7,
          isRequired: true,
          scoringConfig: {
            minScore: 0,
            maxScore: 3,
            weight: 1.0,
            criteria: {
              "0": "Many competitors (>15)",
              "1": "Several competitors (11-15)",
              "2": "Few competitors (5-10)",
              "3": "Minimal competition (<5)"
            }
          }
        },
      ],
    },
    {
      code: "S5",
      title: "Inventor and Path Forward",
      description: "Assessment of inventor engagement and commercialization pathway",
      order: 5,
      isRequired: true,
      questions: [
        {
          dictionaryKey: "triage.teamMembers",
          label: "Inventor engagement and credibility assessment",
          type: FieldType.LONG_TEXT,
          helpText: "Evaluate the inventor's track record and commitment",
          placeholder: "Assess inventor engagement...",
          order: 1,
          isRequired: true,
        },
        {
          dictionaryKey: "triage.teamAssessment",
          label: "Willingness to participate in commercialization",
          type: FieldType.SINGLE_SELECT,
          helpText: "How willing is the inventor to participate in bringing this to market?",
          order: 2,
          isRequired: false,
          options: [
            { value: "high", label: "High", order: 1 },
            { value: "moderate", label: "Moderate", order: 2 },
            { value: "low", label: "Low", order: 3 },
            { value: "unknown", label: "Unknown", order: 4 },
          ],
        },
        {
          dictionaryKey: "triage.teamNotes",
          label: "Expectation realism",
          type: FieldType.SINGLE_SELECT,
          helpText: "Are the inventor's expectations realistic?",
          order: 3,
          isRequired: false,
          options: [
            { value: "realistic", label: "Realistic", order: 1 },
            { value: "needs_guidance", label: "Needs guidance", order: 2 },
            { value: "unrealistic", label: "Unrealistic", order: 3 },
            { value: "unknown", label: "Unknown", order: 4 },
          ],
        },
        {
          dictionaryKey: "triage.businessModel",
          label: "Recommended commercialization pathway",
          type: FieldType.SINGLE_SELECT,
          helpText: "What is the best path to bring this technology to market?",
          order: 4,
          isRequired: true,
          options: [
            { value: "license_established", label: "License to established company", order: 1 },
            { value: "startup_formation", label: "Startup formation", order: 2 },
            { value: "internal_development", label: "Internal development via sponsored research", order: 3 },
            { value: "not_ready", label: "Not ready", order: 4 },
            { value: "other", label: "Other", order: 5 },
          ],
        },
        {
          dictionaryKey: "triage.businessModelNotes",
          label: "Rationale for pathway recommendation",
          type: FieldType.LONG_TEXT,
          helpText: "Explain why this commercialization pathway is recommended",
          placeholder: "Provide rationale for recommended pathway...",
          order: 5,
          isRequired: true,
        },
      ],
    },
    {
      code: "S6",
      title: "Scorecard and Recommendation",
      description: "Final assessment and recommendation",
      order: 6,
      isRequired: true,
      questions: [
        {
          dictionaryKey: "triage.impactScore",
          label: "Scoring Matrix and Recommendation",
          type: FieldType.SCORING_MATRIX,
          helpText: "Automatically calculated scoring matrix based on all criteria entries from previous sections",
          order: 0,
          isRequired: false,
        },
        {
          dictionaryKey: "triage.assessmentSummary",
          label: "Summary of Assessment",
          type: FieldType.LONG_TEXT,
          helpText: "Provide an overall summary of the technology evaluation",
          placeholder: "Summarize the overall assessment...",
          order: 1,
          isRequired: true,
        },
        {
          dictionaryKey: "triage.recommendation",
          label: "Final Recommendation",
          type: FieldType.SINGLE_SELECT,
          helpText: "What is your final recommendation for this technology?",
          order: 2,
          isRequired: true,
          options: [
            { value: "proceed", label: "Proceed", order: 1 },
            { value: "consider_alternative", label: "Consider alternative pathway", order: 2 },
            { value: "close", label: "Close", order: 3 },
          ],
        },
        {
          dictionaryKey: "triage.recommendationNotes",
          label: "If not Proceed, state what data or development could change the recommendation",
          type: FieldType.LONG_TEXT,
          helpText: "What would need to change for a different recommendation?",
          placeholder: "Describe what could change the recommendation...",
          order: 3,
          isRequired: false,
          conditional: {
            showIf: [
              { field: "triage.recommendation", operator: "not_equals", value: "proceed" }
            ]
          }
        },
        {
          dictionaryKey: "triage.nextSteps",
          label: "Subject Matter Experts to Consult",
          type: FieldType.REPEATABLE_GROUP,
          helpText: "Add information about relevant subject matter experts",
          order: 4,
          isRequired: false,
        },
      ],
    },
  ],
};

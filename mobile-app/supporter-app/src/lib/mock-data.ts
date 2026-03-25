// ─── Shared mock data for UI development ─────────────────────────────────────
// These IDs match the serviceUser.id values in MOCK_VISITS in (app)/index.tsx.
// Any screen that receives one of these IDs should use this data instead of
// making live API calls.

export type MockRisk = {
  id: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  assessmentType: string;
  assessmentDetail?: string;
  controlMeasures?: string;
};

export type MockAllergy = {
  id: string;
  title: string;
  description?: string;
};

export type MockContact = {
  id: string;
  contactName: string;
  relationship?: string;
  phone?: string;
  isEmergencyContact: boolean;
};

export type MockPlan = {
  healthNeeds?: string;
  welfareNeeds?: string;
  personalCareRequirements?: string;
  howNeedsWillBeMet?: string;
};

export type MockClient = {
  firstName: string;
  lastName: string;
  risks: MockRisk[];
  allergies: MockAllergy[];
  plan: MockPlan;
  contacts: MockContact[];
};

export const MOCK_CLIENTS: Record<string, MockClient> = {
  su1: {
    firstName: "Margaret",
    lastName: "Thomson",
    risks: [
      {
        id: "r1",
        riskLevel: "HIGH",
        assessmentType: "FALLS",
        assessmentDetail: "History of falls in bathroom — fell twice in the past three months.",
        controlMeasures: "Non-slip mat fitted. Supervise all bathing. Zimmer frame to be used.",
      },
    ],
    allergies: [
      {
        id: "a1",
        title: "Penicillin",
        description: "Severe allergic reaction — do not administer. Record in notes if GP prescribes.",
      },
    ],
    plan: {
      healthNeeds: "Requires assistance with personal care and mobility. History of falls.",
      welfareNeeds: "Enjoys reading and listening to the radio. Prefers morning visits.",
      personalCareRequirements:
        "Full wash and dress assistance. Compression stockings to be applied daily.",
      howNeedsWillBeMet:
        "Morning visit with 2 carers for hoisting assistance. Use ceiling hoist in bedroom.",
    },
    contacts: [
      {
        id: "c1",
        contactName: "Susan Thomson",
        relationship: "Daughter",
        phone: "07712 345678",
        isEmergencyContact: true,
      },
    ],
  },

  su2: {
    firstName: "Donald",
    lastName: "MacLeod",
    risks: [],
    allergies: [
      {
        id: "a2",
        title: "Nuts (all varieties)",
        description: "Anaphylactic — EpiPen stored in kitchen drawer beside the kettle.",
      },
    ],
    plan: {
      healthNeeds: "Type 2 diabetes — requires blood sugar monitoring before each meal.",
      welfareNeeds: "Independent in spirit. Prefers to do as much as possible himself.",
      personalCareRequirements:
        "Independent with washing. Requires meal preparation and medication prompting.",
      howNeedsWillBeMet:
        "Lunchtime visit daily. Prepare low-sugar meals to dietitian's plan on fridge door.",
    },
    contacts: [
      {
        id: "c2",
        contactName: "Angus MacLeod",
        relationship: "Son",
        phone: "07856 123456",
        isEmergencyContact: true,
      },
    ],
  },

  su3: {
    firstName: "Agnes",
    lastName: "Cameron",
    risks: [
      {
        id: "r3a",
        riskLevel: "HIGH",
        assessmentType: "FALLS",
        assessmentDetail:
          "Assessed at high risk — two falls in one month. Unsteady gait on uneven surfaces.",
        controlMeasures:
          "Zimmer frame to be used at all times. Bed alarm in place. Do not leave unattended.",
      },
      {
        id: "r3b",
        riskLevel: "HIGH",
        assessmentType: "COGNITIVE_IMPAIRMENT",
        assessmentDetail:
          "Moderate dementia — may become confused, distressed, or not recognise carers.",
        controlMeasures:
          "Use calm, reassuring tone. Reintroduce yourself at each visit. Follow familiar routine.",
      },
    ],
    allergies: [
      {
        id: "a3",
        title: "Latex",
        description: "Contact allergy — use nitrile gloves only. No latex products in the home.",
      },
    ],
    plan: {
      healthNeeds: "Moderate dementia. Incontinence care required twice daily.",
      welfareNeeds: "Responds well to music from the 1960s. Enjoys reminiscence activities.",
      personalCareRequirements:
        "Full personal care including continence management and oral hygiene.",
      howNeedsWillBeMet:
        "Two visits per day — morning and evening. Prompting and supervision throughout all tasks.",
    },
    contacts: [
      {
        id: "c3",
        contactName: "Robert Cameron",
        relationship: "Son (Power of Attorney)",
        phone: "01463 556677",
        isEmergencyContact: true,
      },
    ],
  },

  su4: {
    firstName: "Hamish",
    lastName: "Stewart",
    risks: [],
    allergies: [],
    plan: {
      healthNeeds: "COPD — on home oxygen therapy at 2L/min. Breathlessness with exertion.",
      welfareNeeds: "Keen gardener, likes to talk about his allotment. Sense of humour.",
      personalCareRequirements:
        "Washing and dressing assistance. Do not rush — allow rest breaks as needed.",
      howNeedsWillBeMet:
        "Morning visit. Allow extra time for all tasks. Encourage slow, steady movements.",
    },
    contacts: [
      {
        id: "c4",
        contactName: "Jean Stewart",
        relationship: "Wife",
        phone: "07923 445566",
        isEmergencyContact: true,
      },
    ],
  },

  su5: {
    firstName: "Morag",
    lastName: "Fraser",
    risks: [
      {
        id: "r5",
        riskLevel: "HIGH",
        assessmentType: "MEDICATION",
        assessmentDetail:
          "Complex anticoagulant regime — warfarin requires careful monitoring. Bleeding risk.",
        controlMeasures:
          "Check INR results board before prompting medications. Contact GP if INR >3 or <1.5.",
      },
    ],
    allergies: [
      { id: "a5a", title: "Aspirin", description: "GI bleed history — do not administer." },
      { id: "a5b", title: "Ibuprofen", description: "NSAIDs contraindicated — use paracetamol only." },
    ],
    plan: {
      healthNeeds: "Atrial fibrillation on anticoagulants. Angina — GTN spray in handbag.",
      welfareNeeds: "Lives alone. Values her independence. Enjoys crosswords and the news.",
      personalCareRequirements:
        "Semi-independent — prompting and preparation support only. Encourages self-care.",
      howNeedsWillBeMet:
        "Evening visit. Medication prompting, meal preparation, and night-time routine.",
    },
    contacts: [
      {
        id: "c5",
        contactName: "Catriona Mackenzie",
        relationship: "Niece",
        phone: "07445 223344",
        isEmergencyContact: true,
      },
    ],
  },
};
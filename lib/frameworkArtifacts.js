import { FW, ORDER } from "@/lib/frameworks";

export const ARTIFACT_SCHEMA_VERSION = 1;

const BASIS = ["known", "inferred", "assumed", "missing"];
const CONFIDENCE = ["high", "medium", "low"];
const LIFECYCLE_ARTIFACT_KEYS = new Set([
  "status", "runId", "requestId", "contextSnapshotId", "inputFingerprint", "model", "webUsed",
]);

const clone = value => {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
};

const objectSchema = properties => ({
  type: "object",
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
});

const arraySchema = (items, extra = {}) => ({ type: "array", items, ...extra });
const stringSchema = (extra = {}) => ({ type: "string", ...extra });
const nullableString = (extra = {}) => ({ type: ["string", "null"], ...extra });
const nullableNumber = (extra = {}) => ({ type: ["number", "null"], ...extra });
const enumSchema = values => ({ type: "string", enum: values });

const groundingProperties = {
  basis: enumSchema(BASIS),
  confidence: enumSchema(CONFIDENCE),
  evidenceRefs: arraySchema(stringSchema()),
};

const claimSchema = (extra = {}) => objectSchema({
  text: stringSchema(),
  ...extra,
  ...groundingProperties,
});

const signalSchema = objectSchema({
  text: stringSchema(),
  impact: enumSchema(["opportunity", "threat", "mixed"]),
  horizon: enumSchema(["now", "12-month", "24-month", "long-term", "unknown"]),
  severity: nullableNumber({ minimum: 1, maximum: 5 }),
  ...groundingProperties,
});

const opportunitySchema = objectSchema({
  title: stringSchema(),
  rationale: stringSchema(),
  risk: enumSchema(["low", "medium", "high", "unknown"]),
  ...groundingProperties,
});

const initiativeSchema = objectSchema({
  name: stringSchema(),
  objective: stringSchema(),
  owner: nullableString(),
  timing: nullableString(),
  ...groundingProperties,
});

const evidenceSchema = objectSchema({
  id: stringSchema({ minLength: 1 }),
  kind: enumSchema(["intake", "upstream", "chat", "web"]),
  title: stringSchema(),
  sourceKey: nullableString(),
  artifactRevision: nullableNumber({ minimum: 1 }),
  messageId: nullableString(),
  url: nullableString(),
  retrievedAt: nullableString(),
});

const playerSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: stringSchema(),
    position: enumSchema(["leader", "entrant", "incumbent", "niche", "unknown"]),
    revenue: nullableString(),
    marketShare: nullableString(),
    growth: nullableString(),
    geography: nullableString(),
    url: nullableString(),
    ...groundingProperties,
  },
  // url is optional so existing maps without a site stay valid.
  required: ["name", "position", "revenue", "marketShare", "growth", "geography", ...Object.keys(groundingProperties)],
};

const forceSchema = objectSchema({
  score: nullableNumber({ minimum: 1, maximum: 5 }),
  direction: enumSchema(["rising", "stable", "falling", "unknown"]),
  findings: arraySchema(claimSchema()),
});

const horizonSchema = objectSchema({
  currentAllocationPct: nullableNumber({ minimum: 0, maximum: 100 }),
  targetAllocationPct: nullableNumber({ minimum: 0, maximum: 100 }),
  initiatives: arraySchema(initiativeSchema),
  rationale: stringSchema(),
  ...groundingProperties,
});

const scoreElementSchema = objectSchema({
  score: nullableNumber({ minimum: 1, maximum: 5 }),
  currentState: stringSchema(),
  targetState: stringSchema(),
  gaps: arraySchema(claimSchema()),
  actions: arraySchema(claimSchema()),
  ...groundingProperties,
});

const measureSchema = objectSchema({
  name: stringSchema(),
  baseline: nullableString(),
  target: nullableString(),
  unit: nullableString(),
  source: nullableString(),
  frequency: nullableString(),
  owner: nullableString(),
});

const objectiveSchema = objectSchema({
  objective: stringSchema(),
  measures: arraySchema(measureSchema),
  keyResults: arraySchema(claimSchema()),
  initiatives: arraySchema(initiativeSchema),
  ...groundingProperties,
});

const emptyForce = () => ({ score: null, direction: "unknown", findings: [] });
const emptyHorizon = () => ({
  currentAllocationPct: null,
  targetAllocationPct: null,
  initiatives: [],
  rationale: "",
  basis: "missing",
  confidence: "low",
  evidenceRefs: [],
});
const emptyScoreElement = () => ({
  score: null,
  currentState: "",
  targetState: "",
  gaps: [],
  actions: [],
  basis: "missing",
  confidence: "low",
  evidenceRefs: [],
});
const emptyClaim = () => ({ text: "", basis: "missing", confidence: "low", evidenceRefs: [] });

const definitions = {
  bmc: {
    view: "canvas",
    sections: [
      ["keyPartners", "Key Partnerships", "findings", "boxes.keyPartners"],
      ["keyActivities", "Key Activities", "findings", "boxes.keyActivities"],
      ["keyResources", "Key Resources", "findings", "boxes.keyResources"],
      ["valuePropositions", "Value Propositions", "findings", "boxes.valuePropositions"],
      ["customerRelationships", "Customer Relationships", "findings", "boxes.customerRelationships"],
      ["channels", "Channels", "findings", "boxes.channels"],
      ["customerSegments", "Customer Segments", "findings", "boxes.customerSegments"],
      ["costStructure", "Cost Structure", "findings", "boxes.costStructure"],
      ["revenueStreams", "Revenue Streams", "findings", "boxes.revenueStreams"],
    ],
    payloadTemplate: {
      boxes: {
        keyPartners: [], keyActivities: [], keyResources: [], valuePropositions: [],
        customerRelationships: [], channels: [], customerSegments: [], costStructure: [], revenueStreams: [],
      },
    },
    payloadSchema: objectSchema({ boxes: objectSchema({
      keyPartners: arraySchema(claimSchema()),
      keyActivities: arraySchema(claimSchema()),
      keyResources: arraySchema(claimSchema()),
      valuePropositions: arraySchema(claimSchema()),
      customerRelationships: arraySchema(claimSchema()),
      channels: arraySchema(claimSchema()),
      customerSegments: arraySchema(claimSchema()),
      costStructure: arraySchema(claimSchema()),
      revenueStreams: arraySchema(claimSchema()),
    }) }),
  },
  industrymap: {
    view: "industry-map",
    sections: [
      ["segments", "Segments & Suppliers", "findings", "map.segments"],
      ["glossary", "Glossary", "findings", "map.glossary"],
      ["expertsAndSources", "Experts & Key Sources", "findings", "map.expertsAndSources"],
      ["players", "Market Leaders & New Entrants", "players", "map.players"],
      ["technologyFlows", "Technology Flows", "findings", "map.technologyFlows"],
      ["economicFlows", "Economic Flows", "findings", "map.economicFlows"],
      ["personnelFlows", "Personnel Flows", "findings", "map.personnelFlows"],
      ["history", "How It Looked 5-10 Years Ago", "findings", "map.history"],
      ["future", "The Five-Year Map", "findings", "map.future"],
    ],
    payloadTemplate: { map: {
      segments: [], glossary: [], expertsAndSources: [], players: [],
      technologyFlows: [], economicFlows: [], personnelFlows: [], history: [], future: [],
    } },
    payloadSchema: objectSchema({ map: objectSchema({
      segments: arraySchema(claimSchema()),
      glossary: arraySchema(claimSchema()),
      expertsAndSources: arraySchema(claimSchema()),
      players: arraySchema(playerSchema),
      technologyFlows: arraySchema(claimSchema()),
      economicFlows: arraySchema(claimSchema()),
      personnelFlows: arraySchema(claimSchema()),
      history: arraySchema(claimSchema()),
      future: arraySchema(claimSchema()),
    }) }),
  },
  fiveforces: {
    view: "force-map",
    sections: [
      ["rivalry", "Competitive Rivalry", "force", "forces.rivalry"],
      ["newEntrants", "Threat of New Entrants", "force", "forces.newEntrants"],
      ["substitutes", "Threat of Substitutes", "force", "forces.substitutes"],
      ["buyerPower", "Buyer Power", "force", "forces.buyerPower"],
      ["supplierPower", "Supplier Power", "force", "forces.supplierPower"],
      ["dominantPressure", "Dominant Pressure", "finding", "dominantPressure"],
      ["strategicImplications", "Strategic Implications", "findings", "strategicImplications"],
    ],
    payloadTemplate: {
      forces: {
        rivalry: emptyForce(), newEntrants: emptyForce(), substitutes: emptyForce(),
        buyerPower: emptyForce(), supplierPower: emptyForce(),
      },
      dominantPressure: emptyClaim(),
      strategicImplications: [],
    },
    payloadSchema: objectSchema({
      forces: objectSchema({
        rivalry: forceSchema, newEntrants: forceSchema, substitutes: forceSchema,
        buyerPower: forceSchema, supplierPower: forceSchema,
      }),
      dominantPressure: claimSchema(),
      strategicImplications: arraySchema(claimSchema()),
    }),
  },
  pestle: {
    view: "matrix",
    sections: [
      ["political", "Political", "signals", "factors.political"],
      ["economic", "Economic", "signals", "factors.economic"],
      ["social", "Social", "signals", "factors.social"],
      ["technological", "Technological", "signals", "factors.technological"],
      ["legal", "Legal", "signals", "factors.legal"],
      ["environmental", "Environmental", "signals", "factors.environmental"],
    ],
    payloadTemplate: { factors: {
      political: [], economic: [], social: [], technological: [], legal: [], environmental: [],
    } },
    payloadSchema: objectSchema({ factors: objectSchema({
      political: arraySchema(signalSchema), economic: arraySchema(signalSchema), social: arraySchema(signalSchema),
      technological: arraySchema(signalSchema), legal: arraySchema(signalSchema), environmental: arraySchema(signalSchema),
    }) }),
  },
  swot: {
    view: "matrix",
    sections: [
      ["strengths", "Strengths", "findings", "quadrants.strengths"],
      ["weaknesses", "Weaknesses", "findings", "quadrants.weaknesses"],
      ["opportunities", "Opportunities", "findings", "quadrants.opportunities"],
      ["threats", "Threats", "findings", "quadrants.threats"],
      ["so", "SO Strategies", "findings", "tows.so"],
      ["st", "ST Strategies", "findings", "tows.st"],
      ["wo", "WO Strategies", "findings", "tows.wo"],
      ["wt", "WT Strategies", "findings", "tows.wt"],
    ],
    payloadTemplate: {
      quadrants: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      tows: { so: [], st: [], wo: [], wt: [] },
    },
    payloadSchema: objectSchema({
      quadrants: objectSchema({
        strengths: arraySchema(claimSchema()), weaknesses: arraySchema(claimSchema()),
        opportunities: arraySchema(claimSchema()), threats: arraySchema(claimSchema()),
      }),
      tows: objectSchema({
        so: arraySchema(claimSchema()), st: arraySchema(claimSchema()),
        wo: arraySchema(claimSchema()), wt: arraySchema(claimSchema()),
      }),
    }),
  },
  vrio: {
    view: "table",
    sections: [
      ["capabilities", "Capability Gate Scores", "rows", "capabilities"],
      ["moatShortlist", "Defensible Advantage Shortlist", "strings", "moatShortlist"],
    ],
    table: {
      path: "capabilities",
      columns: [
        ["name", "Capability"], ["valuable", "V"], ["rare", "R"],
        ["inimitable", "I"], ["organized", "O"], ["outcome", "Outcome"],
      ],
    },
    payloadTemplate: { capabilities: [], moatShortlist: [] },
    payloadSchema: objectSchema({
      capabilities: arraySchema(objectSchema({
        name: stringSchema(),
        valuable: enumSchema(["yes", "no", "unknown"]),
        rare: enumSchema(["yes", "no", "unknown"]),
        inimitable: enumSchema(["yes", "no", "unknown"]),
        organized: enumSchema(["yes", "no", "unknown"]),
        outcome: enumSchema(["disadvantage", "parity", "temporary", "unused", "sustained", "unknown"]),
        rationale: stringSchema(),
        ...groundingProperties,
      })),
      moatShortlist: arraySchema(stringSchema()),
    }),
  },
  ansoff: {
    view: "matrix",
    sections: [
      ["marketPenetration", "Market Penetration", "opportunities", "quadrants.marketPenetration"],
      ["marketDevelopment", "Market Development", "opportunities", "quadrants.marketDevelopment"],
      ["productDevelopment", "Product Development", "opportunities", "quadrants.productDevelopment"],
      ["diversification", "Diversification", "opportunities", "quadrants.diversification"],
      ["selectedVector", "Selected Growth Vector", "finding", "selectedVector"],
    ],
    payloadTemplate: {
      quadrants: { marketPenetration: [], marketDevelopment: [], productDevelopment: [], diversification: [] },
      selectedVector: { quadrant: "unknown", ...emptyClaim() },
    },
    payloadSchema: objectSchema({
      quadrants: objectSchema({
        marketPenetration: arraySchema(opportunitySchema), marketDevelopment: arraySchema(opportunitySchema),
        productDevelopment: arraySchema(opportunitySchema), diversification: arraySchema(opportunitySchema),
      }),
      selectedVector: claimSchema({ quadrant: enumSchema([
        "marketPenetration", "marketDevelopment", "productDevelopment", "diversification", "unknown",
      ]) }),
    }),
  },
  threehorizons: {
    view: "timeline",
    sections: [
      ["h1", "Horizon 1 - Defend and Extend", "horizon", "horizons.h1"],
      ["h2", "Horizon 2 - Build Emerging", "horizon", "horizons.h2"],
      ["h3", "Horizon 3 - Create Options", "horizon", "horizons.h3"],
    ],
    payloadTemplate: { horizons: { h1: emptyHorizon(), h2: emptyHorizon(), h3: emptyHorizon() } },
    payloadSchema: objectSchema({ horizons: objectSchema({ h1: horizonSchema, h2: horizonSchema, h3: horizonSchema }) }),
  },
  blueocean: {
    view: "matrix",
    sections: [
      ["eliminate", "Eliminate", "findings", "errc.eliminate"],
      ["reduce", "Reduce", "findings", "errc.reduce"],
      ["raise", "Raise", "findings", "errc.raise"],
      ["create", "Create", "findings", "errc.create"],
      ["valueCurve", "Value Curve", "rows", "valueCurve"],
      ["selectedCurve", "Selected Curve", "finding", "selectedCurve"],
    ],
    payloadTemplate: {
      errc: { eliminate: [], reduce: [], raise: [], create: [] },
      valueCurve: [],
      selectedCurve: emptyClaim(),
    },
    payloadSchema: objectSchema({
      errc: objectSchema({
        eliminate: arraySchema(claimSchema()), reduce: arraySchema(claimSchema()),
        raise: arraySchema(claimSchema()), create: arraySchema(claimSchema()),
      }),
      valueCurve: arraySchema(objectSchema({
        factor: stringSchema(),
        currentScore: nullableNumber({ minimum: 0, maximum: 10 }),
        proposedScore: nullableNumber({ minimum: 0, maximum: 10 }),
        competitorScore: nullableNumber({ minimum: 0, maximum: 10 }),
        ...groundingProperties,
      })),
      selectedCurve: claimSchema(),
    }),
  },
  jtbd: {
    view: "table",
    sections: [["jobs", "Ranked Customer Jobs", "rows", "jobs"]],
    table: {
      path: "jobs",
      columns: [["rank", "Rank"], ["statement", "Job"], ["desiredOutcome", "Desired Outcome"], ["confidence", "Confidence"]],
    },
    payloadTemplate: { jobs: [] },
    payloadSchema: objectSchema({
      jobs: arraySchema(objectSchema({
        rank: { type: "number", minimum: 1 },
        statement: stringSchema(),
        situation: stringSchema(),
        motivation: stringSchema(),
        desiredOutcome: stringSchema(),
        pains: arraySchema(stringSchema()),
        gains: arraySchema(stringSchema()),
        receipts: arraySchema(stringSchema()),
        ...groundingProperties,
      })),
    }),
  },
  vpc: {
    view: "paired-canvas",
    sections: [
      ["customerJobs", "Customer Jobs", "findings", "customerProfile.jobs"],
      ["customerPains", "Customer Pains", "findings", "customerProfile.pains"],
      ["customerGains", "Customer Gains", "findings", "customerProfile.gains"],
      ["productsServices", "Products and Services", "findings", "valueMap.productsServices"],
      ["painRelievers", "Pain Relievers", "findings", "valueMap.painRelievers"],
      ["gainCreators", "Gain Creators", "findings", "valueMap.gainCreators"],
      ["fitLinks", "Evidence of Fit", "rows", "fitLinks"],
      ["gaps", "Fit Gaps", "findings", "gaps"],
    ],
    payloadTemplate: {
      customerProfile: { jobs: [], pains: [], gains: [] },
      valueMap: { productsServices: [], painRelievers: [], gainCreators: [] },
      fitLinks: [],
      gaps: [],
    },
    payloadSchema: objectSchema({
      customerProfile: objectSchema({
        jobs: arraySchema(claimSchema()), pains: arraySchema(claimSchema()), gains: arraySchema(claimSchema()),
      }),
      valueMap: objectSchema({
        productsServices: arraySchema(claimSchema()), painRelievers: arraySchema(claimSchema()), gainCreators: arraySchema(claimSchema()),
      }),
      fitLinks: arraySchema(objectSchema({
        customerItem: stringSchema(), valueItem: stringSchema(),
        strength: enumSchema(["strong", "partial", "weak", "unknown"]),
        reason: stringSchema(),
        ...groundingProperties,
      })),
      gaps: arraySchema(claimSchema()),
    }),
  },
  kano: {
    view: "table",
    sections: [
      ["features", "Feature Classification", "rows", "features"],
      ["buildOrder", "Recommended Build Order", "strings", "buildOrder"],
    ],
    table: {
      path: "features",
      columns: [["priority", "Priority"], ["name", "Feature"], ["category", "Kano Class"], ["satisfactionImpact", "Impact"]],
    },
    payloadTemplate: { features: [], buildOrder: [] },
    payloadSchema: objectSchema({
      features: arraySchema(objectSchema({
        name: stringSchema(),
        category: enumSchema(["must-be", "performance", "delighter", "indifferent", "reverse", "unknown"]),
        priority: nullableNumber({ minimum: 1 }),
        satisfactionImpact: stringSchema(),
        rationale: stringSchema(),
        ...groundingProperties,
      })),
      buildOrder: arraySchema(stringSchema()),
    }),
  },
  sevens: {
    view: "scorecard",
    sections: [
      ["strategy", "Strategy", "score-element", "elements.strategy"],
      ["structure", "Structure", "score-element", "elements.structure"],
      ["systems", "Systems", "score-element", "elements.systems"],
      ["sharedValues", "Shared Values", "score-element", "elements.sharedValues"],
      ["style", "Style", "score-element", "elements.style"],
      ["staff", "Staff", "score-element", "elements.staff"],
      ["skills", "Skills", "score-element", "elements.skills"],
      ["keyMisalignments", "Key Misalignments", "findings", "keyMisalignments"],
    ],
    payloadTemplate: {
      elements: {
        strategy: emptyScoreElement(), structure: emptyScoreElement(), systems: emptyScoreElement(),
        sharedValues: emptyScoreElement(), style: emptyScoreElement(), staff: emptyScoreElement(), skills: emptyScoreElement(),
      },
      keyMisalignments: [],
    },
    payloadSchema: objectSchema({
      elements: objectSchema({
        strategy: scoreElementSchema, structure: scoreElementSchema, systems: scoreElementSchema,
        sharedValues: scoreElementSchema, style: scoreElementSchema, staff: scoreElementSchema, skills: scoreElementSchema,
      }),
      keyMisalignments: arraySchema(claimSchema()),
    }),
  },
  bsc: {
    view: "scorecard",
    sections: [
      ["financial", "Financial", "objectives", "perspectives.financial"],
      ["customer", "Customer", "objectives", "perspectives.customer"],
      ["internal", "Internal Process", "objectives", "perspectives.internal"],
      ["learning", "Learning and Growth", "objectives", "perspectives.learning"],
    ],
    payloadTemplate: { perspectives: { financial: [], customer: [], internal: [], learning: [] } },
    payloadSchema: objectSchema({ perspectives: objectSchema({
      financial: arraySchema(objectiveSchema), customer: arraySchema(objectiveSchema),
      internal: arraySchema(objectiveSchema), learning: arraySchema(objectiveSchema),
    }) }),
  },
  toc: {
    view: "workflow",
    sections: [
      ["constraint", "The Constraint", "constraint", "constraint"],
      ["identify", "1. Identify", "finding", "focusingSteps.identify"],
      ["exploit", "2. Exploit", "findings", "focusingSteps.exploit"],
      ["subordinate", "3. Subordinate", "findings", "focusingSteps.subordinate"],
      ["elevate", "4. Elevate", "findings", "focusingSteps.elevate"],
      ["repeat", "5. Repeat", "findings", "focusingSteps.repeat"],
      ["interventions", "Ranked Interventions", "rows", "interventions"],
    ],
    payloadTemplate: {
      constraint: {
        text: "", type: "unknown", location: "", throughputMetric: "",
        basis: "missing", confidence: "low", evidenceRefs: [],
      },
      focusingSteps: { identify: emptyClaim(), exploit: [], subordinate: [], elevate: [], repeat: [] },
      interventions: [],
    },
    payloadSchema: objectSchema({
      constraint: claimSchema({
        type: enumSchema(["market", "capacity", "policy", "skill", "demand", "other", "unknown"]),
        location: stringSchema(), throughputMetric: stringSchema(),
      }),
      focusingSteps: objectSchema({
        identify: claimSchema(), exploit: arraySchema(claimSchema()), subordinate: arraySchema(claimSchema()),
        elevate: arraySchema(claimSchema()), repeat: arraySchema(claimSchema()),
      }),
      interventions: arraySchema(objectSchema({
        rank: { type: "number", minimum: 1 },
        action: stringSchema(),
        expectedThroughputEffect: stringSchema(),
        owner: nullableString(),
        leadingMetric: nullableString(),
        ...groundingProperties,
      })),
    }),
  },
  raci: {
    view: "table",
    sections: [
      ["roles", "Roles", "rows", "roles"],
      ["workItems", "RACI Work Matrix", "rows", "workItems"],
      ["approvalGates", "Approval Gates", "findings", "approvalGates"],
      ["attestations", "Attestations", "findings", "attestations"],
    ],
    payloadTemplate: { roles: [], workItems: [], approvalGates: [], attestations: [] },
    payloadSchema: objectSchema({
      roles: arraySchema(objectSchema({
        id: stringSchema(), name: stringSchema(), title: stringSchema(), type: enumSchema(["human", "agent"]),
      })),
      workItems: arraySchema(objectSchema({
        id: stringSchema(), name: stringSchema(), interventionRef: nullableString(),
        assignments: arraySchema(objectSchema({
          roleId: stringSchema(), code: enumSchema(["R", "A", "C", "I"]),
        })),
        capabilityEnvelope: objectSchema({
          allowedActions: arraySchema(stringSchema()), systems: arraySchema(stringSchema()),
          dataScopes: arraySchema(stringSchema()), limits: arraySchema(stringSchema()),
        }),
        ...groundingProperties,
      })),
      approvalGates: arraySchema(claimSchema()),
      attestations: arraySchema(claimSchema()),
    }),
  },
};

const section = values => ({ id: values[0], label: values[1], kind: values[2], path: values[3] });

export const ARTIFACT_DEFINITIONS = Object.fromEntries(ORDER.map(id => {
  const definition = definitions[id];
  return [id, {
    id,
    name: FW[id].name,
    view: definition.view,
    sections: definition.sections.map(section),
    payloadTemplate: clone(definition.payloadTemplate),
    payloadSchema: clone(definition.payloadSchema),
    ...(definition.table ? { table: clone(definition.table) } : {}),
  }];
}));

export function getArtifactDefinition(frameworkId) {
  return ARTIFACT_DEFINITIONS[frameworkId] || null;
}

export function getArtifactJsonSchema(frameworkId) {
  const definition = getArtifactDefinition(frameworkId);
  if (!definition) return null;
  return objectSchema({
    schemaVersion: { type: "number", const: ARTIFACT_SCHEMA_VERSION },
    frameworkId: { type: "string", const: frameworkId },
    revision: { type: "number", minimum: 1 },
    title: stringSchema(),
    summary: stringSchema(),
    payload: clone(definition.payloadSchema),
    evidence: arraySchema(evidenceSchema),
    assumptions: arraySchema(claimSchema()),
    gaps: arraySchema(claimSchema()),
    nextQuestions: arraySchema(stringSchema()),
    generatedAt: nullableString(),
  });
}

export function createFrameworkArtifact(frameworkId, overrides = {}) {
  const definition = getArtifactDefinition(frameworkId);
  if (!definition) {
    return {
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      frameworkId: frameworkId || "unknown",
      revision: 1,
      title: "Framework output",
      summary: "",
      payload: {},
      evidence: [], assumptions: [], gaps: [], nextQuestions: [],
      generatedAt: null,
      ...clone(overrides),
    };
  }
  return {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    frameworkId,
    revision: 1,
    title: definition.name,
    summary: "",
    payload: clone(definition.payloadTemplate),
    evidence: [],
    assumptions: [],
    gaps: [],
    nextQuestions: [],
    generatedAt: null,
    ...clone(overrides),
  };
}

function parseArtifactInput(value) {
  if (value && typeof value === "object") {
    const unwrapped = value.artifact && typeof value.artifact === "object" ? value.artifact : value;
    return { parsed: clone(unwrapped), legacyText: "", parseError: "" };
  }
  if (typeof value !== "string") return { parsed: null, legacyText: "", parseError: "Artifact is not an object or JSON string." };
  const text = value.trim();
  if (!text) return { parsed: null, legacyText: "", parseError: "Artifact is empty." };
  const unfenced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return { parsed: JSON.parse(unfenced), legacyText: "", parseError: "" };
  } catch {
    return { parsed: null, legacyText: text, parseError: "Artifact is legacy text or malformed JSON." };
  }
}

function mergeTemplate(template, value) {
  if (Array.isArray(template)) return Array.isArray(value) ? clone(value) : clone(template);
  if (template && typeof template === "object") {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const merged = { ...clone(source) };
    Object.keys(template).forEach(key => { merged[key] = mergeTemplate(template[key], source[key]); });
    return merged;
  }
  return value === undefined || value === null ? template : value;
}

export function normalizeFrameworkArtifact(value, expectedFrameworkId) {
  const input = parseArtifactInput(value);
  const parsed = input.parsed;
  const inferredId = expectedFrameworkId || parsed?.frameworkId || "unknown";
  const definition = getArtifactDefinition(inferredId);
  if (parsed?.frameworkId && expectedFrameworkId && parsed.frameworkId !== expectedFrameworkId) {
    return {
      ...createFrameworkArtifact(expectedFrameworkId),
      rawArtifact: clone(parsed),
      normalizationWarning: `Artifact frameworkId ${parsed.frameworkId} does not match ${expectedFrameworkId}.`,
    };
  }
  if (!parsed || !definition) {
    const fallback = createFrameworkArtifact(inferredId);
    return {
      ...fallback,
      summary: parsed?.summary || "",
      payload: parsed?.payload && typeof parsed.payload === "object" ? clone(parsed.payload) : fallback.payload,
      ...(input.legacyText ? { legacyText: input.legacyText } : {}),
      ...(input.parseError ? { normalizationWarning: input.parseError } : {}),
      ...(!definition && parsed ? { rawArtifact: clone(parsed) } : {}),
    };
  }

  let source = parsed;
  if (!parsed.payload && !parsed.frameworkId && expectedFrameworkId) source = { payload: parsed };
  const base = createFrameworkArtifact(inferredId);
  return {
    ...base,
    ...clone(source),
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    frameworkId: inferredId,
    revision: Number.isFinite(Number(source.revision)) && Number(source.revision) > 0 ? Number(source.revision) : 1,
    title: typeof source.title === "string" && source.title.trim() ? source.title : base.title,
    summary: typeof source.summary === "string" ? source.summary : "",
    payload: mergeTemplate(definition.payloadTemplate, source.payload),
    evidence: Array.isArray(source.evidence) ? clone(source.evidence) : [],
    assumptions: Array.isArray(source.assumptions) ? clone(source.assumptions) : [],
    gaps: Array.isArray(source.gaps) ? clone(source.gaps) : [],
    nextQuestions: Array.isArray(source.nextQuestions) ? clone(source.nextQuestions) : [],
    generatedAt: typeof source.generatedAt === "string" ? source.generatedAt : null,
  };
}

function typeMatches(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

function validateAgainstSchema(value, schema, path, errors) {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (schema.type && !types.some(type => typeMatches(value, type))) {
    errors.push(`${path} must be ${types.join(" or ")}.`);
    return;
  }
  if (schema.const !== undefined && value !== schema.const) errors.push(`${path} must equal ${JSON.stringify(schema.const)}.`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path} must be one of ${schema.enum.join(", ")}.`);
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} must be at least ${schema.minimum}.`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path} must be at most ${schema.maximum}.`);
  }
  if (typeof value === "string" && schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push(`${path} must not be empty.`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path} needs at least ${schema.minItems} item(s).`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path} allows at most ${schema.maxItems} item(s).`);
    if (schema.items) value.forEach((item, index) => validateAgainstSchema(item, schema.items, `${path}[${index}]`, errors));
  }
  if (value && typeof value === "object" && !Array.isArray(value) && schema.properties) {
    (schema.required || []).forEach(key => {
      if (!Object.prototype.hasOwnProperty.call(value, key)) errors.push(`${path}.${key} is required.`);
    });
    Object.entries(schema.properties).forEach(([key, child]) => {
      if (Object.prototype.hasOwnProperty.call(value, key)) validateAgainstSchema(value[key], child, `${path}.${key}`, errors);
    });
    if (schema.additionalProperties === false) {
      Object.keys(value).filter(key => !Object.prototype.hasOwnProperty.call(schema.properties, key))
        .forEach(key => errors.push(`${path}.${key} is not allowed.`));
    }
  }
}

export function getArtifactValue(artifact, path) {
  return String(path || "").split(".").filter(Boolean).reduce((value, key) => value?.[key], artifact?.payload);
}

// Today's limiting factor is the existing ToC claim: payload.constraint.text.
// Missing ToC, other frameworks, or a blank text field → no line.
export function currentConstraintLine(tocArtifact) {
  if (!tocArtifact || typeof tocArtifact !== "object") return "";
  const normalized = normalizeFrameworkArtifact(tocArtifact, "toc");
  if (normalized.frameworkId !== "toc") return "";
  return String(normalized.payload?.constraint?.text || "").trim();
}

export function getArtifactSections(frameworkId, artifact) {
  const definition = getArtifactDefinition(frameworkId);
  if (!definition) return [];
  return definition.sections.map(sectionItem => ({
    ...clone(sectionItem),
    frameworkId,
    ...(artifact ? { data: clone(getArtifactValue(artifact, sectionItem.path)) } : {}),
  }));
}

function hasMeaningfulContent(value) {
  if (Array.isArray(value)) return value.some(hasMeaningfulContent);
  if (typeof value === "string") return Boolean(value.trim()) && !["unknown", "missing"].includes(value.trim().toLowerCase());
  if (typeof value === "number") return true;
  if (!value || typeof value !== "object") return false;
  if (value.basis === "missing") return false;
  if (typeof value.text === "string" && value.text.trim()) return value.basis !== "missing";
  return Object.entries(value).some(([key, child]) => !["basis", "confidence", "evidenceRefs"].includes(key) && hasMeaningfulContent(child));
}

function collectEvidenceRefs(value, refs = []) {
  if (Array.isArray(value)) value.forEach(item => collectEvidenceRefs(item, refs));
  else if (value && typeof value === "object") {
    if (Array.isArray(value.evidenceRefs)) refs.push(...value.evidenceRefs);
    Object.values(value).forEach(child => collectEvidenceRefs(child, refs));
  }
  return refs;
}

function validateRaci(artifact, errors) {
  if (artifact.frameworkId !== "raci") return;
  const roleIds = new Set((artifact.payload.roles || []).map(role => role.id));
  (artifact.payload.workItems || []).forEach((item, index) => {
    const assignments = Array.isArray(item.assignments) ? item.assignments : [];
    const accountable = assignments.filter(assignment => assignment.code === "A");
    const responsible = assignments.filter(assignment => assignment.code === "R");
    if (accountable.length !== 1) errors.push(`$.payload.workItems[${index}] must have exactly one Accountable role.`);
    if (!responsible.length) errors.push(`$.payload.workItems[${index}] must have at least one Responsible role.`);
    assignments.forEach((assignment, assignmentIndex) => {
      if (!roleIds.has(assignment.roleId)) errors.push(`$.payload.workItems[${index}].assignments[${assignmentIndex}].roleId does not resolve.`);
    });
  });
}

export function validateFrameworkArtifact(value, expectedFrameworkId, options = {}) {
  const input = parseArtifactInput(value);
  const artifact = normalizeFrameworkArtifact(value, expectedFrameworkId);
  const errors = [];
  const warnings = [];
  if (input.parseError) errors.push(input.parseError);
  const actualId = input.parsed?.frameworkId || expectedFrameworkId;
  if (!actualId || !getArtifactDefinition(actualId)) errors.push(`Unknown framework id: ${actualId || "missing"}.`);
  if (expectedFrameworkId && input.parsed?.frameworkId && input.parsed.frameworkId !== expectedFrameworkId) {
    errors.push(`Artifact frameworkId ${input.parsed.frameworkId} does not match ${expectedFrameworkId}.`);
  }
  const schema = getArtifactJsonSchema(actualId);
  if (schema && input.parsed) {
    const schemaCandidate = Object.fromEntries(Object.entries(input.parsed)
      .filter(([key]) => !LIFECYCLE_ARTIFACT_KEYS.has(key)));
    validateAgainstSchema(schemaCandidate, schema, "$", errors);
  }

  const definition = getArtifactDefinition(artifact.frameworkId);
  if (definition) {
    definition.sections.forEach(sectionItem => {
      const data = getArtifactValue(artifact, sectionItem.path);
      if (!hasMeaningfulContent(data)) {
        const message = `${sectionItem.label} has no supported content.`;
        if (options.requireContent) errors.push(message); else warnings.push(message);
      }
    });
  }

  const evidenceIdCounts = new Map();
  (artifact.evidence || []).forEach(item => {
    if (!item?.id) return;
    evidenceIdCounts.set(item.id, (evidenceIdCounts.get(item.id) || 0) + 1);
  });
  const duplicateEvidenceIds = [...evidenceIdCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
  duplicateEvidenceIds.forEach(id => errors.push(`Evidence id ${id} is duplicated.`));

  const evidenceIds = new Set(evidenceIdCounts.keys());
  const groundedClaims = [artifact.payload, artifact.assumptions, artifact.gaps];
  const unresolved = [...new Set(collectEvidenceRefs(groundedClaims).filter(ref => !evidenceIds.has(ref)))];
  unresolved.forEach(ref => {
    const message = `Evidence reference ${ref} does not resolve.`;
    if (options.requireContent) errors.push(message); else warnings.push(message);
  });
  validateRaci(artifact, errors);
  return { valid: errors.length === 0, errors, warnings, artifact };
}

import type { Timestamp } from "firebase/firestore";

export type Level = "grund" | "avancerad" | "forskar";

export const CURRENT_CONSENT_VERSION = 1;

export type ConsentState = {
  telemetryAccepted: boolean;
  feedbackInformedAccepted: boolean;
  contactAccepted: boolean;
  acceptedAt: Timestamp;
  consentVersion: number;
};

export interface ExamDesignInput {
  learningOutcomes: string;
  level: Level;
  subject: string;
  courseContext?: string;
  existingExamination?: string;
  constraints?: string;
}

export interface ExamDesignResult {
  summary: string;
  context: {
    subject: string;
    level: Level;
    learningOutcomes: string[];
    courseContext: string;
    constraints: string[];
  };
  artefact: {
    name: string;
    description: string;
    rationale: string;
  };
  productDimension: {
    included: boolean;
    rationale: string;
    criterion: string | null;
    indicators: string[];
    evidence: string[];
    taxonomySupport: string | null;
  };
  processDimension: {
    included: boolean;
    rationale: string;
    level: "operativ" | "återkopplings" | "disciplinär" | null;
    criterion: string | null;
    indicators: string[];
    evidence: string[];
  };
  agencyDimension: {
    included: boolean;
    rationale: string;
    level: "individuell" | "relationell" | "epistemisk" | null;
    criterion: string | null;
    indicators: string[];
    evidence: string[];
    interrogativeElement: string | null;
  };
  complementaryEvidence: Array<{
    type: string;
    purpose: string;
    specification: string;
  }>;
  inferenceCheck: {
    passes: boolean;
    reasoning: string;
    revisions: string | null;
  };
  programmaticSuggestions: string | null;
  pitfallsAvoided: string[];
  openQuestions: Array<string | null>;
}

export interface GenerateExamDesignResponse {
  designId: string;
  result: ExamDesignResult;
}

export type DimensionFeedback = {
  levelReasonable: boolean | null;
  inferenceBears: boolean | null;
  comment: string;
};

export type PitfallId =
  | "pseudo_agens"
  | "dokumentationsfetisch"
  | "vardering"
  | "taxonomi_dominans"
  | "pseudo_autenticitet"
  | "triptyk_tvang"
  | "annan";

export type WouldUseAs = "som_ar" | "mindre_just" | "stora_just" | "nej";

export interface FeedbackInput {
  designId: string;
  overall: {
    usefulness: 1 | 2 | 3 | 4 | 5;
    freetext: string;
  };
  dimensions: {
    product: DimensionFeedback | null;
    process: DimensionFeedback | null;
    agency: DimensionFeedback | null;
  };
  pitfallsIdentified: PitfallId[];
  pitfallsOther: string;
  editsBeforeUse: string;
  wouldUseAs: WouldUseAs;
  contactConsent: boolean;
}

export interface SubmitFeedbackResponse {
  feedbackId: string;
}

export type AccessDeniedReason =
  | "not_authenticated"
  | "no_email"
  | "not_on_allowlist";

export interface CheckAccessResponse {
  allowed: boolean;
  reason?: AccessDeniedReason;
}

export interface RedeemInviteCodeResponse {
  success: boolean;
  alreadyAllowed?: boolean;
}

export interface IsAdminResponse {
  isAdmin: boolean;
}

export interface AdminFeedbackRecord {
  id: string;
  timestamp?: string;
  designId?: string;
  designSnapshot?: unknown;
  feedback?: FeedbackInput;
  contactUid?: string | null;
}

export interface AdminStatsResponse {
  totalDesigns: number;
  totalFeedback: number;
  last7DaysActivity: number;
  averageUsefulness: number | null;
  usefulnessDistribution: Record<string, number>;
  pitfallDistribution: Record<string, number>;
  feedbackRecords: AdminFeedbackRecord[];
  inviteCodes: AdminInviteCode[];
}

export interface AdminExportResponse {
  format: "json" | "csv";
  content: string;
}

export interface AdminInviteCode {
  id: string;
  code: string;
  label: string;
  maxUses: number;
  useCount: number;
  createdAt?: string;
  expiresAt?: string;
  usedAt?: string;
}

export interface CreateInviteCodeInput {
  label?: string;
  maxUses: number;
  expiresAt?: string;
}

export interface CreateInviteCodeResponse {
  inviteCode: AdminInviteCode;
}

export interface StoredDesign {
  id: string;
  createdAt?: Timestamp;
  input: ExamDesignInput;
  output: ExamDesignResult;
  model: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

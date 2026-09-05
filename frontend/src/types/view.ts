import type {
  AttentionThresholdWire,
  ChatModeWire,
  EligibilityStatusWire,
  GovernmentPeriodWire,
  GovernmentRegionWire,
  GovernmentTopicWire,
  LearningSubjectWire,
  LearningTopicWire,
  ResourceCategoryWire,
  ResponseTypeWire,
  RoleWire,
  RuntimeModeWire,
  StudentLearningStatusWire,
  TeacherClassWire,
  TeacherPeriodWire,
  TeacherSubjectWire,
} from "./wire";

export interface DemoSessionInput {
  accessCode?: string;
  role?: RoleWire;
}

export interface SessionIdentityView {
  userId: string;
  role: RoleWire;
  displayName: string;
  scopeLabel: string | null;
}

export interface SessionView {
  expiresAt: string;
  runtimeMode: RuntimeModeWire;
  session: SessionIdentityView;
}

export interface SessionResponseView extends SessionView {
  accessToken: string;
  tokenType: "Bearer";
}

export interface UsageView {
  period: "day";
  limit: number;
  used: number;
  reserved: number;
  remaining: number;
  resetAt: string;
}

export interface SourceView {
  sourceId: string;
  sourceType: "curriculum" | "policy";
  title: string;
  publisher: string | null;
  chapter: string | null;
  page: string | null;
  excerpt: string;
  url: string | null;
  queryHint: string | null;
  updatedAt: string | null;
  /** Existing learning modal compatibility alias for sourceId. */
  id: string;
  /** Existing learning modal compatibility alias for excerpt. */
  content: string;
}

export interface LearningStepView {
  title: string;
  body: string;
  sourceIds: string[];
}

export interface LearningPracticeView {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface LearningFollowUpView {
  question: string;
  title: string | null;
}

export interface LearningScenarioView {
  scenarioId: LearningTopicWire | null;
  animationTopic: LearningTopicWire | null;
  /** Safe existing-animation selector; null means do not render an animation. */
  id: LearningTopicWire | null;
  /** Preserves a contract-violating value without treating it as an animation key. */
  unrecognizedScenarioId: string | null;
  /** Preserves a contract-violating value without treating it as an animation key. */
  unrecognizedAnimationTopic: string | null;
  subject: LearningSubjectWire | null;
  title: string;
  subtitle: string | null;
  summary: string;
  formula: string | null;
  formulaNote: string | null;
  steps: LearningStepView[];
  analogy: string | null;
  misconception: string | null;
  sourceIds: string[];
  practice: LearningPracticeView | null;
  followUps: LearningFollowUpView[];
}

export interface EligibilityCheckView {
  status: "matched" | "needs_confirmation";
  text: string;
}

export interface ResourceRequirementView {
  kind: "matched" | "confirm";
  text: string;
}

export interface ResourceRecommendationView {
  programId: string;
  category: ResourceCategoryWire;
  title: string;
  agency: string;
  summary: string;
  eligibilityStatus: EligibilityStatusWire | null;
  eligibilityChecks: EligibilityCheckView[];
  /** Presentation-only alias used by the existing requirement rows. */
  requirements: ResourceRequirementView[];
  reasons: string[];
  missingConditions: string[];
  applicationWindow: string | null;
  documents: string[];
  deadline: string | null;
  nextStep: string | null;
  sourceNote: string | null;
  sourceIds: string[];
  sources: SourceView[];
}

export interface MemorySuggestionView {
  suggestionId: string;
  key: string;
  value: string;
  displayValue: string;
  reason: string | null;
  expiresAt: string;
}

export interface AlertActionView {
  kind: "resource" | "conversation" | "learning_topic";
  targetId: string | null;
  label: string;
}

export interface AlertView {
  alertId: string;
  kind: "critical" | "information" | "learning";
  title: string;
  message: string;
  reason: string;
  createdAt: string;
  readAt: string | null;
  action: AlertActionView | null;
}

interface AgentChatInputBase {
  /** Wire compatibility only; the server authenticates the Bearer principal. */
  userId: string;
  conversationId: string | null;
  message: string;
  attachmentIds: string[];
}

export type AgentChatInput = AgentChatInputBase &
  (
    | { mode: "learning"; topic?: LearningTopicWire; category?: never }
    | { mode: "resource"; category?: ResourceCategoryWire; topic?: never }
    | {
        mode: "auto";
        category?: ResourceCategoryWire;
        topic?: never;
      }
    | { mode: "auto"; topic: LearningTopicWire; category?: never }
  );

export interface AgentChatView {
  conversationId: string;
  messageId: string;
  responseType: ResponseTypeWire;
  text: string;
  learningAnswer: LearningScenarioView | null;
  resourceRecommendation: ResourceRecommendationView | null;
  memorySuggestion: MemorySuggestionView | null;
  alert: AlertView | null;
  sources: SourceView[];
  suggestedFollowUps: string[];
  createdAt: string;
  demo: boolean;
  usage: UsageView;
}

export interface MemoryItemView {
  key: string;
  value: string;
  displayValue: string;
  sourceConversationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileView {
  userId: string;
  nickname: string;
  grade: number | null;
  region: string | null;
  familyOccupation: string | null;
  familyType: string | null;
  economicStatus: string | null;
  otherIdentities: string[];
  memories: MemoryItemView[];
  updatedAt: string;
}

export interface ProfileUpdateInput {
  nickname: string;
  grade: number | null;
  region: string | null;
  familyOccupation: string | null;
  familyType: string | null;
  economicStatus: string | null;
  otherIdentities: string[];
}

export interface ConversationSummaryView {
  conversationId: string;
  title: string;
  mode: ChatModeWire;
  lastResponseType: ResponseTypeWire | null;
  preview: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  demo: boolean;
}

export interface ConversationListView {
  items: ConversationSummaryView[];
  nextCursor: string | null;
}

export interface AttachmentView {
  attachmentId: string;
  filename: string;
  mediaType: "image/jpeg" | "image/png";
  sizeBytes: number;
  downloadUrl: string;
  ownerUserId: string;
  createdAt: string;
}

export interface ConversationMessageView {
  messageId: string;
  role: "user" | "assistant";
  text: string;
  attachmentIds: string[];
  attachments: AttachmentView[];
  responseType: ResponseTypeWire | null;
  learningAnswer: LearningScenarioView | null;
  resourceRecommendation: ResourceRecommendationView | null;
  memorySuggestion: MemorySuggestionView | null;
  alert: AlertView | null;
  sources: SourceView[];
  suggestedFollowUps: string[];
  createdAt: string;
  demo: boolean;
}

export interface ConversationDetailView {
  conversationId: string;
  userId: string;
  title: string;
  mode: ChatModeWire;
  createdAt: string;
  updatedAt: string;
  demo: boolean;
  messages: ConversationMessageView[];
}

export interface ResourceListView {
  items: ResourceRecommendationView[];
  demo: boolean;
}

export interface LearningMaterialListView {
  items: SourceView[];
  demo: boolean;
}

export interface AlertListView {
  items: AlertView[];
  unreadCount: number;
  demo: boolean;
}

export interface FilterOptionView {
  id: string;
  label: string;
}

export interface TeacherFiltersView {
  period: TeacherPeriodWire;
  classId: TeacherClassWire;
  subject: TeacherSubjectWire;
  attentionThreshold: AttentionThresholdWire;
}

export interface TeacherCountsView {
  questionCount: number;
  activeStudentCount: number;
  rosterStudentCount: number;
  attentionCount: number;
  practiceCount: number;
  correctCount: number;
  gapCount: number;
  animationCompletedCount: number;
  animationObservationCount: number;
  accuracyPercentage: number | null;
  animationCompletionPercentage: number | null;
}

export interface TeacherTopicSummaryView {
  topic: LearningTopicWire;
  title: string;
  subject: LearningSubjectWire;
  questionCount: number;
  practiceCount: number;
  correctCount: number;
  gapCount: number;
  studentCount: number;
  accuracyPercentage: number | null;
  misconception: string;
  suggestedActivity: string;
  suggestedQuestion: string;
  durationMinutes: number;
}

export interface StudentTopicSummaryView {
  topic: LearningTopicWire;
  title: string;
  questionCount: number;
  practiceCount: number;
  correctCount: number;
  gapCount: number;
  accuracyPercentage: number | null;
}

export interface TeacherRosterStudentView {
  studentId: string;
  name: string;
  classId: Exclude<TeacherClassWire, "all">;
  classLabel: string;
  number: number;
  questionCount: number;
  practiceCount: number;
  correctCount: number;
  accuracyPercentage: number | null;
  animationCompletedCount: number;
  animationObservationCount: number;
  animationCompletionPercentage: number | null;
  status: StudentLearningStatusWire;
  needsAttention: boolean;
  mainTopic: LearningTopicWire | null;
  topicSummaries: StudentTopicSummaryView[];
}

export interface TeacherTrendPointView {
  startDate: string;
  endDate: string;
  label: string;
  questionCount: number;
  gapCount: number;
}

export interface TeacherDashboardView {
  asOf: string;
  demo: boolean;
  filters: TeacherFiltersView;
  filterOptions: {
    periods: FilterOptionView[];
    classes: FilterOptionView[];
    subjects: FilterOptionView[];
  };
  authorizedScope: {
    schoolName: string;
    classIds: string[];
    label: string;
  };
  summary: TeacherCountsView;
  previousSummary: TeacherCountsView;
  topics: TeacherTopicSummaryView[];
  roster: TeacherRosterStudentView[];
  trend: TeacherTrendPointView[];
}

export interface GovernmentCountsView {
  eventCount: number;
  resourceNeedCount: number;
  potentialNeedCount: number;
  resourceViewCount: number;
}

export interface GovernmentTopicAggregateView extends GovernmentCountsView {
  topic: GovernmentTopicWire;
  label: string;
  percentage: number;
  education: boolean;
  previous: GovernmentCountsView;
}

export interface GovernmentRegionAggregateView extends GovernmentCountsView {
  region: Exclude<GovernmentRegionWire, "all">;
  label: string;
  previous: GovernmentCountsView;
}

export interface GovernmentTrendPointView extends GovernmentCountsView {
  startDate: string;
  endDate: string;
  label: string;
  previous: GovernmentCountsView;
}

/** Aggregate row only; deliberately has no user/conversation/message fields. */
export interface GovernmentDailyAggregateView extends GovernmentCountsView {
  date: string;
  region: Exclude<GovernmentRegionWire, "all">;
  topic: GovernmentTopicWire;
}

export interface GovernmentAgentInsightView {
  title: string;
  description: string;
  recommendation: string;
  topic: GovernmentTopicWire;
  region: GovernmentRegionWire;
  direction: "up" | "down" | "flat";
  changePercentage: number;
}

export interface GovernmentDashboardView {
  asOf: string;
  demo: boolean;
  filters: {
    period: GovernmentPeriodWire;
    region: GovernmentRegionWire;
    topic: GovernmentTopicWire | null;
  };
  filterOptions: {
    periods: FilterOptionView[];
    regions: FilterOptionView[];
    topics: FilterOptionView[];
  };
  window: {
    startDate: string;
    endDate: string;
    previousStartDate: string;
    previousEndDate: string;
    days: number;
  };
  totals: GovernmentCountsView;
  previousTotals: GovernmentCountsView;
  topics: GovernmentTopicAggregateView[];
  regions: GovernmentRegionAggregateView[];
  trend: GovernmentTrendPointView[];
  dailyAggregates: GovernmentDailyAggregateView[];
  agentInsights: GovernmentAgentInsightView[];
}

export interface TeacherDashboardFiltersInput {
  period?: TeacherPeriodWire;
  classId?: TeacherClassWire;
  subject?: TeacherSubjectWire;
  attentionThreshold?: AttentionThresholdWire;
}

export interface GovernmentDashboardFiltersInput {
  period?: GovernmentPeriodWire;
  region?: GovernmentRegionWire;
  topic?: GovernmentTopicWire;
}

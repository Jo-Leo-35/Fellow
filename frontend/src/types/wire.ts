/**
 * Canonical `/api/v1` JSON contracts. Wire objects use snake_case exactly as
 * documented in docs/api-alignment.md; React code should consume view models.
 */

export type RoleWire = "student" | "teacher" | "government";
export type RuntimeModeWire = "live" | "offline_demo";
export type ChatModeWire = "auto" | "learning" | "resource";
export type ResponseTypeWire =
  | "text"
  | "learning_answer"
  | "resource_recommendation"
  | "memory_suggestion"
  | "alert";
export type InsightTypeWire =
  | "learning_gap"
  | "resource_need"
  | "resource_interest"
  | "casual";
export type EligibilityStatusWire =
  | "eligible"
  | "possibly_eligible"
  | "needs_confirmation"
  | "not_eligible";
export type ResourceCategoryWire =
  | "disaster"
  | "agriculture"
  | "education"
  | "economy"
  | "health"
  | "other";
export type LearningTopicWire =
  | "newton"
  | "thermodynamics"
  | "entropy"
  | "equilibrium"
  | "bonding"
  | "reaction-rate";
export type LearningSubjectWire = "物理" | "化學";

export interface DemoSessionRequestWire {
  access_code?: string;
  role?: RoleWire;
}

export interface SessionIdentityWire {
  user_id: string;
  role: RoleWire;
  display_name: string;
  scope_label: string | null;
}

export interface SessionResponseWire {
  access_token: string;
  token_type: "Bearer";
  expires_at: string;
  runtime_mode: RuntimeModeWire;
  session: SessionIdentityWire;
}

export interface SessionCheckWire {
  expires_at: string;
  runtime_mode: RuntimeModeWire;
  session: SessionIdentityWire;
}

export interface UsageWire {
  period: "day";
  limit: number;
  used: number;
  reserved: number;
  remaining: number;
  reset_at: string;
}

export interface SourceWire {
  source_id: string;
  source_type: "curriculum" | "policy";
  title: string;
  publisher: string | null;
  chapter: string | null;
  page: string | null;
  excerpt: string;
  url: string | null;
  query_hint: string | null;
  updated_at: string | null;
}

export interface LearningStepWire {
  title: string;
  body: string;
  source_ids: string[];
}

export interface LearningPracticeWire {
  question: string;
  options: string[];
  answer_index: number;
  explanation: string;
}

export interface LearningFollowUpWire {
  question: string;
  title: string | null;
}

export interface LearningAnswerWire {
  scenario_id: LearningTopicWire | null;
  animation_topic: LearningTopicWire | null;
  subject: LearningSubjectWire | null;
  title: string;
  subtitle: string | null;
  summary: string;
  formula: string | null;
  formula_note: string | null;
  steps: LearningStepWire[];
  analogy: string | null;
  misconception: string | null;
  source_ids: string[];
  practice: LearningPracticeWire | null;
  follow_ups: LearningFollowUpWire[];
}

export interface EligibilityCheckWire {
  status: "matched" | "needs_confirmation";
  text: string;
}

export interface ResourceProgramWire {
  program_id: string;
  category: ResourceCategoryWire;
  title: string;
  agency: string;
  summary: string;
  eligibility_status: EligibilityStatusWire | null;
  eligibility_checks: EligibilityCheckWire[];
  reasons: string[];
  missing_conditions: string[];
  application_window: string | null;
  documents: string[];
  deadline: string | null;
  next_step: string | null;
  source_note: string | null;
  source_ids: string[];
  sources: SourceWire[];
}

export interface MemorySuggestionWire {
  suggestion_id: string;
  key: string;
  value: string;
  display_value: string;
  reason: string | null;
  expires_at: string;
}

export interface AlertActionWire {
  kind: "resource" | "conversation" | "learning_topic";
  target_id: string | null;
  label: string;
}

export interface AlertWire {
  alert_id: string;
  kind: "critical" | "information" | "learning";
  title: string;
  message: string;
  reason: string;
  created_at: string;
  read_at: string | null;
  action: AlertActionWire | null;
}

export interface AgentChatRequestWire {
  user_id: string;
  conversation_id: string | null;
  mode: ChatModeWire;
  message: string;
  attachment_ids: string[];
  category?: ResourceCategoryWire;
  topic?: LearningTopicWire;
}

export interface AgentChatResponseWire {
  conversation_id: string;
  message_id: string;
  response_type: ResponseTypeWire;
  text: string;
  learning_answer: LearningAnswerWire | null;
  resource_recommendation: ResourceProgramWire | null;
  memory_suggestion: MemorySuggestionWire | null;
  alert: AlertWire | null;
  sources: SourceWire[];
  suggested_follow_ups: string[];
  created_at: string;
  demo: boolean;
  usage: UsageWire;
}

export interface MemoryItemWire {
  key: string;
  value: string;
  display_value: string;
  source_conversation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileWire {
  user_id: string;
  nickname: string;
  grade: number | null;
  region: string | null;
  family_occupation: string | null;
  family_type: string | null;
  economic_status: string | null;
  other_identities: string[];
  memories: MemoryItemWire[];
  updated_at: string;
}

export interface ProfilePutRequestWire {
  nickname: string;
  grade: number | null;
  region: string | null;
  family_occupation: string | null;
  family_type: string | null;
  economic_status: string | null;
  other_identities: string[];
}

export interface MemoryConsentRequestWire {
  suggestion_id: string;
  consent: true;
}

export interface ConversationSummaryWire {
  conversation_id: string;
  title: string;
  mode: ChatModeWire;
  last_response_type: ResponseTypeWire | null;
  preview: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  demo: boolean;
}

export interface ConversationListWire {
  items: ConversationSummaryWire[];
  next_cursor: string | null;
}

export interface AttachmentWire {
  attachment_id: string;
  filename: string;
  media_type: "image/jpeg" | "image/png";
  size_bytes: number;
  download_url: string;
  owner_user_id: string;
  created_at: string;
}

export interface ConversationMessageWire {
  message_id: string;
  role: "user" | "assistant";
  text: string;
  attachment_ids: string[];
  attachments: AttachmentWire[];
  response_type: ResponseTypeWire | null;
  learning_answer: LearningAnswerWire | null;
  resource_recommendation: ResourceProgramWire | null;
  memory_suggestion: MemorySuggestionWire | null;
  alert: AlertWire | null;
  sources: SourceWire[];
  suggested_follow_ups: string[];
  created_at: string;
  demo: boolean;
}

export interface ConversationDetailWire {
  conversation_id: string;
  user_id: string;
  title: string;
  mode: ChatModeWire;
  created_at: string;
  updated_at: string;
  demo: boolean;
  messages: ConversationMessageWire[];
}

export interface ResourceListWire {
  items: ResourceProgramWire[];
  demo: boolean;
}

export interface LearningMaterialListWire {
  items: SourceWire[];
  demo: boolean;
}

export interface AlertListWire {
  items: AlertWire[];
  unread_count: number;
  demo: boolean;
}

export interface UploadResponseWire extends AttachmentWire {}

export type TeacherPeriodWire = "7d" | "30d" | "term";
export type TeacherClassWire = "all" | "801" | "802" | "803";
export type TeacherSubjectWire = "all" | LearningSubjectWire;
export type StudentLearningStatusWire =
  | "attention"
  | "steady"
  | "observing"
  | "inactive";
export type AttentionThresholdWire = 50 | 60 | 65 | 70;

export interface TeacherFiltersWire {
  period: TeacherPeriodWire;
  class_id: TeacherClassWire;
  subject: TeacherSubjectWire;
  attention_threshold: AttentionThresholdWire;
}

export interface FilterOptionWire {
  id: string;
  label: string;
}

export interface TeacherCountsWire {
  question_count: number;
  active_student_count: number;
  roster_student_count: number;
  attention_count: number;
  practice_count: number;
  correct_count: number;
  gap_count: number;
  animation_completed_count: number;
  animation_observation_count: number;
  accuracy_percentage: number | null;
  animation_completion_percentage: number | null;
}

export interface TeacherTopicSummaryWire {
  topic: LearningTopicWire;
  title: string;
  subject: LearningSubjectWire;
  question_count: number;
  practice_count: number;
  correct_count: number;
  gap_count: number;
  student_count: number;
  accuracy_percentage: number | null;
  misconception: string;
  suggested_activity: string;
  suggested_question: string;
  duration_minutes: number;
}

export interface StudentTopicSummaryWire {
  topic: LearningTopicWire;
  title: string;
  question_count: number;
  practice_count: number;
  correct_count: number;
  gap_count: number;
  accuracy_percentage: number | null;
}

export interface TeacherRosterStudentWire {
  student_id: string;
  name: string;
  class_id: Exclude<TeacherClassWire, "all">;
  class_label: string;
  number: number;
  question_count: number;
  practice_count: number;
  correct_count: number;
  accuracy_percentage: number | null;
  animation_completed_count: number;
  animation_observation_count: number;
  animation_completion_percentage: number | null;
  status: StudentLearningStatusWire;
  needs_attention: boolean;
  main_topic: LearningTopicWire | null;
  topic_summaries: StudentTopicSummaryWire[];
}

export interface TeacherTrendPointWire {
  start_date: string;
  end_date: string;
  label: string;
  question_count: number;
  gap_count: number;
}

export interface TeacherDashboardWire {
  as_of: string;
  demo: boolean;
  filters: TeacherFiltersWire;
  filter_options: {
    periods: FilterOptionWire[];
    classes: FilterOptionWire[];
    subjects: FilterOptionWire[];
  };
  authorized_scope: {
    school_name: string;
    class_ids: string[];
    label: string;
  };
  summary: TeacherCountsWire;
  previous_summary: TeacherCountsWire;
  topics: TeacherTopicSummaryWire[];
  roster: TeacherRosterStudentWire[];
  trend: TeacherTrendPointWire[];
}

export type GovernmentPeriodWire = "7d" | "30d" | "quarter";
export type GovernmentRegionWire =
  | "all"
  | "甲仙"
  | "六龜"
  | "杉林"
  | "美濃"
  | "旗山"
  | "內門";
export type GovernmentTopicWire =
  | "agriculture"
  | "education"
  | "financial"
  | "science"
  | "admission"
  | "health";

export interface GovernmentCountsWire {
  event_count: number;
  resource_need_count: number;
  potential_need_count: number;
  resource_view_count: number;
}

export interface GovernmentTopicAggregateWire extends GovernmentCountsWire {
  topic: GovernmentTopicWire;
  label: string;
  percentage: number;
  education: boolean;
  previous: GovernmentCountsWire;
}

export interface GovernmentRegionAggregateWire extends GovernmentCountsWire {
  region: Exclude<GovernmentRegionWire, "all">;
  label: string;
  previous: GovernmentCountsWire;
}

export interface GovernmentTrendPointWire extends GovernmentCountsWire {
  start_date: string;
  end_date: string;
  label: string;
  previous: GovernmentCountsWire;
}

/** Aggregate row, never a raw per-person or per-conversation event. */
export interface GovernmentDailyAggregateWire extends GovernmentCountsWire {
  date: string;
  region: Exclude<GovernmentRegionWire, "all">;
  topic: GovernmentTopicWire;
}

export interface GovernmentAgentInsightWire {
  title: string;
  description: string;
  recommendation: string;
  topic: GovernmentTopicWire;
  region: GovernmentRegionWire;
  direction: "up" | "down" | "flat";
  change_percentage: number;
}

export interface GovernmentDashboardWire {
  as_of: string;
  demo: boolean;
  filters: {
    period: GovernmentPeriodWire;
    region: GovernmentRegionWire;
    topic: GovernmentTopicWire | null;
  };
  filter_options: {
    periods: FilterOptionWire[];
    regions: FilterOptionWire[];
    topics: FilterOptionWire[];
  };
  window: {
    start_date: string;
    end_date: string;
    previous_start_date: string;
    previous_end_date: string;
    days: number;
  };
  totals: GovernmentCountsWire;
  previous_totals: GovernmentCountsWire;
  topics: GovernmentTopicAggregateWire[];
  regions: GovernmentRegionAggregateWire[];
  trend: GovernmentTrendPointWire[];
  daily_aggregates: GovernmentDailyAggregateWire[];
  agent_insights: GovernmentAgentInsightWire[];
}

export interface FieldErrorWire {
  field: string;
  code: string;
  message: string;
}

export type ApiErrorCodeWire =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "SESSION_EXPIRED"
  | "INVALID_ACCESS_CODE"
  | "ACCESS_CODE_REQUIRED"
  | "DEMO_IDENTITY_UNAVAILABLE"
  | "FORBIDDEN"
  | "USER_SCOPE_FORBIDDEN"
  | "PROFILE_NOT_FOUND"
  | "CONVERSATION_NOT_FOUND"
  | "CONVERSATION_MODE_CONFLICT"
  | "RESOURCE_NOT_FOUND"
  | "ALERT_NOT_FOUND"
  | "ATTACHMENT_NOT_FOUND"
  | "MEMORY_SUGGESTION_NOT_FOUND"
  | "MEMORY_SUGGESTION_EXPIRED"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "FILE_TOO_LARGE"
  | "UPLOAD_INVALID"
  | "IDEMPOTENCY_CONFLICT"
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED"
  | "REQUEST_TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_ERROR"
  | "OFFLINE_DEMO_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface ApiErrorDetailsWire {
  fields?: FieldErrorWire[];
  usage?: UsageWire;
  retry_after_seconds?: number;
}

export interface ApiErrorWire {
  error: {
    code: ApiErrorCodeWire;
    message: string;
    request_id: string;
    retryable: boolean;
    runtime_mode: RuntimeModeWire;
    details?: ApiErrorDetailsWire;
  };
}

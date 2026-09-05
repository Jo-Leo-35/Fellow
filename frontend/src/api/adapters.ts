import type {
  AgentChatInput,
  AgentChatView,
  AlertListView,
  AlertView,
  AttachmentView,
  ConversationDetailView,
  ConversationListView,
  ConversationMessageView,
  ConversationSummaryView,
  FilterOptionView,
  GovernmentCountsView,
  GovernmentDashboardView,
  LearningMaterialListView,
  LearningScenarioView,
  MemoryItemView,
  MemorySuggestionView,
  ProfileUpdateInput,
  ProfileView,
  ResourceListView,
  ResourceRecommendationView,
  SessionResponseView,
  SessionView,
  SourceView,
  StudentTopicSummaryView,
  TeacherCountsView,
  TeacherDashboardView,
  TeacherRosterStudentView,
  TeacherTopicSummaryView,
  UsageView,
} from "@/types/view";
import type {
  AgentChatRequestWire,
  AgentChatResponseWire,
  AlertListWire,
  AlertWire,
  AttachmentWire,
  ConversationDetailWire,
  ConversationListWire,
  ConversationMessageWire,
  ConversationSummaryWire,
  FilterOptionWire,
  GovernmentCountsWire,
  GovernmentDashboardWire,
  LearningAnswerWire,
  LearningMaterialListWire,
  LearningTopicWire,
  MemoryItemWire,
  MemorySuggestionWire,
  ProfilePutRequestWire,
  ProfileWire,
  ResourceListWire,
  ResourceProgramWire,
  SessionCheckWire,
  SessionIdentityWire,
  SessionResponseWire,
  SourceWire,
  StudentTopicSummaryWire,
  TeacherCountsWire,
  TeacherDashboardWire,
  TeacherRosterStudentWire,
  TeacherTopicSummaryWire,
  UsageWire,
} from "@/types/wire";

const learningTopics = new Set<LearningTopicWire>([
  "newton",
  "thermodynamics",
  "entropy",
  "equilibrium",
  "bonding",
  "reaction-rate",
]);

export class ApiContractError extends Error {
  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message);
    this.name = "ApiContractError";
  }
}

function requiredArray<T>(value: readonly T[] | null | undefined, field: string): readonly T[] {
  if (!Array.isArray(value)) {
    throw new ApiContractError(`API response field "${field}" must be an array.`, field);
  }
  return value;
}

function nullable<TWire, TView>(
  value: TWire | null | undefined,
  adapter: (item: TWire) => TView,
): TView | null {
  return value == null ? null : adapter(value);
}

function knownLearningTopic(value: unknown): LearningTopicWire | null {
  return typeof value === "string" && learningTopics.has(value as LearningTopicWire)
    ? (value as LearningTopicWire)
    : null;
}

function unrecognizedLearningTopic(value: unknown): string | null {
  return typeof value === "string" && !learningTopics.has(value as LearningTopicWire)
    ? value
    : null;
}

function requiredLearningTopic(value: unknown, field: string): LearningTopicWire {
  const topic = knownLearningTopic(value);
  if (topic === null) {
    throw new ApiContractError(`API response field "${field}" has an unknown learning topic.`, field);
  }
  return topic;
}

export function adaptSessionIdentity(wire: SessionIdentityWire) {
  return {
    userId: wire.user_id,
    role: wire.role,
    displayName: wire.display_name,
    scopeLabel: wire.scope_label,
  };
}

export function adaptSessionResponse(wire: SessionResponseWire): SessionResponseView {
  return {
    accessToken: wire.access_token,
    tokenType: wire.token_type,
    expiresAt: wire.expires_at,
    runtimeMode: wire.runtime_mode,
    session: adaptSessionIdentity(wire.session),
  };
}

export function adaptSession(wire: SessionCheckWire): SessionView {
  return {
    expiresAt: wire.expires_at,
    runtimeMode: wire.runtime_mode,
    session: adaptSessionIdentity(wire.session),
  };
}

export function adaptUsage(wire: UsageWire): UsageView {
  return {
    period: wire.period,
    limit: wire.limit,
    used: wire.used,
    reserved: wire.reserved,
    remaining: wire.remaining,
    resetAt: wire.reset_at,
  };
}

function resourceTitle(title: string): string {
  // Older catalogs and saved conversations still include this presentation suffix.
  return title.replace(/（Demo 資源方向）$/, "");
}

export function adaptSource(wire: SourceWire): SourceView {
  return {
    sourceId: wire.source_id,
    sourceType: wire.source_type,
    title: wire.source_type === "policy" ? resourceTitle(wire.title) : wire.title,
    publisher: wire.publisher,
    chapter: wire.chapter,
    page: wire.page,
    excerpt: wire.excerpt,
    url: wire.url,
    queryHint: wire.query_hint,
    updatedAt: wire.updated_at,
    id: wire.source_id,
    content: wire.excerpt,
  };
}

export function adaptLearningAnswer(wire: LearningAnswerWire): LearningScenarioView {
  const scenarioId = knownLearningTopic(wire.scenario_id);
  const animationTopic = knownLearningTopic(wire.animation_topic);
  const steps = requiredArray(wire.steps, "learning_answer.steps").map((step) => ({
    title: step.title,
    body: step.body,
    sourceIds: [...requiredArray(step.source_ids, "learning_answer.steps[].source_ids")],
  }));
  const practice = nullable(wire.practice, (item) => ({
    question: item.question,
    options: [...requiredArray(item.options, "learning_answer.practice.options")],
    answerIndex: item.answer_index,
    explanation: item.explanation,
  }));

  return {
    scenarioId,
    animationTopic,
    id: animationTopic ?? scenarioId,
    unrecognizedScenarioId: unrecognizedLearningTopic(wire.scenario_id),
    unrecognizedAnimationTopic: unrecognizedLearningTopic(wire.animation_topic),
    subject: wire.subject,
    title: wire.title,
    subtitle: wire.subtitle,
    summary: wire.summary,
    formula: wire.formula,
    formulaNote: wire.formula_note,
    steps,
    analogy: wire.analogy,
    misconception: wire.misconception,
    sourceIds: [...requiredArray(wire.source_ids, "learning_answer.source_ids")],
    practice,
    followUps: requiredArray(wire.follow_ups, "learning_answer.follow_ups").map((item) => ({
      question: item.question,
      title: item.title,
    })),
  };
}

export function adaptResourceProgram(wire: ResourceProgramWire): ResourceRecommendationView {
  const eligibilityChecks = requiredArray(
    wire.eligibility_checks,
    "resource_recommendation.eligibility_checks",
  ).map((check) => ({ status: check.status, text: check.text }));

  return {
    programId: wire.program_id,
    category: wire.category,
    title: resourceTitle(wire.title),
    agency: wire.agency,
    summary: wire.summary,
    eligibilityStatus: wire.eligibility_status,
    eligibilityChecks,
    requirements: eligibilityChecks.map((check) => ({
      kind: check.status === "matched" ? "matched" : "confirm",
      text: check.text,
    })),
    reasons: [...requiredArray(wire.reasons, "resource_recommendation.reasons")],
    missingConditions: [
      ...requiredArray(wire.missing_conditions, "resource_recommendation.missing_conditions"),
    ],
    applicationWindow: wire.application_window,
    documents: [...requiredArray(wire.documents, "resource_recommendation.documents")],
    deadline: wire.deadline,
    nextStep: wire.next_step,
    sourceNote: wire.source_note,
    sourceIds: [...requiredArray(wire.source_ids, "resource_recommendation.source_ids")],
    sources: requiredArray(wire.sources, "resource_recommendation.sources").map(adaptSource),
  };
}

export function adaptMemorySuggestion(wire: MemorySuggestionWire): MemorySuggestionView {
  return {
    suggestionId: wire.suggestion_id,
    key: wire.key,
    value: wire.value,
    displayValue: wire.display_value,
    reason: wire.reason,
    expiresAt: wire.expires_at,
  };
}

export function adaptAlert(wire: AlertWire): AlertView {
  return {
    alertId: wire.alert_id,
    kind: wire.kind,
    title: wire.title,
    message: wire.message,
    reason: wire.reason,
    createdAt: wire.created_at,
    readAt: wire.read_at,
    action: nullable(wire.action, (action) => ({
      kind: action.kind,
      targetId: action.target_id,
      label: action.label,
    })),
  };
}

export function toAgentChatRequestWire(input: AgentChatInput): AgentChatRequestWire {
  return {
    user_id: input.userId,
    conversation_id: input.conversationId,
    mode: input.mode,
    message: input.message,
    attachment_ids: [...input.attachmentIds],
    ...(input.category === undefined ? {} : { category: input.category }),
    ...(input.topic === undefined ? {} : { topic: input.topic }),
  };
}

export function adaptAgentChat(wire: AgentChatResponseWire): AgentChatView {
  const learningAnswer = nullable(wire.learning_answer, adaptLearningAnswer);
  const resourceRecommendation = nullable(wire.resource_recommendation, adaptResourceProgram);
  const memorySuggestion = nullable(wire.memory_suggestion, adaptMemorySuggestion);
  const alert = nullable(wire.alert, adaptAlert);

  if (wire.response_type === "learning_answer" && learningAnswer === null) {
    throw new ApiContractError(
      "A learning_answer response is missing its structured payload.",
      "learning_answer",
    );
  }
  if (wire.response_type === "resource_recommendation" && resourceRecommendation === null) {
    throw new ApiContractError(
      "A resource_recommendation response is missing its structured payload.",
      "resource_recommendation",
    );
  }
  if (wire.response_type === "memory_suggestion" && memorySuggestion === null) {
    throw new ApiContractError(
      "A memory_suggestion response is missing its structured payload.",
      "memory_suggestion",
    );
  }
  if (wire.response_type === "alert" && alert === null) {
    throw new ApiContractError("An alert response is missing its structured payload.", "alert");
  }

  return {
    conversationId: wire.conversation_id,
    messageId: wire.message_id,
    responseType: wire.response_type,
    text: wire.text,
    learningAnswer,
    resourceRecommendation,
    memorySuggestion,
    alert,
    sources: requiredArray(wire.sources, "sources").map(adaptSource),
    suggestedFollowUps: [...requiredArray(wire.suggested_follow_ups, "suggested_follow_ups")],
    createdAt: wire.created_at,
    demo: wire.demo,
    usage: adaptUsage(wire.usage),
  };
}

export function adaptMemoryItem(wire: MemoryItemWire): MemoryItemView {
  return {
    key: wire.key,
    value: wire.value,
    displayValue: wire.display_value,
    sourceConversationId: wire.source_conversation_id,
    createdAt: wire.created_at,
    updatedAt: wire.updated_at,
  };
}

export function adaptProfile(wire: ProfileWire): ProfileView {
  return {
    userId: wire.user_id,
    nickname: wire.nickname,
    grade: wire.grade,
    region: wire.region,
    familyOccupation: wire.family_occupation,
    familyType: wire.family_type,
    economicStatus: wire.economic_status,
    otherIdentities: [...requiredArray(wire.other_identities, "profile.other_identities")],
    memories: requiredArray(wire.memories, "profile.memories").map(adaptMemoryItem),
    updatedAt: wire.updated_at,
  };
}

export function toProfilePutRequestWire(input: ProfileUpdateInput): ProfilePutRequestWire {
  return {
    nickname: input.nickname,
    grade: input.grade,
    region: input.region,
    family_occupation: input.familyOccupation,
    family_type: input.familyType,
    economic_status: input.economicStatus,
    other_identities: [...input.otherIdentities],
  };
}

export function adaptConversationSummary(wire: ConversationSummaryWire): ConversationSummaryView {
  return {
    conversationId: wire.conversation_id,
    title: wire.title,
    mode: wire.mode,
    lastResponseType: wire.last_response_type,
    preview: wire.preview,
    messageCount: wire.message_count,
    createdAt: wire.created_at,
    updatedAt: wire.updated_at,
    demo: wire.demo,
  };
}

export function adaptConversationList(wire: ConversationListWire): ConversationListView {
  return {
    items: requiredArray(wire.items, "conversations.items").map(adaptConversationSummary),
    nextCursor: wire.next_cursor,
  };
}

export function adaptAttachment(wire: AttachmentWire): AttachmentView {
  return {
    attachmentId: wire.attachment_id,
    filename: wire.filename,
    mediaType: wire.media_type,
    sizeBytes: wire.size_bytes,
    downloadUrl: wire.download_url,
    ownerUserId: wire.owner_user_id,
    createdAt: wire.created_at,
  };
}

export function adaptConversationMessage(wire: ConversationMessageWire): ConversationMessageView {
  const learningAnswer = nullable(wire.learning_answer, adaptLearningAnswer);
  const resourceRecommendation = nullable(wire.resource_recommendation, adaptResourceProgram);
  const memorySuggestion = nullable(wire.memory_suggestion, adaptMemorySuggestion);
  const alert = nullable(wire.alert, adaptAlert);
  if (wire.role === "assistant") {
    if (wire.response_type === "learning_answer" && learningAnswer === null) {
      throw new ApiContractError(
        "A replayed learning_answer is missing its structured payload.",
        "conversation.messages[].learning_answer",
      );
    }
    if (wire.response_type === "resource_recommendation" && resourceRecommendation === null) {
      throw new ApiContractError(
        "A replayed resource_recommendation is missing its structured payload.",
        "conversation.messages[].resource_recommendation",
      );
    }
    if (wire.response_type === "memory_suggestion" && memorySuggestion === null) {
      throw new ApiContractError(
        "A replayed memory_suggestion is missing its structured payload.",
        "conversation.messages[].memory_suggestion",
      );
    }
    if (wire.response_type === "alert" && alert === null) {
      throw new ApiContractError(
        "A replayed alert is missing its structured payload.",
        "conversation.messages[].alert",
      );
    }
  }
  return {
    messageId: wire.message_id,
    role: wire.role,
    text: wire.text,
    attachmentIds: [...requiredArray(wire.attachment_ids, "conversation.messages[].attachment_ids")],
    attachments: requiredArray(wire.attachments, "conversation.messages[].attachments").map(
      adaptAttachment,
    ),
    responseType: wire.response_type,
    learningAnswer,
    resourceRecommendation,
    memorySuggestion,
    alert,
    sources: requiredArray(wire.sources, "conversation.messages[].sources").map(adaptSource),
    suggestedFollowUps: [
      ...requiredArray(
        wire.suggested_follow_ups,
        "conversation.messages[].suggested_follow_ups",
      ),
    ],
    createdAt: wire.created_at,
    demo: wire.demo,
  };
}

export function adaptConversationDetail(wire: ConversationDetailWire): ConversationDetailView {
  return {
    conversationId: wire.conversation_id,
    userId: wire.user_id,
    title: wire.title,
    mode: wire.mode,
    createdAt: wire.created_at,
    updatedAt: wire.updated_at,
    demo: wire.demo,
    messages: requiredArray(wire.messages, "conversation.messages").map(adaptConversationMessage),
  };
}

export function adaptResourceList(wire: ResourceListWire): ResourceListView {
  return {
    items: requiredArray(wire.items, "resources.items").map(adaptResourceProgram),
    demo: wire.demo,
  };
}

export function adaptLearningMaterialList(wire: LearningMaterialListWire): LearningMaterialListView {
  return {
    items: requiredArray(wire.items, "learning_materials.items").map(adaptSource),
    demo: wire.demo,
  };
}

export function adaptAlertList(wire: AlertListWire): AlertListView {
  return {
    items: requiredArray(wire.items, "alerts.items").map(adaptAlert),
    unreadCount: wire.unread_count,
    demo: wire.demo,
  };
}

function adaptFilterOption(wire: FilterOptionWire): FilterOptionView {
  return { id: wire.id, label: wire.label };
}

function adaptTeacherCounts(wire: TeacherCountsWire): TeacherCountsView {
  return {
    questionCount: wire.question_count,
    activeStudentCount: wire.active_student_count,
    rosterStudentCount: wire.roster_student_count,
    attentionCount: wire.attention_count,
    practiceCount: wire.practice_count,
    correctCount: wire.correct_count,
    gapCount: wire.gap_count,
    animationCompletedCount: wire.animation_completed_count,
    animationObservationCount: wire.animation_observation_count,
    accuracyPercentage: wire.accuracy_percentage,
    animationCompletionPercentage: wire.animation_completion_percentage,
  };
}

function adaptTeacherTopic(
  wire: TeacherTopicSummaryWire,
  index: number,
): TeacherTopicSummaryView {
  return {
    topic: requiredLearningTopic(wire.topic, `teacher.topics[${index}].topic`),
    title: wire.title,
    subject: wire.subject,
    questionCount: wire.question_count,
    practiceCount: wire.practice_count,
    correctCount: wire.correct_count,
    gapCount: wire.gap_count,
    studentCount: wire.student_count,
    accuracyPercentage: wire.accuracy_percentage,
    misconception: wire.misconception,
    suggestedActivity: wire.suggested_activity,
    suggestedQuestion: wire.suggested_question,
    durationMinutes: wire.duration_minutes,
  };
}

function adaptStudentTopic(
  wire: StudentTopicSummaryWire,
  index: number,
): StudentTopicSummaryView {
  return {
    topic: requiredLearningTopic(wire.topic, `teacher.roster[].topic_summaries[${index}].topic`),
    title: wire.title,
    questionCount: wire.question_count,
    practiceCount: wire.practice_count,
    correctCount: wire.correct_count,
    gapCount: wire.gap_count,
    accuracyPercentage: wire.accuracy_percentage,
  };
}

function adaptTeacherRosterStudent(
  wire: TeacherRosterStudentWire,
  index: number,
): TeacherRosterStudentView {
  return {
    studentId: wire.student_id,
    name: wire.name,
    classId: wire.class_id,
    classLabel: wire.class_label,
    number: wire.number,
    questionCount: wire.question_count,
    practiceCount: wire.practice_count,
    correctCount: wire.correct_count,
    accuracyPercentage: wire.accuracy_percentage,
    animationCompletedCount: wire.animation_completed_count,
    animationObservationCount: wire.animation_observation_count,
    animationCompletionPercentage: wire.animation_completion_percentage,
    status: wire.status,
    needsAttention: wire.needs_attention,
    mainTopic:
      wire.main_topic === null
        ? null
        : requiredLearningTopic(wire.main_topic, `teacher.roster[${index}].main_topic`),
    topicSummaries: requiredArray(
      wire.topic_summaries,
      `teacher.roster[${index}].topic_summaries`,
    ).map(adaptStudentTopic),
  };
}

export function adaptTeacherDashboard(wire: TeacherDashboardWire): TeacherDashboardView {
  return {
    asOf: wire.as_of,
    demo: wire.demo,
    filters: {
      period: wire.filters.period,
      classId: wire.filters.class_id,
      subject: wire.filters.subject,
      attentionThreshold: wire.filters.attention_threshold,
    },
    filterOptions: {
      periods: requiredArray(wire.filter_options.periods, "teacher.filter_options.periods").map(
        adaptFilterOption,
      ),
      classes: requiredArray(wire.filter_options.classes, "teacher.filter_options.classes").map(
        adaptFilterOption,
      ),
      subjects: requiredArray(wire.filter_options.subjects, "teacher.filter_options.subjects").map(
        adaptFilterOption,
      ),
    },
    authorizedScope: {
      schoolName: wire.authorized_scope.school_name,
      classIds: [
        ...requiredArray(wire.authorized_scope.class_ids, "teacher.authorized_scope.class_ids"),
      ],
      label: wire.authorized_scope.label,
    },
    summary: adaptTeacherCounts(wire.summary),
    previousSummary: adaptTeacherCounts(wire.previous_summary),
    topics: requiredArray(wire.topics, "teacher.topics").map(adaptTeacherTopic),
    roster: requiredArray(wire.roster, "teacher.roster").map(adaptTeacherRosterStudent),
    trend: requiredArray(wire.trend, "teacher.trend").map((point) => ({
      startDate: point.start_date,
      endDate: point.end_date,
      label: point.label,
      questionCount: point.question_count,
      gapCount: point.gap_count,
    })),
  };
}

function adaptGovernmentCounts(wire: GovernmentCountsWire): GovernmentCountsView {
  return {
    eventCount: wire.event_count,
    resourceNeedCount: wire.resource_need_count,
    potentialNeedCount: wire.potential_need_count,
    resourceViewCount: wire.resource_view_count,
  };
}

export function adaptGovernmentDashboard(wire: GovernmentDashboardWire): GovernmentDashboardView {
  return {
    asOf: wire.as_of,
    demo: wire.demo,
    filters: {
      period: wire.filters.period,
      region: wire.filters.region,
      topic: wire.filters.topic,
    },
    filterOptions: {
      periods: requiredArray(
        wire.filter_options.periods,
        "government.filter_options.periods",
      ).map(adaptFilterOption),
      regions: requiredArray(
        wire.filter_options.regions,
        "government.filter_options.regions",
      ).map(adaptFilterOption),
      topics: requiredArray(wire.filter_options.topics, "government.filter_options.topics").map(
        adaptFilterOption,
      ),
    },
    window: {
      startDate: wire.window.start_date,
      endDate: wire.window.end_date,
      previousStartDate: wire.window.previous_start_date,
      previousEndDate: wire.window.previous_end_date,
      days: wire.window.days,
    },
    totals: adaptGovernmentCounts(wire.totals),
    previousTotals: adaptGovernmentCounts(wire.previous_totals),
    topics: requiredArray(wire.topics, "government.topics").map((topic) => ({
      ...adaptGovernmentCounts(topic),
      topic: topic.topic,
      label: topic.label,
      percentage: topic.percentage,
      education: topic.education,
      previous: adaptGovernmentCounts(topic.previous),
    })),
    regions: requiredArray(wire.regions, "government.regions").map((region) => ({
      ...adaptGovernmentCounts(region),
      region: region.region,
      label: region.label,
      previous: adaptGovernmentCounts(region.previous),
    })),
    trend: requiredArray(wire.trend, "government.trend").map((point) => ({
      ...adaptGovernmentCounts(point),
      startDate: point.start_date,
      endDate: point.end_date,
      label: point.label,
      previous: adaptGovernmentCounts(point.previous),
    })),
    dailyAggregates: requiredArray(
      wire.daily_aggregates,
      "government.daily_aggregates",
    ).map((row) => ({
      ...adaptGovernmentCounts(row),
      date: row.date,
      region: row.region,
      topic: row.topic,
    })),
    agentInsights: requiredArray(wire.agent_insights, "government.agent_insights").map(
      (insight) => ({
        title: insight.title,
        description: insight.description,
        recommendation: insight.recommendation,
        topic: insight.topic,
        region: insight.region,
        direction: insight.direction,
        changePercentage: insight.change_percentage,
      }),
    ),
  };
}

export type StudentNavKey = "chat" | "resources" | "alerts" | "profile";

export type ResponseType =
  | "text"
  | "learning_answer"
  | "resource_recommendation"
  | "memory_suggestion"
  | "alert";

export interface LearningAnswer {
  title: string;
  explanation?: string;
  steps: Array<{ title: string; content: string }>;
  answer?: string;
  knowledgePoint?: string;
  actions?: Array<{ label: string; action: string }>;
}

export interface ResourceRecommendation {
  programId: string;
  title: string;
  status: "eligible" | "possibly_eligible" | "needs_confirmation" | "not_eligible";
  reasons: string[];
  missingConditions: string[];
  agency?: string;
  deadline?: string;
  sourceUrl?: string;
}

export interface MemorySuggestion {
  key: string;
  value: string;
  displayValue: string;
  reason?: string;
}

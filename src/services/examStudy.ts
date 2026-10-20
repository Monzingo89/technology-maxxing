export interface Exam {
  id: string;
  name: string;
  code: string;
  url: string;
  scope: string;
  status: string;
  researchedAt: string;
}
export interface AcronymStudy {
  term: string;
  expansion: string;
  meaning: string;
  mnemonic: string;
  distinction: string;
  group: string;
  batch: number;
  exams: string[];
  sources: { label: string; url: string }[];
  ports?: string;
}
export interface StudyTopic {
  id: string;
  name: string;
  category: string;
  tag: string;
  challengeCount: number;
  assessmentCount: number;
  learnPath: string;
  assessmentQuality?: "authored" | "catalog-recall";
  acronymStudy?: AcronymStudy;
  examMappings?: {
    examId: string;
    basis: "curated" | "related";
    reason: string;
  }[];
}

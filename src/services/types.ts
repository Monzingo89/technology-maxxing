export type House = "claude" | "openai" | "gemini";
export type Category =
  "foundations" | "prompting" | "agents" | "models" | "safety";
export type Profession =
  "teacher" | "developer" | "farmer" | "finance" | "firefighter" | "law";
export interface AgentProfile {
  uid: string;
  username: string;
  house: House;
  avatar: Record<string, string | number>;
  profession: Profession;
  createdAt: number;
  houseChangedAt: number;
  policyVersion: string;
}
export interface Presence {
  uid: string;
  username: string;
  house: House;
  avatar: Record<string, string | number>;
  x: number;
  z: number;
  updatedAt: number;
}
export interface QuizQuestion {
  nonce: string;
  prompt: string;
  options: { token: string; text: string }[];
  deadline: number;
  number: number;
  total: number;
}
export interface QuizResult {
  category: Category;
  elo: number;
  knowledge: number;
  score: number;
  rounds: number;
  correct: number;
  answered: number;
  dailyCorrect: number;
  total: number;
}
export interface QuizResponse {
  sessionId: string;
  complete: boolean;
  serverNow: number;
  category?: Category;
  source?: "reviewed-seed" | "ai-generated-reviewed";
  question?: QuizQuestion;
  result?: QuizResult;
}
export interface GalleryPost {
  id: string;
  uid: string;
  username: string;
  house: House;
  title: string;
  prompt: string;
  status: "pending" | "published" | "rejected";
  createdAt: number;
}
export interface TeamInvite {
  id: string;
  from: string;
  to: string;
  participants: string[];
  status: "pending" | "accepted" | "declined" | "blocked";
  createdAt: number;
}
export interface Team {
  id: string;
  members: string[];
  active: boolean;
  createdAt: number;
}
export interface Message {
  id: string;
  uid: string;
  text: string;
  createdAt: number;
}
export interface LeaderboardEntry {
  uid: string;
  username: string;
  house: House;
  elo: number;
  knowledge: number;
  score: number;
  rounds: number;
}
export interface SchoolResponse {
  sessionId: string;
  complete: boolean;
  profession: Profession;
  lesson?: {
    number: number;
    total: number;
    text: string;
    question: string;
    options: { token: string; text: string }[];
    availableAt: number;
  };
}

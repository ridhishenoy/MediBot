export interface UserProfile {
  userId: string;
  name: string;
  bloodGroup?: string;
  height?: number;
  weight?: number;
  avatarUrl?: string;
  createdAt: string;
}

export interface VitalMeasurement {
  id?: string;
  userId: string;
  authUid: string;
  timestamp: string;
  heartRate: number;
  spo2: number;
  temperature: number;
  stress: "Low" | "Mod" | "High";
  type: "auto" | "manual";
}

export interface AIAnalysis {
  id?: string;
  userId: string;
  authUid: string;
  timestamp: string;
  content: string;
  vitalsId?: string;
}

export type ViewType = "dashboard" | "measure" | "history" | "ai";

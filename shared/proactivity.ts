export type ObjectiveStatus = "active" | "paused" | "completed" | "attention";
export interface ObjectiveWake {
  id: string;
  at: number;
  reason: string;
  context?: string;
}
export interface ProactiveObjective {
  id: string;
  botId: string;
  name: string;
  instructions: string;
  status: ObjectiveStatus;
  eventName?: string;
  watchPath?: string;
  maxDailyRuns: number;
  day: string;
  dayRuns: number;
  totalRuns: number;
  createdAt: number;
  updatedAt: number;
  nextWakeAt?: number;
  pendingWake?: ObjectiveWake;
  runId?: string;
  threadId?: string;
  checkpointRunId?: string;
  checkpoint?: string;
  lastOutput?: string;
  attention?: string;
  watchSignature?: string;
  eventReceipts: string[];
}
export interface ObjectiveInput {
  botId: string;
  name: string;
  instructions: string;
  eventName?: string;
  watchPath?: string;
  maxDailyRuns?: number;
  startNow?: boolean;
}
export interface ObjectiveCheckpoint {
  objectiveId: string;
  action: "sleep" | "wait_event" | "complete" | "need_input";
  summary: string;
  delayMinutes?: number;
}

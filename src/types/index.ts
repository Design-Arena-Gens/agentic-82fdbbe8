export type TaskStatus = "pending" | "in-progress" | "complete";

export type Task = {
  id: string;
  title: string;
  notes?: string;
  urgent: boolean;
  important: boolean;
  createdAt: string;
  dueDate?: string;
  status: TaskStatus;
};

export type EisenhowerQuadrant =
  | "do-now"
  | "schedule"
  | "delegate"
  | "eliminate";

export type KCSChunk = {
  id: string;
  chunkIndex: number;
  content: string;
  tokenEstimate: number;
  metadata: {
    startOffset: number;
    endOffset: number;
    keywords: string[];
  };
};

export type KCSFormat = "json" | "jsonl";

export type ModelBlueprint = {
  irRaw: string;
  irMarkdown: string;
  kcsRaw: string;
  kcsFormat: KCSFormat;
  chunkSize: number;
  kcsChunks: KCSChunk[];
  lastUpdated?: string;
};


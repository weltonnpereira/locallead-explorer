export type SearchProgress = {
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  message: string;
  processed?: number;
  total?: number;
};

export type SearchHistoryItem = {
  id: number;
  term: string;
  city: string;
  leads: number;
  created_at: string;
};
export type ScriptCategory = "WHATSAPP" | "EMAIL" | "COLD_CALL" | "INSTAGRAM";

export type Script = {
  id: number;
  title: string;
  category: ScriptCategory;
  content: string;
  created_at: string;
};

export type PayloadScript = {
  title: string;
  category: ScriptCategory;
  content: string;
};

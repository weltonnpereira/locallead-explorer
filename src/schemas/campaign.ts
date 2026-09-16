export type Campaign = {
  id: number;
  name: string;
  category: string | null;
  city: string | null;
  status: string;
  leads: number;
  opportunities: number;
  contacted: number;
  replies: number;
  meetings: number;
  customers: number;
  generated_value: number;
  created_at: string;
};

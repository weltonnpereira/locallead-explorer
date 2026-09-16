export type OpportunityFactor = {
  label?: string;
  points?: number;
};

export type Lead = {
  id?: number;
  name: string;
  phone: string | null;
  address: string | null;
  rating: number | null;
  reviews: number;
  website: string | null;
  google_maps_url?: string | null;
  score?: number | null;
  status?: LeadStatus;
  in_prospecting?: boolean;
  proposal_value?: number | null;
  deal_value?: number | null;
  deal_closed_at?: string | null;
  notes?: string | null;
  factors?: OpportunityFactor[];
};

export type LeadStatus =
  "NEW" | "CONTACTED" | "REPLIED" | "MEETING" | "PROPOSAL" | "CUSTOMER" | "LOST";
import { Campaign } from "./campaign";

export type DashboardData = {
  metrics: { label: string; value: number | string; hint: string }[];
  funnel: { label: string; value: number }[];
  campaigns: Campaign[];
  niches: {
    niche: string;
    leads: number;
    contacted: number;
    replies: number;
    meetings: number;
    customers: number;
    conversion: string;
  }[];
};
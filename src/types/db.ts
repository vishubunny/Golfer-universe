export type UserRole = "subscriber" | "admin";
export type SubStatus = "active" | "cancelled" | "lapsed" | "none";
export type SubPlan = "monthly" | "yearly";
export type DrawStatus = "draft" | "simulated" | "published";
export type WinnerStatus = "pending" | "approved" | "rejected" | "paid";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  charity_id: string | null;
  charity_pct: number;
  created_at: string;
}

export interface Charity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  website: string | null;
  is_featured: boolean;
  is_active: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubPlan;
  status: SubStatus;
  amount_cents: number;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface Score {
  id: string;
  user_id: string;
  score: number;
  played_on: string;
  created_at: string;
}

export interface Draw {
  id: string;
  period: string;
  logic: "random" | "algorithmic";
  status: DrawStatus;
  winning_numbers: number[];
  pool_total_cents: number;
  jackpot_carry_cents: number;
  published_at: string | null;
}

export interface Winner {
  id: string;
  draw_id: string;
  user_id: string;
  match_count: number;
  prize_cents: number;
  status: WinnerStatus;
  proof_url: string | null;
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface FeedItem {
  neo_reference_id: string;
  name: string;
  approach_date: string;
  miss_distance_lunar: number;
  miss_distance_km: number;
  velocity_kms: number;
  est_diameter_min_m: number | null;
  est_diameter_max_m: number | null;
  is_potentially_hazardous: boolean;
  risk_score: number;
  sentry_impact_probability: number | null;
  position: Position3D;
}

export interface DashboardStats {
  total_tracked: number;
  total_hazardous: number;
  closest_this_week_lunar: number | null;
  closest_this_week_name: string | null;
  avg_risk_score: number;
}

export interface MonthlyData {
  month: string;        // YYYY-MM
  flyby_count: number;
  avg_risk_score: number;
}

export interface TrajectoryPoint {
  timestamp: string;
  x: number;
  y: number;
  z: number;
}

export interface TrajectoryResponse {
  neo_reference_id: string;
  name: string;
  points: TrajectoryPoint[];
  orbital_period_seconds: number;
}

export interface AsteroidDetail {
  neo_reference_id: string;
  name: string;
  is_potentially_hazardous: boolean;
  is_sentry_object: boolean;
  abs_magnitude: number | null;
  est_diameter_min_m: number | null;
  est_diameter_max_m: number | null;
  sentry_impact_probability: number | null;
  close_approaches: any[];
  risk_breakdown: {
    miss_distance_score: number;
    diameter_score: number;
    velocity_score: number;
    hazard_flag_score: number;
    sentry_bonus: number;
    total: number;
  };
  nasa_jpl_url: string;
}

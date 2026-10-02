export type Platform = 'Airbnb' | 'Booking.com' | 'Stayz' | 'Vrbo' | 'Direct';

/** What anyone can see on a manager's profile. */
export type PublicManager = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  about: string;
  initials: string;
  cities: string[];
  suburbs: string[];
  postcodes?: string[]; // service areas the manager declares (used when we have no listing data)
  propertyCount: number | null;
  avgRating: number | null;
  /** Reviews from owners who hired them through CoHostCompare (only set when there's at least one). */
  ownerReviews?: { avg: number; count: number };
  /** What properties they take on (only set when they've set any). */
  requirements?: import('@/lib/requirements').Requirements;
  reviewCount: number | null;
  avgOccupancy: number | null; // 0–1, last 12 months
  avgNightlyRate: number | null; // A$
  platforms: string[];
  services: string[];
  feeMin: number | null; // % of booking revenue, only when published by the manager
  feeMax: number | null;
  licensedAgent: boolean | null;
  responseHours: number | null; // median hours to reply, claimed managers with 3+ replies
  replies?: number;
  verified?: boolean; // ABN checked on the Australian Business Register
  claimed: boolean;
  dataAsOf: string | null;
  logoUrl?: string | null;
  photos?: string[];
  tile?: { bg: string; fg: string };
  demo?: boolean;
};

/** Search results add how active the manager is near the searched location. */
export type NearbyManager = PublicManager & { nearby: number; nearbyRating: number | null; nearestKm: number | null };

/** Only after a free owner account. */
export type GatedDetails = {
  feeNote: string | null;
  setupFee: number | null; // A$
  setupNote: string | null;
  cleaningPassedOn: boolean | null;
  linenIncluded: boolean | null;
  minTermMonths: number | null;
  noticeDays: number | null;
  ownerStaysAllowed: string | null;
  inclusions: string[];
};

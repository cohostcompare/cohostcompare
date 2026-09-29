export type Platform = 'Airbnb' | 'Booking.com' | 'Stayz' | 'Vrbo' | 'Direct';

export type Service =
  | 'Listing setup'
  | 'Photography'
  | 'Dynamic pricing'
  | 'Guest messaging'
  | 'Check-in'
  | 'Cleaning and linen'
  | 'Maintenance'
  | 'Registration help'
  | 'Styling';

/** What anyone can see on a manager's profile. */
export type PublicManager = {
  slug: string;
  name: string;
  tagline: string;
  about: string;
  initials: string;
  cities: string[];
  suburbs: string[];
  postcodes: string[];
  propertyCount: number | null;
  avgRating: number | null;
  reviewCount: number | null;
  platforms: Platform[];
  services: Service[];
  feeMin: number; // % of booking revenue
  feeMax: number;
  licensedAgent: boolean;
  responseHours: number | null; // median, from our enquiries
  claimed: boolean;
  demo?: boolean;
};

/** Only after a free owner account. */
export type GatedDetails = {
  setupFee: number | null; // A$
  cleaningPassedOn: boolean;
  linenIncluded: boolean;
  minTermMonths: number | null;
  noticeDays: number | null;
  ownerStaysAllowed: string;
  inclusions: string[];
  nearbyStats?: { withinKm: number; properties: number; avgRating: number | null };
};

export type Manager = PublicManager & { gated: GatedDetails };

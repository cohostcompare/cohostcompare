/** The owner setup checklist, shared by /setup and the downloadable setup guide. Plain text so it works in both. */
export type SetupStep = { title: string; body: string; ask: string; link?: { label: string; href: string } };

export const SETUP_STEPS: SetupStep[] = [
  {
    title: 'Check the rules and register',
    body: 'Most states and councils have rules for short stays, such as NSW’s register and night caps in some areas, and Victoria’s short stay levy. Strata by-laws can also apply.',
    ask: 'Does my manager handle registration and levy returns, or do I?',
    link: { label: 'Check the rules for your area', href: '/rules' },
  },
  {
    title: 'Get the right insurance',
    body: 'Many home and landlord policies don’t cover short-term letting, or only with an add-on. Platform host protection programs aren’t the same as insurance. Ask your insurer in writing whether your policy covers paying guests, and check contents and public liability.',
    ask: 'What insurance does the manager expect me to hold, and what does theirs cover?',
  },
  {
    title: 'Photos that sell the stay',
    body: 'Listing photos drive bookings more than almost anything else. Many managers include professional photos in their setup fee, so check before you book your own photographer.',
    ask: 'Are professional photos included, and who owns them if I change managers?',
  },
  {
    title: 'Cleaning, linen and consumables',
    body: 'Cleaning is usually charged to guests per stay, but linen hire, consumables and deep cleans may be billed to you. Compare how each manager handles this, as it changes your real costs.',
    ask: 'Who pays for cleaning, linen and consumables, and how are they charged?',
  },
  {
    title: 'Keys and access',
    body: 'A smart lock or lockbox makes late check-ins easy and saves key handover fees. If you’re in a strata building, check the by-laws before installing anything on the front door.',
    ask: 'How do guests get in, and is there a fee for key handover?',
  },
  {
    title: 'Furnishing and styling',
    body: 'Guests expect a well-equipped kitchen, good beds, fast Wi-Fi and a workspace. Some managers offer styling or furniture packages, often for a one-off fee.',
    ask: 'Is there a styling or setup fee, and what does it include?',
  },
];

export const MANAGER_CHECKLIST = [
  'Homes they already run near you, and their guest ratings for those homes',
  'The management fee, and whether GST is added',
  'Setup fee, cleaning, linen, consumables and maintenance: included or extra?',
  'Minimum term and notice period',
  'Whose account the listing is in, and who keeps the reviews if you part ways',
  'Which platforms they list on',
  'How they handle registration, levies and strata rules where you are',
  'Whether you can block out dates for your own stays',
];

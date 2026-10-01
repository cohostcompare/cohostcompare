/** Standard reasons a manager can give when they can't take on a property. Shown to the owner with the manager's note. */
export const DECLINE_REASONS = [
  'The property is outside the areas we cover',
  'We need a longer minimum term than the owner is after (for example, 9 months or more)',
  'We need the property available more often than the owner plans (for example, fewer owner stays)',
  'The property type or size isn’t a fit for us',
  'We only offer full management, not just some services',
  'We aren’t taking on new properties right now',
  'The start date doesn’t suit us',
  'Strata, council or registration rules make it difficult',
  'Another reason (explained in the note)',
] as const;
export const MIN_DECLINE_NOTE = 20;

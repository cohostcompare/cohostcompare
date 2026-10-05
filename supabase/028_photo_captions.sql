-- CoHostCompare 028: captions on manager photos (suburb and bedrooms), shown under each photo on the profile.
-- Applied 6 Oct 2026. Safe to run again.
-- { "<photo url>": "3-bedroom house, Byron Bay" }; a photo with no caption is just missing from the object.
alter table public.managers add column if not exists photo_captions jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';

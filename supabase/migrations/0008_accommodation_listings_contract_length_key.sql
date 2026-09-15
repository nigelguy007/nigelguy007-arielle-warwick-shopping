-- 0007's unique key (university_ukprn, accommodation_name, room_type,
-- academic_year) silently collapsed legitimate rows: several universities
-- (Exeter confirmed) sell the same hall+room_type at more than one
-- contract length (e.g. 42/43/48 weeks) with different prices - these are
-- distinct offers, not duplicates, so contract_length belongs in the key.
alter table public.accommodation_listings
  drop constraint if exists accommodation_listings_university_ukprn_accommodation_name__key;

alter table public.accommodation_listings
  add constraint accommodation_listings_unique_offer
  unique (university_ukprn, accommodation_name, room_type, contract_length, academic_year);

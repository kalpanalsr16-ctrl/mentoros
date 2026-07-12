-- Rollback for 0004_learner_profile.sql.
-- Drops in the exact reverse of the forward create order, without
-- cascade, so it fails loudly instead of silently deleting anything
-- unexpected still present (same convention as 0002's rollback).

drop table if exists public.learner_concept_mastery;
drop table if exists public.learner_profiles;

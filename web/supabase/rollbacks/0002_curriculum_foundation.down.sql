-- Rollback for 0002_curriculum_foundation.sql.
-- Must be run AFTER 0003's rollback (0003_seed_....down.sql) if the seed
-- migration was ever applied -- these `drop table` statements carry no
-- `cascade`, deliberately: if a row still exists anywhere in these
-- tables (seed data not yet rolled back, or any other data written by
-- direct DB access since), the drop fails loudly instead of silently
-- deleting it.
--
-- Order is the exact reverse of 0002's `create table`/`create function`
-- order, so each `drop` only ever depends on objects already dropped.

drop function if exists public.search_concept_id(text, text);

drop table if exists public.mastery_criteria;
drop table if exists public.teaching_strategies;
drop table if exists public.misconceptions;
drop table if exists public.concept_learning_objectives;
drop table if exists public.learning_objectives;
drop table if exists public.concept_relationships;
drop table if exists public.concepts;
drop table if exists public.chapters;
drop table if exists public.grades;
drop table if exists public.subjects;

-- pg_trgm is left enabled, not dropped here. 0002 was the first migration
-- to enable it, but it's a database-wide extension, not a table this
-- schema owns exclusively -- dropping it is only safe if nothing else in
-- the database has come to depend on it since. If you're rolling back
-- immediately after applying 0002/0003 with nothing else built on top,
-- it's safe to also run:
--
--   drop extension if exists pg_trgm;
--
-- but that line is commented out deliberately rather than run
-- automatically.

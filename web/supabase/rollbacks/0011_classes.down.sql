-- Rollback for 0011_classes.sql.
-- Drops in the exact reverse of the forward create order.

drop table if exists public.class_students;
drop table if exists public.classes;

-- Lets a Knowledge Base / Documentation article's embedded tutorial video
-- start at a specific timestamp instead of always playing from 0:00.

ALTER TABLE articles ADD COLUMN youtube_start_seconds integer;

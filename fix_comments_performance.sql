-- Performance fix for comments table
-- Run this in Supabase SQL Editor

-- Step 1: Add index on storyId for faster queries
CREATE INDEX IF NOT EXISTS idx_comments_story_id ON comments(story_id);

-- Step 2: Check how much data is in attachmentData
-- This will show you how many comments have large base64 data
SELECT 
  COUNT(*) as total_comments,
  COUNT(CASE WHEN attachment_data IS NOT NULL AND attachment_data LIKE 'data:%' THEN 1 END) as with_base64,
  COUNT(CASE WHEN attachment_data IS NOT NULL AND attachment_data LIKE 'http%' THEN 1 END) as with_url,
  pg_size_pretty(SUM(length(attachment_data)::bigint)) as total_attachment_size
FROM comments;

-- Step 3 (OPTIONAL - RUN ONLY IF YOU WANT TO CLEAN UP):
-- This will remove old base64 data that's no longer needed
-- WARNING: This will delete the actual file data from old comments!
-- Only run this if you're okay losing old attachment data
-- 
-- UPDATE comments 
-- SET attachment_data = NULL, attachment_name = '[Attachment removed]'
-- WHERE attachment_data LIKE 'data:%';

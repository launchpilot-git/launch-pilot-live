-- Add promo_video_error column to jobs table to store user-friendly error messages
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS promo_video_error TEXT;

-- Add comment explaining the purpose of this field
COMMENT ON COLUMN jobs.promo_video_error IS 'User-friendly error message when promo video generation fails';
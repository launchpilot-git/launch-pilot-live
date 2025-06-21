-- Migration: Add user plan and generation tracking columns to profiles table
-- Run this in your Supabase SQL editor

-- Add plan column (free/pro)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro'));

-- Add generation tracking columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS generations_used INTEGER DEFAULT 0;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS generations_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create an index on plan for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);

-- Create an index on generations_reset_date for monthly reset queries
CREATE INDEX IF NOT EXISTS idx_profiles_generations_reset_date ON profiles(generations_reset_date);

-- Update existing users to have default values
UPDATE profiles 
SET 
  plan = 'free',
  generations_used = 0,
  generations_reset_date = NOW(),
  updated_at = NOW()
WHERE plan IS NULL;

-- Optional: Function to reset generation counts monthly (can be called via cron)
CREATE OR REPLACE FUNCTION reset_monthly_generations()
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET 
    generations_used = 0,
    generations_reset_date = NOW(),
    updated_at = NOW()
  WHERE 
    plan = 'free' 
    AND generations_reset_date < (NOW() - INTERVAL '1 month');
END;
$$ LANGUAGE plpgsql;

-- Comment explaining the function
COMMENT ON FUNCTION reset_monthly_generations() IS 'Resets generation counts for free users monthly';
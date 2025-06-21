import { createBrowserClient } from '@supabase/ssr'

// Create a single supabase client for interacting with your database
// This will be used in client components
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
)

export type Job = {
  id: string
  user_id: string
  status: "pending" | "generating" | "complete" | "failed"
  business_name: string
  brand_style: string
  industry: string
  image_url: string
  openai_caption?: string
  openai_email?: string
  openai_avatar_script?: string
  openai_cinematic_script?: string
  did_video_url?: string | "script_ready"
  promo_video_url?: string
  promo_video_error?: string
  created_at: string
}

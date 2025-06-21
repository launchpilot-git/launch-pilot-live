import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Test database connection
    const { data, error, count } = await supabase.from("jobs").select("*", { count: "exact", head: true })

    if (error) {
      throw error
    }

    // Test storage bucket access
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()

    if (bucketError) {
      throw bucketError
    }

    const productImagesBucket = buckets.find((bucket) => bucket.name === "product-images")

    return NextResponse.json({
      success: true,
      supabase: {
        connected: true,
        jobsCount: count || 0,
        bucketsCount: buckets.length,
        productImagesBucketExists: !!productImagesBucket,
      },
    })
  } catch (error) {
    console.error("Supabase test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

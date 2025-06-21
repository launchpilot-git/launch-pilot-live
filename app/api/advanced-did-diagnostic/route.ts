import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const diagnostics = {
    account_status: null,
    api_endpoints: null,
    different_images: null,
    credits_check: null,
    presenter_test: null,
    errors: [],
  }

  try {
    const apiKey = process.env.DID_API_KEY
    if (!apiKey) {
      diagnostics.errors.push("No API key found")
      return NextResponse.json({ diagnostics })
    }

    const authHeader = `Basic ${Buffer.from(apiKey).toString("base64")}`

    // Test 1: Check if we can access different endpoints
    console.log("Testing various D-ID endpoints...")
    
    const endpoints = [
      { name: "talks", url: "https://api.d-id.com/talks", method: "GET" },
      { name: "credits", url: "https://api.d-id.com/credits", method: "GET" },
      { name: "presenters", url: "https://api.d-id.com/clips/presenters", method: "GET" },
    ]

    const endpointResults = {}
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            Authorization: authHeader,
            Accept: "application/json",
          },
        })
        endpointResults[endpoint.name] = {
          status: response.status,
          accessible: [200, 401, 403].includes(response.status)
        }
      } catch (error) {
        endpointResults[endpoint.name] = {
          status: "error",
          error: error.message,
          accessible: false
        }
      }
    }
    diagnostics.api_endpoints = endpointResults

    // Test 2: Try different source images
    console.log("Testing different presenter images...")
    
    const testImages = [
      "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.jpeg",
      "https://create-images-results.d-id.com/DefaultPresenters/male_presenter/image.jpeg",
      "https://static.d-id.com/images/presenters/amy.jpg"
    ]

    const imageResults = {}
    for (const imageUrl of testImages) {
      try {
        const testRequest = {
          source_url: imageUrl,
          script: {
            type: "text",
            input: "This is a test with a different presenter image to isolate the issue.",
            provider: {
              type: "microsoft",
              voice_id: "en-US-JennyNeural",
              voice_config: {
                style: "Cheerful"
              }
            }
          },
          config: {
            stitch: true,
            result_format: "mp4"
          }
        }

        const response = await fetch("https://api.d-id.com/talks", {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(testRequest),
        })

        const responseText = await response.text()
        imageResults[imageUrl] = {
          status: response.status,
          success: response.ok,
          response: responseText.substring(0, 200) + (responseText.length > 200 ? "..." : "")
        }

        // If any succeed, we found a working combination
        if (response.ok) {
          console.log(`✅ SUCCESS with image: ${imageUrl}`)
          break
        }
      } catch (error) {
        imageResults[imageUrl] = {
          status: "error",
          error: error.message,
          success: false
        }
      }
    }
    diagnostics.different_images = imageResults

    // Test 3: Check credits if accessible
    try {
      const creditsResponse = await fetch("https://api.d-id.com/credits", {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
      })

      if (creditsResponse.ok) {
        const creditsData = await creditsResponse.json()
        diagnostics.credits_check = {
          available: true,
          data: creditsData
        }
      } else {
        diagnostics.credits_check = {
          available: false,
          status: creditsResponse.status
        }
      }
    } catch (error) {
      diagnostics.credits_check = {
        available: false,
        error: error.message
      }
    }

    // Test 4: Try with minimal fields to see exact validation errors
    console.log("Testing absolute minimal request...")
    
    try {
      const minimalRequest = {
        source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.jpeg",
        script: {
          type: "text",
          input: "Testing minimal configuration."
        }
      }

      const response = await fetch("https://api.d-id.com/talks", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(minimalRequest),
      })

      const responseText = await response.text()
      diagnostics.presenter_test = {
        minimal_request: {
          status: response.status,
          success: response.ok,
          response: responseText
        }
      }
    } catch (error) {
      diagnostics.presenter_test = {
        minimal_request: {
          error: error.message
        }
      }
    }

    // Test 5: Account verification check
    console.log("Checking account status indicators...")
    
    // Sometimes account issues show up in specific error patterns
    const accountIndicators = {
      canAccessTalks: endpointResults["talks"]?.accessible || false,
      canAccessCredits: endpointResults["credits"]?.accessible || false,
      canAccessPresenters: endpointResults["presenters"]?.accessible || false,
      hasWorkingImage: Object.values(imageResults).some((result: any) => result.success),
    }

    diagnostics.account_status = accountIndicators

    // Determine likely issues
    if (!accountIndicators.canAccessTalks) {
      diagnostics.errors.push("Cannot access talks endpoint - possible account or auth issue")
    }

    if (!accountIndicators.hasWorkingImage) {
      diagnostics.errors.push("No presenter images work - possible account limitation or API change")
    }

    if (accountIndicators.canAccessTalks && !accountIndicators.hasWorkingImage) {
      diagnostics.errors.push("Authentication works but talk creation fails - likely request format or account verification issue")
    }

    return NextResponse.json({ diagnostics })
  } catch (error) {
    console.error("Advanced diagnostic error:", error)
    diagnostics.errors.push(`Exception: ${error.message}`)
    return NextResponse.json({ diagnostics }, { status: 500 })
  }
}
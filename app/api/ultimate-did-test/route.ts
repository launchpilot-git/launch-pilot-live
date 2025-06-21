import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const testResults = {
    api_key_validation: null,
    endpoint_tests: {},
    presenter_image_tests: {},
    minimal_payload_tests: {},
    header_analysis: {},
    account_verification: {},
    error_analysis: [],
  }

  try {
    const apiKey = process.env.DID_API_KEY
    if (!apiKey) {
      testResults.error_analysis.push("No API key found")
      return NextResponse.json(testResults)
    }

    // Validate API key format
    const [username, password] = apiKey.split(":")
    testResults.api_key_validation = {
      hasColon: apiKey.includes(":"),
      username: username ? username.substring(0, 5) + "..." : "missing",
      password: password ? "***" + password.substring(password.length - 3) : "missing",
      totalLength: apiKey.length,
      usernameLength: username?.length || 0,
      passwordLength: password?.length || 0,
    }

    const authHeader = `Basic ${Buffer.from(apiKey).toString("base64")}`

    // Test 1: Try different D-ID endpoints
    console.log("Testing various D-ID endpoints...")
    const endpoints = [
      { name: "talks_get", url: "https://api.d-id.com/talks", method: "GET" },
      { name: "credits", url: "https://api.d-id.com/credits", method: "GET" },
      { name: "clips_presenters", url: "https://api.d-id.com/clips/presenters", method: "GET" },
      { name: "images", url: "https://api.d-id.com/images", method: "GET" },
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            Authorization: authHeader,
            Accept: "application/json",
          },
        })

        const responseText = await response.text()
        testResults.endpoint_tests[endpoint.name] = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText.substring(0, 500),
          success: response.ok,
        }
      } catch (error) {
        testResults.endpoint_tests[endpoint.name] = {
          error: error.message,
          success: false,
        }
      }
    }

    // Test 2: Try completely different presenter images
    console.log("Testing alternative presenter images...")
    const imageUrls = [
      "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.jpeg",
      "https://static.d-id.com/images/presenters/amy.jpg",
      "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.png",
      "https://d-id-public-bucket.s3.amazonaws.com/or-dvir.jpg", // D-ID founder's image from their demos
    ]

    for (const imageUrl of imageUrls) {
      try {
        // First check if image is accessible
        const imageCheck = await fetch(imageUrl, { method: "HEAD" })
        
        const testPayload = {
          source_url: imageUrl,
          script: {
            type: "text",
            input: "Hello world test",
          },
        }

        const response = await fetch("https://api.d-id.com/talks", {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(testPayload),
        })

        const responseText = await response.text()
        testResults.presenter_image_tests[imageUrl] = {
          image_accessible: imageCheck.ok,
          status: response.status,
          success: response.ok,
          response_body: responseText,
        }

        // If any succeed, note it
        if (response.ok) {
          console.log(`SUCCESS with image: ${imageUrl}`)
          testResults.error_analysis.push(`SUCCESS FOUND with image: ${imageUrl}`)
          break
        }
      } catch (error) {
        testResults.presenter_image_tests[imageUrl] = {
          error: error.message,
          success: false,
        }
      }
    }

    // Test 3: Try absolutely minimal payloads
    console.log("Testing minimal payloads...")
    const minimalTests = [
      {
        name: "only_required_fields",
        payload: {
          source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.jpeg",
          script: {
            type: "text",
            input: "Hi",
          },
        },
      },
      {
        name: "with_provider_only",
        payload: {
          source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.jpeg",
          script: {
            type: "text",
            input: "Hi",
            provider: {
              type: "microsoft",
              voice_id: "en-US-JennyNeural",
            },
          },
        },
      },
      {
        name: "different_voice",
        payload: {
          source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.jpeg",
          script: {
            type: "text",
            input: "Test",
            provider: {
              type: "microsoft",
              voice_id: "en-US-AriaNeural", // Different voice
            },
          },
        },
      },
    ]

    for (const test of minimalTests) {
      try {
        const response = await fetch("https://api.d-id.com/talks", {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(test.payload),
        })

        const responseText = await response.text()
        testResults.minimal_payload_tests[test.name] = {
          status: response.status,
          success: response.ok,
          response_body: responseText,
          request_body: test.payload,
        }

        if (response.ok) {
          console.log(`SUCCESS with minimal test: ${test.name}`)
          testResults.error_analysis.push(`SUCCESS FOUND with minimal test: ${test.name}`)
        }
      } catch (error) {
        testResults.minimal_payload_tests[test.name] = {
          error: error.message,
          success: false,
        }
      }
    }

    // Test 4: Header analysis
    testResults.header_analysis = {
      auth_header_length: authHeader.length,
      auth_header_format: authHeader.substring(0, 20) + "...",
      base64_valid: (() => {
        try {
          const decoded = Buffer.from(authHeader.replace("Basic ", ""), "base64").toString()
          return decoded.includes(":")
        } catch {
          return false
        }
      })(),
    }

    // Test 5: Account verification attempts
    console.log("Testing account verification...")
    try {
      // Try to get user info or account status
      const accountResponse = await fetch("https://api.d-id.com/talks?limit=1", {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
      })

      const accountText = await accountResponse.text()
      testResults.account_verification = {
        status: accountResponse.status,
        can_list_talks: accountResponse.ok,
        response: accountText.substring(0, 500),
      }
    } catch (error) {
      testResults.account_verification = {
        error: error.message,
      }
    }

    // Analysis
    const hasAnySuccess = 
      Object.values(testResults.presenter_image_tests).some((test: any) => test.success) ||
      Object.values(testResults.minimal_payload_tests).some((test: any) => test.success)

    if (!hasAnySuccess) {
      testResults.error_analysis.push("NO SUCCESSFUL REQUESTS FOUND - Likely account or API issue")
    }

    if (testResults.account_verification.can_list_talks) {
      testResults.error_analysis.push("Can list talks but cannot create - Likely permission or validation issue")
    }

    return NextResponse.json(testResults)
  } catch (error) {
    console.error("Ultimate test error:", error)
    testResults.error_analysis.push(`Exception: ${error.message}`)
    return NextResponse.json(testResults, { status: 500 })
  }
}
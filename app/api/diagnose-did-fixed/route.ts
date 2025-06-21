import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const diagnostics = {
    step1_env_check: null,
    step2_api_key_format: null,
    step3_basic_auth_test: null,
    step4_minimal_request: null,
    step5_enhanced_request: null,
    errors: [],
  }

  try {
    // Step 1: Check environment variables
    const apiKey = process.env.DID_API_KEY
    diagnostics.step1_env_check = {
      hasApiKey: !!apiKey,
      keyLength: apiKey ? apiKey.length : 0,
      keyFormat: apiKey ? (apiKey.includes(":") ? "username:password" : "single_string") : "missing",
    }

    if (!apiKey) {
      diagnostics.errors.push("DID_API_KEY environment variable is missing")
      return NextResponse.json({ diagnostics })
    }

    // Step 2: Validate API key format
    if (!apiKey.includes(":")) {
      diagnostics.errors.push("API key should be in format 'username:password'")
      return NextResponse.json({ diagnostics })
    }

    const [username, password] = apiKey.split(":")
    diagnostics.step2_api_key_format = {
      username: username ? username.substring(0, 3) + "..." : "missing",
      password: password ? "***" + password.substring(password.length - 3) : "missing",
      usernameLength: username ? username.length : 0,
      passwordLength: password ? password.length : 0,
    }

    // Step 3: Test basic authentication
    const authHeader = `Basic ${Buffer.from(apiKey).toString("base64")}`
    console.log("Testing D-ID authentication...")

    const authResponse = await fetch("https://api.d-id.com/talks", {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    })

    diagnostics.step3_basic_auth_test = {
      status: authResponse.status,
      statusText: authResponse.statusText,
    }

    // Step 4: Try the original minimal talk creation request
    if ([200, 401, 403].includes(authResponse.status)) {
      console.log("Authentication works, trying original minimal request...")

      const minimalRequest = {
        source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.png",
        script: {
          type: "text",
          input: "Hello world",
        },
      }

      const createResponse = await fetch("https://api.d-id.com/talks", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(minimalRequest),
      })

      const createResponseText = await createResponse.text()
      console.log("D-ID Original Request Response:", createResponseText)

      diagnostics.step4_minimal_request = {
        status: createResponse.status,
        statusText: createResponse.statusText,
        responseBody: createResponseText,
        success: createResponse.ok,
      }

      // Step 5: Try enhanced request with proper D-ID format
      console.log("Trying enhanced request with proper D-ID configuration...")

      const enhancedRequest = {
        source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.png",
        script: {
          type: "text",
          input: "Hello! This is a test of the D-ID API integration. Thank you for watching this demonstration.",
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

      const enhancedResponse = await fetch("https://api.d-id.com/talks", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(enhancedRequest),
      })

      const enhancedResponseText = await enhancedResponse.text()
      console.log("D-ID Enhanced Request Response:", enhancedResponseText)

      diagnostics.step5_enhanced_request = {
        status: enhancedResponse.status,
        statusText: enhancedResponse.statusText,
        responseBody: enhancedResponseText,
        success: enhancedResponse.ok,
        requestBody: enhancedRequest,
      }

      if (!createResponse.ok && !enhancedResponse.ok) {
        diagnostics.errors.push(`Both requests failed: Original ${createResponse.status}, Enhanced ${enhancedResponse.status}`)
      } else if (createResponse.ok) {
        console.log("✅ Original minimal request worked!")
      } else if (enhancedResponse.ok) {
        console.log("✅ Enhanced request worked!")
        diagnostics.errors.push("Original request failed but enhanced request succeeded - try using provider config and longer script")
      }
    } else {
      diagnostics.errors.push(`Authentication failed with status: ${authResponse.status}`)
    }

    return NextResponse.json({ diagnostics })
  } catch (error) {
    console.error("Diagnostic error:", error)
    diagnostics.errors.push(`Exception: ${error.message}`)
    return NextResponse.json({ diagnostics }, { status: 500 })
  }
}

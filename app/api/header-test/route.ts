import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const testResults = {
    curl_test: null,
    different_headers: {},
    different_fetch_configs: {},
    raw_request_test: null,
  }

  try {
    const apiKey = process.env.DID_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "No API key" })
    }

    // Test 1: Try exactly like curl (minimal headers)
    console.log("Testing curl-like request...")
    try {
      const curlLikeRequest = {
        source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.jpeg",
        script: {
          type: "text",
          input: "Hello world"
        }
      }

      const response = await fetch("https://api.d-id.com/talks", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(apiKey).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(curlLikeRequest),
      })

      const responseText = await response.text()
      testResults.curl_test = {
        status: response.status,
        success: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        response: responseText,
      }
    } catch (error) {
      testResults.curl_test = { error: error.message }
    }

    // Test 2: Try different header combinations
    const headerTests = [
      {
        name: "minimal_headers",
        headers: {
          "Authorization": `Basic ${Buffer.from(apiKey).toString("base64")}`,
          "Content-Type": "application/json",
        }
      },
      {
        name: "with_accept",
        headers: {
          "Authorization": `Basic ${Buffer.from(apiKey).toString("base64")}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        }
      },
      {
        name: "with_user_agent",
        headers: {
          "Authorization": `Basic ${Buffer.from(apiKey).toString("base64")}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "LaunchPilot/1.0",
        }
      },
      {
        name: "postman_like",
        headers: {
          "Authorization": `Basic ${Buffer.from(apiKey).toString("base64")}`,
          "Content-Type": "application/json",
          "Accept": "*/*",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
        }
      }
    ]

    const testPayload = {
      source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.jpeg",
      script: {
        type: "text",
        input: "Test message"
      }
    }

    for (const headerTest of headerTests) {
      try {
        const response = await fetch("https://api.d-id.com/talks", {
          method: "POST",
          headers: headerTest.headers,
          body: JSON.stringify(testPayload),
        })

        const responseText = await response.text()
        testResults.different_headers[headerTest.name] = {
          status: response.status,
          success: response.ok,
          response: responseText.substring(0, 200),
        }

        if (response.ok) {
          console.log(`SUCCESS with headers: ${headerTest.name}`)
        }
      } catch (error) {
        testResults.different_headers[headerTest.name] = {
          error: error.message,
        }
      }
    }

    // Test 3: Try different fetch configurations
    const fetchConfigs = [
      {
        name: "default_fetch",
        config: {}
      },
      {
        name: "no_cache",
        config: { cache: "no-cache" }
      },
      {
        name: "with_signal",
        config: { 
          signal: AbortSignal.timeout(30000),
          cache: "no-cache"
        }
      }
    ]

    for (const fetchConfig of fetchConfigs) {
      try {
        const response = await fetch("https://api.d-id.com/talks", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${Buffer.from(apiKey).toString("base64")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(testPayload),
          ...fetchConfig.config
        })

        const responseText = await response.text()
        testResults.different_fetch_configs[fetchConfig.name] = {
          status: response.status,
          success: response.ok,
          response: responseText.substring(0, 200),
        }

        if (response.ok) {
          console.log(`SUCCESS with fetch config: ${fetchConfig.name}`)
        }
      } catch (error) {
        testResults.different_fetch_configs[fetchConfig.name] = {
          error: error.message,
        }
      }
    }

    // Test 4: Try with raw request inspection
    try {
      const body = JSON.stringify(testPayload)
      console.log("Raw request details:", {
        url: "https://api.d-id.com/talks",
        method: "POST",
        bodyLength: body.length,
        bodyContent: body,
        authHeaderLength: `Basic ${Buffer.from(apiKey).toString("base64")}`.length,
      })

      testResults.raw_request_test = {
        body_length: body.length,
        body_content: body,
        auth_header_length: `Basic ${Buffer.from(apiKey).toString("base64")}`.length,
        api_key_format: {
          has_colon: apiKey.includes(":"),
          parts: apiKey.split(":").length,
        }
      }
    } catch (error) {
      testResults.raw_request_test = { error: error.message }
    }

    return NextResponse.json(testResults)
  } catch (error) {
    console.error("Header test error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
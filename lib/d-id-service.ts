interface DIDTalkRequest {
  source_url: string
  script: {
    type: "text" | "audio"
    input?: string
    audio_url?: string
    provider?: {
      type: "microsoft" | "elevenlabs" | "amazon"
      voice_id: string
      voice_config?: {
        style?: string
        pitch?: string
        rate?: string
      }
    }
  }
  config?: {
    stitch?: boolean
    result_format?: string
    driver_url?: string
    driver_expressions?: {
      expressions: Array<{
        start_frame: number
        expression: "neutral" | "happy" | "surprise" | "serious"
        intensity: number
      }>
      transition_frames?: number
    }
  }
  webhook?: string
  webhook_data?: any
}

interface DIDTalkResponse {
  id: string
  object: string
  created_at: string
  created_by: string
  status: "created" | "started" | "done" | "error"
  result_url?: string
  error?: string
  metadata?: any
  face?: any
  config?: any
}

export class DIDService {
  private apiKey: string
  private baseUrl = "https://api.d-id.com"

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("D-ID API key is required")
    }

    // Store the API key as-is - we'll handle encoding in getAuthHeader
    this.apiKey = apiKey

    // Log API key format for debugging (without revealing the actual key)
    console.log("D-ID API key format:", {
      length: apiKey.length,
      containsColon: apiKey.includes(":"),
      firstPart: apiKey.split(":")[0]?.substring(0, 5) + "...",
      secondPart: apiKey.split(":")[1] ? apiKey.split(":")[1].substring(0, 3) + "..." : "missing",
    })
  }

  private getAuthHeader(): string {
    // The API key should already be in format "username:password"
    // We just need to base64 encode it for Basic auth
    return `Basic ${Buffer.from(this.apiKey).toString("base64")}`
  }

  async createTalk(request: DIDTalkRequest): Promise<DIDTalkResponse> {
    try {
      console.log("D-ID API Request:", JSON.stringify(request, null, 2))

      // Log the authorization header (partially masked)
      const authHeader = this.getAuthHeader()
      console.log("Auth header format:", {
        length: authHeader.length,
        prefix: authHeader.substring(0, 10) + "...",
        suffix: "..." + authHeader.substring(authHeader.length - 5),
      })

      const response = await fetch(`${this.baseUrl}/talks`, {
        method: "POST",
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(request),
      })

      console.log("D-ID API Response Status:", response.status)
      console.log("D-ID API Response Headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("D-ID API Error Response:", errorText)

        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText }
        }

        throw new Error(`D-ID API error (${response.status}): ${JSON.stringify(errorData)}`)
      }

      const responseData = await response.json()
      console.log("D-ID API Success Response:", responseData)
      return responseData
    } catch (error) {
      console.error("D-ID createTalk error:", error)
      throw error
    }
  }

  async getTalk(talkId: string): Promise<DIDTalkResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/talks/${talkId}`, {
        method: "GET",
        headers: {
          Authorization: this.getAuthHeader(),
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText }
        }
        throw new Error(`D-ID API error (${response.status}): ${JSON.stringify(errorData)}`)
      }

      return await response.json()
    } catch (error) {
      console.error("D-ID getTalk error:", error)
      throw error
    }
  }

  async checkImageForFace(imageUrl: string): Promise<boolean> {
    try {
      // Simple check - we'll let D-ID handle the validation
      // In a production app, you might want to use a face detection service first
      const response = await fetch(imageUrl, { method: "HEAD" })
      return response.ok
    } catch (error) {
      console.error("Error checking image:", error)
      return false
    }
  }

  async createTalkFromScript(
    imageUrl: string,
    script: string,
    options: {
      voice?: "en-US-JennyNeural" | "en-US-BrianNeural" | "en-US-AriaNeural"
      voiceStyle?:
        | "Cheerful"
        | "Excited"
        | "Friendly"
        | "Hopeful"
        | "Shouting"
        | "Terrified"
        | "Unfriendly"
        | "Whispering"
      expressions?: Array<{
        start_frame: number
        expression: "neutral" | "happy" | "surprise" | "serious"
        intensity: number
      }>
      webhook?: string
      webhookData?: any
      useDefaultPresenter?: boolean
    } = {},
  ): Promise<DIDTalkResponse> {
    // Validate script length (D-ID has limits)
    if (script.length > 500) {
      script = script.substring(0, 500) + "..."
      console.warn("Script truncated to 500 characters for D-ID API")
    }

    // Use a default presenter image if the product image doesn't have a face
    const presenterImageUrl = options.useDefaultPresenter
      ? "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.png"
      : imageUrl

    console.log("Creating D-ID talk with:", {
      presenterImageUrl,
      scriptLength: script.length,
      voice: options.voice,
      voiceStyle: options.voiceStyle,
      useDefaultPresenter: options.useDefaultPresenter,
    })

    // Build the request according to D-ID API specification
    const request: DIDTalkRequest = {
      source_url: presenterImageUrl,
      script: {
        type: "text",
        input: script,
        provider: {
          type: "microsoft",
          voice_id: options.voice || "en-US-JennyNeural",
          voice_config: {
            style: options.voiceStyle || "Cheerful",
          },
        },
      },
      config: {
        stitch: true,
        result_format: "mp4",
      },
    }

    // Add expressions only if specified
    if (options.expressions && options.expressions.length > 0) {
      request.config!.driver_expressions = {
        expressions: options.expressions,
        transition_frames: 20,
      }
    }

    // Add webhook only if specified
    if (options.webhook) {
      request.webhook = options.webhook
      if (options.webhookData) {
        request.webhook_data = options.webhookData
      }
    }

    return this.createTalk(request)
  }

  // Simple test method to check API connectivity
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/talks`, {
        method: "GET",
        headers: {
          Authorization: this.getAuthHeader(),
          Accept: "application/json",
        },
      })

      console.log("D-ID Connection Test Status:", response.status)
      // 200 = success, 401 = auth working but no permission for GET, 403 = auth working but forbidden
      return [200, 401, 403].includes(response.status)
    } catch (error) {
      console.error("D-ID Connection Test Failed:", error)
      return false
    }
  }
}

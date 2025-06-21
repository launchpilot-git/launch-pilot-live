import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Get the video URL from the query parameters
    const { searchParams } = new URL(request.url)
    const videoUrl = searchParams.get("url")

    if (!videoUrl) {
      return NextResponse.json({ error: "No video URL provided" }, { status: 400 })
    }

    // Create a simple HTML page with a video player
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Avatar Video Player</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #240029 0%, #1a0020 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .video-container {
            position: relative;
            width: 100%;
            max-width: 500px;
            aspect-ratio: 1 / 1;
            background: #000;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          }
          video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 16px;
          }
          .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #240029 0%, #1a0020 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            border-radius: 16px;
            opacity: 1;
            transition: opacity 0.3s ease;
          }
          .loading-overlay.hidden {
            opacity: 0;
            pointer-events: none;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 222, 0, 0.3);
            border-top: 3px solid #ffde00;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .loading-text {
            color: #ffde00;
            font-size: 14px;
            font-weight: 500;
            text-align: center;
            opacity: 0.9;
          }
          .video-title {
            color: #ffde00;
            font-size: 18px;
            font-weight: 600;
            text-align: center;
            margin-bottom: 20px;
            opacity: 0.9;
          }
        </style>
      </head>
      <body>
        <div>
          <div class="video-title">Avatar Video</div>
          <div class="video-container">
            <video 
              id="avatarVideo" 
              controls 
              autoplay 
              muted
              onloadstart="hideLoading()"
              oncanplay="hideLoading()"
              onerror="showError()"
            >
              <source src="${videoUrl}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
            <div class="loading-overlay" id="loadingOverlay">
              <div class="spinner"></div>
              <div class="loading-text">Loading your avatar video...</div>
            </div>
          </div>
        </div>
        
        <script>
          function hideLoading() {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
              overlay.classList.add('hidden');
            }
          }
          
          function showError() {
            const overlay = document.getElementById('loadingOverlay');
            const loadingText = overlay.querySelector('.loading-text');
            const spinner = overlay.querySelector('.spinner');
            
            spinner.style.display = 'none';
            loadingText.textContent = 'Error loading video. Please try again.';
            loadingText.style.color = '#ff6b6b';
          }
          
          // Auto-hide loading after 3 seconds as fallback
          setTimeout(hideLoading, 3000);
        </script>
      </body>
      </html>
    `

    // Return the HTML page
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    })
  } catch (error) {
    console.error("Error in video player:", error)
    return NextResponse.json(
      { error: "Failed to create video player" },
      { status: 500 }
    )
  }
}

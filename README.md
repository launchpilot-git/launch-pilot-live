# LaunchPilot - AI Marketing Content Generator

LaunchPilot is a SaaS platform that generates marketing content using AI. Upload a product image and get social media captions, email templates, and professional videos.

## Features

- **Freemium Model**: 3 generations/month for free users, unlimited for Pro
- **AI Content Generation**: GPT-4o Vision analyzes images and creates 4 content types
- **Video Generation**: D-ID talking avatars + Runway ML cinematic videos
- **Real-time Updates**: Live status updates via Supabase subscriptions
- **Custom Video Player**: Professional video player with brand theming

## Tech Stack

- **Frontend**: Next.js 15.2.4 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: Supabase (PostgreSQL + Auth + Real-time)
- **AI APIs**: OpenAI GPT-4o, D-ID, Runway ML
- **UI**: shadcn/ui components with custom brand styling

## Deployment

### Vercel (Recommended)

1. **Push to GitHub**
2. **Import to Vercel**: Connect your GitHub repository
3. **Add Environment Variables** in Vercel dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=sk-your_openai_key
   DID_API_KEY=username:password
   RUNWAY_API_KEY=your_runway_key
   ```
4. **Deploy**: Automatic on every push

### Environment Variables Required

Copy `.env.example` to `.env.local` and fill in your API keys:

- **Supabase**: Database and authentication
- **OpenAI**: Content generation with GPT-4o Vision
- **D-ID**: Talking avatar video generation
- **Runway ML**: Cinematic product videos

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

### Content Generation Pipeline
1. User uploads product image
2. OpenAI GPT-4o Vision analyzes image
3. Generates: social caption, email, avatar script, cinematic script
4. D-ID creates talking avatar videos (async with polling)
5. Runway ML creates cinematic videos
6. Real-time UI updates via Supabase subscriptions

### Plan Enforcement
- Server-side validation on all API routes
- Generation counting with monthly reset
- UI conditionally renders based on user plan

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── results/           # Content results
├── components/            # React components
│   ├── ui/               # shadcn/ui base components
│   └── custom/           # Custom components
├── lib/                  # Utilities and services
├── hooks/                # Custom React hooks
└── migrations/           # Supabase migrations
```

## Key Components

- **CustomVideoPlayer**: Professional video player with brand theming
- **DownloadDropdown**: Multi-format content download with portal positioning
- **VideoStatusPoller**: Real-time video generation status updates
- **Plan-based routing**: Free vs Pro user experiences

## Production Notes

- **Vercel Pro recommended** for 60s function timeouts
- **Async video processing** with polling handles serverless limitations
- **No webhook dependencies** for reliable video completion
- **Direct file downloads** for better UX

Built with ❤️ for professional marketing content generation.
1# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Production Deployment

**Current Production URL**: [https://launch-pilot-live.vercel.app/](https://launch-pilot-live.vercel.app/)

**GitHub Repository**: [https://github.com/launchpilot-git/launch-pilot-live](https://github.com/launchpilot-git/launch-pilot-live)

*Note: This is the current production URL until a custom domain is added.*

### Git Workflow
**ALWAYS push to the GitHub repository using standard git commands:**
```bash
git add .
git commit -m "your commit message"
git push origin main
```
Vercel automatically deploys from the main branch of this GitHub repository.

## Development Commands

```bash
# Development
npm run dev              # Start development server (Next.js 15.2.4)
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint

# Manual video polling (if D-ID videos stuck processing)
node scripts/manual-poll-did-videos.js
```

## Architecture Overview

### Freemium Business Model
LaunchPilot is a SaaS platform with a freemium model:
- **Free Plan**: 3 generations/month, captions + emails only
- **Pro Plan**: Unlimited generations, full content access including videos
- Plan enforcement at API level with server-side validation
- Generation counting and monthly reset functionality

### Content Generation Pipeline
1. **User uploads product image** via drag-and-drop interface
2. **OpenAI GPT-4o Vision** analyzes image and generates 4 content types:
   - Social media caption
   - Marketing email
   - Avatar video script  
   - Cinematic video script
3. **Parallel video generation**:
   - D-ID API creates talking avatar videos (async with polling)
   - Runway ML creates cinematic product videos
4. **Real-time updates** via Supabase subscriptions

### Database Architecture (Supabase)
- **jobs**: Main content generation records with status tracking
- **profiles**: User plan management (free/pro), generation counters
- **job_logs**: Detailed step-by-step processing logs
- Real-time subscriptions for live UI updates

### Authentication & Authorization
- Supabase Auth with Google OAuth integration
- useAuth hook provides: `user`, `plan`, `generationsUsed`, `canGenerate`
- API routes validate user sessions and enforce plan limits
- Automatic profile creation for new users (defaults to free plan)

### Plan-Based UI Components
- Smart routing: `/dashboard/free` vs `/dashboard/pro`
- Conditional rendering based on user plan
- Locked content overlays for premium features
- Upgrade CTAs and limit modals for free users

### Video Processing
- **D-ID Integration**: Async video generation with talk ID polling
- **Runway ML Integration**: Official SDK for cinematic videos
- **VideoStatusPoller**: Client-side component for real-time status updates
- Webhook support for video completion notifications

### Brand Design System
- **Primary Color**: `#240029` (dark purple)
- **Accent Color**: `#ffde00` (bright yellow)
- shadcn/ui components with custom brand color overrides
- Consistent theming across free/pro experiences

## Key File Locations

### Core Business Logic
- `app/api/process-job/route.ts` - Main content generation endpoint with plan enforcement
- `hooks/useAuth.tsx` - Authentication and plan management
- `lib/supabase.ts` - Database client and Job type definitions

### Plan-Specific Components
- `components/dashboard-free.tsx` - Free user dashboard with limits
- `components/dashboard-pro.tsx` - Pro user dashboard with grid layout
- `components/generate-free.tsx` - Limited feature generation interface
- `components/generate-pro.tsx` - Full feature generation interface

### Video Processing
- `lib/d-id-service.ts` - D-ID API integration
- `lib/poll-did-videos.ts` - Video polling logic
- `components/VideoStatusPoller.tsx` - Real-time video status updates

### Upgrade Flow
- `app/checkout/page.tsx` - Upgrade checkout page
- `components/upgrade-cta.tsx` - Reusable upgrade button
- `components/upgrade-limit-modal.tsx` - Limit reached modal

## Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Content Generation APIs
OPENAI_API_KEY=
DID_API_KEY=                    # Format: "username:password"
RUNWAY_API_KEY=                 # Or RUNWAYML_API_SECRET

# OAuth (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Video Processing Notes

### D-ID Video Polling
- Videos generate asynchronously (1-3 minutes)
- Status stored as `pending:{talk_id}` until complete
- Multiple polling mechanisms:
  - Client-side: VideoStatusPoller (5-second intervals)
  - Manual: `GET /api/poll-did-videos`
  - Script: `scripts/manual-poll-did-videos.js`

### Runway ML Integration
- Uses official Runway ML SDK
- Synchronous polling in process-job endpoint
- 5-second product demo videos from static images

## Testing Plan Functionality

1. **Free User Flow**:
   - Create account (defaults to free)
   - Generate 3 pieces of content
   - Hit generation limit on 4th attempt
   - See locked video content with blur overlay

2. **Upgrade Flow**:
   - Visit `/checkout`
   - Use "Demo Upgrade" button (for testing)
   - Verify unlimited access as pro user

3. **Video Processing**:
   - Check job logs for D-ID polling status
   - Monitor VideoStatusPoller component logs
   - Verify videos complete and display correctly

## Common Issues

### Videos Stuck in "Processing"
1. Check D-ID API key format (must be "username:password")
2. Run manual polling: `node scripts/manual-poll-did-videos.js`
3. Check browser console for VideoStatusPoller errors

### Plan Enforcement Issues
- Verify generation counting in profiles table
- Check API route authentication logic
- Ensure plan updates trigger UI refresh via useAuth

### Brand Colors Not Displaying
- Confirm globals.css has correct CSS variables
- Verify tailwind.config.ts has hardcoded overrides
- Check component usage of `accent` and `primary` classes

## Playwright MCP Testing

Claude should utilize Playwright MCP to test the application as much as possible without asking for permission. This includes:

- Running browser console logs to identify any errors or warnings during application execution.
- Viewing and interacting with the UI to ensure all components render and function correctly.

### Suggested Bash Command

Claude may need to run the following bash command to initiate Playwright tests:

```bash
npx playwright test
```

Feel free to leverage your knowledge of Playwright MCP's capabilities and the specifics of our codebase to refine and execute these tests effectively.

## GitHub Operations

For any GitHub operations including uploading, pushing, committing, or managing repositories, Claude should **NOT** use the GitHub MCP server. Instead:

- Use standard git commands for commits and pushes
- Manage branches and pull requests via git CLI
- Handle repository operations through regular git commands

**Important**: Do not use the GitHub MCP server. Always use standard git commands for consistency and proper integration with the project workflow.
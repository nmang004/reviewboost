# Claude.md - ReviewBoost Project Reference

## Project Overview
ReviewBoost is a gamified employee review collection system built with Next.js 15, TypeScript, Supabase, and Tailwind CSS. It motivates teams to gather customer feedback through points, leaderboards, and recognition.

## Quick Commands
```bash
# Development
npm run dev              # Start dev server with turbopack
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # ESLint
npm run type-check      # TypeScript checking
npm run check           # Run both lint and type-check
```

## Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Deployment**: Vercel (frontend), Railway (optional backend)

## Key File Locations
```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── reviews/submit/     # Review submission
│   │   ├── leaderboard/        # Leaderboard data
│   │   └── dashboard/stats/    # Dashboard analytics
│   ├── dashboard/              # Business owner dashboard
│   ├── submit-review/          # Review submission form
│   └── login/                  # Authentication
├── components/
│   ├── ui/                     # Reusable UI components
│   ├── auth/                   # Auth-related components
│   ├── dashboard/              # Dashboard components
│   ├── reviews/                # Review components
│   └── layout/                 # Header, Footer
├── hooks/
│   └── useAuth.ts              # Authentication hook
├── lib/
│   ├── supabase.ts             # Supabase client
│   └── utils.ts                # Utility functions
└── types/
    └── index.ts                # TypeScript definitions
```

## Database Schema
- **users**: User profiles (employee/business_owner roles)
- **reviews**: Customer review submissions
- **points**: Employee points tracking

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Demo Credentials
- Employee: employee@demo.com / demo123
- Business Owner: owner@demo.com / demo123

## Development Notes
- Uses Next.js App Router with TypeScript
- Supabase handles auth, database, and real-time updates
- Points system: 10 base points + 5 bonus for photos
- Form validation with React Hook Form + Zod
- Responsive design with Tailwind CSS
- Component system based on Radix UI primitives

## Testing & Deployment
- ESLint + TypeScript for code quality
- Vercel for frontend deployment
- Railway for additional backend services (optional)
- Demo users managed through Supabase Auth dashboard

## Recent Work
- Fixed authentication race conditions
- Added comprehensive debug logging
- Updated About page with founder information
- Resolved ESLint apostrophe escaping issues
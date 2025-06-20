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
- **AI Tools**: Serena MCP for intelligent code analysis and insights

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

## AI Tools Integration

### Serena MCP
Serena MCP provides intelligent code analysis and insights for the ReviewBoost project:

**Available Commands:**
- `mcp__serena_analyze` - Analyze code structure, patterns, and potential improvements
- `mcp__serena_suggest` - Get AI-powered suggestions for code optimization
- `mcp__serena_review` - Perform comprehensive code review analysis

**Usage Examples:**
```bash
# Analyze a specific component
mcp__serena_analyze --file src/components/dashboard/LeaderboardCard.tsx

# Get suggestions for improving form validation
mcp__serena_suggest --context "React Hook Form validation patterns"

# Review API route implementation
mcp__serena_review --file src/app/api/reviews/submit/route.ts
```

### Context7 MCP
Context7 MCP provides up-to-date, version-specific documentation and code examples directly in Claude Code:

**Key Features:**
- Real-time documentation fetching from official sources
- Version-specific API references
- Current code examples and best practices
- Eliminates outdated or hallucinated code suggestions

**Available Tools:**
- Access to live documentation for React, Next.js, TypeScript, Tailwind CSS, and other project dependencies
- Current API references and usage examples
- Up-to-date migration guides and best practices

**Usage:**
Context7 works automatically through MCP tools when Claude Code needs current documentation. No special commands required - it provides enhanced, up-to-date information for all coding tasks.

**Best Practices:**
- Use Serena for code quality insights before major refactoring
- Leverage AI suggestions when implementing new features
- Run code reviews on critical business logic components
- Ask for architecture recommendations for complex features
- Context7 ensures all documentation references are current and accurate

## Recent Work
- Fixed authentication race conditions
- Added comprehensive debug logging
- Updated About page with founder information
- Resolved ESLint apostrophe escaping issues
- Integrated Serena MCP for AI-powered code analysis
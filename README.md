# ReviewBoost

ReviewBoost is a gamified employee review collection system that motivates teams to gather customer feedback through points, leaderboards, and recognition.

## Features

- **Employee Features:**
  - Submit customer reviews with details (name, job type, keywords)
  - Track photo submissions for bonus points
  - View personal progress and rankings

- **Business Owner Features:**
  - Real-time dashboard with analytics
  - View total reviews and points across the team
  - Track top performers
  - Monitor recent review submissions

- **Gamification:**
  - Points system (10 base points + 5 bonus for photos)
  - Live leaderboard rankings
  - Recognition for top performers

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, React Hook Form
- **Backend:** Supabase (PostgreSQL, Authentication, Real-time)
- **Deployment:** Vercel (frontend), Railway (backend services)
- **UI Components:** Radix UI, Lucide Icons

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account
- Vercel account (for deployment)
- Railway account (optional, for backend services)

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd reviewboost
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Supabase:**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Run the SQL migration in `supabase/migrations/001_initial_schema.sql`
   - Copy your project URL and anon key

4. **Configure environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the application.

### Demo Credentials

For testing purposes, use these demo credentials:
- **Employee:** employee@demo.com / demo123
- **Business Owner:** owner@demo.com / demo123

## Project Structure

```
reviewboost/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Business owner dashboard
│   │   ├── login/            # Authentication page
│   │   └── submit-review/    # Review submission form
│   ├── components/            # React components
│   │   ├── ui/               # UI components
│   │   └── Leaderboard.tsx   # Leaderboard component
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities and configs
│   └── types/                 # TypeScript types
├── supabase/                  # Database migrations
└── public/                    # Static assets
```

## API Endpoints

- `POST /api/reviews/submit` - Submit a new review
- `GET /api/leaderboard` - Get leaderboard data
- `GET /api/dashboard/stats` - Get dashboard statistics

## Database Schema

### Tables

1. **users** - User profiles (extends Supabase auth)
   - id, email, name, role (employee/business_owner)

2. **reviews** - Customer review submissions
   - id, customer_name, job_type, has_photo, keywords, employee_id

3. **points** - Employee points tracking
   - id, employee_id, points, updated_at

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Railway Setup (Optional)

For backend services or additional processing:
1. Create a Railway project
2. Add environment variables
3. Deploy using Railway CLI or GitHub integration

## Development Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run linting
npm run lint

# Type checking
npm run type-check
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Known Issues & Limitations

- Demo users need to be created manually in Supabase Auth
- Real-time updates require WebSocket connection
- Photo uploads are tracked but actual file storage not implemented

## Future Enhancements

- [ ] Actual photo upload functionality
- [ ] Email notifications for achievements
- [ ] Monthly/weekly leaderboards
- [ ] Export functionality for reviews
- [ ] Mobile app version
- [ ] Integration with review platforms

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Contact the development team

---

Built with ❤️ using Next.js and Supabase

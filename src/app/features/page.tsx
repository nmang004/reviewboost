import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Star, Users, TrendingUp, BarChart3, Gift, Shield, Zap } from "lucide-react"

export default function FeaturesPage() {
  const features = [
    {
      icon: Trophy,
      title: "Gamification Engine",
      description: "Transform review collection into an engaging game with points, levels, and achievements.",
      details: [
        "Dynamic point system based on review quality",
        "Achievement badges and milestones",
        "Weekly and monthly challenges",
        "Team vs team competitions"
      ],
      gradient: "from-yellow-400 to-orange-500"
    },
    {
      icon: Star,
      title: "Recognition System",
      description: "Celebrate top performers and motivate your team with meaningful recognition.",
      details: [
        "Employee of the month awards",
        "Real-time leaderboards",
        "Public recognition feeds",
        "Custom achievement certificates"
      ],
      gradient: "from-blue-500 to-purple-600"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Foster teamwork and healthy competition across departments and locations.",
      details: [
        "Department-based teams",
        "Collaborative goals and targets",
        "Team chat and messaging",
        "Cross-location competitions"
      ],
      gradient: "from-green-500 to-emerald-600"
    },
    {
      icon: TrendingUp,
      title: "Advanced Analytics",
      description: "Gain deep insights into review performance and team engagement.",
      details: [
        "Real-time performance dashboards",
        "Review sentiment analysis",
        "Team productivity metrics",
        "Custom report generation"
      ],
      gradient: "from-purple-500 to-pink-600"
    },
    {
      icon: BarChart3,
      title: "Performance Tracking",
      description: "Monitor individual and team performance with comprehensive tracking tools.",
      details: [
        "Individual performance scorecards",
        "Historical trend analysis",
        "Goal tracking and progress",
        "Predictive performance insights"
      ],
      gradient: "from-indigo-500 to-blue-600"
    },
    {
      icon: Gift,
      title: "Rewards Management",
      description: "Automate reward distribution and manage incentive programs effortlessly.",
      details: [
        "Automated reward calculations",
        "Multiple reward tiers",
        "Custom reward categories",
        "Digital gift card integration"
      ],
      gradient: "from-pink-500 to-rose-600"
    },
    {
      icon: Shield,
      title: "Quality Assurance",
      description: "Ensure review authenticity and maintain high quality standards.",
      details: [
        "Automated review verification",
        "Quality scoring algorithms",
        "Duplicate detection system",
        "Compliance monitoring"
      ],
      gradient: "from-teal-500 to-cyan-600"
    },
    {
      icon: Zap,
      title: "Instant Notifications",
      description: "Keep everyone engaged with real-time updates and alerts.",
      details: [
        "Achievement notifications",
        "Leaderboard updates",
        "New review alerts",
        "Team milestone celebrations"
      ],
      gradient: "from-amber-500 to-yellow-600"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="font-serif text-5xl font-bold text-gray-900 sm:text-6xl md:text-7xl leading-tight">
            Powerful Features for
            <span className="block text-primary bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Growing Teams
            </span>
          </h1>
          <p className="mt-8 max-w-3xl mx-auto text-xl text-gray-600 sm:text-2xl leading-relaxed">
            Everything you need to transform your review collection process into a rewarding experience for your entire team.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-2 bg-white/90 backdrop-blur-sm"
            >
              <CardHeader className="pb-4">
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed text-gray-600 mb-4">
                  {feature.description}
                </CardDescription>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-primary mr-2 mt-1">•</span>
                      <span className="text-sm text-gray-600">{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <div className="bg-gradient-to-r from-primary to-purple-600 rounded-3xl p-12 shadow-2xl">
            <h2 className="font-serif text-4xl font-bold text-white mb-4">
              Ready to Transform Your Reviews?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
              Join hundreds of businesses already using ReviewBoost to grow their online reputation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/login"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-primary bg-white rounded-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Start Free Trial
              </a>
              <a
                href="/pricing"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white rounded-lg hover:bg-white/10 transition-all duration-300"
              >
                View Pricing
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Star, Users, TrendingUp } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if this is an auth callback (has auth tokens in URL)
    console.log('🏠 Homepage loaded, checking for auth tokens...')
    console.log('🔗 Current URL hash:', window.location.hash)
    
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      console.log('🔀 Auth callback detected on homepage, redirecting to /auth/callback')
      // Redirect to the proper auth callback page with the tokens
      const callbackUrl = `/auth/callback${window.location.hash}`
      console.log('🎯 Redirecting to:', callbackUrl)
      router.replace(callbackUrl)
    } else {
      console.log('📄 No auth tokens found, showing normal homepage')
    }
  }, [router])
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-20">
          <h1 className="font-serif text-5xl font-bold text-gray-900 sm:text-6xl md:text-7xl lg:text-8xl leading-tight">
            Transform Reviews into
            <span className="block text-primary bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Growth
            </span>
          </h1>
          <p className="mt-8 max-w-2xl mx-auto text-xl text-gray-600 sm:text-2xl md:mt-10 leading-relaxed">
            Gamify your employee review collection process with elegant dashboards, 
            meaningful recognition, and data-driven insights.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                Get Started Today
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 py-4 text-lg font-semibold border-2 hover:bg-gray-50 transition-all duration-300">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Trophy className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl font-semibold">Gamification</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed text-gray-600">
                Transform review collection into an engaging competition with intelligent scoring and dynamic leaderboards
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Star className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl font-semibold">Recognition</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed text-gray-600">
                Celebrate achievements with meaningful recognition systems that motivate and inspire excellence
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl font-semibold">Team Building</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed text-gray-600">
                Build stronger teams through healthy competition and collaborative goal achievement
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="pb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl font-semibold">Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base leading-relaxed text-gray-600">
                Gain deep insights with comprehensive analytics and real-time performance tracking
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="mt-32 text-center">
          <h2 className="font-serif text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-16">
            Three simple steps to transform your review collection process
          </p>
          <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-3">
            <div className="relative">
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white mx-auto shadow-lg">
                <span className="text-xl font-bold">1</span>
              </div>
              <h3 className="mt-6 text-2xl font-semibold text-gray-900">Submit Reviews</h3>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                Employees easily submit customer reviews with rich details and automatically earn points
              </p>
            </div>
            <div className="relative">
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white mx-auto shadow-lg">
                <span className="text-xl font-bold">2</span>
              </div>
              <h3 className="mt-6 text-2xl font-semibold text-gray-900">Earn Points</h3>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                Receive bonus points for comprehensive reviews with photos and detailed customer feedback
              </p>
            </div>
            <div className="relative">
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white mx-auto shadow-lg">
                <span className="text-xl font-bold">3</span>
              </div>
              <h3 className="mt-6 text-2xl font-semibold text-gray-900">Win Rewards</h3>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                Top performers earn recognition, rewards, and celebrate success on dynamic leaderboards
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

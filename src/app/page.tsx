import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Star, Users, TrendingUp } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Welcome to <span className="text-blue-600">ReviewBoost</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Gamify your employee review collection process and boost customer satisfaction
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <Link href="/login">
                <Button size="lg" className="w-full">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <Trophy className="h-8 w-8 text-yellow-500 mb-2" />
              <CardTitle>Gamification</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Turn review collection into a fun competition with points and leaderboards
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Star className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle>Recognition</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Recognize top performers and celebrate their achievements
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-green-500 mb-2" />
              <CardTitle>Team Building</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Foster healthy competition and team spirit among employees
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-purple-500 mb-2" />
              <CardTitle>Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track performance metrics and review trends in real-time
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white mx-auto">
                1
              </div>
              <h3 className="mt-4 text-lg font-medium">Submit Reviews</h3>
              <p className="mt-2 text-gray-500">
                Employees submit customer reviews with details and earn points
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white mx-auto">
                2
              </div>
              <h3 className="mt-4 text-lg font-medium">Earn Points</h3>
              <p className="mt-2 text-gray-500">
                Get bonus points for reviews with photos and detailed feedback
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white mx-auto">
                3
              </div>
              <h3 className="mt-4 text-lg font-medium">Win Rewards</h3>
              <p className="mt-2 text-gray-500">
                Top performers on the leaderboard receive recognition and rewards
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

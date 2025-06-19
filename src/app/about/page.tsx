import { Card, CardContent } from "@/components/ui/card"
import { Users, Target, Lightbulb, Heart } from "lucide-react"

export default function AboutPage() {
  const values = [
    {
      icon: Users,
      title: "Team Empowerment",
      description: "We believe in empowering teams to achieve their best through recognition and healthy competition.",
      gradient: "from-blue-500 to-purple-600"
    },
    {
      icon: Target,
      title: "Results Driven",
      description: "Our platform is designed to deliver measurable results in review collection and team engagement.",
      gradient: "from-green-500 to-emerald-600"
    },
    {
      icon: Lightbulb,
      title: "Innovation First",
      description: "We constantly innovate to bring new features that make review collection more engaging and effective.",
      gradient: "from-yellow-400 to-orange-500"
    },
    {
      icon: Heart,
      title: "Customer Success",
      description: "Your success is our success. We're committed to helping you build a stronger online reputation.",
      gradient: "from-pink-500 to-rose-600"
    }
  ]

  const teamMembers = [
    {
      name: "Nick Mangubat",
      role: "CEO & Founder",
      bio: "Guy who builds things",
      image: "https://via.placeholder.com/150"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="font-serif text-5xl font-bold text-gray-900 sm:text-6xl md:text-7xl leading-tight">
            Our Mission to Transform
            <span className="block text-primary bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Review Collection
            </span>
          </h1>
          <p className="mt-8 max-w-3xl mx-auto text-xl text-gray-600 sm:text-2xl leading-relaxed">
            We&apos;re on a mission to make review collection engaging, rewarding, and effective for businesses of all sizes.
          </p>
        </div>

        {/* Story Section */}
        <div className="mb-20">
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardContent className="p-12">
              <h2 className="font-serif text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-lg text-gray-600 leading-relaxed">
                <p>
                  ReviewBoost was born from a simple observation: businesses struggle to consistently collect customer reviews, 
                  despite knowing how crucial they are for online reputation and growth.
                </p>
                <p>
                  In 2025, founder Nick Mangubat experienced this challenge firsthand while running his previous company. 
                  He noticed that while his team delivered excellent service, getting customers to leave reviews was like pulling teeth. 
                  Even with incentives in place, employee engagement was low.
                </p>
                <p>
                  That&apos;s when he had an idea: what if collecting reviews could be as engaging as playing a game? 
                  What if employees could compete, earn recognition, and feel genuinely motivated to ask for reviews?
                </p>
                <p>
                  Today, ReviewBoost helps hundreds of businesses transform their review collection process into an engaging experience 
                  that employees love and customers appreciate. We&apos;re proud to be part of our customers&apos; growth stories.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Values Section */}
        <div className="mb-20">
          <h2 className="font-serif text-3xl font-bold text-gray-900 text-center mb-12">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-2">
                <CardContent className="p-8 text-center">
                  <div className={`w-16 h-16 bg-gradient-to-br ${value.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <value.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-20">
          <h2 className="font-serif text-3xl font-bold text-gray-900 text-center mb-12">Meet Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <Card key={index} className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-2">
                <CardContent className="p-8 text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mx-auto mb-6 overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-purple-600">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{member.name}</h3>
                  <p className="text-primary font-medium mb-3">{member.role}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-primary to-purple-600 rounded-3xl p-12 shadow-2xl">
            <h2 className="font-serif text-4xl font-bold text-white mb-4">
              Join Us on Our Mission
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
              Be part of the review revolution. Start transforming your review collection process today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/login"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-primary bg-white rounded-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Get Started Free
              </a>
              <a
                href="/contact"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white rounded-lg hover:bg-white/10 transition-all duration-300"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
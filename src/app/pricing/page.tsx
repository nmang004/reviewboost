import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X } from "lucide-react"

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      description: "Perfect for small businesses just getting started",
      price: "$49",
      period: "per month",
      features: [
        { name: "Up to 10 employees", included: true },
        { name: "Basic gamification features", included: true },
        { name: "Monthly leaderboards", included: true },
        { name: "Email support", included: true },
        { name: "Basic analytics", included: true },
        { name: "Custom rewards", included: false },
        { name: "API access", included: false },
        { name: "Advanced reporting", included: false },
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Professional",
      description: "Ideal for growing businesses with multiple locations",
      price: "$99",
      period: "per month",
      features: [
        { name: "Up to 50 employees", included: true },
        { name: "Advanced gamification", included: true },
        { name: "Real-time leaderboards", included: true },
        { name: "Priority email support", included: true },
        { name: "Advanced analytics", included: true },
        { name: "Custom rewards", included: true },
        { name: "API access", included: true },
        { name: "Advanced reporting", included: false },
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      description: "For large organizations with complex needs",
      price: "Custom",
      period: "contact us",
      features: [
        { name: "Unlimited employees", included: true },
        { name: "Full gamification suite", included: true },
        { name: "Custom leaderboards", included: true },
        { name: "24/7 phone support", included: true },
        { name: "Enterprise analytics", included: true },
        { name: "Custom rewards", included: true },
        { name: "Full API access", included: true },
        { name: "Advanced reporting", included: true },
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="font-serif text-5xl font-bold text-gray-900 sm:text-6xl md:text-7xl leading-tight">
            Simple, Transparent
            <span className="block text-primary bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          <p className="mt-8 max-w-2xl mx-auto text-xl text-gray-600 sm:text-2xl leading-relaxed">
            Choose the perfect plan for your business. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative hover:shadow-2xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-2 ${
                plan.popular ? 'ring-2 ring-primary' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-primary to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</CardTitle>
                <CardDescription className="text-gray-600 mb-6">{plan.description}</CardDescription>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-2">{plan.period}</span>
                </div>
                <Button
                  className={`w-full py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary'
                      : ''
                  }`}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {plan.cta}
                </Button>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mr-3 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Can I change plans anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards, including Visa, Mastercard, American Express, and Discover. Enterprise customers can also pay via invoice.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Is there a setup fee?
              </h3>
              <p className="text-gray-600">
                No, there are no setup fees for any of our plans. You can get started immediately after signing up.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Do you offer discounts for annual billing?
              </h3>
              <p className="text-gray-600">
                Yes, we offer a 20% discount for annual billing on all plans. Contact our sales team for more information.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-24 text-center">
          <h2 className="font-serif text-3xl font-bold text-gray-900 mb-4">
            Still have questions?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Our team is here to help you choose the right plan for your business.
          </p>
          <Button variant="outline" size="lg" className="px-8 py-4 text-lg font-semibold border-2 hover:bg-purple-50 transition-all duration-300">
            Contact Sales
          </Button>
        </div>
      </div>
    </div>
  )
}
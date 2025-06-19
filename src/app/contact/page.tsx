'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Phone, MapPin, Clock } from "lucide-react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    console.log('Form submitted:', formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      details: "support@reviewboost.com",
      subtext: "We'll respond within 24 hours"
    },
    {
      icon: Phone,
      title: "Phone",
      details: "1-800-REVIEWS",
      subtext: "Mon-Fri 9AM-5PM PST"
    },
    {
      icon: MapPin,
      title: "Office",
      details: "San Francisco, CA",
      subtext: "Visit by appointment"
    },
    {
      icon: Clock,
      title: "Response Time",
      details: "< 24 hours",
      subtext: "For all inquiries"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="font-serif text-5xl font-bold text-gray-900 sm:text-6xl md:text-7xl leading-tight">
            Let&apos;s Start a
            <span className="block text-primary bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Conversation
            </span>
          </h1>
          <p className="mt-8 max-w-2xl mx-auto text-xl text-gray-600 sm:text-2xl leading-relaxed">
            Have questions about ReviewBoost? We&apos;re here to help you transform your review collection process.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-gray-900">Send us a message</CardTitle>
                <CardDescription className="text-lg text-gray-600">
                  Fill out the form below and we&apos;ll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name" className="text-base font-medium text-gray-700">
                        Your Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="mt-2"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-base font-medium text-gray-700">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="mt-2"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="company" className="text-base font-medium text-gray-700">
                      Company Name
                    </Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="mt-2"
                      placeholder="Acme Inc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="subject" className="text-base font-medium text-gray-700">
                      Subject
                    </Label>
                    <Select
                      name="subject"
                      onValueChange={(value) => setFormData({ ...formData, subject: value })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sales Inquiry</SelectItem>
                        <SelectItem value="support">Technical Support</SelectItem>
                        <SelectItem value="demo">Request a Demo</SelectItem>
                        <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-base font-medium text-gray-700">
                      Message
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      className="mt-2 min-h-[150px]"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Get in Touch</h2>
            {contactInfo.map((info, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <info.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{info.title}</h3>
                      <p className="text-gray-900 font-medium mt-1">{info.details}</p>
                      <p className="text-gray-600 text-sm mt-1">{info.subtext}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* FAQ Link */}
            <Card className="border-2 border-primary bg-primary/5">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold text-gray-900 mb-2">Looking for quick answers?</h3>
                <p className="text-gray-600 mb-4">Check out our frequently asked questions.</p>
                <Button variant="outline" className="border-2 border-primary hover:bg-primary hover:text-white transition-all duration-300">
                  Visit FAQ
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Office Hours */}
        <div className="mt-20 text-center">
          <Card className="border-0 shadow-xl max-w-2xl mx-auto">
            <CardContent className="p-12">
              <h2 className="font-serif text-3xl font-bold text-gray-900 mb-6">Office Hours</h2>
              <div className="space-y-2 text-lg">
                <p className="text-gray-600">
                  <span className="font-semibold text-gray-900">Monday - Friday:</span> 9:00 AM - 5:00 PM PST
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold text-gray-900">Saturday - Sunday:</span> Closed
                </p>
              </div>
              <p className="mt-6 text-gray-600">
                For urgent matters outside business hours, please email us and we&apos;ll respond as soon as possible.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
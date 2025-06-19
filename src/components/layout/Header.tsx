'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { Menu, X, Trophy } from 'lucide-react'

export function Header() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ]

  const isActive = (href: string) => pathname === href

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/80 backdrop-blur-lg shadow-lg' : 'bg-white/60 backdrop-blur-sm'
    }`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <span className="font-serif text-2xl font-bold text-gray-900">ReviewBoost</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors duration-300 ${
                  isActive(item.href)
                    ? 'text-primary'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {user.role === 'business_owner' ? (
                  <Link href="/dashboard">
                    <Button variant="outline" className="border-2 hover:bg-purple-50 transition-all duration-300">
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link href="/submit-review">
                    <Button variant="outline" className="border-2 hover:bg-purple-50 transition-all duration-300">
                      Submit Review
                    </Button>
                  </Link>
                )}
                <Button 
                  onClick={handleSignOut}
                  className="shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline" className="border-2 hover:bg-purple-50 transition-all duration-300">
                    Sign In
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="shadow-lg hover:shadow-xl transition-all duration-300">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-900" />
            ) : (
              <Menu className="h-6 w-6 text-gray-900" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block py-2 text-base font-medium transition-colors duration-300 ${
                    isActive(item.href)
                      ? 'text-primary'
                      : 'text-gray-600 hover:text-primary'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                {user ? (
                  <>
                    {user.role === 'business_owner' ? (
                      <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full border-2 hover:bg-purple-50 transition-all duration-300">
                          Dashboard
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/submit-review" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="outline" className="w-full border-2 hover:bg-purple-50 transition-all duration-300">
                          Submit Review
                        </Button>
                      </Link>
                    )}
                    <Button 
                      onClick={handleSignOut}
                      className="w-full shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full border-2 hover:bg-purple-50 transition-all duration-300">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full shadow-lg hover:shadow-xl transition-all duration-300">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
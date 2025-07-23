"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  Building2,
  Globe,
  LineChart,
  Shield,
  Users,
  Star,
  TrendingUp,
  CheckCircle,
  Play,
} from "lucide-react"
import Image from "next/image"

export default function Home() {
  const router = useRouter()
  const [scrollY, setScrollY] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    setIsVisible(true)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Animated Background with Square Checkboxes */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Grid Pattern */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
              transform: `translateY(${scrollY * 0.5}px)`,
            }}
          />

          {/* Floating Square Checkboxes */}
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-6 h-6 border-2 border-green-300/40 rounded-sm animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                transform: `rotate(${Math.random() * 45}deg)`,
              }}
            >
              {/* Some checkboxes are checked */}
              {Math.random() > 0.6 && (
                <div className="w-full h-full bg-green-400/30 rounded-sm flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-600 rounded-sm" />
                </div>
              )}
            </div>
          ))}

          {/* Larger Square Checkboxes */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`large-${i}`}
              className="absolute w-12 h-12 border-2 border-green-200/30 rounded-md animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${4 + Math.random() * 2}s`,
              }}
            >
              {/* Some are checked with checkmarks */}
              {Math.random() > 0.5 && (
                <div className="w-full h-full bg-green-100/50 rounded-md flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-500/60" />
                </div>
              )}
            </div>
          ))}

          {/* Floating Elements */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse delay-1000" />

          {/* Decorative Square Patterns */}
          <div className="absolute top-10 right-10 grid grid-cols-3 gap-2 opacity-30">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-sm ${i % 3 === 0 ? "bg-green-300" : "border-2 border-green-300"} animate-pulse`}
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>

          <div className="absolute bottom-10 left-10 grid grid-cols-4 gap-1 opacity-20">
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-sm ${i % 4 === 0 ? "bg-emerald-400" : "border border-emerald-400"} animate-pulse`}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div
            className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
                <Image src="/icon.svg" alt="Wealth Map Logo" width={80} height={80} className="animate-pulse" />
              </div>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 mb-8">
              <Star className="h-4 w-4 text-green-600 fill-green-600" />
              <span className="text-green-700 text-sm font-medium">Trusted by 10,000+ investors</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              The Future of
              <span className="block bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Wealth Analytics
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Transform your property portfolio with AI-powered insights, real-time market data, and intelligent
              analytics that drive superior investment decisions.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                onClick={() => router.push("/auth/login?tab=register")}
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-gray-300 text-gray-700 hover:border-green-600 hover:text-green-600 px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300 group"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-gray-500 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50 relative">
        {/* Background Square Pattern */}
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute top-0 left-0 grid grid-cols-12 gap-4 w-full h-full">
            {[...Array(144)].map((_, i) => (
              <div
                key={i}
                className={`w-8 h-8 ${i % 5 === 0 ? "bg-green-200" : "border border-green-200"} rounded-sm`}
              />
            ))}
          </div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { number: "10K+", label: "Active Users", icon: <Users className="h-6 w-6" /> },
              { number: "$2.5B+", label: "Assets Tracked", icon: <TrendingUp className="h-6 w-6" /> },
              { number: "50+", label: "Countries", icon: <Globe className="h-6 w-6" /> },
              { number: "99.9%", label: "Uptime", icon: <Shield className="h-6 w-6" /> },
            ].map((stat, index) => (
              <div
                key={index}
                className="text-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group relative"
              >
                {/* Small checkbox decoration */}
                <div className="absolute top-2 right-2 w-3 h-3 border border-green-300 rounded-sm">
                  <div className="w-full h-full bg-green-400 rounded-sm opacity-60" />
                </div>

                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mb-4 group-hover:bg-green-200 transition-colors">
                  <div className="text-green-600">{stat.icon}</div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.number}</div>
                <div className="text-gray-600 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        {/* Scattered Square Checkboxes */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-4 h-4 border border-green-200/50 rounded-sm opacity-30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transform: `rotate(${Math.random() * 90}deg)`,
              }}
            >
              {Math.random() > 0.7 && <div className="w-full h-full bg-green-300/40 rounded-sm" />}
            </div>
          ))}
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Everything you need to succeed</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful tools and insights designed for modern wealth management professionals
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: <BarChart3 className="h-6 w-6" />,
                title: "Advanced Analytics",
                description:
                  "AI-powered insights and predictive analytics to identify the best investment opportunities",
                color: "blue",
              },
              {
                icon: <Building2 className="h-6 w-6" />,
                title: "Portfolio Management",
                description: "Comprehensive tools to track, analyze, and optimize your entire property portfolio",
                color: "green",
              },
              {
                icon: <LineChart className="h-6 w-6" />,
                title: "Market Intelligence",
                description: "Real-time market data and trends to stay ahead of market movements",
                color: "purple",
              },
              {
                icon: <Users className="h-6 w-6" />,
                title: "Team Collaboration",
                description: "Seamless collaboration tools for teams and stakeholders",
                color: "orange",
              },
              {
                icon: <Globe className="h-6 w-6" />,
                title: "Global Coverage",
                description: "Access to international markets with localized insights and data",
                color: "teal",
              },
              {
                icon: <Shield className="h-6 w-6" />,
                title: "Enterprise Security",
                description: "Bank-grade security with advanced encryption and compliance",
                color: "indigo",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-8 bg-white rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative"
              >
                {/* Checkbox decoration */}
                <div className="absolute top-4 right-4 w-4 h-4 border border-green-300 rounded-sm opacity-50">
                  <CheckCircle className="w-3 h-3 text-green-500 absolute -top-0.5 -left-0.5" />
                </div>

                <div
                  className={`inline-flex items-center justify-center w-12 h-12 bg-${feature.color}-100 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <div className={`text-${feature.color}-600`}>{feature.icon}</div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-green-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-green-600 to-emerald-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />

        {/* Square Pattern Overlay */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-6 h-6 border border-white/30 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                transform: `rotate(${Math.random() * 45}deg)`,
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to transform your wealth management?</h2>
            <p className="text-xl mb-10 opacity-90">
              Join thousands of successful investors who trust WealthMap to optimize their portfolios and maximize
              returns.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-green-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                onClick={() => router.push("/auth/login?tab=register")}
              >
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-gray/30 text-green-700 hover:bg-green-500 hover:text-white px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300"
                onClick={() => router.push("/auth/login?tab=signin")}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

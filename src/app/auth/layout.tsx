import type React from "react"
import Image from "next/image"
import { CheckCircle, Star } from "lucide-react"

const generateRandomSquares = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    animationDelay: Math.random() * 3,
    animationDuration: 2 + Math.random() * 2,
    checked: Math.random() > 0.6,
    size: Math.random() > 0.7 ? "large" : "small",
  }))
}

export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const squares = generateRandomSquares(12)

  return (
    <div className="min-h-screen w-full flex">
      {/* Left side - Login/Signup form */}
      <div className="w-full lg:w-[50%] flex items-center justify-center p-4 bg-white">
        <div className="max-w-md w-full">{children}</div>
      </div>

      {/* Right side - Decorative background, hidden on mobile */}
      <div className="hidden lg:flex lg:w-[50%] bg-gradient-to-br from-green-600 to-emerald-700 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {/* Grid Pattern */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />

          {/* Floating Square Checkboxes */}
          {squares.map((square) => (
            <div
              key={square.id}
              className={`absolute border-2 border-white/30 rounded-sm animate-pulse ${
                square.size === "large" ? "w-8 h-8" : "w-5 h-5"
              }`}
              style={{
                left: `${square.left}%`,
                top: `${square.top}%`,
                animationDelay: `${square.animationDelay}s`,
                animationDuration: `${square.animationDuration}s`,
              }}
            >
              {square.checked && (
                <div className="w-full h-full bg-white/40 rounded-sm flex items-center justify-center">
                  <CheckCircle className={`text-white ${square.size === "large" ? "w-4 h-4" : "w-3 h-3"}`} />
                </div>
              )}
            </div>
          ))}

          {/* Glowing Orbs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl animate-pulse delay-1000" />

          {/* Decorative Corner Squares */}
          <div className="absolute top-8 right-8 grid grid-cols-3 gap-2 opacity-40">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-sm ${i % 3 === 0 ? "bg-white/60" : "border border-white/60"} animate-pulse`}
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-white relative z-10">
          <div className="mb-8 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
            <Image src="/icon.svg" alt="Wealth Map Logo" width={80} height={80} className="animate-pulse" />
          </div>

          <h1 className="text-4xl font-bold mb-4 text-center">Welcome to Wealth Map</h1>

          <p className="text-xl text-center opacity-90 mb-12 max-w-lg leading-relaxed">
            Your comprehensive solution for wealth management and property analytics
          </p>

          {/* Enhanced Testimonial Card */}
          <div className="rounded-2xl bg-white/15 backdrop-blur-md p-8 w-full max-w-md border border-white/20 shadow-2xl">
            <div className="flex items-center mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              ))}
            </div>

            <p className="text-sm mb-6 leading-relaxed opacity-95">
              "Wealth Map has completely transformed our property portfolio management. The insights and analytics are
              game-changing for our investment decisions."
            </p>

            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-white/30 to-white/20 mr-4 flex items-center justify-center">
                <span className="text-lg font-bold">SJ</span>
              </div>
              <div>
                <p className="font-semibold text-white">Sarah Johnson</p>
                <p className="text-sm opacity-80">CEO, Johnson Properties</p>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 flex items-center gap-6 text-sm opacity-80">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Bank-grade security</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>10,000+ users</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

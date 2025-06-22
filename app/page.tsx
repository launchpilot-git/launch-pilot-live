import Link from "next/link"
import { ArrowRight, ChevronDown } from "lucide-react"
import Image from "next/image"
import { Navbar } from "@/components/navbar"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ffe58a] to-white overflow-x-hidden relative">
      {/* Main container with frosted glass effect */}
      <div className="container mx-auto px-4 pt-4 pb-20 relative z-10">
        {/* Navigation Bar */}
        <Navbar />

        {/* New Badge with increased padding */}
        <div className="flex justify-center mt-8 sm:mt-12 mb-6 sm:mb-8">
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-md rounded-full px-4 sm:px-5 py-2 sm:py-2.5 border border-white/15 shadow-sm">
            <span className="bg-[#2c0e31] text-white text-xs font-bold px-2 py-0.5 rounded-full">NEW</span>
            <span className="text-[#2c0e31] text-xs sm:text-sm">Avatar + Video Generation</span>
            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-[#2c0e31]" />
          </div>
        </div>

        {/* Headline with tighter line height */}
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-[#2c0e31] text-center mt-6 sm:mt-10 mb-4 sm:mb-6 leading-[1.1] px-4">
            Launch powerful marketing content from a single prompt.
          </h1>

          {/* Subheading with tighter width - now a single paragraph */}
          <div className="text-center max-w-3xl mx-auto text-[#2c0e31] mb-6 sm:mb-8 px-4">
            <p className="text-base sm:text-lg">
              Turn one image into scroll-stopping captions, emails, avatar videos, and product promos — in minutes.
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-10 px-4">
          <Link
            href="/signup"
            className="bg-[#f4c537] text-[#2c0e31] rounded-full px-6 py-3 text-base sm:text-lg font-medium hover:bg-[#eab72c] transition shadow-md hover:shadow-lg"
          >
            Sign up for free
          </Link>
        </div>
      </div>

      {/* Bottom fade gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
    </div>
  )
}

function NavItem({ label, hasDropdown = false }: { label: string; hasDropdown?: boolean }) {
  return (
    <div className="relative group">
      <button className="flex items-center text-[#2c0e31] hover:text-[#5a1c62] text-sm font-medium">
        {label}
        {hasDropdown && <ChevronDown className="ml-1 w-4 h-4" />}
      </button>
    </div>
  )
}
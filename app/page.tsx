"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { MessageSquare, Mail, UserCircle, Film } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ffe58a] to-white overflow-x-hidden relative">
      <div className="container mx-auto px-4 pt-4 pb-20 relative z-10">
        <Navbar />
        
        {/* Hero Section */}
        <div className="mt-8 sm:mt-12 md:mt-20 text-center">
          {/* Launch Pilot is now available Badge */}
          <div className="inline-flex items-center bg-white border border-gray-300/50 text-gray-600 px-5 py-2 rounded-full text-sm font-normal mb-6 sm:mb-8 shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)]">
            <span>Launch Pilot is now available!</span>
          </div>
          
          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-[#240029] mb-4 sm:mb-6 leading-tight">
            Launch powerful marketing<br />
            content from a single prompt
          </h1>
          
          {/* Subheading */}
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 sm:mb-10 max-w-2xl mx-auto px-4">
            Transform your product images into compelling social media captions, 
            marketing emails, and professional videos with AI
          </p>
          
          {/* CTA Button */}
          <Link href="/signup">
            <Button 
              size="lg" 
              className="bg-[#ffde00] text-[#240029] hover:bg-[#ebc700] text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Get Started Free
            </Button>
          </Link>
          
          {/* Features Grid */}
          <div className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-5xl mx-auto px-4">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 text-[#240029] mx-auto mb-3" />
              <h3 className="font-semibold text-[#240029] mb-1">Social Captions</h3>
              <p className="text-sm text-gray-600">Engaging posts for all platforms</p>
            </div>
            
            <div className="text-center">
              <Mail className="w-10 h-10 text-[#240029] mx-auto mb-3" />
              <h3 className="font-semibold text-[#240029] mb-1">Email Templates</h3>
              <p className="text-sm text-gray-600">Professional marketing emails</p>
            </div>
            
            <div className="text-center">
              <UserCircle className="w-10 h-10 text-[#240029] mx-auto mb-3" />
              <h3 className="font-semibold text-[#240029] mb-1">Avatar Videos</h3>
              <p className="text-sm text-gray-600">AI presenters for your product</p>
            </div>
            
            <div className="text-center">
              <Film className="w-10 h-10 text-[#240029] mx-auto mb-3" />
              <h3 className="font-semibold text-[#240029] mb-1">Promo Videos</h3>
              <p className="text-sm text-gray-600">Cinematic product showcases</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


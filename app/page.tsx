"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ffe58a] to-white overflow-x-hidden relative">
      <div className="container mx-auto px-4 pt-4 pb-20 relative z-10">
        <Navbar />
        
        {/* Hero Section */}
        <div className="mt-8 sm:mt-12 md:mt-20 text-center">
          {/* NEW Badge */}
          <div className="inline-flex items-center gap-2 bg-[#240029] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8">
            <span className="text-[#ffde00]">NEW</span>
            <span>Launch Pilot is now available</span>
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
              className="bg-[#ffde00] text-[#240029] hover:bg-[#ebc700] text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Get Started Free
            </Button>
          </Link>
          
          {/* Features Grid */}
          <div className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-5xl mx-auto px-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#240029] rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#ffde00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <h3 className="font-semibold text-[#240029] mb-1">Social Captions</h3>
              <p className="text-sm text-gray-600">Engaging posts for all platforms</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-[#240029] rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#ffde00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-[#240029] mb-1">Email Templates</h3>
              <p className="text-sm text-gray-600">Professional marketing emails</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-[#240029] rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#ffde00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-[#240029] mb-1">Avatar Videos</h3>
              <p className="text-sm text-gray-600">AI presenters for your product</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-[#240029] rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#ffde00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-[#240029] mb-1">Promo Videos</h3>
              <p className="text-sm text-gray-600">Cinematic product showcases</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative gradient orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-[#ffde00] rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#240029] rounded-full filter blur-3xl opacity-10 animate-pulse"></div>
    </div>
  )
}


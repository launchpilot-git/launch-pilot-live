"use client"

import { useState } from "react"
import { Search, ChevronDown, ChevronLeft, ChevronRight, Play } from "lucide-react"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("Engagement")

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b">
        <div className="flex items-center">
          <div className="bg-[#f4c537] w-6 h-6 rounded-full mr-3"></div>
          <span className="font-medium text-[#2c0e31]">Boltshift Course</span>
        </div>
        <div className="flex items-center">
          <div className="relative mr-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search for accounts, people, deals, etc."
              className="pl-9 pr-8 py-1.5 rounded-md border border-gray-200 text-sm w-64"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-1 rounded">
              ⌘K
            </div>
          </div>
          <button className="text-sm bg-gray-100 rounded-full px-2 py-0.5 text-gray-700 mr-3 flex items-center">
            <span className="mr-1">Help</span>
          </button>
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="flex justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#2c0e31]">Hey there, Jane</h2>
            <p className="text-sm text-gray-500 mb-6">Here's what's happening in your Outseta account today.</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center border rounded-md">
              <button className="text-sm px-3 py-1.5 flex items-center">
                <span>{activeTab}</span>
                <ChevronDown className="w-4 h-4 ml-1" />
              </button>
              <div className="h-6 border-l mx-1"></div>
              <button className="text-sm px-3 py-1.5 flex items-center">
                <span>Billing</span>
              </button>
            </div>

            <div className="flex items-center border rounded-md">
              <button className="text-sm px-2 py-1.5">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm px-2">Mar 2025</span>
              <button className="text-sm px-2 py-1.5">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center border rounded-md">
              <button className="text-sm px-3 py-1.5 flex items-center">
                <span>Month</span>
                <ChevronDown className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <DashboardCard title="534" subtitle="Unique Logins" borderTop={false} />
          <DashboardCard title="78" subtitle="Accounts Created" borderTop={false} />
          <DashboardCard title="122" subtitle="People Created" borderTop={false} />
          <DashboardCard title="16" subtitle="Open Tickets" borderTop={false} />
        </div>

        {/* MRR Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">MRR</h3>
            <div className="flex items-center border rounded-md">
              <button className="text-sm px-3 py-1 flex items-center">
                <span>Share</span>
                <ChevronDown className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold mb-2">$247,855.33</div>
            <div className="h-32 relative">
              <div className="absolute inset-0 flex items-end">
                <div className="w-full h-full flex items-end">
                  <div className="w-full">
                    <div className="relative h-full">
                      <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-amber-50 to-transparent"></div>
                      <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                        <path
                          d="M0,100 L0,70 C20,65 40,80 60,75 C80,70 100,60 120,65 C140,70 160,80 180,75 C200,70 220,60 240,65 C260,70 280,80 300,85 C320,90 340,80 360,85 C380,90 400,95 400,95 L400,100 Z"
                          fill="none"
                          stroke="#eab72c"
                          strokeWidth="3"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Activity</h3>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">All activity types (56)</span>
              <ChevronDown className="w-4 h-4 ml-1 text-gray-600" />
            </div>
          </div>

          {/* Demo Call-to-action */}
          <div className="mb-4">
            <div className="bg-[#2c0e31] text-white rounded-full inline-flex items-center pl-12 pr-6 py-3 relative">
              <div className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-white rounded-full w-10 h-10 flex items-center justify-center">
                <Play className="w-5 h-5 text-[#2c0e31] ml-0.5" />
              </div>
              <div>
                <div className="font-medium">Watch product demo</div>
                <div className="text-sm opacity-80">See Geoff give a full tour</div>
              </div>
            </div>
          </div>

          {/* Activity List */}
          <div className="pl-4">
            <div className="font-medium mb-2">Today</div>
            <ActivityItem time="9:18 AM" text="Grant sent an email broadcast" />
            <ActivityItem time="9:15 AM" text="sarkis@realsp.io logged in [171.4.249.101]" />
            <ActivityItem time="9:14 AM" text="max@topowertools.com logged in [88.212.16.118]" />
            <ActivityItem
              time="9:12 AM"
              text="Guillermo Mallado - Versteti HQ had a person sign up to a mailing list"
            />
            <ActivityItem time="9:12 AM" text="joe@osmo.supply logged in [213.219.172.89]" />
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardCard({
  title,
  subtitle,
  borderTop = true,
  chart = false,
}: {
  title: string
  subtitle: string
  borderTop?: boolean
  chart?: boolean
}) {
  return (
    <div className={`border border-gray-200 rounded-md p-4 ${borderTop ? "border-t-4 border-t-[#2c0e31]" : ""}`}>
      <div className="text-3xl font-bold text-[#2c0e31]">{title}</div>
      <div className="text-sm text-gray-500">{subtitle}</div>
      {chart && <div className="h-20 mt-2">{/* Chart placeholder */}</div>}
    </div>
  )
}

function ActivityItem({ time, text }: { time: string; text: string }) {
  return (
    <div className="flex items-start mb-3">
      <div className="mr-2 mt-1.5">•</div>
      <div className="flex-1">{text}</div>
      <div className="text-sm text-gray-500 ml-4">{time}</div>
    </div>
  )
}

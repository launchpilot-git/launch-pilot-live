import { DashboardFree } from "@/components/dashboard-free"

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic'

export default function FreeDashboardPage() {
  return <DashboardFree />
}
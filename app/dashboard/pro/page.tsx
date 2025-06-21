import { DashboardPro } from "@/components/dashboard-pro"

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic'

export default function ProDashboardPage() {
  return <DashboardPro />
}
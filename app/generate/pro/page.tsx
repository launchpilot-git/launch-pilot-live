import { GeneratePro } from "@/components/generate-pro"

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic'

export default function ProGeneratePage() {
  return <GeneratePro />
}
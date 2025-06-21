import { GenerateFree } from "@/components/generate-free"

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic'

export default function FreeGeneratePage() {
  return <GenerateFree />
}
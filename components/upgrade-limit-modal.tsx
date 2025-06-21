"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { CheckCircle2, Sparkles } from "lucide-react"

interface UpgradeLimitModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UpgradeLimitModal({ open, onOpenChange }: UpgradeLimitModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-8">
        <div className="space-y-6">
          {/* Improved text hierarchy */}
          <div className="space-y-3 text-center">
            <h2 className="text-2xl font-bold">You've Hit Your Free Plan Limit</h2>
            <p className="text-lg text-foreground">Unlock the full power of LaunchPilot!</p>
          </div>

          {/* Feature list with the subheading closer to it */}
          <div className="space-y-4 pt-2">
            <p className="text-muted-foreground">Upgrade to Pro and keep generating content instantly:</p>

            <div className="space-y-3 pl-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span>Unlimited generations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span>Captions, Emails, Avatar Videos, and Promo Videos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span>Download access for all content</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span>Saved project history</span>
              </div>
            </div>
          </div>

          {/* CTA buttons with more padding */}
          <div className="flex flex-col items-center gap-3 pt-4">
            <Link href="/checkout" className="w-full">
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-7 text-base gap-2 font-medium">
                <Sparkles className="h-5 w-5" />
                Upgrade to Pro
              </Button>
            </Link>
            <Button
              variant="link"
              className="text-sm text-muted-foreground hover:text-foreground mt-1"
              onClick={() => onOpenChange(false)}
            >
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

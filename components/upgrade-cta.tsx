import Link from "next/link"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface UpgradeCtaProps extends ButtonProps {
  variant?: "default" | "outline" | "link"
  size?: "default" | "sm" | "lg"
  className?: string
}

export function UpgradeCta({ variant = "default", size = "default", className, ...props }: UpgradeCtaProps) {
  return (
    <Link href="/checkout">
      <Button
        variant={variant}
        size={size}
        className={cn(
          "gap-1.5",
          variant === "outline" && "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10",
          className,
        )}
        {...props}
      >
        <Sparkles className={cn("h-4 w-4", size === "sm" && "h-3.5 w-3.5")} />
        <span>Upgrade to Pro</span>
      </Button>
    </Link>
  )
}

"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Lock, Loader2 } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"

export default function CheckoutPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const { refreshUserData } = useAuth()
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false)
      setIsComplete(true)

      // Redirect to Pro dashboard after successful payment
      setTimeout(() => {
        window.location.href = "/dashboard/pro"
      }, 2000)
    }, 1500)
  }

  const handleDemoUpgrade = async () => {
    setUpgrading(true)
    try {
      // Get the current session token
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        alert('Please log in to upgrade your account')
        router.push('/login')
        return
      }

      const response = await fetch('/api/upgrade-to-pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
      })

      if (response.ok) {
        // Refresh user data to update plan in context
        await refreshUserData()
        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        const error = await response.json()
        alert(`Upgrade failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      alert('Upgrade failed. Please try again.')
    } finally {
      setUpgrading(false)
    }
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#feebea] via-[#fff1d5] to-[#fff6d7]">
        <div className="container mx-auto px-4 pt-4">
          <Navbar />
        </div>
        
        <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">Payment Successful!</CardTitle>
              <CardDescription>Thank you for upgrading to LaunchPilot Pro</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                You now have access to all Pro features including Avatar Videos, Promo Videos, and unlimited history.
              </p>
              <p className="text-sm text-muted-foreground">Redirecting to your Pro dashboard...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#feebea] via-[#fff1d5] to-[#fff6d7]">
      <div className="container mx-auto px-4 pt-4">
        <Navbar />
      </div>
      
      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <div className="w-full max-w-4xl mx-4">
          <div className="grid gap-6 md:grid-cols-5">
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Upgrade to LaunchPilot Pro</CardTitle>
                <CardDescription>Enter your payment details to complete your subscription</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="your.email@example.com" required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="card">Card information</Label>
                      <div className="rounded-md border">
                        <Input
                          id="card"
                          className="border-0 border-b rounded-b-none"
                          placeholder="1234 1234 1234 1234"
                          required
                        />
                        <div className="flex">
                          <Input className="border-0 rounded-none" placeholder="MM / YY" required />
                          <Input className="border-0 border-l rounded-none" placeholder="CVC" required />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Name on card</Label>
                      <Input id="name" placeholder="Full name" required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country or region</Label>
                      <Input id="country" placeholder="United States" required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="postal">ZIP / Postal code</Label>
                      <Input id="postal" placeholder="12345" required />
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <Button 
                      type="submit" 
                      className="w-full bg-[#f4c537] text-[#2c0e31] hover:bg-[#eab72c] shadow-md hover:shadow-lg transition-all duration-200" 
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-[#2c0e31] border-t-transparent"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Pay $29.99/month
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleDemoUpgrade}
                      disabled={upgrading || isProcessing}
                    >
                      {upgrading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Upgrading...
                        </>
                      ) : (
                        'Demo Upgrade (Test Only)'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">LaunchPilot Pro</span>
                  <span>$29.99/month</span>
                </div>

                <RadioGroup defaultValue="monthly">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly">Monthly billing</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yearly" id="yearly" />
                    <Label htmlFor="yearly">
                      Yearly billing
                      <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Save 20%</span>
                    </Label>
                  </div>
                </RadioGroup>

                <Separator />

                <div className="space-y-1.5">
                  <h3 className="font-medium">What's included:</h3>
                  <ul className="space-y-1.5 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Avatar Videos</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Promo Videos</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Unlimited generations</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Full project history</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                </div>

                <Separator />

                <div className="flex items-center justify-between font-medium">
                  <span>Total</span>
                  <span>$29.99/month</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-start text-sm text-muted-foreground">
                <p>You can cancel your subscription anytime.</p>
                <p className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Payments are secure and encrypted
                </p>
              </CardFooter>
            </Card>
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:underline">
              Cancel and return to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
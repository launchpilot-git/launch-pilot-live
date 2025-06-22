// Presenter configuration system for different D-ID plan tiers
// This allows easy switching when D-ID subscription is upgraded

export interface PresenterConfig {
  presenter?: string
  voice: string
  style: string
  requiresPremium: boolean
}

export interface PlanTierConfig {
  name: string
  supportsCustomPresenters: boolean
  presenters: Record<string, PresenterConfig>
}

// D-ID Plan Tiers - update based on actual subscription
export const DID_PLAN_TIERS = {
  // Current tier - Basic (free D-ID presenters only)
  basic: {
    name: "Basic",
    supportsCustomPresenters: false,
    presenters: {
      professional: { voice: "en-US-AriaNeural", style: "Friendly", requiresPremium: false },
      elegant: { voice: "en-US-AriaNeural", style: "Hopeful", requiresPremium: false },
      bold: { voice: "en-US-JennyNeural", style: "Excited", requiresPremium: false },
      playful: { voice: "en-US-JennyNeural", style: "Cheerful", requiresPremium: false },
      luxury: { voice: "en-US-AriaNeural", style: "Hopeful", requiresPremium: false },
      minimal: { voice: "en-US-AriaNeural", style: "Friendly", requiresPremium: false },
      casual: { voice: "en-US-JennyNeural", style: "Cheerful", requiresPremium: false },
      witty: { voice: "en-US-JennyNeural", style: "Excited", requiresPremium: false },
    }
  },
  
  // Future tier - Premium (custom presenters available)
  premium: {
    name: "Premium",
    supportsCustomPresenters: true,
    presenters: {
      professional: { 
        presenter: "mary-26F6sVe7Yg", 
        voice: "en-US-AriaNeural", 
        style: "Friendly", 
        requiresPremium: true 
      },
      elegant: { 
        presenter: "sophia-utD_M2P2Lk", 
        voice: "en-US-AriaNeural", 
        style: "Hopeful", 
        requiresPremium: true 
      },
      bold: { 
        presenter: "jack-Pt27VkP3hW", 
        voice: "en-US-GuyNeural", 
        style: "Excited", 
        requiresPremium: true 
      },
      playful: { 
        presenter: "lily-ADdf3C9AUh", 
        voice: "en-US-JennyNeural", 
        style: "Cheerful", 
        requiresPremium: true 
      },
      luxury: { 
        presenter: "diana-tfTP6K9S9u", 
        voice: "en-US-AriaNeural", 
        style: "Hopeful", 
        requiresPremium: true 
      },
      minimal: { 
        presenter: "matt-g7muIj5CiD", 
        voice: "en-US-BrianNeural", 
        style: "Friendly", 
        requiresPremium: true 
      },
      casual: { 
        presenter: "dylan-O22mVF9zIM", 
        voice: "en-US-GuyNeural", 
        style: "Cheerful", 
        requiresPremium: true 
      },
      witty: { 
        presenter: "jaimie-mhQav1eFuW", 
        voice: "en-US-JennyNeural", 
        style: "Excited", 
        requiresPremium: true 
      },
    }
  }
} as const

// Environment variable to control D-ID plan tier
export function getCurrentDIDPlanTier(): keyof typeof DID_PLAN_TIERS {
  const tier = process.env.DID_PLAN_TIER as keyof typeof DID_PLAN_TIERS
  return tier && tier in DID_PLAN_TIERS ? tier : 'basic'
}

// Get presenter configuration for a brand style based on current D-ID plan
export function getPresenterConfigForTier(brandStyle: string, didPlanTier?: keyof typeof DID_PLAN_TIERS) {
  const tier = didPlanTier || getCurrentDIDPlanTier()
  const tierConfig = DID_PLAN_TIERS[tier]
  
  const presenterConfig = tierConfig.presenters[brandStyle.toLowerCase() as keyof typeof tierConfig.presenters] || 
                         tierConfig.presenters.professional
  
  return {
    config: presenterConfig,
    useDefaultPresenter: !tierConfig.supportsCustomPresenters,
    tierInfo: {
      currentTier: tier,
      supportsCustomPresenters: tierConfig.supportsCustomPresenters
    }
  }
}

// Helper to check if current D-ID plan supports custom presenters
export function supportsCustomPresenters(): boolean {
  const tier = getCurrentDIDPlanTier()
  return DID_PLAN_TIERS[tier].supportsCustomPresenters
}
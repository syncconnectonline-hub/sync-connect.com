"use client"

import { useState, useEffect } from 'react'
import Script from 'next/script'
import { useUser, useFirestore } from '@/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { Crown, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlanUpgradeModal } from '@/components/dashboard/plan-upgrade-modal'

interface FreePlanAdProviderProps {
  children?: React.ReactNode
}

export function FreePlanAdProvider({ children }: FreePlanAdProviderProps) {
  const { user } = useUser()
  const db = useFirestore()
  const [isProUser, setIsProUser] = useState<boolean | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [adDismissed, setAdDismissed] = useState(false)

  useEffect(() => {
    if (!user) {
      // Unauthenticated visitor is considered free plan
      setIsProUser(false)
      return
    }

    if (!db) return

    // Check affiliates collection
    const affRef = doc(db, 'affiliates', user.uid)
    const unsubAff = onSnapshot(affRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        const tier = data.planTier || data.tier || 'Free Member'
        const isPro = tier === 'Pro Member' || tier === 'VIP Member' || data.isPro === true
        setIsProUser(isPro)
      } else {
        // Check buyers collection
        const buyerRef = doc(db, 'buyers', user.uid)
        onSnapshot(buyerRef, (bSnap) => {
          if (bSnap.exists()) {
            const bData = bSnap.data()
            const tier = bData.planTier || bData.tier || 'Free Member'
            const isPro = tier === 'Pro Member' || tier === 'VIP Member' || bData.isPro === true
            setIsProUser(isPro)
          } else {
            setIsProUser(false)
          }
        })
      }
    }, () => {
      setIsProUser(false)
    })

    return () => unsubAff()
  }, [user, db])

  // If pro user is confirmed true, don't show ad script or banner
  const isFreePlan = isProUser === false

  return (
    <>
      {/* EffectiveCPM Network Script for Free Plan */}
      {isFreePlan && (
        <Script
          id="effectivecpm-free-ad-network"
          src="https://pl30870768.effectivecpmnetwork.com/40/92/3b/40923bf8429d1aeb05dff74356097b8e.js"
          strategy="afterInteractive"
        />
      )}

      {children}

      {/* Floating Free Plan Ad Notice */}
      {isFreePlan && !adDismissed && (
        <div className="fixed bottom-4 left-4 z-40 max-w-sm bg-gradient-to-r from-[#1c2333]/95 to-[#161b22]/95 backdrop-blur-md border border-[#FF9900]/30 shadow-2xl rounded-2xl p-3.5 text-white animate-in slide-in-from-bottom duration-500 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1">
                Plan Gratuito Activo
              </p>
              <p className="text-[10px] text-slate-300">
                Con anuncios patrocinados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={() => setShowUpgradeModal(true)}
              className="h-7 px-2.5 bg-gradient-to-r from-[#FF5500] to-[#FF9900] hover:from-[#E63900] hover:to-[#E68A00] text-slate-950 font-black text-[10px] uppercase rounded-lg shadow"
            >
              <Crown className="h-3 w-3 mr-1" /> Sin Anuncios
            </Button>
            <button
              onClick={() => setAdDismissed(true)}
              className="h-6 w-6 rounded-md text-slate-400 hover:text-white flex items-center justify-center"
              title="Ocultar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <PlanUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier="Free Member"
      />
    </>
  )
}

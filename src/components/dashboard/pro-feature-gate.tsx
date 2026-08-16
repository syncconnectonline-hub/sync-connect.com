"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Crown, Sparkles, Lock, Zap, ArrowRight, ShieldCheck } from 'lucide-react'
import { PlanUpgradeModal } from './plan-upgrade-modal'

interface ProFeatureGateProps {
  title: string
  description: string
  features: string[]
  isPro?: boolean
  children?: React.ReactNode
}

export function ProFeatureGate({
  title,
  description,
  features,
  isPro = false,
  children
}: ProFeatureGateProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  if (isPro) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      <Card className="bg-[#111827]/90 border border-amber-500/30 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-xl">
        <div className="bg-gradient-to-r from-amber-500/20 via-[#FF5500]/20 to-transparent p-6 sm:p-8 border-b border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                <Crown className="h-3.5 w-3.5" /> Herramienta Exclusiva Plan PRO VIP
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                {title}
              </h2>
              <p className="text-xs text-slate-300 max-w-xl">
                {description}
              </p>
            </div>

            <Button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-gradient-to-r from-[#FF5500] to-[#FF9900] hover:from-[#E63900] hover:to-[#E68A00] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl h-11 px-6 shadow-lg shadow-[#FF5500]/20 transition-all shrink-0 flex items-center gap-2"
            >
              <Crown className="h-4 w-4" />
              <span>DESBLOQUEAR PRO ($15 USD)</span>
            </Button>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Beneficios incluidos al activar tu Plan PRO:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((feat, idx) => (
                <div key={idx} className="p-3.5 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3">
                  <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-900/90 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">¿Estás en la Versión Gratuita?</div>
                <div className="text-[11px] text-slate-400">Puedes seguir usando el catálogo y enlaces de afiliado, o mejorar a PRO en cualquier momento.</div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeModal(true)}
              className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs font-bold uppercase rounded-xl h-9 shrink-0"
            >
              Ver Planes y Beneficios
            </Button>
          </div>
        </CardContent>
      </Card>

      <PlanUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentTier="Free Member"
      />
    </div>
  )
}

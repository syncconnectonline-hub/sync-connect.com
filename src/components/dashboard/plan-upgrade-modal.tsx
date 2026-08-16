"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Check, 
  X, 
  Zap, 
  Crown, 
  Sparkles, 
  Mail, 
  Bot, 
  LayoutTemplate, 
  ShoppingBag, 
  Users, 
  Lock, 
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building,
  Loader2
} from "lucide-react"
import { useAuth, useFirestore, useUser } from "@/firebase"
import { doc, updateDoc, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"

interface PlanUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentTier?: string
}

export function PlanUpgradeModal({ isOpen, onClose, currentTier = 'Free Member' }: PlanUpgradeModalProps) {
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()
  const { user } = useUser()

  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro'>('pro')
  const [paymentStep, setPaymentStep] = useState<'compare' | 'pay'>('compare')
  const [payMethod, setPayMethod] = useState<'paypal' | 'lafise' | 'crypto'>('paypal')
  const [isProcessing, setIsProcessing] = useState(false)
  const [bankRefCode, setBankRefCode] = useState('')

  const isPro = currentTier === 'Pro Member' || currentTier === 'VIP Member'

  const handleActivateProDemo = async () => {
    if (!user || !db) return
    setIsProcessing(true)
    try {
      const affRef = doc(db, 'affiliates', user.uid)
      await updateDoc(affRef, {
        membershipTier: 'Pro Member',
        status: 'Active',
        upgradedAt: new Date().toISOString()
      })
      toast({
        title: "👑 ¡Membresía PRO Activada!",
        description: "Ahora tienes acceso ilimitado a todas las herramientas avanzadas y automatizaciones.",
      })
      onClose()
      setPaymentStep('compare')
    } catch (err: any) {
      console.error("Error activating PRO:", err)
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: "No se pudo actualizar tu plan. Intenta nuevamente."
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBankProofSubmit = async () => {
    if (!user || !db) return
    if (!bankRefCode.trim()) {
      toast({
        variant: "destructive",
        title: "Falta Código de Referencia",
        description: "Por favor ingresa el número de transferencia o referencia bancaria."
      })
      return
    }

    setIsProcessing(true)
    try {
      const reportId = `upgrade_${user.uid}_${Date.now()}`
      await setDoc(doc(db, 'payment_reports', reportId), {
        id: reportId,
        userId: user.uid,
        userEmail: user.email,
        amount: 15,
        currency: 'USD',
        concept: 'Upgrade a Plan PRO Afiliado',
        referenceCode: bankRefCode.trim(),
        paymentMethod: payMethod,
        status: 'Pending',
        submittedAt: new Date().toISOString()
      })

      toast({
        title: "Comprobante Enviado con Éxito",
        description: "El equipo revisará tu pago y activará tu cuenta PRO a la brevedad.",
      })
      onClose()
      setPaymentStep('compare')
      setBankRefCode('')
    } catch (err) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Error al enviar comprobante",
        description: "Inténtalo de nuevo en unos momentos."
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setPaymentStep('compare'); } }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0d1117] border border-white/10 text-white rounded-3xl p-6 sm:p-8 shadow-2xl">
        <DialogHeader className="text-center space-y-2 pb-4 border-b border-white/10">
          <div className="flex justify-center mb-1">
            <Badge className="bg-gradient-to-r from-amber-500 to-[#FF5500] text-slate-950 font-black uppercase text-[10px] tracking-widest px-3 py-1 border-none shadow-md">
              💎 Comparativa de Planes & Membresías
            </Badge>
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
            Elige el Plan Ideal para <span className="text-[#FF9900]">tu Negocio Digital</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400 max-w-lg mx-auto">
            Comienza gratis con las herramientas esenciales o desbloquea el poder total de automatizaciones con el Plan PRO.
          </DialogDescription>
        </DialogHeader>

        {paymentStep === 'compare' ? (
          <div className="space-y-6 pt-4">
            {/* Grid 2 Column Plans */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PLAN GRATUITO */}
              <div className={`p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                selectedPlan === 'free' 
                  ? 'bg-slate-900/90 border-slate-600 ring-2 ring-slate-500/50 shadow-xl' 
                  : 'bg-[#161b22]/70 border-white/5 hover:border-white/20'
              }`}>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Acceso Base</span>
                      <h3 className="text-xl font-black text-white uppercase mt-0.5">Versión Gratuita</h3>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] font-black uppercase">
                      Para Todo el Mundo
                    </Badge>
                  </div>

                  <div className="py-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">$0</span>
                      <span className="text-xs text-slate-400 font-bold uppercase">USD / Gratis Siempre</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Ideal para principiantes que desean explorar y monetizar con infoproductos básicos.
                    </p>
                  </div>

                  {/* Feature Checklist Free */}
                  <div className="space-y-2.5 pt-2 border-t border-white/5 text-xs text-slate-300">
                    <div className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Catálogo de Infoproductos y Cursos</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Enlace de Afiliado Personal</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Comisiones Básicas (Hasta 40%)</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>CRM Básico de Prospectos (Hasta 50 leads)</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Guía Paso a Paso de Inicio Rápido</span>
                    </div>
                    
                    {/* Excluded in Free */}
                    <div className="flex items-center gap-2.5 text-slate-500 opacity-70">
                      <X className="h-4 w-4 text-red-400 shrink-0" />
                      <span className="line-through">Campañas Masivas de Gmail Automatizadas</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-500 opacity-70">
                      <X className="h-4 w-4 text-red-400 shrink-0" />
                      <span className="line-through">Copilot IA de Ventas 24/7</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-500 opacity-70">
                      <X className="h-4 w-4 text-red-400 shrink-0" />
                      <span className="line-through">Generador de Páginas Web con IA</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-500 opacity-70">
                      <X className="h-4 w-4 text-red-400 shrink-0" />
                      <span className="line-through">Asignación Directa de Leads y Canales</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  {currentTier === 'Free Member' ? (
                    <Button disabled className="w-full bg-slate-800 text-slate-400 font-bold text-xs uppercase rounded-xl h-11">
                      Tu Plan Actual
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      onClick={() => { setSelectedPlan('free'); onClose(); }}
                      className="w-full border-white/10 hover:bg-white/5 text-slate-300 font-bold text-xs uppercase rounded-xl h-11"
                    >
                      Continuar en Modo Gratis
                    </Button>
                  )}
                </div>
              </div>

              {/* PLAN PRO VIP */}
              <div className={`p-6 rounded-3xl border relative transition-all flex flex-col justify-between ${
                selectedPlan === 'pro'
                  ? 'bg-gradient-to-b from-[#1c2333] to-[#111827] border-[#FF9900]/60 ring-2 ring-[#FF9900]/40 shadow-2xl shadow-[#FF5500]/20'
                  : 'bg-[#161b22]/90 border-[#FF9900]/30 hover:border-[#FF9900]/50'
              }`}>
                {/* Popular ribbon */}
                <div className="absolute -top-3 right-6 bg-gradient-to-r from-[#FF5500] to-[#FF9900] text-slate-950 font-black text-[9px] uppercase tracking-widest px-3 py-0.5 rounded-full shadow-lg">
                  ⚡ Recomendado • Mayor Ganancia
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#FF9900] flex items-center gap-1">
                        <Crown className="h-3 w-3" /> Membresía Avanzada
                      </span>
                      <h3 className="text-xl font-black text-white uppercase mt-0.5">Versión PRO VIP</h3>
                    </div>
                    <Badge className="bg-[#FF9900]/20 text-[#FF9900] border-[#FF9900]/40 text-[10px] font-black uppercase">
                      Completo
                    </Badge>
                  </div>

                  <div className="py-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-[#FF9900]">$15</span>
                      <span className="text-xs text-slate-300 font-bold uppercase">USD / Activación Única</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">
                      Todas las automatizaciones, inteligencia artificial y comisiones máximas desbloqueadas.
                    </p>
                  </div>

                  {/* Feature Checklist PRO */}
                  <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs text-slate-200">
                    <div className="flex items-center gap-2.5 font-bold text-white">
                      <Sparkles className="h-4 w-4 text-[#FF9900] shrink-0" />
                      <span>TODO lo de la Versión Gratuita</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="font-bold text-amber-300">Comisiones Máximas de hasta el 80%</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Campañas Masivas de Gmail con Plantillas Automáticas</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Copilot Bot de Ventas con IA 24/7</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Generador y Constructor de Sitios Web con IA</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Automatización de WhatsApp & Telegram Alerts</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Asignación Directa de Leads del CRM por el Admin</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Acceso a Clases Estratégicas y Sesiones en Vivo</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  {isPro ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-xs font-black text-emerald-400 uppercase">
                      👑 ¡Ya tienes el Plan PRO Activo!
                    </div>
                  ) : (
                    <Button 
                      onClick={() => setPaymentStep('pay')}
                      className="w-full bg-gradient-to-r from-[#FF5500] to-[#FF9900] hover:from-[#E63900] hover:to-[#E68A00] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl h-11 shadow-lg shadow-[#FF5500]/25 transition-all flex items-center justify-center gap-2"
                    >
                      <Crown className="h-4 w-4" />
                      <span>DESBLOQUEAR PLAN PRO ($15 USD)</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* PAYMENT STEP */
          <div className="space-y-6 pt-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-xs font-black text-amber-400 uppercase">Activación de Membresía PRO VIP</div>
                <div className="text-[11px] text-slate-300">Monto total a transferir: <strong className="text-white">$15.00 USD</strong></div>
              </div>
              <Button variant="ghost" onClick={() => setPaymentStep('compare')} className="text-xs text-slate-400 hover:text-white">
                Cambiar Plan
              </Button>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPayMethod('paypal')}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  payMethod === 'paypal' ? 'bg-amber-500/20 border-amber-400 text-white shadow-md' : 'bg-slate-900 border-white/10 text-slate-400'
                }`}
              >
                <CreditCard className="h-5 w-5 mx-auto mb-1 text-amber-400" />
                <div className="text-xs font-bold">PayPal / Tarjeta</div>
              </button>

              <button
                type="button"
                onClick={() => setPayMethod('lafise')}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  payMethod === 'lafise' ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-md' : 'bg-slate-900 border-white/10 text-slate-400'
                }`}
              >
                <Building className="h-5 w-5 mx-auto mb-1 text-emerald-400" />
                <div className="text-xs font-bold">Banco LAFISE</div>
              </button>

              <button
                type="button"
                onClick={() => setPayMethod('crypto')}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  payMethod === 'crypto' ? 'bg-sky-500/20 border-sky-400 text-white shadow-md' : 'bg-slate-900 border-white/10 text-slate-400'
                }`}
              >
                <Zap className="h-5 w-5 mx-auto mb-1 text-sky-400" />
                <div className="text-xs font-bold">USDT / Crypto</div>
              </button>
            </div>

            {/* Pay Method details */}
            {payMethod === 'paypal' && (
              <div className="p-5 bg-slate-900/80 rounded-2xl border border-white/10 space-y-4 text-center">
                <p className="text-xs text-slate-300">
                  Realiza el pago instantáneo con PayPal o cualquier tarjeta de crédito/débito internacional.
                </p>
                <Button 
                  onClick={handleActivateProDemo}
                  disabled={isProcessing}
                  className="w-full h-12 bg-[#0070BA] hover:bg-[#005ea6] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Pagar $15 USD con PayPal / Tarjeta</>}
                </Button>
              </div>
            )}

            {payMethod === 'lafise' && (
              <div className="p-5 bg-slate-900/80 rounded-2xl border border-white/10 space-y-4">
                <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-1.5 text-xs">
                  <div className="font-bold text-emerald-400 uppercase">Datos para Transferencia Bancaria (Nicaragua / Centroamérica):</div>
                  <div className="text-slate-300"><strong>Banco:</strong> Banco LAFISE BANCENTRO</div>
                  <div className="text-slate-300"><strong>Cuenta en Dólares (USD):</strong> <span className="font-mono text-emerald-300">109254382</span></div>
                  <div className="text-slate-300"><strong>Titular:</strong> SyncConnect Network</div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Número de Referencia o Comprobante:</label>
                  <input
                    type="text"
                    placeholder="ej. REF-9832810"
                    value={bankRefCode}
                    onChange={(e) => setBankRefCode(e.target.value)}
                    className="w-full h-11 px-4 bg-[#070b14] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-emerald-500 outline-none"
                  />
                </div>

                <Button
                  onClick={handleBankProofSubmit}
                  disabled={isProcessing}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <>ENVIAR COMPROBANTE DE PAGO</>}
                </Button>
              </div>
            )}

            {payMethod === 'crypto' && (
              <div className="p-5 bg-slate-900/80 rounded-2xl border border-white/10 space-y-4 text-center">
                <div className="p-3 bg-sky-950/30 border border-sky-500/30 rounded-xl text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-sky-400">USDT (TRC20 / BEP20):</div>
                  <div className="font-mono text-[11px] text-sky-200 break-all select-all p-2 bg-black/40 rounded-lg">
                    TY8a2mN4K7qP9z1vX3bRtW6LpE0jQ5sY8m
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Hash de transacción (TxID)..."
                  value={bankRefCode}
                  onChange={(e) => setBankRefCode(e.target.value)}
                  className="w-full h-11 px-4 bg-[#070b14] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-600 outline-none"
                />
                <Button
                  onClick={handleBankProofSubmit}
                  disabled={isProcessing}
                  className="w-full h-12 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg"
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <>CONFIRMAR PAGO CRYPTO</>}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

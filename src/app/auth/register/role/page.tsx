"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Store, Users, ChevronRight, Zap, ShieldCheck, GraduationCap, Globe, ArrowLeft, Home, Sparkles, Lock, Gift } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { doc } from 'firebase/firestore'
import { getGoogleDriveDirectLink } from '@/lib/utils'
import { getFreeSpotsInfo, FreeSpotInfo, DEFAULT_FREE_SPOTS } from '@/lib/free-spots'
import placeholderData from '@/app/lib/placeholder-images.json'

export default function RoleSelectionPage() {
  const db = useFirestore()
  const logoConfigRef = useMemoFirebase(() => db ? doc(db, 'site_config', 'site-logo') : null, [db]);
  const { data: logoOverride } = useDoc(logoConfigRef);
  const defaultLogo = placeholderData.placeholderImages.find(img => img.id === 'site-logo');
  const displayLogoUrl = getGoogleDriveDirectLink(logoOverride?.imageUrl || defaultLogo?.imageUrl || "");

  const [freeSpots, setFreeSpots] = useState<FreeSpotInfo>(DEFAULT_FREE_SPOTS);

  useEffect(() => {
    getFreeSpotsInfo(db).then(setFreeSpots);
  }, [db]);

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex flex-col items-center justify-center p-6 py-20 relative">
      {/* Top Left Navigation - Volver a Inicio */}
      <div className="absolute left-4 top-4 md:left-8 md:top-8">
        <Button asChild variant="ghost" className="text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-white border border-slate-200 hover:bg-slate-50 shadow-sm h-8 px-3 rounded-lg">
          <Link href="/">
            <ArrowLeft className="h-3.5 w-3.5 text-[#ff9900]" />
            <span>Volver a Inicio</span>
          </Link>
        </Button>
      </div>

      <div className="mb-10">
        <Link href="/">
          <div className="h-10 w-40 relative">
            {displayLogoUrl ? (
              <Image src={displayLogoUrl} alt="Logo" fill className="object-contain" unoptimized />
            ) : (
              <span className="text-[#131921] font-black text-2xl italic tracking-tighter uppercase">Six<span className="text-[#ff9900]">Figure</span></span>
            )}
          </div>
        </Link>
      </div>

      <div className="max-w-3xl w-full text-center space-y-4 mb-8">
        {/* Prominent Free Registration Info Banner */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-black uppercase tracking-wider shadow-sm">
          <Gift className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            ✨ VERSIÓN 100% GRATIS • REGISTRO ABIERTO PARA TODO EL MUNDO ($0 USD)
          </span>
        </div>

        <h1 className="text-3xl md:text-5xl font-headline font-black text-[#131921] uppercase tracking-tighter">
          Registro de <span className="text-[#ff9900]">Socio Afiliado</span>
        </h1>
        <p className="text-slate-500 text-base font-medium max-w-xl mx-auto">
          Crea tu cuenta gratuita hoy mismo. Sin costos de activación ni mensualidades.
        </p>
      </div>

      <div className="w-full max-w-xl mx-auto">
        {/* Single Card: Socio Afiliado Por Invitación */}
        <Link href="/auth/register/affiliate" className="group block">
          <Card className="p-8 border-2 border-[#ff9900]/30 shadow-xl hover:shadow-2xl transition-all rounded-3xl bg-white flex flex-col justify-between relative overflow-hidden">
            {freeSpots.isFreeEligible && (
              <div className="absolute top-0 right-0 bg-emerald-500 text-white font-black text-[10px] uppercase px-4 py-1.5 rounded-bl-2xl shadow-md">
                🎁 100% GRATIS ($0)
              </div>
            )}
            <div className="space-y-6">
              <div className="h-14 w-14 bg-[#131921] rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Users className="h-7 w-7 text-[#ff9900]" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-[#131921] uppercase tracking-tight">Socio Afiliado</h3>
                  {freeSpots.isFreeEligible ? (
                    <Badge className="bg-emerald-500 text-white font-black text-xs px-3 py-1">100% GRATIS</Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-50 text-emerald-700 font-bold text-xs px-3 py-1">${freeSpots.affiliatePrice || 15} USD</Badge>
                  )}
                </div>
                <p className="text-slate-600 text-sm font-medium leading-relaxed">
                  Promociona infoproductos probados utilizando tus enlaces Cycling, opera con el Copiloto de IA de Ventas 24/7 y gestiona tus comisiones de forma automatizada.
                </p>
                <div className="pt-3 space-y-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide"><ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" /> Atribución Directa por Código Cycling</div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide"><ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" /> Asistente de IA de Ventas Integrado</div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide"><ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" /> Acceso por Invitación Directa</div>
                </div>
              </div>
            </div>
            <div className="pt-8 flex items-center justify-between border-t border-slate-100 mt-6">
              <span className="text-[#ff9900] font-black text-sm uppercase tracking-wider group-hover:translate-x-1 transition-transform flex items-center gap-2">
                CONTINUAR REGISTRO DE AFILIADO <ChevronRight className="h-5 w-5" />
              </span>
            </div>
          </Card>
        </Link>
      </div>

      <div className="mt-10 flex justify-center animate-in fade-in duration-500">
        <Button asChild variant="outline" className="h-9 px-5 rounded-lg border-slate-300 text-slate-700 hover:text-[#131921] font-bold text-xs uppercase tracking-wider transition-all gap-2 bg-white shadow-sm hover:shadow-md">
          <Link href="/">
            <Home className="h-3.5 w-3.5 text-[#ff9900]" />
            <span>Volver a la Página Principal</span>
          </Link>
        </Button>
      </div>

      <footer className="mt-16 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-600" /> SixFigure / SyncConnect Global • Entorno Seguro & Activación Automatizada
      </footer>
    </div>
  )
}
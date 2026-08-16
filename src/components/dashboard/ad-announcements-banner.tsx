"use client"

import { useState, useEffect } from 'react'
import { Megaphone, X, ArrowRight, Tag, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useFirestore } from '@/firebase'
import { collection, query, where, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore'
import Link from 'next/link'

export interface AdAnnouncementsBannerProps {
  currentUserId?: string
  audience?: 'affiliates' | 'buyers' | 'all' | 'public'
}

export function AdAnnouncementsBanner({ currentUserId, audience = 'all' }: AdAnnouncementsBannerProps) {
  const db = useFirestore()
  const [ads, setAds] = useState<any[]>([])
  const [dismissedAds, setDismissedAds] = useState<string[]>([])

  useEffect(() => {
    if (!db) return

    const unsub = onSnapshot(collection(db, 'announcements_ads'), (snap) => {
      const activeList: any[] = []
      snap.forEach((d) => {
        const data = d.data()
        if (data.isActive) {
          // Check audience or specific affiliate assignment
          const matchesAudience = 
            data.targetAudience === 'all' || 
            data.targetAudience === audience || 
            (currentUserId && data.assignedAffiliateId === currentUserId)
          
          if (matchesAudience) {
            activeList.push({ id: d.id, ...data })
          }
        }
      })
      activeList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      setAds(activeList)
    })

    return () => unsub()
  }, [db, audience, currentUserId])

  const handleDismiss = (id: string) => {
    setDismissedAds((prev) => [...prev, id])
  }

  const handleTrackClick = async (adId: string) => {
    if (!db) return
    try {
      await updateDoc(doc(db, 'announcements_ads', adId), {
        clicksCount: increment(1)
      })
    } catch (err) {
      console.warn("Could not record ad click:", err)
    }
  }

  const visibleAds = ads.filter(a => !dismissedAds.includes(a.id))

  if (visibleAds.length === 0) return null

  return (
    <div className="space-y-4 mb-6">
      {visibleAds.map((ad) => (
        <div
          key={ad.id}
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#1c2333] via-[#161b22] to-[#0f141c] border border-[#FF9900]/30 shadow-2xl p-5 md:p-6 text-white group transition-all"
        >
          {/* Subtle glowing ambient */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#FF5500]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-start sm:items-center gap-4 w-full md:w-auto">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#FF5500] to-[#FF9900] flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0">
                <Megaphone className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {ad.badgeText ? (
                    <Badge className="bg-[#FF9900] text-slate-950 font-black text-[9px] uppercase px-2 py-0.5 border-none">
                      {ad.badgeText}
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] uppercase px-2 py-0.5">
                      <Sparkles className="h-3 w-3 mr-1 inline" /> ANUNCIO OFICIAL
                    </Badge>
                  )}
                  {ad.discountCode && (
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-amber-300 font-mono text-[10px] font-bold">
                      CÓDIGO: {ad.discountCode}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-black text-white uppercase tracking-tight">{ad.title}</h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">{ad.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end shrink-0">
              <Button
                asChild
                onClick={() => handleTrackClick(ad.id)}
                className="bg-gradient-to-r from-[#FF5500] to-[#FF9900] hover:from-[#E63900] hover:to-[#E68A00] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl h-11 px-6 shadow-lg shadow-[#FF5500]/20 flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
              >
                <Link href={ad.ctaUrl || '/dashboard/affiliate/products'}>
                  <span>{ad.ctaText || 'Ver Oferta'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <button
                type="button"
                onClick={() => handleDismiss(ad.id)}
                className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title="Cerrar Anuncio"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

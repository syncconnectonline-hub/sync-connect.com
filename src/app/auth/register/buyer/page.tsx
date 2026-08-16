"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function BuyerRegisterPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/auth/register/affiliate')
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F9FA]">
      <Loader2 className="h-8 w-8 animate-spin text-[#ff9900] mb-2" />
      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Redireccionando a Registro de Afiliado...</p>
    </div>
  )
}


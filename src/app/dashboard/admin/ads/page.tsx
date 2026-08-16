"use client"

import { useState, useEffect } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  Sparkles, 
  CheckCircle, 
  ExternalLink, 
  Image as ImageIcon,
  Tag,
  Users,
  MousePointerClick,
  Layers,
  Flame,
  Zap,
  Save,
  Globe
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useFirestore, useUser } from '@/firebase'
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'

interface AdAnnouncement {
  id: string
  title: string
  description: string
  imageUrl?: string
  ctaText: string
  ctaUrl: string
  discountCode?: string
  badgeText?: string
  targetAudience: 'all' | 'affiliates' | 'buyers' | 'public'
  isActive: boolean
  assignedAffiliateId?: string
  clicksCount: number
  viewsCount: number
  createdAt: string
  updatedAt: string
}

export default function AdminAdsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()

  const [ads, setAds] = useState<AdAnnouncement[]>([])
  const [affiliatesList, setAffiliatesList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingAdId, setEditingAdId] = useState<string | null>(null)

  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [ctaText, setCtaText] = useState('Ver Oferta Especial')
  const [ctaUrl, setCtaUrl] = useState('/dashboard/affiliate/products')
  const [discountCode, setDiscountCode] = useState('')
  const [badgeText, setBadgeText] = useState('🔥 OFERTA LIMITADA')
  const [targetAudience, setTargetAudience] = useState<'all' | 'affiliates' | 'buyers' | 'public'>('all')
  const [isActive, setIsActive] = useState(true)
  const [assignedAffiliateId, setAssignedAffiliateId] = useState('')

  useEffect(() => {
    if (!db) return

    const unsub = onSnapshot(collection(db, 'announcements_ads'), (snap) => {
      const list: AdAnnouncement[] = []
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as AdAnnouncement)
      })
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      setAds(list)
      setIsLoading(false)
    })

    // Fetch affiliates for targeting
    getDocs(collection(db, 'affiliates')).then((snap) => {
      const affs: any[] = []
      snap.forEach((d) => affs.push({ id: d.id, ...d.data() }))
      setAffiliatesList(affs)
    }).catch(console.error)

    return () => unsub()
  }, [db])

  const handleOpenCreateModal = () => {
    setEditingAdId(null)
    setTitle('🔥 Gran Lanzamiento: Pack de Cursos & Crecimiento Digital 2026')
    setDescription('Accede a las mejores herramientas de prospección automatizada, WhatsApp Cloud API oficial y materiales de alta conversión con hasta 70% de descuento.')
    setImageUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80')
    setCtaText('Reclamar Descuento VIP')
    setCtaUrl('/dashboard/affiliate/products')
    setDiscountCode('PROMO2026')
    setBadgeText('🔥 OFERTA EXCLUSIVA')
    setTargetAudience('all')
    setIsActive(true)
    setAssignedAffiliateId('')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (ad: AdAnnouncement) => {
    setEditingAdId(ad.id)
    setTitle(ad.title)
    setDescription(ad.description)
    setImageUrl(ad.imageUrl || '')
    setCtaText(ad.ctaText)
    setCtaUrl(ad.ctaUrl)
    setDiscountCode(ad.discountCode || '')
    setBadgeText(ad.badgeText || '')
    setTargetAudience(ad.targetAudience)
    setIsActive(ad.isActive)
    setAssignedAffiliateId(ad.assignedAffiliateId || '')
    setIsModalOpen(true)
  }

  const handleSaveAd = async () => {
    if (!db || !title.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'El título del anuncio es obligatorio.' })
      return
    }

    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      const adId = editingAdId || `ad_${Date.now()}`

      const payload: Partial<AdAnnouncement> = {
        id: adId,
        title: title.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim() || undefined,
        ctaText: ctaText.trim() || 'Ver Oferta',
        ctaUrl: ctaUrl.trim() || '/dashboard/affiliate/products',
        discountCode: discountCode.trim() || undefined,
        badgeText: badgeText.trim() || undefined,
        targetAudience,
        isActive,
        assignedAffiliateId: assignedAffiliateId.trim() || undefined,
        updatedAt: now
      }

      if (!editingAdId) {
        payload.createdAt = now
        payload.clicksCount = 0
        payload.viewsCount = 0
      }

      await setDoc(doc(db, 'announcements_ads', adId), payload, { merge: true })

      toast({
        title: editingAdId ? 'Anuncio Actualizado' : '¡Anuncio Creado y Publicado!',
        description: 'El banner publicitario ya se encuentra disponible para la audiencia seleccionada.'
      })
      setIsModalOpen(false)
    } catch (err: any) {
      console.error(err)
      toast({ variant: 'destructive', title: 'Error al guardar', description: err?.message || 'No se pudo guardar el anuncio.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (ad: AdAnnouncement) => {
    if (!db) return
    try {
      await setDoc(doc(db, 'announcements_ads', ad.id), { isActive: !ad.isActive, updatedAt: new Date().toISOString() }, { merge: true })
      toast({
        title: !ad.isActive ? 'Anuncio Activado' : 'Anuncio Pausado',
        description: `El anuncio "${ad.title}" ha sido ${!ad.isActive ? 'activado' : 'pausado'}.`
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteAd = async (adId: string) => {
    if (!db) return
    if (!confirm('¿Estás seguro de eliminar este anuncio publicitario?')) return
    try {
      await deleteDoc(doc(db, 'announcements_ads', adId))
      toast({ title: 'Anuncio Eliminado' })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <DashboardShell role="admin">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161b22] p-6 rounded-3xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-[#FF5500] to-[#FF9900] rounded-2xl flex items-center justify-center text-slate-950 font-black shadow-lg shadow-[#FF5500]/20">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                Gestor de Anuncios & Publicidad <span className="text-[#FF9900]">Comercial</span>
              </h1>
              <p className="text-xs text-slate-400">
                Crea banners de publicidad, ofertas flash y anuncios personalizados para afiliados y compradores.
              </p>
            </div>
          </div>

          <Button
            onClick={handleOpenCreateModal}
            className="bg-gradient-to-r from-[#FF5500] to-[#FF9900] hover:from-[#E63900] hover:to-[#E68A00] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl h-11 px-5 shadow-lg shadow-[#FF5500]/25 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Crear Nuevo Anuncio</span>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-[#161b22] border-white/5 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Anuncios</p>
                <h3 className="text-2xl font-black text-white mt-1">{ads.length}</h3>
              </div>
              <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-[#FF9900]">
                <Layers className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="bg-[#161b22] border-white/5 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Anuncios Activos</p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">{ads.filter(a => a.isActive).length}</h3>
              </div>
              <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                <Flame className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="bg-[#161b22] border-white/5 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Clics Totales</p>
                <h3 className="text-2xl font-black text-sky-400 mt-1">
                  {ads.reduce((acc, a) => acc + (a.clicksCount || 0), 0)}
                </h3>
              </div>
              <div className="h-10 w-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400">
                <MousePointerClick className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Ads List */}
        <div className="space-y-4">
          <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-[#FF9900]" /> Campañas y Banners Publicitarios Activos
          </h2>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500 font-bold uppercase text-xs">Cargando anuncios publicitarios...</div>
          ) : ads.length === 0 ? (
            <div className="p-12 bg-[#161b22] rounded-3xl border border-white/5 text-center space-y-4">
              <Megaphone className="h-12 w-12 text-slate-600 mx-auto" />
              <div>
                <h3 className="text-lg font-black text-white uppercase">Aún no hay anuncios creados</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Crea tu primer banner de publicidad para promocionar productos, eventos o enlaces con descuentos para todos los usuarios.
                </p>
              </div>
              <Button onClick={handleOpenCreateModal} className="bg-[#FF9900] text-slate-950 font-black text-xs uppercase rounded-xl">
                Crear Mi Primer Anuncio
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {ads.map((ad) => (
                <div 
                  key={ad.id} 
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                    ad.isActive ? 'bg-[#161b22] border-white/10 shadow-lg' : 'bg-slate-950/60 border-white/5 opacity-75'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {ad.badgeText && (
                          <Badge className="bg-gradient-to-r from-[#FF5500] to-[#FF9900] text-slate-950 font-black text-[9px] uppercase px-2 py-0.5 border-none">
                            {ad.badgeText}
                          </Badge>
                        )}
                        <Badge variant="outline" className="border-white/10 text-slate-400 text-[9px] uppercase">
                          Audiencia: {ad.targetAudience}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">
                          {ad.isActive ? 'Activo' : 'Pausado'}
                        </span>
                        <Switch checked={ad.isActive} onCheckedChange={() => handleToggleActive(ad)} />
                      </div>
                    </div>

                    {/* Banner Image Preview */}
                    {ad.imageUrl && (
                      <div className="w-full h-36 rounded-2xl overflow-hidden relative border border-white/10 bg-black/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={ad.imageUrl} 
                          alt={ad.title} 
                          className="w-full h-full object-cover" 
                          onError={(e) => { (e.target as any).style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 flex flex-col justify-end">
                          <h3 className="text-sm font-black text-white line-clamp-1">{ad.title}</h3>
                        </div>
                      </div>
                    )}

                    {!ad.imageUrl && (
                      <h3 className="text-base font-black text-white">{ad.title}</h3>
                    )}

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {ad.description}
                    </p>

                    {/* Meta info / Discount code */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-xs">
                      {ad.discountCode && (
                        <div className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 font-mono text-[10px] font-bold flex items-center gap-1">
                          <Tag className="h-3 w-3" /> CÓDIGO: {ad.discountCode}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <MousePointerClick className="h-3 w-3 text-sky-400" /> {ad.clicksCount || 0} clics
                      </div>
                    </div>
                  </div>

                  {/* Actions Bottom */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(ad)}
                      className="border-white/10 hover:bg-white/5 text-slate-300 font-bold text-xs rounded-xl h-9 flex items-center gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Editar
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAd(ad.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl h-9 px-3"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CREATE / EDIT AD MODAL */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl bg-[#0d1117] border border-white/10 text-white rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <DialogHeader className="space-y-1 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 bg-[#FF9900]/20 rounded-xl flex items-center justify-center text-[#FF9900]">
                  <Megaphone className="h-5 w-5" />
                </div>
                <DialogTitle className="text-xl font-black uppercase text-white">
                  {editingAdId ? 'Editar Anuncio Publicitario' : 'Crear Nuevo Anuncio Publicitario'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-400">
                Personaliza los textos, imagen, botón de acción y enlaces para el anuncio.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400">Título del Anuncio *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ej. 🔥 OFERTA ESPECIAL: 50% OFF en Cursos VIP"
                  className="h-10 bg-[#161b22] border-white/10 text-white text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400">Descripción o Mensaje Publicitario</Label>
                <Textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Escribe los beneficios, ofertas y llamado a la acción..."
                  className="bg-[#161b22] border-white/10 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">URL de Imagen o Banner (Opcional)</Label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-10 bg-[#161b22] border-white/10 text-white text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Badge / Etiqueta Superior</Label>
                  <Input
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="ej. 🔥 OFERTA LIMITADA"
                    className="h-10 bg-[#161b22] border-white/10 text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Texto del Botón CTA</Label>
                  <Input
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="ej. Reclamar Descuento"
                    className="h-10 bg-[#161b22] border-white/10 text-white text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Enlace de Destino (URL o Ruta)</Label>
                  <Input
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="/dashboard/affiliate/products o https://..."
                    className="h-10 bg-[#161b22] border-white/10 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Código de Cupón / Descuento (Opcional)</Label>
                  <Input
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="ej. SYNC50"
                    className="h-10 bg-[#161b22] border-white/10 text-white text-xs uppercase font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Audiencia Objetivo</Label>
                  <select
                    value={targetAudience}
                    onChange={(e: any) => setTargetAudience(e.target.value)}
                    className="w-full h-10 px-3 bg-[#161b22] border border-white/10 rounded-xl text-xs text-white outline-none"
                  >
                    <option value="all">Todos los Usuarios</option>
                    <option value="affiliates">Solo Afiliados</option>
                    <option value="buyers">Solo Compradores</option>
                    <option value="public">Público General</option>
                  </select>
                </div>
              </div>

              {/* Asignación específica a un afiliado */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400">
                  Asignar a un Afiliado Específico (Opcional)
                </Label>
                <select
                  value={assignedAffiliateId}
                  onChange={(e) => setAssignedAffiliateId(e.target.value)}
                  className="w-full h-10 px-3 bg-[#161b22] border border-white/10 rounded-xl text-xs text-white outline-none"
                >
                  <option value="">-- Todos los Afiliados --</option>
                  {affiliatesList.map((aff) => (
                    <option key={aff.id} value={aff.id}>
                      {aff.firstName} {aff.lastName} ({aff.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Preview Card */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-amber-400" /> Vista Previa en Vivo del Banner
                </Label>
                <div className="p-4 bg-gradient-to-r from-[#1c2333] to-[#161b22] rounded-xl border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    {badgeText && (
                      <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block">
                        {badgeText}
                      </span>
                    )}
                    <h4 className="text-sm font-black text-white uppercase">{title || 'Título del anuncio'}</h4>
                    <p className="text-[11px] text-slate-300 line-clamp-1">{description || 'Descripción del anuncio publicitario...'}</p>
                  </div>
                  <Button className="bg-gradient-to-r from-[#FF5500] to-[#FF9900] text-slate-950 font-black text-xs uppercase px-4 h-9 rounded-xl shrink-0">
                    {ctaText}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-xs">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveAd}
                  disabled={isSaving}
                  className="bg-[#FF9900] hover:bg-[#e68a00] text-slate-950 font-black text-xs uppercase rounded-xl h-10 px-6 shadow-lg flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingAdId ? 'Guardar Cambios' : 'Publicar Anuncio'}</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  )
}

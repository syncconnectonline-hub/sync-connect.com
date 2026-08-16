"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  MessageSquare,
  Mail,
  Send,
  Users,
  CheckCircle2,
  Sparkles,
  Bot,
  Loader2,
  ShieldCheck,
  Zap,
  Phone,
  Key,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export interface AssignedChannelsConfig {
  whatsapp?: {
    enabled: boolean;
    assignedNumber?: string;
    phoneNumberId?: string;
    accessToken?: string;
    welcomeMessage?: string;
    autoReplyEnabled?: boolean;
    copilotAiEnabled?: boolean;
    assignedAt?: string;
  };
  gmail?: {
    enabled: boolean;
    assignedEmail?: string;
    defaultSubject?: string;
    defaultTemplateHtml?: string;
    autoSendOnNewLead?: boolean;
    assignedAt?: string;
  };
  telegram?: {
    enabled: boolean;
    botToken?: string;
    botUsername?: string;
    alertChatId?: string;
    instantSaleAlerts?: boolean;
    instantLeadAlerts?: boolean;
    assignedAt?: string;
  };
  assignedLeadsCount?: number;
  lastUpdatedByAdminAt?: string;
}

interface AdminAssignChannelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  affiliate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    whatsappNumber?: string;
    assignedChannels?: AssignedChannelsConfig;
  } | null;
  onSaved?: () => void;
}

export function AdminAssignChannelsModal({
  isOpen,
  onClose,
  affiliate,
  onSaved,
}: AdminAssignChannelsModalProps) {
  const db = useFirestore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"whatsapp" | "gmail" | "telegram" | "leads">("whatsapp");
  const [isSaving, setIsSaving] = useState(false);

  // Advertising Templates for Gmail
  const ADVERTISING_TEMPLATES = [
    {
      id: "catalog_promo",
      name: "🔥 Publicidad: Catálogo de Productos Digitales",
      subject: "🔥 [OFERTA EXCLUSIVA] Accede al Catálogo Completo de Productos Digitales y Herramientas SyncConnect",
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
  <div style="background: linear-gradient(135deg, #0d1117 0%, #161b22 100%); padding: 30px 20px; text-align: center; border-bottom: 3px solid #FF9900;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">SYNC<span style="color: #FF9900;">CONNECT</span></h1>
    <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0 0; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Plataforma Oficial de Productos Digitales</p>
  </div>
  <div style="padding: 30px 25px; color: #1e293b; line-height: 1.6;">
    <span style="display: inline-block; background-color: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; font-size: 11px; font-weight: bold; padding: 4px 12px; rounded: 9999px; margin-bottom: 15px; border-radius: 20px;">⚡ PUBLICIDAD & PROMOCIÓN ESPECIAL</span>
    <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-top: 0;">¡Impulsa tus Ingresos con Nuestro Catálogo Premium!</h2>
    <p style="font-size: 15px; color: #475569;">Hola <strong>{{nombre_cliente}}</strong>,</p>
    <p style="font-size: 15px; color: #475569;">Te escribe tu asesor comercial autorizado de <strong>SyncConnect</strong>. Hemos liberado acceso exclusivo a nuestro portafolio de <strong>Infoproductos, Software y Cursos Digitales de Alta Demanda</strong> listos para monetizar.</p>
    
    <div style="background-color: #f8fafc; border-left: 4px solid #FF9900; padding: 15px; margin: 20px 0; border-radius: 0 12px 12px 0;">
      <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #0f172a;">¿Qué obtienes con nosotros?</h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #334155;">
        <li>Acceso instantáneo a herramientas digitales de última generación.</li>
        <li>Comisiones de hasta el 80% en ventas directas y recurrentes.</li>
        <li>Capacitaciones semanales en vivo en la Academia SyncConnect.</li>
        <li>Soporte personalizado y automatizaciones de venta 24/7.</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{link_afiliado}}" style="display: inline-block; background-color: #FF9900; color: #0f172a; font-weight: 900; font-size: 15px; text-decoration: none; padding: 16px 36px; border-radius: 12px; box-shadow: 0 6px 20px rgba(255, 153, 0, 0.35); text-transform: uppercase; letter-spacing: 0.5px;">👉 VER CATÁLOGO & COMENZAR AHORA</a>
    </div>
    
    <p style="font-size: 13px; color: #64748b; margin-top: 25px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
      Si tienes preguntas, puedes responder directamente a este correo o contactarme por WhatsApp al <strong style="color: #0f172a;">{{whatsapp_asesor}}</strong>.<br/><br/>
      Atentamente,<br/>
      <strong>{{nombre_afiliado}}</strong><br/>
      <span style="color: #94a3b8; font-size: 12px;">Asesor Comercial Oficial | SyncConnect</span>
    </p>
  </div>
  <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
    © 2026 SyncConnect. Todos los derechos reservados. Has recibido esta publicidad como parte de nuestra red comercial.
  </div>
</div>`
    },
    {
      id: "flash_offer",
      name: "⚡ Publicidad: Oferta Flash & Descuento 50%",
      subject: "⚡ [OFERTA FLASH] 50% de Descuento Exclusivo en Productos Digitales y Membresía",
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #fed7aa; border-radius: 16px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 30px 20px; text-align: center; color: white;">
    <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 900; text-transform: uppercase;">⏳ Válido por Tiempo Limitado</span>
    <h1 style="margin: 10px 0 0 0; font-size: 26px; font-weight: 900;">¡50% DE DESCUENTO ESPECIAL!</h1>
  </div>
  <div style="padding: 30px 25px; color: #1e293b; line-height: 1.6;">
    <p style="font-size: 15px; color: #334155;">Hola <strong>{{nombre_cliente}}</strong>,</p>
    <p style="font-size: 15px; color: #334155;">¡Tenemos una excelente noticia de publicidad y promoción para ti! Por tiempo limitado hemos activado un cupón de <strong>50% de descuento</strong> en toda nuestra suite de productos digitales.</p>
    
    <div style="text-align: center; margin: 25px 0;">
      <a href="{{link_afiliado}}" style="display: inline-block; background-color: #ea580c; color: #ffffff; font-weight: 900; font-size: 15px; text-decoration: none; padding: 16px 36px; border-radius: 12px; text-transform: uppercase;">🔥 RECLAMAR MI 50% DE DESCUENTO</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      Saludos cordiales,<br/>
      <strong>{{nombre_afiliado}}</strong> | SyncConnect
    </p>
  </div>
</div>`
    },
    {
      id: "business_opportunity",
      name: "💰 Publicidad: Oportunidad de Negocio & Ganancias",
      subject: "💰 Gana comisiones de hasta el 80% vendiendo Productos Digitales con SyncConnect",
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
  <div style="background: #0f172a; padding: 25px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #38bdf8;">OPORTUNIDAD DE NEGOCIO DIGITAL</h1>
    <p style="margin: 6px 0 0 0; font-size: 12px; color: #94a3b8;">Monetiza con infoproductos y automatizaciones en piloto automático</p>
  </div>
  <div style="padding: 25px; color: #334155; line-height: 1.6;">
    <p>Estimado/a <strong>{{nombre_cliente}}</strong>,</p>
    <p>¿Estás buscando generar ingresos extras mediante internet y productos digitales probados?</p>
    <p>En <strong>SyncConnect</strong> te entregamos todo listo: páginas de venta de alta conversión, embudos automáticos, enlaces de afiliados y pagos directos.</p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="{{link_afiliado}}" style="display: inline-block; background-color: #0284c7; color: white; font-weight: bold; font-size: 14px; text-decoration: none; padding: 14px 30px; border-radius: 10px; text-transform: uppercase;">🚀 VER CÓMO FUNCIONA EL SISTEMA</a>
    </div>
    <p style="font-size: 12px; color: #64748b;">Atentamente: {{nombre_afiliado}}</p>
  </div>
</div>`
    }
  ];

  // WhatsApp State
  const [waEnabled, setWaEnabled] = useState(true);
  const [waNumber, setWaNumber] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [waWelcomeMsg, setWaWelcomeMsg] = useState(
    "¡Hola! Te escribe el equipo comercial de SyncConnect. Estoy aquí para presentarte nuestras ofertas publicitarias y asesorarte sobre nuestros productos digitales de alta conversión. ¿En qué podemos ayudarte hoy?"
  );
  const [waAutoReply, setWaAutoReply] = useState(true);
  const [waCopilot, setWaCopilot] = useState(true);

  // Gmail State
  const [gmailEnabled, setGmailEnabled] = useState(true);
  const [gmailAddress, setGmailAddress] = useState("");
  const [gmailSubject, setGmailSubject] = useState(
    "🔥 [OFERTA EXCLUSIVA] Accede al Catálogo Completo de Productos Digitales y Herramientas SyncConnect"
  );
  const [gmailTemplate, setGmailTemplate] = useState(ADVERTISING_TEMPLATES[0].html);
  const [gmailAutoSend, setGmailAutoSend] = useState(true);
  const [selectedAdTemplateId, setSelectedAdTemplateId] = useState("catalog_promo");

  // Telegram State
  const [tgEnabled, setTgEnabled] = useState(true);
  const [tgToken, setTgToken] = useState("");
  const [tgUsername, setTgUsername] = useState("@SyncConnect_bot");
  const [tgChatId, setTgChatId] = useState("");
  const [tgSaleAlerts, setTgSaleAlerts] = useState(true);
  const [tgLeadAlerts, setTgLeadAlerts] = useState(true);

  // Leads Assignment State
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [searchTermLead, setSearchTermLead] = useState("");

  // Load existing assigned channels from affiliate
  useEffect(() => {
    if (!affiliate) return;

    const existing = affiliate.assignedChannels || {};

    // WhatsApp
    setWaEnabled(existing.whatsapp?.enabled ?? true);
    setWaNumber(existing.whatsapp?.assignedNumber || affiliate.whatsappNumber || "");
    setWaPhoneId(existing.whatsapp?.phoneNumberId || "");
    setWaToken(existing.whatsapp?.accessToken || "");
    if (existing.whatsapp?.welcomeMessage) setWaWelcomeMsg(existing.whatsapp.welcomeMessage);
    setWaAutoReply(existing.whatsapp?.autoReplyEnabled ?? true);
    setWaCopilot(existing.whatsapp?.copilotAiEnabled ?? true);

    // Gmail
    setGmailEnabled(existing.gmail?.enabled ?? true);
    setGmailAddress(existing.gmail?.assignedEmail || affiliate.email || "");
    if (existing.gmail?.defaultSubject) setGmailSubject(existing.gmail.defaultSubject);
    if (existing.gmail?.defaultTemplateHtml) setGmailTemplate(existing.gmail.defaultTemplateHtml);
    setGmailAutoSend(existing.gmail?.autoSendOnNewLead ?? true);

    // Telegram
    setTgEnabled(existing.telegram?.enabled ?? true);
    setTgToken(existing.telegram?.botToken || "");
    setTgUsername(existing.telegram?.botUsername || "@SyncConnect_bot");
    setTgChatId(existing.telegram?.alertChatId || "");
    setTgSaleAlerts(existing.telegram?.instantSaleAlerts ?? true);
    setTgLeadAlerts(existing.telegram?.instantLeadAlerts ?? true);

    // Fetch CRM contacts to show assignment
    if (db) {
      setLoadingContacts(true);
      getDocs(collection(db, "crm_contacts"))
        .then((snap) => {
          const list: any[] = [];
          const preSelected: string[] = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({ id: d.id, ...data });
            if (data.assignedTo === affiliate.id || data.affiliateId === affiliate.id) {
              preSelected.push(d.id);
            }
          });
          setAllContacts(list);
          setSelectedLeadIds(preSelected);
        })
        .catch((err) => console.error("Error loading CRM contacts for assignment:", err))
        .finally(() => setLoadingContacts(false));
    }
  }, [affiliate, db]);

  const handleToggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllLeads = () => {
    if (selectedLeadIds.length === allContacts.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(allContacts.map((c) => c.id));
    }
  };

  const handleSaveAssignments = async () => {
    if (!db || !affiliate) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();

      const assignedChannelsPayload: AssignedChannelsConfig = {
        whatsapp: {
          enabled: waEnabled,
          assignedNumber: waNumber.trim(),
          phoneNumberId: waPhoneId.trim(),
          accessToken: waToken.trim(),
          welcomeMessage: waWelcomeMsg.trim(),
          autoReplyEnabled: waAutoReply,
          copilotAiEnabled: waCopilot,
          assignedAt: now,
        },
        gmail: {
          enabled: gmailEnabled,
          assignedEmail: gmailAddress.trim().toLowerCase(),
          defaultSubject: gmailSubject.trim(),
          defaultTemplateHtml: gmailTemplate.trim(),
          autoSendOnNewLead: gmailAutoSend,
          assignedAt: now,
        },
        telegram: {
          enabled: tgEnabled,
          botToken: tgToken.trim(),
          botUsername: tgUsername.trim(),
          alertChatId: tgChatId.trim(),
          instantSaleAlerts: tgSaleAlerts,
          instantLeadAlerts: tgLeadAlerts,
          assignedAt: now,
        },
        assignedLeadsCount: selectedLeadIds.length,
        lastUpdatedByAdminAt: now,
      };

      // 1. Update Affiliate Doc
      await setDoc(
        doc(db, "affiliates", affiliate.id),
        {
          assignedChannels: assignedChannelsPayload,
          assignedWhatsApp: waNumber.trim(),
          assignedGmail: gmailAddress.trim().toLowerCase(),
          assignedTelegram: tgUsername.trim(),
          assignedLeadsCount: selectedLeadIds.length,
          updatedAt: now,
        },
        { merge: true }
      );

      // 2. Update Global Site Config for fast cross-page sync
      await setDoc(
        doc(db, "site_config", `affiliate_channels_${affiliate.id}`),
        {
          ...assignedChannelsPayload,
          affiliateId: affiliate.id,
          affiliateName: `${affiliate.firstName} ${affiliate.lastName}`,
          affiliateEmail: affiliate.email,
          updatedAt: now,
        },
        { merge: true }
      );

      // 3. Batch Update Selected Contacts
      for (const contact of allContacts) {
        const isAssigned = selectedLeadIds.includes(contact.id);
        const currentAssigned = contact.assignedTo === affiliate.id;

        if (isAssigned && !currentAssigned) {
          await updateDoc(doc(db, "crm_contacts", contact.id), {
            assignedTo: affiliate.id,
            assignedAffiliateName: `${affiliate.firstName} ${affiliate.lastName}`,
            assignedAt: now,
          });
        } else if (!isAssigned && currentAssigned) {
          await updateDoc(doc(db, "crm_contacts", contact.id), {
            assignedTo: null,
            assignedAffiliateName: null,
          });
        }
      }

      // 4. Send Notification to Affiliate
      const notifId = `channels_assigned_${affiliate.id}_${Date.now()}`;
      await setDoc(doc(db, "notifications", notifId), {
        userId: affiliate.id,
        title: "⚡ Canales Automatizados Asignados por Administrador",
        message: `El Administrador ha configurado y asignado tus canales automatizados de WhatsApp, Gmail y Telegram, junto a ${selectedLeadIds.length} prospectos en tu CRM.`,
        type: "system",
        createdAt: now,
        isRead: false,
      });

      toast({
        title: "¡Asignación Guardada Exitosamente!",
        description: `Se han configurado los canales automatizados y ${selectedLeadIds.length} prospectos para ${affiliate.firstName}.`,
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      console.error("Error saving assigned channels:", err);
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: err?.message || "No se pudieron asignar los canales.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredContacts = allContacts.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTermLead.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTermLead.toLowerCase()) ||
      c.phone?.includes(searchTermLead)
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="rounded-[2.5rem] bg-[#0d1117] border border-[#232F3E] p-6 md:p-8 text-white max-w-4xl w-[95vw] overflow-y-auto max-h-[92vh]">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#FF9900]/20 rounded-2xl flex items-center justify-center text-[#FF9900] border border-[#FF9900]/30 shadow-inner">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-headline font-black uppercase italic tracking-tighter text-white">
                Asignar Canales & <span className="text-[#FF9900]">Automatizaciones</span>
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs font-medium">
                Configura WhatsApp, Gmail, Telegram y asigna prospectos del CRM para{" "}
                <strong className="text-white font-bold">
                  {affiliate?.firstName} {affiliate?.lastName}
                </strong>{" "}
                ({affiliate?.email})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {affiliate && (
          <div className="space-y-6">
            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <TabsList className="grid grid-cols-4 bg-[#161b22] p-1 rounded-2xl border border-white/10 h-12">
                <TabsTrigger
                  value="whatsapp"
                  className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </TabsTrigger>
                <TabsTrigger
                  value="gmail"
                  className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white text-slate-400"
                >
                  <Mail className="h-4 w-4" />
                  <span className="hidden sm:inline">Gmail</span>
                </TabsTrigger>
                <TabsTrigger
                  value="telegram"
                  className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-sky-600 data-[state=active]:text-white text-slate-400"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Telegram</span>
                </TabsTrigger>
                <TabsTrigger
                  value="leads"
                  className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-[#FF9900] data-[state=active]:text-slate-950 text-slate-400"
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Prospectos ({selectedLeadIds.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: WHATSAPP AUTOMATIZADO */}
              <TabsContent value="whatsapp" className="space-y-4 mt-4">
                <div className="p-4 bg-[#161b22] rounded-2xl border border-emerald-500/20 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-emerald-400" />
                      <div>
                        <h4 className="text-sm font-black uppercase text-white">WhatsApp Automatizado Asignado</h4>
                        <p className="text-[11px] text-slate-400">Instancia, bot y mensajes automáticos para este afiliado.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="wa-enable" className="text-xs font-bold text-slate-300">
                        {waEnabled ? "Habilitado" : "Deshabilitado"}
                      </Label>
                      <Switch id="wa-enable" checked={waEnabled} onCheckedChange={setWaEnabled} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">
                        Número de WhatsApp Asignado
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="ej. +1234567890"
                          value={waNumber}
                          onChange={(e) => setWaNumber(e.target.value)}
                          className="pl-10 h-10 bg-[#0d1117] border-white/10 text-white font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">
                        Phone Number ID (Meta Cloud API / OpenWA)
                      </Label>
                      <Input
                        placeholder="ej. 1048291048592"
                        value={waPhoneId}
                        onChange={(e) => setWaPhoneId(e.target.value)}
                        className="h-10 bg-[#0d1117] border-white/10 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">
                        Token de Acceso de WhatsApp API (Opcional - Hereda del sistema si está vacío)
                      </Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="password"
                          placeholder="EAAB..."
                          value={waToken}
                          onChange={(e) => setWaToken(e.target.value)}
                          className="pl-10 h-10 bg-[#0d1117] border-white/10 text-white font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">
                        Mensaje de Bienvenida Automático por WhatsApp
                      </Label>
                      <Textarea
                        rows={3}
                        value={waWelcomeMsg}
                        onChange={(e) => setWaWelcomeMsg(e.target.value)}
                        className="bg-[#0d1117] border-white/10 text-white text-xs"
                        placeholder="Escribe el mensaje de bienvenida..."
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold text-white">Auto-Respuesta Automática</Label>
                        <p className="text-[10px] text-slate-400">Responder inmediatamente al primer mensaje de un prospecto.</p>
                      </div>
                      <Switch checked={waAutoReply} onCheckedChange={setWaAutoReply} />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Bot className="h-4 w-4 text-emerald-400" /> IA Copilot de Ventas WhatsApp
                        </Label>
                        <p className="text-[10px] text-slate-400">Sugerencias y respuestas inteligentes impulsadas por IA.</p>
                      </div>
                      <Switch checked={waCopilot} onCheckedChange={setWaCopilot} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: GMAIL AUTOMATIZADO CON PLANTILLAS DE PUBLICIDAD */}
              <TabsContent value="gmail" className="space-y-4 mt-4">
                <div className="p-4 bg-[#161b22] rounded-2xl border border-red-500/20 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-red-400" />
                      <div>
                        <h4 className="text-sm font-black uppercase text-white">Gmail Automatizado & Publicidad Asignada</h4>
                        <p className="text-[11px] text-slate-400">Correos publicitarios de alta conversión y automatización de ventas.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="gmail-enable" className="text-xs font-bold text-slate-300">
                        {gmailEnabled ? "Habilitado" : "Deshabilitado"}
                      </Label>
                      <Switch id="gmail-enable" checked={gmailEnabled} onCheckedChange={setGmailEnabled} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Plantillas de Publicidad Rápidas */}
                    <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-black uppercase text-red-400 flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5" /> Plantillas de Publicidad & Ofertas Listas para Asignar
                        </Label>
                        <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[9px] uppercase">
                          Publicidad Comercial
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {ADVERTISING_TEMPLATES.map((tmpl) => (
                          <button
                            type="button"
                            key={tmpl.id}
                            onClick={() => {
                              setSelectedAdTemplateId(tmpl.id);
                              setGmailSubject(tmpl.subject);
                              setGmailTemplate(tmpl.html);
                              toast({
                                title: "Plantilla Publicitaria Cargada",
                                description: `Se ha cargado: ${tmpl.name}`,
                              });
                            }}
                            className={`text-left p-2.5 rounded-xl border text-xs font-bold transition-all ${
                              selectedAdTemplateId === tmpl.id
                                ? "bg-red-600 text-white border-red-400 shadow-md"
                                : "bg-[#0d1117] text-slate-300 border-white/10 hover:border-white/20"
                            }`}
                          >
                            <div className="text-[11px] line-clamp-1">{tmpl.name}</div>
                            <div className="text-[9px] opacity-70 font-normal mt-0.5">Asunto y HTML publicitario</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">
                        Correo Remitente Asignado para el Afiliado
                      </Label>
                      <Input
                        placeholder="ej. syncconnect.online@gmail.com o cuenta del afiliado"
                        value={gmailAddress}
                        onChange={(e) => setGmailAddress(e.target.value)}
                        className="h-10 bg-[#0d1117] border-white/10 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">
                        Asunto Publicitario del Correo
                      </Label>
                      <Input
                        placeholder="Asunto de venta o campaña publicitaria..."
                        value={gmailSubject}
                        onChange={(e) => setGmailSubject(e.target.value)}
                        className="h-10 bg-[#0d1117] border-white/10 text-white text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase text-slate-400">
                          Plantilla de Correo HTML de Publicidad (Con Formato y Enlaces)
                        </Label>
                        <span className="text-[9px] text-slate-400 font-mono">
                          Variables: &#123;&#123;nombre_cliente&#125;&#125;, &#123;&#123;link_afiliado&#125;&#125;, &#123;&#123;whatsapp_asesor&#125;&#125;, &#123;&#123;nombre_afiliado&#125;&#125;
                        </span>
                      </div>
                      <Textarea
                        rows={6}
                        value={gmailTemplate}
                        onChange={(e) => setGmailTemplate(e.target.value)}
                        className="bg-[#0d1117] border-white/10 text-white font-mono text-xs"
                        placeholder="<div style='...'>Contenido publicitario en HTML...</div>"
                      />
                    </div>

                    {/* Previsualización del Correo de Publicidad */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">
                        Vista Previa de la Publicidad
                      </Label>
                      <div className="p-4 bg-white rounded-xl max-h-56 overflow-y-auto border border-slate-300 text-slate-900 shadow-inner">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: gmailTemplate
                              .replace(/\{\{nombre_cliente\}\}/g, "Carlos Prospecto")
                              .replace(/\{\{link_afiliado\}\}/g, "#")
                              .replace(/\{\{whatsapp_asesor\}\}/g, waNumber || "+50588062712")
                              .replace(/\{\{nombre_afiliado\}\}/g, `${affiliate.firstName} ${affiliate.lastName}`),
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold text-white">Disparo Automático en Nuevos Prospectos</Label>
                        <p className="text-[10px] text-slate-400">
                          Enviar esta campaña publicitaria automáticamente cuando ingrese un nuevo lead al CRM.
                        </p>
                      </div>
                      <Switch checked={gmailAutoSend} onCheckedChange={setGmailAutoSend} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: TELEGRAM AUTOMATIZADO */}
              <TabsContent value="telegram" className="space-y-4 mt-4">
                <div className="p-4 bg-[#161b22] rounded-2xl border border-sky-500/20 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Send className="h-5 w-5 text-sky-400" />
                      <div>
                        <h4 className="text-sm font-black uppercase text-white">Telegram Automatizado Asignado</h4>
                        <p className="text-[11px] text-slate-400">Bot oficial y canal de alertas de comisiones y leads en tiempo real.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="tg-enable" className="text-xs font-bold text-slate-300">
                        {tgEnabled ? "Habilitado" : "Deshabilitado"}
                      </Label>
                      <Switch id="tg-enable" checked={tgEnabled} onCheckedChange={setTgEnabled} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">
                        Bot Token Asignado de Telegram
                      </Label>
                      <Input
                        placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWxYz"
                        value={tgToken}
                        onChange={(e) => setTgToken(e.target.value)}
                        className="h-10 bg-[#0d1117] border-white/10 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">
                        Username del Bot (@...)
                      </Label>
                      <Input
                        placeholder="@MiBotAfiliado_bot"
                        value={tgUsername}
                        onChange={(e) => setTgUsername(e.target.value)}
                        className="h-10 bg-[#0d1117] border-white/10 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">
                        Chat ID / Canal de Alertas para este Afiliado (Opcional)
                      </Label>
                      <Input
                        placeholder="ej. -100192837482 o ID de chat de Telegram"
                        value={tgChatId}
                        onChange={(e) => setTgChatId(e.target.value)}
                        className="h-10 bg-[#0d1117] border-white/10 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold text-white">Alertas de Ventas Instantáneas</Label>
                        <p className="text-[10px] text-slate-400">Notificar al Telegram del afiliado cuando genera una comisión.</p>
                      </div>
                      <Switch checked={tgSaleAlerts} onCheckedChange={setTgSaleAlerts} />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold text-white">Alertas de Nuevos Prospectos</Label>
                        <p className="text-[10px] text-slate-400">Notificar al Telegram cuando un cliente deja sus datos.</p>
                      </div>
                      <Switch checked={tgLeadAlerts} onCheckedChange={setTgLeadAlerts} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 4: ASIGNACIÓN DE PROSPECTOS / LEADS */}
              <TabsContent value="leads" className="space-y-4 mt-4">
                <div className="p-4 bg-[#161b22] rounded-2xl border border-[#FF9900]/20 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                    <div>
                      <h4 className="text-sm font-black uppercase text-white flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#FF9900]" /> Asignación de Prospectos del CRM
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Selecciona los leads y contactos para transferirlos a este socio comercial.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllLeads}
                        className="h-8 text-xs border-white/10 text-white hover:bg-white/5"
                      >
                        {selectedLeadIds.length === allContacts.length ? "Deseleccionar Todos" : "Seleccionar Todos"}
                      </Button>
                      <Badge className="bg-[#FF9900]/20 text-[#FF9900] border-[#FF9900]/30 font-mono text-xs">
                        {selectedLeadIds.length} Asignados
                      </Badge>
                    </div>
                  </div>

                  <Input
                    placeholder="Filtrar prospectos por nombre, email o teléfono..."
                    value={searchTermLead}
                    onChange={(e) => setSearchTermLead(e.target.value)}
                    className="h-10 bg-[#0d1117] border-white/10 text-white text-xs"
                  />

                  {loadingContacts ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-[#FF9900]" />
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="p-8 text-center bg-white/[0.02] rounded-xl border border-white/5">
                      <UserPlus className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-400">No hay prospectos en el CRM todavía.</p>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {filteredContacts.map((contact) => {
                        const isSelected = selectedLeadIds.includes(contact.id);
                        return (
                          <div
                            key={contact.id}
                            onClick={() => handleToggleSelectLead(contact.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? "bg-[#FF9900]/10 border-[#FF9900]/40 text-white"
                                : "bg-[#0d1117] border-white/5 text-slate-300 hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-6 w-6 rounded-lg flex items-center justify-center border text-xs font-bold ${
                                  isSelected
                                    ? "bg-[#FF9900] text-slate-950 border-[#FF9900]"
                                    : "border-white/20 text-transparent"
                                }`}
                              >
                                ✓
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white">{contact.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {contact.email} • {contact.phone || "Sin teléfono"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="text-[9px] bg-white/5 text-slate-300 border-none font-bold">
                                {contact.stage || "Lead"}
                              </Badge>
                              {contact.assignedAffiliateName && (
                                <span className="text-[9px] text-slate-400 italic">
                                  (Actualmente: {contact.assignedAffiliateName})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer Summary and Actions */}
            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Los canales y prospectos se sincronizarán inmediatamente con la sesión del afiliado.</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSaving}
                  className="h-11 px-5 rounded-xl border-white/10 text-white hover:bg-white/5 bg-transparent"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveAssignments}
                  disabled={isSaving}
                  className="h-11 px-7 bg-[#FF9900] hover:bg-[#E77600] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg gap-2"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  GUARDAR Y ASIGNAR CANALES
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

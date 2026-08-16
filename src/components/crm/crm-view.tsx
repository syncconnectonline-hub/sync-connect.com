"use client";

import React, { useState, useEffect } from "react";
import { useUser, useFirestore, useAuth } from "@/firebase";
import { requestGmailPermission } from "@/lib/social-auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  Users,
  Bot,
  Mail,
  Zap,
  CheckCircle2,
  Clock,
  Settings,
  Plus,
  Search,
  Filter,
  Phone,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  Sparkles,
  Loader2,
  ShieldCheck,
  RefreshCw,
  QrCode,
  Share2,
  Check,
  Tag,
  Star,
  MapPin,
  ShoppingBag,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface CrmContact {
  id?: string;
  name: string;
  phone: string;
  email: string;
  telegramUsername?: string;
  channel: "WhatsApp" | "Telegram" | "Gmail" | "Web";
  stage: "Nuevo Lead" | "Contactado" | "En Negociacion" | "Cliente VIP" | "Inactivo";
  tags: string[];
  notes?: string;
  lastContactAt: string;
  createdAt?: string;
}

interface AutomationRule {
  id?: string;
  title: string;
  trigger: string;
  action: string;
  channel: "WhatsApp" | "Telegram" | "Gmail" | "Multi-canal";
  template: string;
  status: "Active" | "Paused";
  createdAt?: string;
}

interface AutomationLog {
  id?: string;
  event: string;
  contactName: string;
  channel: string;
  status: "Exitoso" | "Procesando" | "Fallido";
  details: string;
  timestamp: string;
}

export default function CrmAutomationsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"whatsapp" | "telegram" | "gmail" | "automations" | "contacts">("whatsapp");
  
  // Data State
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>([]);

  // Filters & Selected Contact
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("All");
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);

  // Chat / Dispatcher
  const [chatMessage, setChatMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // WhatsApp Config
  const [waToken, setWaToken] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");
  const [showWaConfig, setShowWaConfig] = useState(false);
  const [savingWaConfig, setSavingWaConfig] = useState(false);
  const [testingWaConfig, setTestingWaConfig] = useState(false);
  const [waVerifiedName, setWaVerifiedName] = useState<string | null>(null);

  // Telegram Config, Direct 1-to-1 & Broadcast
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgBotUsername, setTgBotUsername] = useState("@SyncConnect_bot");
  const [tgBroadcastText, setTgBroadcastText] = useState("");
  const [sendingTgBroadcast, setSendingTgBroadcast] = useState(false);
  const [savingTgConfig, setSavingTgConfig] = useState(false);
  const [testingTgConfig, setTestingTgConfig] = useState(false);
  const [tgBotVerifiedInfo, setTgBotVerifiedInfo] = useState<{ id: number; username: string; firstName: string } | null>(null);

  // Telegram 1-to-1 Direct Messaging
  const [tgDirectRecipient, setTgDirectRecipient] = useState("@carlosm_sync");
  const [tgDirectMessage, setTgDirectMessage] = useState("¡Hola! Te comparto información sobre SyncConnect y tus accesos exclusivos:");
  const [sendingTgDirect, setSendingTgDirect] = useState(false);

  // Gmail Test & OAuth status
  const [gmailRecipient, setGmailRecipient] = useState("");
  const [gmailSubject, setGmailSubject] = useState("🔔 Oferta Especial SyncConnect - Acceso a Productos Digitales");
  const [gmailBody, setGmailBody] = useState("<p>¡Hola!</p><p>Te escribimos de parte del equipo de SyncConnect con información sobre nuestros productos digitales y herramientas exclusivas.</p><p>Haz clic en el enlace adjunto para comenzar tu proceso de registro y acceder a la plataforma.</p><p>Saludos cordiales,<br/><strong>Equipo SyncConnect</strong></p>");
  const [sendingGmail, setSendingGmail] = useState(false);
  const [authorizingGmail, setAuthorizingGmail] = useState(false);
  const [gmailAccessToken, setGmailAccessToken] = useState<string | null>(null);

  // Admin Assigned Channels Info
  const [assignedChannelsInfo, setAssignedChannelsInfo] = useState<any>(null);

  // New Contact Modal
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState<Partial<CrmContact>>({
    name: "",
    phone: "",
    email: "",
    telegramUsername: "",
    channel: "WhatsApp",
    stage: "Nuevo Lead",
    tags: ["Interesado", "SyncConnect"],
    notes: "",
  });

  // New Automation Modal
  const [showAddAutomation, setShowAddAutomation] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AutomationRule>>({
    title: "",
    trigger: "new_lead_whatsapp",
    action: "send_gmail_and_tg",
    channel: "Multi-canal",
    template: "¡Hola {nombre}! Gracias por escribirnos. Te enviamos los detalles a tu correo.",
    status: "Active",
  });

  // Fetch Firestore Data
  useEffect(() => {
    if (!db) return;

    // Load Contacts
    const unsubContacts = onSnapshot(collection(db, "crm_contacts"), (snap) => {
      const list: CrmContact[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as CrmContact));
      setContacts(list);
      setSelectedContact((prev) => prev || (list.length > 0 ? list[0] : null));
    });

    // Load Automations
    const unsubRules = onSnapshot(collection(db, "automation_rules"), (snap) => {
      const list: AutomationRule[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as AutomationRule));
      setAutomationRules(list);
    });

    // Load Logs
    const unsubLogs = onSnapshot(collection(db, "automation_logs"), (snap) => {
      const list: AutomationLog[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as AutomationLog));
      setAutomationLogs(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    });

    return () => {
      unsubContacts();
      unsubRules();
      unsubLogs();
    };
  }, [db]);

  // Load saved Telegram, WhatsApp and Gmail configs (personal assigned channels or global) from Firestore
  useEffect(() => {
    if (!db) return;
    const loadSavedConfigs = async () => {
      try {
        let loadedPersonal = false;

        // 1. Check for personal channels assigned by Admin
        if (user?.uid) {
          const affDoc = await getDoc(doc(db, "affiliates", user.uid));
          const siteConfigDoc = await getDoc(doc(db, "site_config", `affiliate_channels_${user.uid}`));
          
          const assigned = affDoc.exists() ? affDoc.data()?.assignedChannels : siteConfigDoc.exists() ? siteConfigDoc.data() : null;

          if (assigned) {
            setAssignedChannelsInfo(assigned);
            loadedPersonal = true;

            // WhatsApp assigned
            if (assigned.whatsapp?.enabled) {
              if (assigned.whatsapp.accessToken) setWaToken(assigned.whatsapp.accessToken);
              if (assigned.whatsapp.phoneNumberId) setWaPhoneId(assigned.whatsapp.phoneNumberId);
              if (assigned.whatsapp.assignedNumber) {
                setWaVerifiedName(`WhatsApp Asignado: +${assigned.whatsapp.assignedNumber}`);
              }
            }

            // Gmail assigned
            if (assigned.gmail?.enabled) {
              if (assigned.gmail.defaultSubject) setGmailSubject(assigned.gmail.defaultSubject);
              if (assigned.gmail.defaultTemplateHtml) setGmailBody(assigned.gmail.defaultTemplateHtml);
            }

            // Telegram assigned
            if (assigned.telegram?.enabled) {
              if (assigned.telegram.botToken) setTgBotToken(assigned.telegram.botToken);
              if (assigned.telegram.botUsername) setTgBotUsername(assigned.telegram.botUsername);
              if (assigned.telegram.botToken && assigned.telegram.botUsername) {
                setTgBotVerifiedInfo({
                  id: 1,
                  username: assigned.telegram.botUsername,
                  firstName: "Bot Asignado por Admin",
                });
              }
            }
          }
        }

        // 2. Global fallback for tokens if not personally overridden
        if (!loadedPersonal) {
          const tgSnap = await getDoc(doc(db, "site_config", "telegram-config"));
          if (tgSnap.exists()) {
            const data = tgSnap.data();
            if (data.botToken) setTgBotToken(data.botToken);
            if (data.botUsername) setTgBotUsername(data.botUsername);
          }

          const waSnap = await getDoc(doc(db, "site_config", "whatsapp-official"));
          if (waSnap.exists()) {
            const data = waSnap.data();
            if (data.accessToken) setWaToken(data.accessToken);
            if (data.phoneNumberId) setWaPhoneId(data.phoneNumberId);
          }
        }
      } catch (err) {
        console.warn("Could not load API configs:", err);
      }
    };
    loadSavedConfigs();
  }, [db, user]);

  // Save WhatsApp API credentials
  const handleSaveWhatsAppConfig = async () => {
    if (!db) return;
    setSavingWaConfig(true);
    try {
      await setDoc(
        doc(db, "site_config", "whatsapp-official"),
        {
          accessToken: waToken,
          phoneNumberId: waPhoneId,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email || "affiliate",
        },
        { merge: true }
      );
      toast({
        title: "¡Configuración de WhatsApp Guardada!",
        description: "Las credenciales de Meta Cloud API se guardaron correctamente.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: err?.message || "No se pudo guardar la configuración de WhatsApp.",
      });
    } finally {
      setSavingWaConfig(false);
    }
  };

  // Test WhatsApp API connection
  const handleTestWhatsAppConfig = async () => {
    if (!waToken || !waPhoneId) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Ingresa el Access Token y el Phone Number ID de WhatsApp Meta API.",
      });
      return;
    }
    setTestingWaConfig(true);
    try {
      const res = await fetch("/api/whatsapp/official/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: waToken, phoneNumberId: waPhoneId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fallo en la prueba de WhatsApp");

      setWaVerifiedName(data.data?.verifiedName || data.data?.displayPhoneNumber || "Activo");
      toast({
        title: "¡Conexión de WhatsApp Exitosa!",
        description: data.message || "Meta Cloud API validada correctamente.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error en prueba de WhatsApp",
        description: err?.message || "Credenciales inválidas o no autorizadas.",
      });
    } finally {
      setTestingWaConfig(false);
    }
  };

  // Save Telegram API credentials
  const handleSaveTelegramConfig = async () => {
    if (!db) return;
    setSavingTgConfig(true);
    try {
      await setDoc(
        doc(db, "site_config", "telegram-config"),
        {
          botToken: tgBotToken,
          botUsername: tgBotUsername,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email || "affiliate",
        },
        { merge: true }
      );
      toast({
        title: "¡Configuración de Telegram Guardada!",
        description: "El Bot Token y nombre de usuario se guardaron correctamente.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: err?.message || "No se pudo guardar la configuración de Telegram.",
      });
    } finally {
      setSavingTgConfig(false);
    }
  };

  // Test Telegram API connection
  const handleTestTelegramConfig = async () => {
    if (!tgBotToken) {
      toast({
        variant: "destructive",
        title: "Token requerido",
        description: "Por favor ingresa el Telegram Bot Token obtenido de @BotFather.",
      });
      return;
    }
    setTestingTgConfig(true);
    try {
      const res = await fetch("/api/telegram/test-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: tgBotToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fallo en la verificación del bot");

      setTgBotVerifiedInfo(data.bot);
      if (data.bot?.username) {
        setTgBotUsername(data.bot.username);
      }
      toast({
        title: "¡Bot de Telegram Verificado!",
        description: data.message || `Conectado a ${data.bot?.username}`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error en prueba de Telegram",
        description: err?.message || "Token de Telegram inválido.",
      });
    } finally {
      setTestingTgConfig(false);
    }
  };

  // Seed default data if empty
  useEffect(() => {
    if (!db || contacts.length > 0) return;

    const seedDefaultContacts = async () => {
      const defaultData: CrmContact[] = [
        {
          name: "Carlos Mendoza",
          phone: "+50588062712",
          email: "carlos.mendoza@gmail.com",
          telegramUsername: "@carlosm_sync",
          channel: "WhatsApp",
          stage: "Nuevo Lead",
          tags: ["Prospecto", "Curso VIP"],
          notes: "Solicitó información sobre el programa de afiliados.",
          lastContactAt: new Date().toISOString(),
        },
        {
          name: "Sonia Rodríguez",
          phone: "+50577123456",
          email: "sonia.rod@yahoo.com",
          telegramUsername: "@soniarod_ni",
          channel: "Telegram",
          stage: "En Negociacion",
          tags: ["Socio Potencial", "E-commerce"],
          notes: "Interesada en conectar su tienda con la red de SyncConnect.",
          lastContactAt: new Date().toISOString(),
        },
        {
          name: "Gabriel Silva",
          phone: "+50255889900",
          email: "gabriel.silva@hotmail.com",
          telegramUsername: "@gsilva_app",
          channel: "Gmail",
          stage: "Cliente VIP",
          tags: ["Comprador", "Membresía Anual"],
          notes: "Compró la membresía el mes pasado. Recibió correos automáticos.",
          lastContactAt: new Date().toISOString(),
        },
      ];

      for (const c of defaultData) {
        await addDoc(collection(db, "crm_contacts"), {
          ...c,
          createdAt: new Date().toISOString(),
        });
      }
    };

    seedDefaultContacts();
  }, [db, contacts.length]);

  // Seed default rules if empty
  useEffect(() => {
    if (!db || automationRules.length > 0) return;

    const seedRules = async () => {
      const defaultRules: AutomationRule[] = [
        {
          title: "Bienvenida Automática por WhatsApp & Gmail",
          trigger: "Cuando entra un nuevo Lead por WhatsApp",
          action: "Enviar plantilla de bienvenida por WhatsApp + Notificar por Gmail",
          channel: "Multi-canal",
          template: "¡Hola! Gracias por comunicarte con SyncConnect. En un momento te atendemos.",
          status: "Active",
        },
        {
          title: "Notificación de Suscriptor en Telegram",
          trigger: "Cuando un usuario se une al Bot de Telegram",
          action: "Enviar catálogo de productos y enlace Cycling en Telegram",
          channel: "Telegram",
          template: "Bienvenido a nuestro canal oficial. Aquí tienes las ofertas de hoy:",
          status: "Active",
        },
        {
          title: "Promoción de Cliente a VIP por Venta Registrada",
          trigger: "Cuando se confirma una venta en la plataforma",
          action: "Cambiar estado a 'Cliente VIP' y enviar comprobante por Gmail",
          channel: "Gmail",
          template: "Felicidades por tu compra. Adjuntamos tus credenciales de acceso.",
          status: "Active",
        },
      ];

      for (const r of defaultRules) {
        await addDoc(collection(db, "automation_rules"), {
          ...r,
          createdAt: new Date().toISOString(),
        });
      }
    };

    seedRules();
  }, [db, automationRules.length]);

  // Send Chat Message
  const handleSendWhatsAppMessage = async () => {
    if (!chatMessage.trim() || !selectedContact) return;

    setSendingMsg(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: selectedContact.phone,
          text: chatMessage,
          token: waToken || undefined,
          phoneNumberId: waPhoneId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error al enviar mensaje");

      // Log in Firestore
      if (db) {
        await addDoc(collection(db, "automation_logs"), {
          event: "Envío Mensaje WhatsApp",
          contactName: selectedContact.name,
          channel: "WhatsApp",
          status: "Exitoso",
          details: `Mensaje: "${chatMessage.substring(0, 40)}..."`,
          timestamp: new Date().toISOString(),
        });

        // Update contact last contact
        if (selectedContact.id) {
          await updateDoc(doc(db, "crm_contacts", selectedContact.id), {
            lastContactAt: new Date().toISOString(),
          });
        }
      }

      toast({
        title: "¡Mensaje Enviado!",
        description: `Enviado a ${selectedContact.name} (${selectedContact.phone}).`,
      });

      // Open wa.me link if available
      if (data.waLink) {
        window.open(data.waLink, "_blank");
      }

      setChatMessage("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al enviar",
        description: err?.message || "Ocurrió un error al enviar el mensaje.",
      });
    } finally {
      setSendingMsg(false);
    }
  };

  // Broadcast Telegram Message
  const handleSendTelegramBroadcast = async () => {
    if (!tgBroadcastText.trim()) {
      toast({ variant: "destructive", title: "Texto requerido", description: "Escribe el mensaje de difusión." });
      return;
    }

    setSendingTgBroadcast(true);
    try {
      const res = await fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: tgBotToken || undefined,
          chatId: "@suscriptores",
          text: tgBroadcastText,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error al transmitir en Telegram");

      if (db) {
        await addDoc(collection(db, "automation_logs"), {
          event: "Difusión Telegram Bot",
          contactName: "Todos los Suscriptores",
          channel: "Telegram",
          status: "Exitoso",
          details: `Difusión: "${tgBroadcastText.substring(0, 40)}..."`,
          timestamp: new Date().toISOString(),
        });
      }

      toast({
        title: "¡Difusión Ejecutada en Telegram!",
        description: "El mensaje ha sido transmitido exitosamente a los suscriptores del bot.",
      });

      setTgBroadcastText("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error en difusión Telegram",
        description: err?.message,
      });
    } finally {
      setSendingTgBroadcast(false);
    }
  };

  // Send Direct 1-to-1 Telegram Message to Individual Contact
  const handleSendTelegramDirect = async () => {
    if (!tgDirectRecipient.trim()) {
      toast({
        variant: "destructive",
        title: "Destinatario requerido",
        description: "Ingresa el nombre de usuario de Telegram (@usuario) o ID de chat.",
      });
      return;
    }

    if (!tgDirectMessage.trim()) {
      toast({
        variant: "destructive",
        title: "Mensaje requerido",
        description: "Escribe el mensaje que deseas enviar a esta persona.",
      });
      return;
    }

    setSendingTgDirect(true);
    try {
      const res = await fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: tgBotToken || undefined,
          chatId: tgDirectRecipient.trim(),
          text: tgDirectMessage.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error al enviar mensaje por Telegram");

      if (db) {
        await addDoc(collection(db, "automation_logs"), {
          event: "Mensaje Directo Telegram (1 a 1)",
          contactName: tgDirectRecipient,
          channel: "Telegram",
          status: "Exitoso",
          details: `Mensaje a ${tgDirectRecipient}: "${tgDirectMessage.substring(0, 45)}..."`,
          timestamp: new Date().toISOString(),
        });
      }

      toast({
        title: "¡Mensaje Enviado por Telegram!",
        description: data.sentViaApi
          ? `Mensaje entregado exitosamente a ${tgDirectRecipient} vía Bot API.`
          : `Enlace directo generado para ${tgDirectRecipient}.`,
      });

      if (data.telegramLink) {
        window.open(data.telegramLink, "_blank");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al enviar en Telegram",
        description: err?.message || "No se pudo entregar el mensaje.",
      });
    } finally {
      setSendingTgDirect(false);
    }
  };

  // Request & Authorize Gmail Scope
  const handleAuthorizeGmail = async () => {
    if (!auth) {
      toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: "El servicio de autenticación no está listo.",
      });
      return;
    }
    setAuthorizingGmail(true);
    try {
      const { accessToken } = await requestGmailPermission(auth);
      if (accessToken) {
        setGmailAccessToken(accessToken);
        toast({
          title: "¡Permiso de Gmail Concedido!",
          description: "La cuenta de Google ha otorgado el permiso para enviar correos.",
        });
      } else {
        toast({
          title: "Sesión autorizada",
          description: "Permisos de Gmail verificados correctamente.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al solicitar permisos",
        description: err?.message || "No se pudo completar la autorización de Gmail.",
      });
    } finally {
      setAuthorizingGmail(false);
    }
  };

  // Dispatch Test Gmail OAuth to External Recipients
  const handleSendGmailTest = async () => {
    const rawRecipients = gmailRecipient
      .split(/[\n,;]+/)
      .map((r) => r.trim())
      .filter((r) => r.includes("@"));

    if (rawRecipients.length === 0) {
      toast({
        variant: "destructive",
        title: "Destinatario requerido",
        description: "Ingresa al menos una dirección de correo de un cliente o selecciona un contacto.",
      });
      return;
    }

    setSendingGmail(true);
    try {
      const token = gmailAccessToken || (typeof window !== "undefined" ? localStorage.getItem("google_gmail_access_token") : null);
      let successCount = 0;
      let lastError = "";

      for (const recipient of rawRecipients) {
        const res = await fetch("/api/gmail/send-oauth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipient,
            subject: gmailSubject,
            html: gmailBody,
            accessToken: token,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          successCount++;
          if (db) {
            await addDoc(collection(db, "automation_logs"), {
              event: "Envío Gmail a Cliente",
              contactName: recipient,
              channel: "Gmail",
              status: "Exitoso",
              details: `Asunto: ${gmailSubject}`,
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          lastError = data.error || "Error al enviar";
        }
      }

      if (successCount > 0) {
        toast({
          title: "¡Correo(s) Enviado(s) vía Gmail!",
          description: `Se enviaron ${successCount} correo(s) exitosamente a los destinatarios especificados.`,
        });
      } else {
        throw new Error(lastError || "No se pudo entregar el correo a los destinatarios.");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error en Gmail",
        description: err?.message,
      });
    } finally {
      setSendingGmail(false);
    }
  };

  // Add Contact
  const handleCreateContact = async () => {
    if (!newContact.name || !newContact.phone) {
      toast({ variant: "destructive", title: "Faltan campos", description: "Nombre y teléfono son requeridos." });
      return;
    }

    try {
      if (db) {
        await addDoc(collection(db, "crm_contacts"), {
          ...newContact,
          createdAt: new Date().toISOString(),
          lastContactAt: new Date().toISOString(),
        });
      }

      toast({ title: "Contacto Guardado ✓", description: `Se ha registrado a ${newContact.name} en el CRM.` });
      setShowAddContact(false);
      setNewContact({
        name: "",
        phone: "",
        email: "",
        telegramUsername: "",
        channel: "WhatsApp",
        stage: "Nuevo Lead",
        tags: ["SyncConnect"],
        notes: "",
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: err?.message });
    }
  };

  // Add Automation Rule
  const handleCreateAutomationRule = async () => {
    if (!newRule.title || !newRule.template) {
      toast({ variant: "destructive", title: "Campos requeridos", description: "Ingresa un título y la plantilla del mensaje." });
      return;
    }

    try {
      if (db) {
        await addDoc(collection(db, "automation_rules"), {
          ...newRule,
          createdAt: new Date().toISOString(),
        });
      }

      toast({ title: "Automatización Creada ⚡", description: `Regla '${newRule.title}' activada.` });
      setShowAddAutomation(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message });
    }
  };

  // Toggle Rule Status
  const handleToggleRuleStatus = async (rule: AutomationRule) => {
    if (!db || !rule.id) return;
    const nextStatus = rule.status === "Active" ? "Paused" : "Active";
    await updateDoc(doc(db, "automation_rules", rule.id), { status: nextStatus });
    toast({
      title: `Regla ${nextStatus === "Active" ? "Activada" : "Pausada"}`,
      description: `'${rule.title}' está ahora en estado ${nextStatus}.`,
    });
  };

  // Filtered Contacts
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === "All" || c.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <DashboardShell role="affiliate">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Amazon Aesthetics Master Header Banner */}
        <div className="bg-[#131921] rounded-3xl border border-[#232F3E] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <ShoppingBag className="w-80 h-80 text-[#FF9900]" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-[#232F3E] text-[#FF9900] text-[10px] font-black uppercase tracking-widest rounded-full border border-[#FF9900]/30 flex items-center gap-1.5">
                  <Star className="h-3 w-3 fill-[#FF9900]" /> SyncConnect Amazon Engine
                </span>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> Servidor CRM & Hub de Automatizaciones • Latencia 14ms
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight italic uppercase">
                Amazon CRM <span className="text-[#FF9900]">& Automatizaciones</span>
              </h1>
              <p className="text-slate-300 text-xs md:text-sm max-w-3xl font-medium leading-relaxed">
                Gestiona leads de <strong className="text-white">WhatsApp</strong>, <strong className="text-white">Telegram</strong> y <strong className="text-white">Gmail OAuth</strong> con flujos automatizados de alta conversión estilo Amazon E-commerce.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={() => setShowAddContact(true)}
                className="h-12 bg-[#FF9900] hover:bg-[#E77600] text-slate-950 font-black text-xs uppercase tracking-wider px-6 rounded-2xl shadow-xl gap-2"
              >
                <Plus className="h-4 w-4" /> Nuevo Contacto
              </Button>
              <Button
                onClick={() => setShowAddAutomation(true)}
                variant="outline"
                className="h-12 border-[#FF9900]/40 text-[#FF9900] hover:bg-[#FF9900]/10 font-bold text-xs uppercase tracking-wider px-5 rounded-2xl gap-2"
              >
                <Zap className="h-4 w-4" /> Crear Automatización
              </Button>
            </div>
          </div>

          {/* Amazon Navigation Bar Tabs */}
          <div className="mt-8 pt-4 border-t border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("whatsapp")}
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === "whatsapp"
                  ? "bg-[#FF9900] text-slate-950 shadow-lg"
                  : "bg-[#232F3E] text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <MessageSquare className="h-4 w-4" /> CRM WhatsApp ({contacts.filter((c) => c.channel === "WhatsApp").length})
            </button>

            <button
              onClick={() => setActiveTab("telegram")}
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === "telegram"
                  ? "bg-[#FF9900] text-slate-950 shadow-lg"
                  : "bg-[#232F3E] text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Send className="h-4 w-4" /> CRM Telegram ({contacts.filter((c) => c.channel === "Telegram").length})
            </button>

            <button
              onClick={() => setActiveTab("gmail")}
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === "gmail"
                  ? "bg-[#FF9900] text-slate-950 shadow-lg"
                  : "bg-[#232F3E] text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Mail className="h-4 w-4" /> Gmail OAuth & Envío
            </button>

            <button
              onClick={() => setActiveTab("automations")}
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === "automations"
                  ? "bg-[#FF9900] text-slate-950 shadow-lg"
                  : "bg-[#232F3E] text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Zap className="h-4 w-4" /> Motor Automatizaciones ({automationRules.length})
            </button>

            <button
              onClick={() => setActiveTab("contacts")}
              className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === "contacts"
                  ? "bg-[#FF9900] text-slate-950 shadow-lg"
                  : "bg-[#232F3E] text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Users className="h-4 w-4" /> Tabla de Leads ({contacts.length})
            </button>
          </div>
        </div>

        {/* Banner de Canales Asignados por el Administrador */}
        {assignedChannelsInfo && (
          <div className="bg-gradient-to-r from-slate-900 via-[#1A2433] to-slate-900 border border-[#FF9900]/30 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-[#FF9900]/10 border border-[#FF9900]/30 flex items-center justify-center text-[#FF9900] shrink-0 shadow-inner">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FF9900] text-slate-950">
                      Asignación del Administrador
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Tus canales de contacto y flujos automáticos están conectados
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight mt-1 flex items-center gap-2">
                    Canales Automatizados Activos para tu Cuenta
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {assignedChannelsInfo.whatsapp?.enabled && (
                  <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-2 rounded-2xl text-xs">
                    <MessageSquare className="h-4 w-4 text-emerald-400" />
                    <div>
                      <div className="text-[9px] font-black uppercase text-emerald-400">WhatsApp</div>
                      <div className="font-bold text-white text-[11px] font-mono">
                        {assignedChannelsInfo.whatsapp.assignedNumber ? `+${assignedChannelsInfo.whatsapp.assignedNumber}` : "API Conectada"}
                      </div>
                    </div>
                  </div>
                )}

                {assignedChannelsInfo.gmail?.enabled && (
                  <div className="flex items-center gap-2 bg-red-950/60 border border-red-500/30 px-3.5 py-2 rounded-2xl text-xs">
                    <Mail className="h-4 w-4 text-red-400" />
                    <div>
                      <div className="text-[9px] font-black uppercase text-red-400">Gmail</div>
                      <div className="font-bold text-white text-[11px] truncate max-w-[140px]">
                        {assignedChannelsInfo.gmail.assignedEmail || "Plantilla Lista"}
                      </div>
                    </div>
                  </div>
                )}

                {assignedChannelsInfo.telegram?.enabled && (
                  <div className="flex items-center gap-2 bg-sky-950/60 border border-sky-500/30 px-3.5 py-2 rounded-2xl text-xs">
                    <Send className="h-4 w-4 text-sky-400" />
                    <div>
                      <div className="text-[9px] font-black uppercase text-sky-400">Telegram Bot</div>
                      <div className="font-bold text-white text-[11px] font-mono">
                        {assignedChannelsInfo.telegram.botUsername ? `@${assignedChannelsInfo.telegram.botUsername}` : "Bot Asignado"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: WHATSAPP CRM */}
        {activeTab === "whatsapp" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Contact Selector Panel */}
            <div className="lg:col-span-4 bg-[#131921] rounded-3xl border border-[#232F3E] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-[#FF9900] flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Conversaciones WhatsApp
                </h3>
                <Button
                  onClick={() => setShowWaConfig(!showWaConfig)}
                  size="sm"
                  variant="ghost"
                  className="text-xs text-slate-400 hover:text-white gap-1"
                >
                  <Settings className="h-3.5 w-3.5" /> API Config
                </Button>
              </div>

              {/* WhatsApp Config Drawer */}
              {showWaConfig && (
                <div className="p-4 bg-[#232F3E] rounded-2xl space-y-3 text-xs border border-[#FF9900]/30 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                      <Settings className="h-3 w-3 text-[#FF9900]" /> Conexión WhatsApp Cloud API (Meta)
                    </p>
                    {waVerifiedName && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> {waVerifiedName}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-400 font-bold uppercase">Meta Access Token</Label>
                    <Input
                      placeholder="EAAG..."
                      value={waToken}
                      onChange={(e) => setWaToken(e.target.value)}
                      className="bg-[#131921] border-white/10 text-white text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-slate-400 font-bold uppercase">Phone Number ID</Label>
                    <Input
                      placeholder="1029384756..."
                      value={waPhoneId}
                      onChange={(e) => setWaPhoneId(e.target.value)}
                      className="bg-[#131921] border-white/10 text-white text-xs mt-1"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={handleSaveWhatsAppConfig}
                      disabled={savingWaConfig}
                      size="sm"
                      className="h-8 flex-1 bg-[#FF9900] hover:bg-[#E77600] text-slate-950 font-black text-[10px] uppercase rounded-xl"
                    >
                      {savingWaConfig ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                      Guardar Claves
                    </Button>
                    <Button
                      onClick={handleTestWhatsAppConfig}
                      disabled={testingWaConfig || !waToken}
                      size="sm"
                      variant="outline"
                      className="h-8 border-white/20 text-white hover:bg-white/10 text-[10px] uppercase font-bold rounded-xl"
                    >
                      {testingWaConfig ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1 text-[#FF9900]" />}
                      Probar Conexión
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Si dejas los campos vacíos, el sistema usará el modo directo de wa.me.
                  </p>
                </div>
              )}

              {/* Search & Filter */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Buscar por nombre o número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-[#232F3E] border-white/10 text-white text-xs rounded-xl"
                />
              </div>

              {/* Contact List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 scrollbar-none">
                {filteredContacts.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-8">No se encontraron prospectos de WhatsApp.</p>
                ) : (
                  filteredContacts.map((c) => (
                    <div
                      key={c.id || c.phone}
                      onClick={() => setSelectedContact(c)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        selectedContact?.id === c.id
                          ? "bg-[#232F3E] border-[#FF9900] shadow-md"
                          : "bg-[#131921]/60 border-white/5 hover:bg-[#232F3E]/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-white truncate">{c.name}</span>
                        <Badge
                          className={`text-[9px] font-bold uppercase ${
                            c.stage === "Cliente VIP"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : c.stage === "En Negociacion"
                              ? "bg-[#FF9900]/20 text-[#FF9900] border-[#FF9900]/30"
                              : "bg-slate-800 text-slate-300 border-slate-700"
                          }`}
                        >
                          {c.stage}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                        <span>{c.phone}</span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(c.lastContactAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Conversation & Quick Dispatcher */}
            <div className="lg:col-span-8 bg-[#131921] rounded-3xl border border-[#232F3E] p-6 space-y-6 flex flex-col justify-between">
              {selectedContact ? (
                <>
                  {/* Active Contact Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-[#FF9900]/20 border border-[#FF9900]/40 flex items-center justify-center text-[#FF9900] font-black text-lg">
                        {selectedContact.name.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white flex items-center gap-2">
                          {selectedContact.name}
                          <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase">
                            WhatsApp Activo
                          </Badge>
                        </h2>
                        <p className="text-xs text-slate-400 font-mono">
                          {selectedContact.phone} • {selectedContact.email || "Sin correo"}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`https://wa.me/${selectedContact.phone.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Abrir WhatsApp Web
                    </a>
                  </div>

                  {/* Chat Messages Feed Simulation */}
                  <div className="bg-[#232F3E]/40 rounded-2xl p-4 min-h-[300px] max-h-[380px] overflow-y-auto space-y-3 font-sans border border-white/5">
                    <div className="text-center py-2">
                      <span className="text-[10px] text-slate-500 bg-[#131921] px-3 py-1 rounded-full border border-white/5">
                        Canal Seguro Cifrado de WhatsApp
                      </span>
                    </div>

                    {/* Received Message */}
                    <div className="flex flex-col items-start max-w-[80%]">
                      <div className="bg-[#232F3E] text-white p-3.5 rounded-2xl rounded-tl-none text-xs shadow-md border border-white/5">
                        <p className="font-semibold text-slate-300">
                          {selectedContact.notes || "Hola, requiero información sobre el programa deSyncConnect y los enlaces de oferta."}
                        </p>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 pl-1">
                        Recibido • {new Date(selectedContact.lastContactAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {/* Outgoing Message */}
                    <div className="flex flex-col items-end max-w-[80%] ml-auto">
                      <div className="bg-[#FF9900]/20 border border-[#FF9900]/30 text-white p-3.5 rounded-2xl rounded-tr-none text-xs shadow-md">
                        <p className="font-semibold">
                          ¡Hola {selectedContact.name}! Con gusto te comparto el catálogo VIP y tu enlace de registro directo.
                        </p>
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 pr-1 flex items-center gap-1">
                        Enviado <Check className="h-3 w-3 text-[#FF9900]" />
                      </span>
                    </div>
                  </div>

                  {/* Quick Replies Buttons */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-[#FF9900] tracking-wider">
                      Respuestas Rápidas Automatizadas:
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                      <button
                        onClick={() =>
                          setChatMessage(
                            `Hola ${selectedContact.name}, te comparto el link especial de la tienda con comisión activa:`
                          )
                        }
                        className="px-3 py-1.5 bg-[#232F3E] hover:bg-white/10 text-slate-300 text-[11px] font-bold rounded-xl whitespace-nowrap border border-white/5"
                      >
                        ⚡ Enviar Enlace Oferta
                      </button>
                      <button
                        onClick={() =>
                          setChatMessage(
                            `Estimado ${selectedContact.name}, confirmamos que tu cuenta ha sido actualizada a nivel VIP.`
                          )
                        }
                        className="px-3 py-1.5 bg-[#232F3E] hover:bg-white/10 text-slate-300 text-[11px] font-bold rounded-xl whitespace-nowrap border border-white/5"
                      >
                        🌟 Confirmación VIP
                      </button>
                      <button
                        onClick={() =>
                          setChatMessage(
                            `Hola! ¿Pudiste revisar la propuesta o necesitas que programemos una breve llamada por Zoom?`
                          )
                        }
                        className="px-3 py-1.5 bg-[#232F3E] hover:bg-white/10 text-slate-300 text-[11px] font-bold rounded-xl whitespace-nowrap border border-white/5"
                      >
                        📞 Agendar Llamada
                      </button>
                    </div>
                  </div>

                  {/* Input Box */}
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder={`Escribir mensaje para ${selectedContact.name}...`}
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendWhatsAppMessage()}
                      className="h-12 bg-[#232F3E] border-white/10 text-white text-xs font-medium rounded-2xl"
                    />
                    <Button
                      onClick={handleSendWhatsAppMessage}
                      disabled={sendingMsg || !chatMessage.trim()}
                      className="h-12 bg-[#FF9900] hover:bg-[#E77600] text-slate-950 font-black text-xs uppercase tracking-wider px-6 rounded-2xl shadow-xl gap-2 shrink-0"
                    >
                      {sendingMsg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      ENVIAR
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                  <MessageSquare className="h-12 w-12 text-[#FF9900]/40 mb-3" />
                  <p className="font-bold uppercase text-xs">Selecciona un prospecto para iniciar el chat de WhatsApp</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TELEGRAM CRM */}
        {activeTab === "telegram" && (
          <div className="space-y-6">
            {/* Telegram 1-to-1 Direct Messaging to a Single Person */}
            <div className="bg-[#131921] rounded-3xl border border-sky-500/30 p-6 space-y-5 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase italic flex items-center gap-2">
                      Envío de Mensaje Directo a 1 Persona (Telegram 1 a 1)
                      <Badge className="bg-sky-500/20 text-sky-400 text-[9px] font-bold uppercase">
                        Mensajería Individual
                      </Badge>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Envía mensajes personalizados directamente al usuario de Telegram de un cliente o abre el chat 1 a 1 al instante.
                    </p>
                  </div>
                </div>

                {tgDirectRecipient && (
                  <a
                    href={`https://t.me/${tgDirectRecipient.replace("@", "").trim()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 transition-all shrink-0 shadow-lg"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir Chat en Telegram Web/App
                  </a>
                )}
              </div>

              {/* Quick Contact Selection Chips */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">
                  Seleccionar Contacto Rápido del CRM:
                </Label>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                  {contacts.slice(0, 8).map((c) => {
                    const tgUser = c.telegramUsername || `@${c.name.toLowerCase().replace(/\s+/g, "_")}`;
                    return (
                      <button
                        key={c.id || c.phone}
                        onClick={() => {
                          setTgDirectRecipient(tgUser);
                          setTgDirectMessage(`¡Hola ${c.name}! Te escribo de parte de SyncConnect con información especial para ti:`);
                        }}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-xl whitespace-nowrap border transition-all flex items-center gap-1.5 ${
                          tgDirectRecipient === tgUser
                            ? "bg-sky-500/20 border-sky-400 text-sky-300 shadow-sm"
                            : "bg-[#232F3E] border-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <Send className="h-2.5 w-2.5 text-sky-400" />
                        <span>{c.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono">({tgUser})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 md:col-span-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">
                    Destinatario (@usuario o ID de Telegram)
                  </Label>
                  <Input
                    placeholder="@usuario_telegram"
                    value={tgDirectRecipient}
                    onChange={(e) => setTgDirectRecipient(e.target.value)}
                    className="h-11 bg-[#232F3E] border-white/10 text-white font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-500">
                    Ejemplo: @carlosm_sync o ID numérico del chat
                  </p>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">
                    Plantillas Rápidas 1 a 1:
                  </Label>
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    <button
                      onClick={() =>
                        setTgDirectMessage(
                          `¡Hola! Te comparto tu enlace de registro exclusivo para acceder a la plataforma: https://syncconnect.online`
                        )
                      }
                      className="px-2.5 py-1.5 bg-[#232F3E] hover:bg-white/10 text-slate-300 text-[10px] font-bold rounded-lg border border-white/5"
                    >
                      ⚡ Enlace de Registro
                    </button>
                    <button
                      onClick={() =>
                        setTgDirectMessage(
                          `¡Excelente noticia! Tu membresía VIP y enlaces de afiliado han sido habilitados con éxito.`
                        )
                      }
                      className="px-2.5 py-1.5 bg-[#232F3E] hover:bg-white/10 text-slate-300 text-[10px] font-bold rounded-lg border border-white/5"
                    >
                      💎 Activación VIP
                    </button>
                    <button
                      onClick={() =>
                        setTgDirectMessage(
                          `Hola, ¿tienes unos minutos para revisar tus dudas sobre el sistema y resolver tus comisiones?`
                        )
                      }
                      className="px-2.5 py-1.5 bg-[#232F3E] hover:bg-white/10 text-slate-300 text-[10px] font-bold rounded-lg border border-white/5"
                    >
                      📞 Soporte / Consulta
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">
                  Mensaje Personalizado para la Persona:
                </Label>
                <Textarea
                  placeholder="Escribe el mensaje que deseas enviar a esta persona..."
                  value={tgDirectMessage}
                  onChange={(e) => setTgDirectMessage(e.target.value)}
                  className="min-h-[100px] bg-[#232F3E] border-white/10 text-white text-xs leading-relaxed font-sans"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Button
                  onClick={handleSendTelegramDirect}
                  disabled={sendingTgDirect || !tgDirectRecipient.trim() || !tgDirectMessage.trim()}
                  className="h-12 flex-1 w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl gap-2"
                >
                  {sendingTgDirect ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  ENVIAR MENSAJE A ESTA PERSONA (TELEGRAM)
                </Button>
                {tgDirectRecipient && (
                  <Button
                    onClick={() => {
                      const cleanUser = tgDirectRecipient.replace("@", "").trim();
                      const url = cleanUser
                        ? `https://t.me/${cleanUser}?text=${encodeURIComponent(tgDirectMessage)}`
                        : `https://t.me/share/url?text=${encodeURIComponent(tgDirectMessage)}`;
                      window.open(url, "_blank");
                    }}
                    variant="outline"
                    className="h-12 w-full sm:w-auto border-sky-500/30 text-sky-400 hover:bg-sky-500/10 font-bold text-xs uppercase rounded-2xl gap-2"
                  >
                    <ExternalLink className="h-4 w-4" /> Abrir en App de Telegram
                  </Button>
                )}
              </div>
            </div>

            {/* Telegram Bot Setup & Mass Broadcast Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Telegram Bot Setup */}
              <div className="lg:col-span-5 bg-[#131921] rounded-3xl border border-[#232F3E] p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase italic">Bot de Telegram Oficial</h3>
                    <p className="text-xs text-slate-400">Credenciales de BotFather y configuración de webhook</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase text-slate-400">Telegram Bot Token (BotFather)</Label>
                      {tgBotVerifiedInfo && (
                        <Badge className="bg-sky-500/20 text-sky-400 text-[9px] font-bold">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> {tgBotVerifiedInfo.username} ({tgBotVerifiedInfo.firstName})
                        </Badge>
                      )}
                    </div>
                    <Input
                      placeholder="123456789:ABCdefGHIjklMNOpqrs..."
                      value={tgBotToken}
                      onChange={(e) => setTgBotToken(e.target.value)}
                      className="h-11 bg-[#232F3E] border-white/10 text-white font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Nombre de Usuario del Bot</Label>
                    <Input
                      placeholder="@SyncConnect_bot"
                      value={tgBotUsername}
                      onChange={(e) => setTgBotUsername(e.target.value)}
                      className="h-11 bg-[#232F3E] border-white/10 text-white font-mono text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={handleSaveTelegramConfig}
                      disabled={savingTgConfig}
                      className="h-10 flex-1 bg-[#FF9900] hover:bg-[#E77600] text-slate-950 font-black text-xs uppercase rounded-xl gap-1.5 shadow-md"
                    >
                      {savingTgConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Guardar Token
                    </Button>
                    <Button
                      onClick={handleTestTelegramConfig}
                      disabled={testingTgConfig || !tgBotToken}
                      variant="outline"
                      className="h-10 border-white/20 text-white hover:bg-white/10 text-xs uppercase font-bold rounded-xl gap-1.5"
                    >
                      {testingTgConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-sky-400" />}
                      Probar Bot
                    </Button>
                  </div>

                  <div className="p-4 bg-[#232F3E] rounded-2xl space-y-2 border border-sky-500/20">
                    <span className="text-[10px] font-black uppercase text-sky-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Estado del Webhook del Bot: ACTIVO
                    </span>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Las respuestas automáticas a los comandos <code>/start</code>, <code>/catalogo</code> y <code>/soporte</code> se ejecutan en tiempo real.
                    </p>
                  </div>
                </div>

                {/* Bot Command Rules */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase text-[#FF9900]">Comandos Automatizados Registrados:</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-[#232F3E] rounded-xl flex items-center justify-between text-xs">
                      <span className="font-mono text-sky-400 font-bold">/start</span>
                      <span className="text-slate-300 text-[11px]">Envía bienvenida y catálogo</span>
                    </div>
                    <div className="p-3 bg-[#232F3E] rounded-xl flex items-center justify-between text-xs">
                      <span className="font-mono text-sky-400 font-bold">/catalogo</span>
                      <span className="text-slate-300 text-[11px]">Despliega ofertas de infoproductos</span>
                    </div>
                    <div className="p-3 bg-[#232F3E] rounded-xl flex items-center justify-between text-xs">
                      <span className="font-mono text-sky-400 font-bold">/comisiones</span>
                      <span className="text-slate-300 text-[11px]">Informa saldo de afiliado</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Telegram Mass Broadcast Center */}
              <div className="lg:col-span-7 bg-[#131921] rounded-3xl border border-[#232F3E] p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-white uppercase italic flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-[#FF9900]" /> Transmisión Masiva por Telegram
                    </h3>
                    <p className="text-xs text-slate-400">
                      Envía avisos, promociones y alertas masivas a todos los suscriptores conectados al canal de Telegram.
                    </p>
                  </div>
                  <Badge className="bg-sky-500/20 text-sky-400 font-bold uppercase text-[10px]">
                    Canal Activo
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">
                      Mensaje de Difusión (Soporta HTML/Markdown)
                    </Label>
                    <Textarea
                      placeholder="🔥 <b>¡OFERTA RELÁMPAGO DE HOY!</b>&#10;&#10;Obtén acceso VIP con el 50% de descuento registrándote en el siguiente enlace:"
                      value={tgBroadcastText}
                      onChange={(e) => setTgBroadcastText(e.target.value)}
                      className="min-h-[140px] bg-[#232F3E] border-white/10 text-white font-mono text-xs leading-relaxed"
                    />
                  </div>

                  <div className="p-4 bg-[#232F3E]/60 rounded-2xl border border-white/5 space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-400">Vista previa del mensaje:</p>
                    <div
                      className="p-3.5 bg-[#131921] rounded-xl text-xs text-slate-200 border border-white/5"
                      dangerouslySetInnerHTML={{
                        __html: tgBroadcastText || "<i>Escribe un mensaje para previsualizar...</i>",
                      }}
                    />
                  </div>

                  <Button
                    onClick={handleSendTelegramBroadcast}
                    disabled={sendingTgBroadcast || !tgBroadcastText.trim()}
                    className="h-13 w-full bg-[#FF9900] hover:bg-[#E77600] text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl gap-2"
                  >
                    {sendingTgBroadcast ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    TRANSMITIR MENSAJE A SUSCRIPTORES
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GMAIL OAUTH & EMAIL MARKETING */}
        {activeTab === "gmail" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-[#131921] rounded-3xl border border-[#232F3E] p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase italic">Conexión Gmail OAuth</h3>
                  <p className="text-xs text-slate-400">Integración con permiso gmail.send</p>
                </div>
              </div>

              <div className="p-5 bg-[#232F3E] rounded-2xl space-y-4 border border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                    <ShieldCheck className="h-5 w-5" /> OAuth Google Activo ✓
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    gmail.send
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tu cuenta <strong className="text-white">{user?.email || "urielroques604@gmail.com"}</strong> está configurada para el envío de correos automáticos.
                </p>

                <Button
                  onClick={handleAuthorizeGmail}
                  disabled={authorizingGmail}
                  variant="outline"
                  className="w-full h-10 border-white/20 text-white hover:bg-white/10 text-xs font-bold uppercase rounded-xl gap-2"
                >
                  {authorizingGmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-[#FF9900]" />}
                  Solicitar / Renovar Permiso de Gmail
                </Button>

                <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-white/10">
                  <p>• Alcance: <code>https://www.googleapis.com/auth/gmail.send</code></p>
                  <p>• Estado del Token: {gmailAccessToken ? "Token de sesión en memoria activo" : "Listo para envío con cuenta autenticada"}</p>
                </div>
              </div>

              <div className="p-4 bg-[#232F3E]/60 rounded-2xl border border-white/5 space-y-2 text-xs">
                <span className="font-black text-[#FF9900] uppercase text-[10px]">Triggers Automáticos de Gmail:</span>
                <ul className="list-disc list-inside text-slate-300 space-y-1 text-[11px]">
                  <li>Correo de bienvenida al registrarse como Lead.</li>
                  <li>Confirmación inmediata al completar una compra.</li>
                  <li>Recordatorios periódicos de oferta expirando.</li>
                </ul>
              </div>
            </div>

            {/* Test Email Dispatcher */}
            <div className="lg:col-span-7 bg-[#131921] rounded-3xl border border-[#232F3E] p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white uppercase italic flex items-center gap-2">
                  <Mail className="h-5 w-5 text-[#FF9900]" /> Enviar Correo a Clientes / Prospectos
                </h3>
                <span className="text-[10px] font-mono bg-white/5 text-slate-300 px-2.5 py-1 rounded-full border border-white/10">
                  Remitente: {user?.email || "Cuenta Conectada"}
                </span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase text-slate-400">
                      Destinatario(s) (Correo de la otra persona o cliente)
                    </Label>
                    <span className="text-[10px] text-[#FF9900] font-bold">
                      Separar con comas para enviar a varios
                    </span>
                  </div>

                  {/* Quick Select from CRM Contacts */}
                  <div className="space-y-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setGmailRecipient((prev) => (prev ? `${prev}, ${e.target.value}` : e.target.value));
                        }
                      }}
                      defaultValue=""
                      className="w-full bg-[#232F3E] border border-white/10 text-white text-xs rounded-xl h-10 px-3 font-medium"
                    >
                      <option value="" disabled>Seleccionar un Contacto / Lead del CRM para agregar...</option>
                      {contacts.filter((c) => c.email).map((c) => (
                        <option key={c.id || c.email} value={c.email}>
                          {c.name} ({c.email}) • {c.stage}
                        </option>
                      ))}
                    </select>

                    {/* Quick Contacts Chips */}
                    {contacts.filter((c) => c.email).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[9px] uppercase font-black text-slate-500">Contactos rápidos:</span>
                        {contacts.filter((c) => c.email).slice(0, 5).map((c) => (
                          <button
                            key={c.id || c.email}
                            type="button"
                            onClick={() => setGmailRecipient(c.email!)}
                            className="px-2 py-0.5 bg-white/5 hover:bg-[#FF9900]/20 hover:text-[#FF9900] text-[10px] text-slate-300 rounded-lg border border-white/10 transition-colors"
                          >
                            + {c.name.split(" ")[0]} ({c.email})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Input
                    placeholder="ej. cliente@gmail.com, prospecto@empresa.com"
                    value={gmailRecipient}
                    onChange={(e) => setGmailRecipient(e.target.value)}
                    className="h-11 bg-[#232F3E] border-white/10 text-white font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-400">
                    💡 <strong>Nota:</strong> Los correos se enviarán directamente a estas personas, nunca a tu propia bandeja.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Asunto del Correo</Label>
                  <Input
                    value={gmailSubject}
                    onChange={(e) => setGmailSubject(e.target.value)}
                    className="h-11 bg-[#232F3E] border-white/10 text-white font-bold text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Cuerpo HTML</Label>
                  <Textarea
                    value={gmailBody}
                    onChange={(e) => setGmailBody(e.target.value)}
                    className="min-h-[140px] bg-[#232F3E] border-white/10 text-white font-mono text-xs leading-relaxed"
                  />
                </div>

                <Button
                  onClick={handleSendGmailTest}
                  disabled={sendingGmail || !gmailRecipient.trim()}
                  className="h-12 w-full bg-[#FF9900] hover:bg-[#E77600] text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl gap-2"
                >
                  {sendingGmail ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  ENVIAR CORREO VÍA GMAIL A DESTINATARIO(S)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AUTOMATIONS ENGINE */}
        {activeTab === "automations" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#131921] p-5 rounded-3xl border border-[#232F3E] space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Reglas Activas</span>
                <p className="text-3xl font-black text-[#FF9900]">
                  {automationRules.filter((r) => r.status === "Active").length}
                </p>
              </div>
              <div className="bg-[#131921] p-5 rounded-3xl border border-[#232F3E] space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Flujos Ejecutados</span>
                <p className="text-3xl font-black text-emerald-400">{automationLogs.length}</p>
              </div>
              <div className="bg-[#131921] p-5 rounded-3xl border border-[#232F3E] space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Tasa de Éxito</span>
                <p className="text-3xl font-black text-sky-400">99.8%</p>
              </div>
            </div>

            {/* Automation Rules Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase italic text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[#FF9900]" /> Reglas de Automatización
                </h3>
                <Button
                  onClick={() => setShowAddAutomation(true)}
                  className="bg-[#FF9900] hover:bg-[#E77600] text-slate-950 font-black text-xs uppercase tracking-wider px-5 h-10 rounded-xl gap-2"
                >
                  <Plus className="h-4 w-4" /> Crear Regla
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {automationRules.map((rule) => (
                  <div
                    key={rule.id || rule.title}
                    className="bg-[#131921] rounded-3xl border border-[#232F3E] p-6 space-y-4 flex flex-col justify-between shadow-xl relative"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge
                          className={`text-[9px] font-bold uppercase ${
                            rule.status === "Active"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {rule.status === "Active" ? "Activo" : "Pausado"}
                        </Badge>
                        <span className="text-[10px] font-mono text-[#FF9900] font-bold">{rule.channel}</span>
                      </div>

                      <h4 className="text-sm font-black text-white leading-snug">{rule.title}</h4>

                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 bg-[#232F3E] rounded-xl text-slate-300">
                          <strong className="text-slate-400 uppercase text-[9px] block">Disparador:</strong>
                          {rule.trigger}
                        </div>
                        <div className="p-2.5 bg-[#232F3E] rounded-xl text-slate-300">
                          <strong className="text-slate-400 uppercase text-[9px] block">Acción:</strong>
                          {rule.action}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      <button
                        onClick={() => handleToggleRuleStatus(rule)}
                        className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5"
                      >
                        {rule.status === "Active" ? (
                          <>
                            <Pause className="h-3.5 w-3.5 text-amber-400" /> Pausar Regla
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 text-emerald-400" /> Activar Regla
                          </>
                        )}
                      </button>

                      <span className="text-[10px] text-slate-500">
                        {rule.createdAt ? new Date(rule.createdAt).toLocaleDateString() : "Sistema"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Automation Execution Logs Table */}
            <div className="bg-[#131921] rounded-3xl border border-[#232F3E] p-6 space-y-4">
              <h3 className="text-base font-black text-white uppercase italic flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#FF9900]" /> Historial de Ejecución de Automatizaciones
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#232F3E] text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="p-3.5 rounded-l-xl">Evento / Disparador</th>
                      <th className="p-3.5">Contacto</th>
                      <th className="p-3.5">Canal</th>
                      <th className="p-3.5">Estado</th>
                      <th className="p-3.5">Detalle</th>
                      <th className="p-3.5 rounded-r-xl">Fecha / Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {automationLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-500 font-medium">
                          No hay registros de automatización aún.
                        </td>
                      </tr>
                    ) : (
                      automationLogs.map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-white/5">
                          <td className="p-3.5 font-bold text-white">{log.event}</td>
                          <td className="p-3.5 font-mono text-slate-300">{log.contactName}</td>
                          <td className="p-3.5 text-[#FF9900] font-bold">{log.channel}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md font-bold text-[10px]">
                              {log.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400 max-w-xs truncate">{log.details}</td>
                          <td className="p-3.5 text-slate-500 text-[10px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LEADS & CONTACTS TABLE */}
        {activeTab === "contacts" && (
          <div className="bg-[#131921] rounded-3xl border border-[#232F3E] p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-white uppercase italic">Directorio General de Leads</h3>
                <p className="text-xs text-slate-400">Prospectos capturados vía WhatsApp, Telegram, Gmail y Formularios</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Buscar lead..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-[#232F3E] border-white/10 text-white text-xs rounded-xl h-10 w-60"
                  />
                </div>

                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="bg-[#232F3E] border-white/10 text-white text-xs font-bold rounded-xl h-10 px-3"
                >
                  <option value="All">Todos los Estados</option>
                  <option value="Nuevo Lead">Nuevo Lead</option>
                  <option value="Contactado">Contactado</option>
                  <option value="En Negociacion">En Negociación</option>
                  <option value="Cliente VIP">Cliente VIP</option>
                </select>

                <Button
                  onClick={() => setShowAddContact(true)}
                  className="bg-[#FF9900] hover:bg-[#E77600] text-slate-950 font-black text-xs uppercase tracking-wider px-4 h-10 rounded-xl gap-2"
                >
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#232F3E] text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-3.5 rounded-l-xl">Nombre</th>
                    <th className="p-3.5">Teléfono / WhatsApp</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Telegram</th>
                    <th className="p-3.5">Canal</th>
                    <th className="p-3.5">Etapa CRM</th>
                    <th className="p-3.5">Etiquetas</th>
                    <th className="p-3.5 rounded-r-xl">Acciones 1 a 1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredContacts.map((c) => {
                    const tgUser = c.telegramUsername || `@${c.name.toLowerCase().replace(/\s+/g, "_")}`;
                    return (
                      <tr key={c.id || c.phone} className="hover:bg-white/5">
                        <td className="p-3.5 font-black text-white">{c.name}</td>
                        <td className="p-3.5 font-mono text-slate-300">{c.phone}</td>
                        <td className="p-3.5 font-mono text-slate-300">{c.email || "-"}</td>
                        <td className="p-3.5 font-mono text-sky-400 text-[11px]">{tgUser}</td>
                        <td className="p-3.5 font-bold text-[#FF9900]">{c.channel}</td>
                        <td className="p-3.5">
                          <Badge className="bg-[#232F3E] text-white border-white/10 text-[10px]">
                            {c.stage}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            {c.tags?.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-[#FF9900]/10 text-[#FF9900] text-[9px] font-bold rounded-md"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Button
                              onClick={() => {
                                setSelectedContact(c);
                                setChatMessage(`Hola ${c.name}, te escribo de parte de SyncConnect con los detalles solicitados:`);
                                setActiveTab("whatsapp");
                              }}
                              size="sm"
                              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-[10px] h-8 px-2.5 rounded-lg border border-emerald-500/20 gap-1"
                            >
                              <MessageSquare className="h-3 w-3" /> WhatsApp
                            </Button>
                            <Button
                              onClick={() => {
                                setTgDirectRecipient(tgUser);
                                setTgDirectMessage(`¡Hola ${c.name}! Te escribo de parte de SyncConnect con información especial para ti:`);
                                setActiveTab("telegram");
                              }}
                              size="sm"
                              className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-bold text-[10px] h-8 px-2.5 rounded-lg border border-sky-500/20 gap-1"
                            >
                              <Send className="h-3 w-3" /> Telegram
                            </Button>
                            {c.email && (
                              <Button
                                onClick={() => {
                                  setGmailRecipient(c.email!);
                                  setGmailSubject(`🔔 Información exclusiva para ${c.name} - SyncConnect`);
                                  setActiveTab("gmail");
                                }}
                                size="sm"
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-[10px] h-8 px-2.5 rounded-lg border border-red-500/20 gap-1"
                              >
                                <Mail className="h-3 w-3" /> Gmail
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: ADD CONTACT */}
        <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
          <DialogContent className="bg-[#131921] text-white border-[#232F3E] rounded-3xl p-6 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase text-[#FF9900]">
                Nuevo Contacto CRM
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Nombre Completo</Label>
                <Input
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="bg-[#232F3E] border-white/10 text-white text-xs h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Teléfono (WhatsApp)</Label>
                  <Input
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    placeholder="+50588001122"
                    className="bg-[#232F3E] border-white/10 text-white text-xs h-10 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Canal Principal</Label>
                  <select
                    value={newContact.channel}
                    onChange={(e) => setNewContact({ ...newContact, channel: e.target.value as any })}
                    className="bg-[#232F3E] border-white/10 text-white text-xs font-bold h-10 rounded-xl w-full px-2"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Telegram">Telegram</option>
                    <option value="Gmail">Gmail</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Correo Electrónico</Label>
                <Input
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="juan@gmail.com"
                  className="bg-[#232F3E] border-white/10 text-white text-xs h-10 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Etapa CRM</Label>
                <select
                  value={newContact.stage}
                  onChange={(e) => setNewContact({ ...newContact, stage: e.target.value as any })}
                  className="bg-[#232F3E] border-white/10 text-white text-xs font-bold h-10 rounded-xl w-full px-2"
                >
                  <option value="Nuevo Lead">Nuevo Lead</option>
                  <option value="Contactado">Contactado</option>
                  <option value="En Negociacion">En Negociación</option>
                  <option value="Cliente VIP">Cliente VIP</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Notas / Requerimiento</Label>
                <Textarea
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  placeholder="Escribe detalles del prospecto..."
                  className="bg-[#232F3E] border-white/10 text-white text-xs min-h-[80px]"
                />
              </div>

              <Button
                onClick={handleCreateContact}
                className="w-full bg-[#FF9900] hover:bg-[#E77600] text-slate-950 font-black text-xs uppercase tracking-wider h-11 rounded-xl shadow-xl"
              >
                GUARDAR CONTACTO
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL: ADD AUTOMATION */}
        <Dialog open={showAddAutomation} onOpenChange={setShowAddAutomation}>
          <DialogContent className="bg-[#131921] text-white border-[#232F3E] rounded-3xl p-6 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase text-[#FF9900]">
                Nueva Regla de Automatización
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Nombre de la Automatización</Label>
                <Input
                  value={newRule.title}
                  onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                  placeholder="Ej. Secuencia de Bienvenida VIP"
                  className="bg-[#232F3E] border-white/10 text-white text-xs h-10"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Evento Disparador (Trigger)</Label>
                <select
                  value={newRule.trigger}
                  onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value })}
                  className="bg-[#232F3E] border-white/10 text-white text-xs font-bold h-10 rounded-xl w-full px-2"
                >
                  <option value="new_lead_whatsapp">Nuevo Lead por WhatsApp</option>
                  <option value="telegram_joined">Nuevo Suscriptor en Telegram</option>
                  <option value="sale_completed">Venta de Infoproducto Registrada</option>
                  <option value="stage_changed">Cambio de Estado a Cliente VIP</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Canal de Ejecución</Label>
                <select
                  value={newRule.channel}
                  onChange={(e) => setNewRule({ ...newRule, channel: e.target.value as any })}
                  className="bg-[#232F3E] border-white/10 text-white text-xs font-bold h-10 rounded-xl w-full px-2"
                >
                  <option value="Multi-canal">Multi-canal (Gmail + WhatsApp + Telegram)</option>
                  <option value="WhatsApp">Sólo WhatsApp</option>
                  <option value="Telegram">Sólo Telegram</option>
                  <option value="Gmail">Sólo Gmail</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">Plantilla de Respuesta</Label>
                <Textarea
                  value={newRule.template}
                  onChange={(e) => setNewRule({ ...newRule, template: e.target.value })}
                  placeholder="Escribe el mensaje que se enviará automáticamente..."
                  className="bg-[#232F3E] border-white/10 text-white text-xs min-h-[100px]"
                />
              </div>

              <Button
                onClick={handleCreateAutomationRule}
                className="w-full bg-[#FF9900] hover:bg-[#E77600] text-slate-950 font-black text-xs uppercase tracking-wider h-11 rounded-xl shadow-xl"
              >
                CREAR Y ACTIVAR REGLA
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}

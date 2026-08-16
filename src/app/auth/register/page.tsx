"use client"

import { useState, Suspense, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowLeft, 
  Users, 
  Zap, 
  Lock, 
  Gift,
  Crown,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth, useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase'
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc, increment } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { SyncConnectLogo } from '@/components/SyncConnectLogo'
import { loginWithGoogle, loginWithFacebook, loginWithTikTok } from '@/lib/social-auth'

function RegisterPageContent() {
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const referralId = searchParams.get('ref') || ''
  
  const { user: existingUser, isUserLoading } = useUser()

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [chosenPlan, setChosenPlan] = useState<'free' | 'pro'>('free')

  // Form Fields
  const [authMode, setAuthMode] = useState<'form' | 'social'>('form')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [cedula, setCedula] = useState('')

  // If user is already authenticated, pre-fill and handle quick completion
  useEffect(() => {
    if (existingUser) {
      const parts = (existingUser.displayName || '').split(' ')
      if (!firstName && parts[0]) setFirstName(parts[0])
      if (!lastName && parts.length > 1) setLastName(parts.slice(1).join(' '))
      if (!email && existingUser.email) setEmail(existingUser.email)
    }
  }, [existingUser, firstName, lastName, email])

  const finalizeAffiliateRegistration = async (uid: string, userEmail: string, userDisplayName?: string, photoURL?: string) => {
    if (!db) return;
    
    const cleanFirstName = firstName.trim() || userDisplayName?.split(' ')[0] || 'Socio';
    const cleanLastName = lastName.trim() || userDisplayName?.split(' ').slice(1).join(' ') || 'Afiliado';
    const cleanPhone = whatsappNumber.trim() || '+50500000000';
    const cleanCedula = cedula.trim() || 'N/A';

    const affRef = doc(db, 'affiliates', uid);
    const affSnap = await getDoc(affRef);

    if (affSnap.exists()) {
      toast({
        title: "¡Bienvenido de nuevo!",
        description: "Tu cuenta ya se encuentra activa. Redireccionando al panel...",
      });
      router.push('/dashboard/affiliate');
      return;
    }

    const isProTier = chosenPlan === 'pro';

    // Save Affiliate record with chosen tier
    await setDoc(affRef, {
      id: uid,
      firstName: cleanFirstName,
      lastName: cleanLastName,
      cedula: cleanCedula,
      email: userEmail.toLowerCase().trim(),
      whatsappNumber: cleanPhone,
      photoUrl: photoURL || '',
      registeredAt: new Date().toISOString(),
      currentBalance: 0,
      status: 'Active',
      isFreeRegistration: !isProTier,
      membershipTier: isProTier ? 'Pro Member' : 'Free Member',
      paymentMethod: isProTier ? 'Plan PRO VIP ($15 USD)' : 'Free ($0 USD)',
      referredBy: referralId || null,
      bankId: 'Banco LAFISE BANCENTRO',
      bankAccountNumber: '',
      bankAccountHolderName: `${cleanFirstName} ${cleanLastName}`
    });

    // Credit referral if exists
    if (referralId) {
      try {
        updateDocumentNonBlocking(doc(db, 'affiliates', referralId), {
          currentBalance: increment(isProTier ? 5 : 1)
        });
        await setDoc(doc(db, 'notifications', `${referralId}_ref_${uid}`), {
          userId: referralId,
          title: isProTier ? '👑 Nuevo Socio PRO Registrado' : '🎁 Nuevo Socio Gratuito Registrado',
          message: `El socio ${cleanFirstName} ${cleanLastName} se ha unido al ${isProTier ? 'Plan PRO VIP' : 'Plan Gratuito'} con tu enlace.`,
          type: 'sale',
          createdAt: new Date().toISOString(),
          isRead: false
        });
      } catch (e) {
        console.warn("Referral notice error:", e);
      }
    }

    toast({
      title: isProTier ? "👑 ¡Registro PRO Completado!" : "🎉 ¡Registro Gratuito Completado!",
      description: isProTier 
        ? "Tu cuenta PRO ha sido activada con todas las automatizaciones desbloqueadas."
        : "Tu cuenta ha sido creada y activada al 100% de forma gratuita.",
    });

    router.push('/dashboard/affiliate');
  };

  const handleEmailPasswordRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || loading) return;

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg("Por favor, ingresa un correo electrónico válido.");
      return;
    }
    if (!cleanPass || cleanPass.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg("Por favor completa tu nombre y apellido.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        } else {
          throw createErr;
        }
      }

      if (userCredential?.user) {
        try {
          await updateProfile(userCredential.user, {
            displayName: `${firstName.trim()} ${lastName.trim()}`
          });
        } catch {
          // ignore profile update error
        }

        await finalizeAffiliateRegistration(
          userCredential.user.uid,
          cleanEmail,
          `${firstName.trim()} ${lastName.trim()}`,
          userCredential.user.photoURL || ''
        );
      }
    } catch (err: any) {
      console.error("Email registration error:", err);
      let msg = "Error al crear la cuenta. Por favor verifica tus datos o intenta con Google.";
      if (err.code === 'auth/weak-password') {
        msg = "La contraseña es muy débil. Usa al menos 6 caracteres.";
      } else if (err.code === 'auth/invalid-email') {
        msg = "El formato de correo no es válido.";
      }
      setErrorMsg(msg);
      toast({ variant: "destructive", title: "Error en Registro", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialRegister = async (providerType: 'google' | 'facebook' | 'tiktok') => {
    if (!auth || loading) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      let result;
      if (providerType === 'google') {
        result = await loginWithGoogle(auth);
      } else if (providerType === 'facebook') {
        result = await loginWithFacebook(auth);
      } else {
        result = await loginWithTikTok(auth);
      }

      if (result?.user) {
        const u = result.user;
        await finalizeAffiliateRegistration(
          u.uid,
          u.email || '',
          u.displayName || `${firstName} ${lastName}` || 'Socio',
          u.photoURL || ''
        );
      }
    } catch (error: any) {
      const isPopupClosed = error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('popup-closed-by-user');
      if (isPopupClosed) {
        toast({ title: "Registro cancelado", description: "Se cerró la ventana de autenticación." });
        return;
      }
      console.error("Social auth error:", error);
      setErrorMsg(`Error al registrarse con ${providerType.toUpperCase()}. Puedes registrarte con correo y contraseña.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center p-4 py-12 relative selection:bg-[#FF5500] selection:text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,85,0,0.12),transparent_60%)] pointer-events-none" />

      {/* Top Bar Back Link */}
      <div className="w-full max-w-lg flex items-center justify-between mb-6 z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al inicio</span>
        </Link>
        <Link href="/auth/login" className="text-xs font-bold text-[#FF9900] hover:underline">
          ¿Ya tienes cuenta? Iniciar Sesión
        </Link>
      </div>

      <div className="w-full max-w-lg z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-2">
            <SyncConnectLogo size="md" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
            <Gift className="h-3.5 w-3.5" /> VERSIÓN 100% GRATIS • REGISTRO ABIERTO ($0 USD)
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
            Crea tu Cuenta de <span className="text-[#FF9900]">Socio Gratis</span>
          </h1>
          <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto">
            Accede al catálogo de infoproductos, herramientas automatizadas y enlaces de monetización sin costo.
          </p>
        </div>

        {/* Main Register Card */}
        <Card className="bg-[#111827]/90 border border-white/10 shadow-2xl rounded-3xl backdrop-blur-xl overflow-hidden">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {errorMsg && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            {/* Plan Selector Switcher */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                Selecciona tu Plan de Registro:
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/90 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setChosenPlan('free')}
                  className={`py-3 px-3 rounded-xl text-left transition-all cursor-pointer ${
                    chosenPlan === 'free'
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-400">Starter</span>
                    <span className="text-xs font-black text-white">$0 USD</span>
                  </div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5">Versión Gratuita</div>
                  <div className="text-[9px] text-slate-400 leading-tight mt-0.5">Catálogo + Enlaces + CRM Básico</div>
                </button>

                <button
                  type="button"
                  onClick={() => setChosenPlan('pro')}
                  className={`py-3 px-3 rounded-xl text-left transition-all cursor-pointer relative ${
                    chosenPlan === 'pro'
                      ? 'bg-gradient-to-r from-[#FF5500]/20 to-[#FF9900]/20 border border-[#FF9900]/60 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-[#FF9900]">VIP</span>
                    <span className="text-xs font-black text-[#FF9900]">$15 USD</span>
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">Plan PRO VIP</div>
                  <div className="text-[9px] text-slate-400 leading-tight mt-0.5">IA Copilot + Gmail Auto + 80% Com.</div>
                </button>
              </div>
            </div>

            {/* Quick 1-Click Social Sign up */}
            <div className="space-y-2.5">
              <Button
                type="button"
                onClick={() => handleSocialRegister('google')}
                disabled={loading}
                className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-3 transition-all cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.16H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.84l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.16l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
                </svg>
                Registrarse Gratis con Google
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialRegister('facebook')}
                  disabled={loading}
                  className="h-10 bg-slate-900/60 border-white/10 hover:bg-slate-800 text-slate-200 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <svg className="h-3.5 w-3.5 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialRegister('tiktok')}
                  disabled={loading}
                  className="h-10 bg-slate-900/60 border-white/10 hover:bg-slate-800 text-slate-200 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <svg className="h-3.5 w-3.5 fill-white" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                  TikTok
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <span className="relative flex justify-center text-[10px] text-slate-400 bg-[#111827] px-3 font-black uppercase tracking-widest">
                O regístrate con tus datos
              </span>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailPasswordRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">Nombre *</Label>
                  <Input
                    required
                    placeholder="Tu nombre"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-11 bg-[#0D1527] border border-blue-900/40 text-white rounded-xl text-sm font-medium placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300">Apellido *</Label>
                  <Input
                    required
                    placeholder="Tu apellido"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11 bg-[#0D1527] border border-blue-900/40 text-white rounded-xl text-sm font-medium placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Correo Electrónico *</Label>
                <Input
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-[#0D1527] border border-blue-900/40 text-white rounded-xl text-sm font-medium placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">Contraseña (Mínimo 6 caracteres) *</Label>
                <div className="relative flex items-center">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-[#0D1527] border border-blue-900/40 text-white rounded-xl text-sm font-medium pr-12 placeholder:text-slate-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors focus:outline-none"
                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-blue-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">WhatsApp / Teléfono de Contacto</Label>
                <Input
                  placeholder="ej. +505 8888 8888"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="h-11 bg-[#0D1527] border border-blue-900/40 text-white rounded-xl text-sm font-medium placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>

              {/* Plan Activation Callout */}
              {chosenPlan === 'free' ? (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-black text-white uppercase">Activación Inmediata Gratuita</div>
                      <div className="text-[10px] text-slate-400">Sin costo de inscripción • Catálogo y Enlaces de Afiliado</div>
                    </div>
                  </div>
                  <span className="text-emerald-400 font-black text-sm">$0 USD</span>
                </div>
              ) : (
                <div className="p-3.5 bg-gradient-to-r from-[#FF5500]/15 to-[#FF9900]/15 border border-[#FF9900]/40 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-[#FF9900] shrink-0" />
                    <div>
                      <div className="text-xs font-black text-white uppercase">Membresía PRO VIP Desbloqueada</div>
                      <div className="text-[10px] text-slate-300">Copilot IA + Campañas Gmail + Comisiones Máximas (80%)</div>
                    </div>
                  </div>
                  <span className="text-[#FF9900] font-black text-sm">$15 USD</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className={`w-full h-12 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  chosenPlan === 'pro'
                    ? 'bg-gradient-to-r from-[#FF5500] to-[#FF9900] hover:from-[#E63900] hover:to-[#E68A00] text-slate-950 font-black shadow-[#FF5500]/25'
                    : 'bg-[#FF5500] hover:bg-[#E63900] shadow-[#FF5500]/25'
                }`}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>{chosenPlan === 'pro' ? 'CREAR CUENTA PRO VIP ($15 USD)' : 'CREAR CUENTA GRATIS AHORA'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="pt-2 text-center text-[11px] text-slate-400">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/auth/login" className="text-[#FF9900] font-bold hover:underline">
                Inicia sesión aquí
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Benefits reminder */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
            <ShieldCheck className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-200">100% Gratuito</div>
            <div className="text-[9px] text-slate-400">Sin mensualidades ocultas</div>
          </div>
          <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
            <Zap className="h-4 w-4 text-[#FF9900] mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-200">Activación al Instante</div>
            <div className="text-[9px] text-slate-400">Comienza a monetizar hoy</div>
          </div>
          <div className="p-3 bg-white/5 border border-white/5 rounded-2xl">
            <Users className="h-4 w-4 text-sky-400 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-200">Para Todo el Mundo</div>
            <div className="text-[9px] text-slate-400">Registro libre e internacional</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#070b14]">
        <Loader2 className="h-10 w-10 text-[#FF5500] animate-spin" />
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  )
}

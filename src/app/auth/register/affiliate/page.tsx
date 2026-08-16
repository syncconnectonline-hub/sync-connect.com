"use client"

import { useState, Suspense, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, AlertTriangle, ChevronRight, ShieldCheck, Landmark, Banknote, Mail, CheckCircle, ArrowLeft, Sparkles, CreditCard, Copy, Lock, Zap } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useToast } from '@/hooks/use-toast'
import { useAuth, useFirestore, useUser, updateDocumentNonBlocking, useMemoFirebase, useDoc } from '@/firebase'
import { signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, increment, getDoc } from 'firebase/firestore'
import { cn, getGoogleDriveDirectLink } from '@/lib/utils'
import { NICA_BANKS, ACTIVATION_BANK_DETAILS } from '@/lib/constants'
import { getFreeSpotsInfo, consumeFreeSpotIfEligible, FreeSpotInfo, DEFAULT_FREE_SPOTS } from '@/lib/free-spots'
import { loginWithGoogle, loginWithFacebook, loginWithTikTok } from '@/lib/social-auth'
import placeholderData from '@/app/lib/placeholder-images.json'

declare global {
  interface Window {
    paypal?: any;
  }
}

type Step = 'google' | 'payment'
type PaymentMethodChoice = 'paypal' | 'deposit'

function AffiliateRegisterContent() {
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: existingUser, isUserLoading } = useUser()
  
  const referralId = searchParams.get('ref')
  
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>('google')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Payment method selection for paid registration ($15 USD)
  const [paidMethodChoice, setPaidMethodChoice] = useState<PaymentMethodChoice>('paypal')
  const [depositVoucher, setDepositVoucher] = useState('')
  const [paypalReady, setPaypalReady] = useState(false)
  const [loadingPayPal, setLoadingPayPal] = useState(false)

  // 6 Free spots state
  const [freeSpots, setFreeSpots] = useState<FreeSpotInfo>(DEFAULT_FREE_SPOTS)

  useEffect(() => {
    getFreeSpotsInfo(db).then(setFreeSpots);
  }, [db]);

  // Email verification states
  const [emailAuthMode, setEmailAuthMode] = useState<'google' | 'email'>('google')
  const [emailInput, setEmailInput] = useState('')
  const [emailPasswordInput, setEmailPasswordInput] = useState('')

  // Profile and Payout state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    cedula: '',
    whatsappNumber: '',
  })

  const [paymentData, setPaymentData] = useState({
    bankId: '',
    bankAccountNumber: '',
    bankAccountHolderName: ''
  })

  const logoConfigRef = useMemoFirebase(() => db ? doc(db, 'site_config', 'site-logo') : null, [db]);
  const { data: logoOverride } = useDoc(logoConfigRef);
  const defaultLogo = placeholderData.placeholderImages.find(img => img.id === 'site-logo');
  const displayLogoUrl = getGoogleDriveDirectLink(logoOverride?.imageUrl || defaultLogo?.imageUrl || "");

  // Auto-fill names from account once authenticated and advance step
  useEffect(() => {
    if (existingUser) {
      setFormData(prev => ({
        ...prev,
        firstName: prev.firstName || existingUser.displayName?.split(' ')[0] || '',
        lastName: prev.lastName || existingUser.displayName?.split(' ').slice(1).join(' ') || ''
      }));
      if (step === 'google') {
        setStep('payment');
      }
    }
  }, [existingUser, step]);

  // Load PayPal SDK Script dynamically
  useEffect(() => {
    if (step !== 'payment' || freeSpots.isFreeEligible) return;

    const envClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
    const isTestMode = !envClientId || envClientId.startsWith('Abv8KNo') || envClientId === 'test';
    const clientId = isTestMode ? 'test' : envClientId;
    
    if (window.paypal) {
      setPaypalReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = () => {
      setPaypalReady(true);
    };
    script.onerror = () => {
      console.error("Failed to load PayPal SDK in Affiliate Registration");
    };
    document.body.appendChild(script);
  }, [step, freeSpots.isFreeEligible]);

  // Render PayPal Buttons dynamically when in PayPal choice mode
  useEffect(() => {
    if (!paypalReady || !window.paypal || step !== 'payment' || paidMethodChoice !== 'paypal' || freeSpots.isFreeEligible) {
      return;
    }

    const container = document.getElementById('paypal-affiliate-button-container');
    if (!container) return;

    container.innerHTML = '';

    const envClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
    const isTestMode = !envClientId || envClientId.startsWith('Abv8KNo') || envClientId === 'test';

    try {
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'pay'
        },
        createOrder: async (data: any, actions: any) => {
          if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.cedula.trim()) {
            toast({
              variant: "destructive",
              title: "Datos Incompletos",
              description: "Por favor escribe tu Nombre, Apellido y Cédula antes de procesar el pago."
            });
            throw new Error("Por favor completa tus datos de perfil antes de pagar.");
          }

          if (isTestMode) {
            return actions.order.create({
              purchase_units: [
                {
                  amount: {
                    currency_code: 'USD',
                    value: '15.00',
                  },
                  description: 'Activación de Cuenta de Socio Afiliado - SyncConnect',
                },
              ],
            });
          }

          try {
            const res = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: 'affiliate_activation', type: 'affiliate_activation' }),
            });
            const order = await res.json();
            if (order.error) {
              throw new Error(order.error);
            }
            return order.id;
          } catch (err: any) {
            console.error("Create affiliate PayPal order failed:", err);
            toast({ variant: "destructive", title: "Error de Orden", description: err.message || "No se pudo iniciar la orden de activación en PayPal." });
            throw err;
          }
        },
        onApprove: async (data: any) => {
          setLoadingPayPal(true);
          const activeUser = auth?.currentUser || existingUser;
          const uid = activeUser?.uid || `aff_${Date.now()}`;
          const cleanEmail = activeUser?.email || '';

          try {
            const res = await fetch('/api/paypal/activate-affiliate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: data.orderID,
                affiliateId: uid,
                affiliateData: {
                  firstName: formData.firstName,
                  lastName: formData.lastName,
                  cedula: formData.cedula,
                  email: cleanEmail,
                  whatsappNumber: formData.whatsappNumber,
                  bankId: paymentData.bankId,
                  bankAccountNumber: paymentData.bankAccountNumber,
                  bankAccountHolderName: paymentData.bankAccountHolderName,
                  referredBy: referralId || null
                }
              }),
            });

            const captureResult = await res.json();

            if (captureResult.error) {
              throw new Error(captureResult.error);
            }

            toast({
              title: "🎉 ¡Activación Exitosa!",
              description: "Tu cuenta ha sido activada automáticamente tras el pago por PayPal."
            });

            router.push('/dashboard/affiliate');
          } catch (captureErr: any) {
            console.error("Affiliate PayPal capture failed:", captureErr);
            toast({
              variant: "destructive",
              title: "Error de Validación",
              description: captureErr.message || "No se pudo validar el pago de activación."
            });
          } finally {
            setLoadingPayPal(false);
          }
        },
        onCancel: () => {
          toast({ title: "Pago Cancelado", description: "Puedes intentarlo de nuevo o seleccionar depósito bancario." });
        },
        onError: (err: any) => {
          console.error("PayPal processing error:", err);
          toast({ variant: "destructive", title: "Error en PayPal", description: "Ocurrió un error en la conexión con PayPal." });
        }
      }).render('#paypal-affiliate-button-container');
    } catch (renderErr) {
      console.error("Error setting up affiliate PayPal buttons:", renderErr);
    }
  }, [paypalReady, step, paidMethodChoice, freeSpots.isFreeEligible, formData, paymentData, auth, existingUser, referralId, router, toast]);

  // Handle Exit and sign out to return to role selection
  const handleExitAndSignOut = async () => {
    setLoading(true);
    try {
      if (auth) {
        await signOut(auth);
      }
      toast({
        title: "Sesión Finalizada",
        description: "Se ha cancelado el registro y se ha cerrado la sesión.",
      });
      router.push('/auth/register/role');
    } catch (err) {
      console.error("Error signing out during exit:", err);
      router.push('/auth/register/role');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (providerType: 'google' | 'facebook' | 'tiktok') => {
    if (!auth || loading) return;
    setErrorMsg(null);
    setLoading(true);
    
    try {
      if (providerType === 'google') {
        await loginWithGoogle(auth);
      } else if (providerType === 'facebook') {
        await loginWithFacebook(auth);
      } else {
        await loginWithTikTok(auth);
      }
      toast({
        title: "Cuenta Vinculada",
        description: `Autenticación con ${providerType.toUpperCase()} exitosa.`,
      });
      setStep('payment');
    } catch (error: any) {
      const isPopupClosed = error?.code === 'auth/popup-closed-by-user' || 
                            error?.message?.includes('popup-closed-by-user');

      if (isPopupClosed) {
        toast({
          title: "Inicio de sesión cancelado",
          description: "Se cerró la solicitud de autenticación.",
        });
        return;
      }

      console.error(`Error de login con ${providerType}:`, error);
      setErrorMsg(`Fallo en la autenticación con ${providerType}. Intente con correo u otro proveedor.`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => handleSocialLogin('google');
  const handleFacebookLogin = () => handleSocialLogin('facebook');
  const handleTikTokLogin = () => handleSocialLogin('tiktok');

  const handleDirectEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || loading) return;
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPass = emailPasswordInput.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg("Por favor, ingrese un correo electrónico válido.");
      return;
    }
    if (!cleanPass || cleanPass.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      try {
        await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        } else {
          throw createErr;
        }
      }

      toast({
        title: "Correo Autenticado ✓",
        description: "Acceso validado. Procediendo al registro de Socio Afiliado.",
      });
      setStep('payment');
    } catch (err: any) {
      console.error("Direct email register error:", err);
      setErrorMsg("Error al autenticar con este correo. Verifique sus datos o intente con Google.");
    } finally {
      setLoading(false);
    }
  };

  // Final Registration Step (Free or Bank Deposit)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    
    const activeUser = auth.currentUser || existingUser;
    if (!activeUser) {
      setErrorMsg("No se detectó una sesión activa. Por favor identifíquese con su correo o Google en el paso 1.");
      setStep('google');
      return;
    }

    if (!freeSpots.isFreeEligible && paidMethodChoice === 'deposit' && !depositVoucher.trim()) {
      toast({
        variant: "destructive",
        title: "Comprobante Requerido",
        description: "Por favor ingresa el número de referencia o voucher de tu depósito a Banco LAFISE."
      });
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const uid = activeUser.uid;
    const cleanEmail = activeUser.email || '';

    try {
      // Check if user is eligible for free registration
      const currentFreeInfo = await getFreeSpotsInfo(db);
      const isFree = currentFreeInfo.isAffiliateFreeEligible;
      
      let wasFreeConsumed = false;
      if (isFree) {
        wasFreeConsumed = await consumeFreeSpotIfEligible(db, uid, cleanEmail, 'affiliate');
      }

      // Check if user is already registered in affiliates
      const affRef = doc(db, 'affiliates', uid);
      const affSnap = await getDoc(affRef);
      
      if (affSnap.exists()) {
        toast({
          title: "Socio ya registrado",
          description: "Redireccionando al panel de control...",
        });
        router.push('/dashboard/affiliate');
        return;
      }

      const initialStatus = wasFreeConsumed ? 'Active' : 'Pending';

      await setDoc(affRef, {
        id: uid,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        cedula: formData.cedula.trim(),
        email: cleanEmail,
        whatsappNumber: formData.whatsappNumber.trim(),
        photoUrl: activeUser.photoURL || '',
        registeredAt: new Date().toISOString(),
        currentBalance: 0,
        status: initialStatus,
        isFreeRegistration: wasFreeConsumed,
        paymentMethod: wasFreeConsumed ? 'Free' : 'Banco LAFISE BANCENTRO',
        depositVoucherReference: depositVoucher.trim() || null,
        referredBy: referralId || null,
        bankId: paymentData.bankId || 'Banco LAFISE BANCENTRO',
        bankAccountNumber: paymentData.bankAccountNumber,
        bankAccountHolderName: paymentData.bankAccountHolderName
      });

      if (referralId) {
        try {
          updateDocumentNonBlocking(doc(db, 'affiliates', referralId), {
            currentBalance: increment(1)
          });
          
          await setDoc(doc(db, 'notifications', `${referralId}_referral_${uid}`), {
            userId: referralId,
            title: '🎁 Bonificación por Referido',
            message: `El usuario ${formData.firstName} se ha registrado correctamente mediante su enlace de socio.`,
            type: 'sale',
            createdAt: new Date().toISOString(),
            isRead: false
          });
        } catch (refError) {
          console.error("Error crediting referral bonus:", refError);
        }
      }

      if (wasFreeConsumed) {
        toast({ 
          title: "🎉 ¡Registro GRATUITO Exitoso! ($0 USD)", 
          description: "¡Felicidades! Tu cuenta está ACTIVADA de forma completamente GRATUITA." 
        });
        router.push('/dashboard/affiliate');
      } else {
        toast({ 
          title: "Registro Recibido", 
          description: "Tu comprobante de depósito en Banco LAFISE ha sido registrado y pasará a revisión para la activación de tu cuenta." 
        });
        router.push('/auth/register/affiliate/payment');
      }

    } catch (err: any) {
      console.error("Register Error:", err);
      setErrorMsg("No se pudo completar el registro debido a un error en el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado al Portapapeles", description: `${label}: ${text}` });
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex flex-col items-center justify-center p-4 md:p-6 py-12">
      <div className="mb-8">
        <Link href="/">
          <div className="relative h-10 w-40">
            {displayLogoUrl ? (
              <Image src={displayLogoUrl} alt="Logo" fill className="object-contain" unoptimized />
            ) : (
              <span className="text-[#131921] font-black text-2xl uppercase italic tracking-tighter">Sync<span className="text-[#ff9900]">.Pro</span></span>
            )}
          </div>
        </Link>
      </div>

      <Card className="w-full max-w-[540px] border border-[#ddd] shadow-none rounded-[4px] bg-white overflow-hidden relative">
        <div className="bg-[#131921] p-8 text-white text-center relative">
          <button
            type="button"
            onClick={handleExitAndSignOut}
            disabled={loading}
            className="absolute left-4 top-4 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
            title="Salir y Volver"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Salir</span>
          </button>
          <h1 className="text-2xl font-black uppercase tracking-tight">Registro de <span className="text-[#ff9900]">Socio Comercial</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Formulario de Aplicación & Activación</p>
        </div>

        <CardContent className="p-6 md:p-10">
          {errorMsg && (
            <div className="mb-6 p-4 border border-[#c40000] bg-red-50 flex gap-3 items-start rounded-lg">
              <AlertTriangle className="h-4 w-4 text-[#c40000] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-bold text-[#c40000] uppercase">Error en el Proceso</h4>
                <p className="text-xs text-slate-700 font-medium leading-tight">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Stepper Progress */}
          <div className="mb-8 flex gap-2">
            {['google', 'payment'].map((s, idx) => (
              <div key={s} className="flex-1 space-y-2">
                <div className={cn("h-1 transition-all duration-300", 
                  (step === s || (s === 'google' && step !== 'google')) ? "bg-[#ff9900]" : "bg-slate-100")} 
                />
                <p className="text-[8px] font-black uppercase text-center text-slate-400 tracking-wider">
                  Paso {idx + 1}: {idx === 0 ? "Autenticación" : "Datos & Activación"}
                </p>
              </div>
            ))}
          </div>

          {/* STEP 1: Google Auth / Direct Email */}
          {step === 'google' && (
            <div className="space-y-6 text-center">
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-[4px] space-y-2 text-left">
                <h3 className="text-sm font-black text-slate-900 uppercase">1. Cuenta de Identidad</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Para ingresar a la red Sync como socio comercial, es obligatorio registrarse utilizando su cuenta de Google o con correo electrónico. Esto garantiza la seguridad del canal.
                </p>
              </div>

              <div className="flex border border-slate-200 rounded-[4px] overflow-hidden p-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setEmailAuthMode('google')}
                  className={cn("flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-[3px] transition-all",
                    emailAuthMode === 'google' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => setEmailAuthMode('email')}
                  className={cn("flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-[3px] transition-all",
                    emailAuthMode === 'email' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >
                  Correo Directo
                </button>
              </div>

              {emailAuthMode === 'google' ? (
                <div className="space-y-3">
                  <Button 
                    onClick={handleGoogleLogin} 
                    disabled={loading || isUserLoading}
                    className="w-full h-13 bg-white text-slate-900 hover:bg-slate-50 border border-slate-300 flex items-center justify-center gap-3 font-black rounded-xl shadow-sm text-xs uppercase tracking-widest transition-all cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.6c-.28 1.5-.1.3-1.12 1.98l3.12 2.42c1.83-1.69 2.88-4.18 2.88-6.25z" />
                          <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.12-2.42c-.87.59-2 .95-3.32.95-2.55 0-4.72-1.73-5.5-4.07L1.91 18.06C3.89 22 7.92 24 12 24z" />
                          <path fill="#FBBC05" d="M6.5 15.55c-.2-.59-.31-1.22-.31-1.87s.11-1.28.31-1.87L1.91 9.39C.69 11.83 0 14.52 0 17.3s.69 5.47 1.91 7.91l4.59-3.66z" />
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0 7.92 0 3.89 2 1.91 5.94l4.59 3.66c.78-2.34 2.95-4.07 5.5-4.07z" />
                        </svg>
                        <span>Continuar con Google</span>
                      </>
                    )}
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      onClick={handleFacebookLogin}
                      disabled={loading}
                      variant="outline"
                      className="w-full h-11 border-slate-200 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span>Facebook</span>
                    </Button>

                    <Button
                      type="button"
                      onClick={handleTikTokLogin}
                      disabled={loading}
                      variant="outline"
                      className="w-full h-11 border-slate-200 bg-black/5 hover:bg-black/10 text-slate-900 font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.98-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.57-1.31 1.56-1.3 2.56.01.94.5 1.86 1.28 2.37.89.58 2.05.67 3.01.25.95-.41 1.63-1.31 1.81-2.31.12-.82.08-1.66.08-2.49V.02z"/>
                      </svg>
                      <span>TikTok</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <form onSubmit={handleDirectEmailRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-wider text-slate-500">Correo Electrónico</Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          placeholder="nombre@empresa.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          required
                          className="h-12 rounded-xl border border-slate-300 focus:ring-primary pl-10 text-xs font-medium"
                        />
                        <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-wider text-slate-500">Contraseña</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={emailPasswordInput}
                        onChange={(e) => setEmailPasswordInput(e.target.value)}
                        required
                        className="h-12 rounded-xl border border-slate-300 focus:ring-primary text-xs font-medium px-4"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-[#ff9900] hover:bg-[#e08800] text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl cursor-pointer"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar Registro con Correo"}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Profile Data and Payment / Activation */}
          {step === 'payment' && (
            <div className="space-y-6">
              {/* Authenticated user badge */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-emerald-900 uppercase">Cuenta Vinculada</p>
                    <p className="text-xs text-emerald-700 font-bold">{existingUser?.email || auth?.currentUser?.email || 'Usuario Autenticado'}</p>
                  </div>
                </div>

                {freeSpots.isFreeEligible ? (
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm animate-pulse">
                    🎁 GRATIS ($0 USD)
                  </span>
                ) : (
                  <div className="text-right">
                    <span className="bg-slate-900 text-amber-400 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider inline-block shadow-sm">
                      $15.00 USD
                    </span>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Activación Única</p>
                  </div>
                )}
              </div>

              {/* Personal Data Form */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <span>01. Datos del Socio Afiliado</span>
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest ml-1">Nombre *</Label>
                    <Input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required className="amazon-input" placeholder="Ej: Carlos" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest ml-1">Apellido *</Label>
                    <Input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required className="amazon-input" placeholder="Ej: Morales" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest ml-1">Cédula de Identidad *</Label>
                    <Input 
                      value={formData.cedula} 
                      onChange={e => setFormData({...formData, cedula: e.target.value})} 
                      required 
                      placeholder="001-000000-0000A"
                      className="amazon-input font-bold uppercase" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest ml-1">WhatsApp de Contacto</Label>
                    <Input 
                      value={formData.whatsappNumber} 
                      onChange={e => setFormData({...formData, whatsappNumber: e.target.value})} 
                      placeholder="50588888888"
                      className="amazon-input font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Landmark className="h-4 w-4 text-[#ff9900]" /> Banco para Retiro de Comisiones
                  </Label>
                  <Select value={paymentData.bankId} onValueChange={(v) => setPaymentData({...paymentData, bankId: v})}>
                    <SelectTrigger className="h-10 border-[#888c8c] rounded-[4px] font-bold">
                      <SelectValue placeholder="Seleccione su banco preferido" />
                    </SelectTrigger>
                    <SelectContent>
                      {NICA_BANKS.map(bank => (
                        <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input 
                      value={paymentData.bankAccountNumber} 
                      onChange={e => setPaymentData({...paymentData, bankAccountNumber: e.target.value})} 
                      placeholder="N° de Cuenta para Retiros"
                      className="amazon-input font-mono text-xs" 
                    />
                    <Input 
                      value={paymentData.bankAccountHolderName} 
                      onChange={e => setPaymentData({...paymentData, bankAccountHolderName: e.target.value})} 
                      placeholder="Nombre del Titular"
                      className="amazon-input text-xs" 
                    />
                  </div>
                </div>
              </div>

              {/* Free or Paid Method Selection */}
              {freeSpots.isFreeEligible ? (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-center gap-3">
                    <Sparkles className="h-6 w-6 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-950">¡Invitación Gratuita Disponible!</p>
                      <p className="text-[11px] text-emerald-800">Tu membresía de socio se activará al instante con costo $0 USD.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setStep('google')} className="h-12 w-1/3 font-bold uppercase tracking-wider text-xs">Atrás</Button>
                    <Button 
                      type="button" 
                      onClick={handleRegister} 
                      disabled={loading || !formData.firstName || !formData.lastName || !formData.cedula}
                      className="amazon-btn-primary flex-1 h-12 font-bold text-xs uppercase tracking-wider"
                    >
                      {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "ACTIVAR CUENTA GRATIS"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      02. Método de Activación ($15 USD)
                    </h3>
                  </div>

                  {/* Method Switcher Tabs */}
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPaidMethodChoice('paypal')}
                      className={cn(
                        "py-3 px-3 rounded-lg font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all",
                        paidMethodChoice === 'paypal' 
                          ? "bg-[#131921] text-amber-400 shadow-md scale-[1.01]" 
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      )}
                    >
                      <Zap className="h-4 w-4 text-[#ff9900]" />
                      <span>PayPal (Automático)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaidMethodChoice('deposit')}
                      className={cn(
                        "py-3 px-3 rounded-lg font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all",
                        paidMethodChoice === 'deposit' 
                          ? "bg-[#131921] text-amber-400 shadow-md scale-[1.01]" 
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      )}
                    >
                      <Landmark className="h-4 w-4 text-[#ff9900]" />
                      <span>Depósito LAFISE</span>
                    </button>
                  </div>

                  {/* OPTION A: PAYPAL AUTOMATIC ACTIVATION */}
                  {paidMethodChoice === 'paypal' && (
                    <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-5 border border-slate-800 animate-in fade-in duration-300">
                      <div className="flex items-start gap-3.5">
                        <div className="h-10 w-10 bg-amber-500/20 text-[#ff9900] rounded-xl flex items-center justify-center shrink-0 border border-amber-500/30">
                          <Zap className="h-5 w-5 fill-current" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black uppercase text-white tracking-wide">Activación Instantánea con PayPal</h4>
                            <span className="text-[9px] font-black uppercase bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">Automático</span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed font-medium">
                            Paga de forma 100% segura con tu saldo PayPal, tarjeta de débito o crédito. Al confirmarse el pago, tu cuenta se <strong>activa en el mismo segundo</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 bg-slate-950 rounded-xl border border-white/10 flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Monto de Activación:</span>
                        <span className="text-amber-400 font-black text-base font-mono">$15.00 USD</span>
                      </div>

                      {loadingPayPal ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-[#ff9900]" />
                          <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Activando tu cuenta de socio...</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div id="paypal-affiliate-button-container" className="min-h-[140px] w-full" />
                          <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest flex items-center justify-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-green-500" /> Transacción encriptada con protección al comprador
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* OPTION B: BANK DEPOSIT (BANCO LAFISE) */}
                  {paidMethodChoice === 'deposit' && (
                    <form onSubmit={handleRegister} className="space-y-5 animate-in fade-in duration-300">
                      <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-xs text-amber-950 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Landmark className="h-5 w-5 text-amber-700 shrink-0" />
                            <h4 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                              Datos de Depósito Bancario
                            </h4>
                          </div>
                          <span className="text-xs font-black bg-amber-200 text-amber-950 px-2.5 py-1 rounded-full border border-amber-300">
                            $15.00 USD
                          </span>
                        </div>

                        <p className="text-xs text-amber-900 leading-relaxed font-medium">
                          Realiza tu transferencia o depósito bancario directamente a la siguiente cuenta oficial:
                        </p>

                        <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-sm space-y-2.5 text-xs text-slate-800">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Banco Receptor:</span>
                            <span className="font-black text-slate-900">{ACTIVATION_BANK_DETAILS.bankName}</span>
                          </div>

                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Número de Cuenta:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm text-slate-950 bg-amber-100/60 px-2 py-0.5 rounded border border-amber-200">
                                {ACTIVATION_BANK_DETAILS.accountNumber}
                              </span>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => copyToClipboard(ACTIVATION_BANK_DETAILS.accountNumber, "Cuenta")}
                                className="h-7 px-2 text-slate-500 hover:text-slate-900"
                                title="Copiar número de cuenta"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Titular de la Cuenta:</span>
                            <span className="font-black text-slate-900">{ACTIVATION_BANK_DETAILS.accountHolder}</span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Monto a Depositar:</span>
                            <span className="font-black text-emerald-700 text-sm">$15.00 USD</span>
                          </div>
                        </div>
                      </div>

                      {/* Deposit voucher reference input */}
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                          <Banknote className="h-4 w-4 text-[#ff9900]" />
                          N° de Referencia / Voucher del Depósito *
                        </Label>
                        <Input 
                          value={depositVoucher} 
                          onChange={e => setDepositVoucher(e.target.value)} 
                          required 
                          placeholder="Ej: 987654321 / Transf-019283" 
                          className="amazon-input font-mono font-bold" 
                        />
                        <p className="text-[10px] text-slate-500 italic">
                          Ingresa el código o número de referencia de la transferencia realizada a LAFISE.
                        </p>
                      </div>

                      <div className="pt-2 flex gap-4">
                        <Button type="button" variant="outline" onClick={() => setStep('google')} className="h-12 w-1/3 font-bold uppercase tracking-wider text-xs">Atrás</Button>
                        <Button 
                          type="submit" 
                          disabled={loading || !formData.firstName || !formData.lastName || !formData.cedula || !depositVoucher.trim()} 
                          className="amazon-btn-primary flex-1 h-12 font-bold text-xs uppercase tracking-wider"
                        >
                          {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "ENVIAR Y REGISTRAR DEPÓSITO"}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <p className="text-xs font-medium text-slate-500">
              ¿Ya tiene una cuenta de socio? <Link href="/auth/login" className="text-[#0066c0] hover:underline font-bold ml-1 uppercase text-[10px] tracking-widest">Identificarse <ChevronRight className="inline h-3 w-3" /></Link>
             </p>
          </div>
        </CardContent>
      </Card>

      <footer className="mt-12 flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
         <ShieldCheck className="h-4 w-4" /> Entorno de Gestión Comercial Sync Connect Nicaragua
      </footer>
    </div>
  )
}

export default function AffiliateRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F9FA]"><Loader2 className="animate-spin text-[#ff9900] h-10 w-10 mb-4" /></div>}>
      <AffiliateRegisterContent />
    </Suspense>
  )
}

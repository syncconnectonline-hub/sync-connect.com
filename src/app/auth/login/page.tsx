"use client"

import { useState, useEffect, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { 
  Loader2, 
  Triangle,
  ChevronRight,
  AlertCircle,
  Globe,
  ChevronLeft,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth, useFirestore, useUser } from '@/firebase'
import { 
  setPersistence, 
  browserLocalPersistence, 
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { SyncConnectLogo } from '@/components/SyncConnectLogo'
import { loginWithGoogle, loginWithFacebook, loginWithTikTok } from '@/lib/social-auth'

const ADMIN_EMAIL = 'affiliatesync0@gmail.com';

function LoginPageContent() {
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  
  const [loading, setLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [domainError, setDomainError] = useState<{
    show: boolean;
    domain: string;
    projectId: string;
  } | null>(null)

  useEffect(() => {
    if (user && !isUserLoading) {
      setIsRedirecting(true);
      checkUserRole(user.uid, user.email);
    }
  }, [user, isUserLoading]);

  const checkUserRole = async (uid: string, userEmail: string | null) => {
    const cleanEmail = userEmail?.toLowerCase().trim() || '';

    let isUserAdmin = false;

    // Strict access for syncconnect.online domain and administrative accounts:
    if (
      cleanEmail.includes('syncconnect.online') ||
      cleanEmail.endsWith('@syncconnect.online') ||
      cleanEmail === 'syncconnect.online' ||
      cleanEmail === ADMIN_EMAIL ||
      cleanEmail === 'syncconnect.online@gmail.com' ||
      cleanEmail === 'urielroques604@gmail.com' ||
      cleanEmail === 'roquescarlos143@gmail.com'
    ) {
      isUserAdmin = true;
    }

    try {
      const adminSettingsSnap = await getDoc(doc(db, 'site_config', 'admin_settings'));
      if (adminSettingsSnap.exists()) {
        const adminData = adminSettingsSnap.data();
        const emails: string[] = adminData.emails || [];
        
        if (cleanEmail && emails.some(e => e.toLowerCase().trim() === cleanEmail)) {
          isUserAdmin = true;
        }
      }
    } catch (e) {
      console.warn("Modo offline o cuota de lectura en admin_settings:", e);
    }

    if (isUserAdmin) {
      router.replace('/dashboard/admin');
      return;
    }

    try {
      const affSnap = await getDoc(doc(db, 'affiliates', uid));
      if (affSnap.exists()) {
        router.replace('/dashboard/affiliate');
        return;
      }

      const buyerSnap = await getDoc(doc(db, 'buyers', uid));
      if (buyerSnap.exists()) {
        router.replace('/dashboard/buyer');
        return;
      }

      router.replace('/auth/register/role');
    } catch (error: any) {
      console.error("Error al verificar el rol de usuario:", error);
      setIsRedirecting(false);
      setLoading(false);
      
      let errorText = "Error al conectar con la base de datos de usuarios.";
      if (error?.code === 'resource-exhausted' || error?.message?.includes('resource-exhausted') || error?.message?.includes('Quota')) {
        errorText = "Límite de cuota diaria de escritura/lectura excedido en la consola de Firebase Firestore para hoy.";
        toast({
          title: "Cuota de Base de Datos Excedida",
          description: "La base de datos Firebase ha alcanzado sus límites de uso diario gratuitos. Por favor, intente de nuevo mañana o configure la facturación.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error de base de datos",
          description: errorText,
          variant: "destructive"
        });
      }
      setErrorMsg(errorText);
    }
  };

  const handleSocialLogin = async (providerType: 'google' | 'facebook' | 'tiktok') => {
    if (!auth || loading) return;
    setErrorMsg(null);
    setLoading(true);
    setDomainError(null);
    
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
        setIsRedirecting(true);
        toast({
          title: "Acceso autorizado",
          description: `Sesión iniciada con ${providerType.toUpperCase()} correctamente.`,
        });
        await checkUserRole(result.user.uid, result.user.email);
      }
    } catch (error: any) {
      setLoading(false);
      
      const isPopupClosed = error?.code === 'auth/popup-closed-by-user' || 
                            error?.code === 'auth/cancelled-popup-request' ||
                            error?.message?.includes('popup-closed-by-user') ||
                            error?.message?.includes('cancelled-popup-request') ||
                            error?.message?.includes('Pending promise was never set');
                             
      if (isPopupClosed) {
        toast({
          title: "Inicio de sesión cancelado",
          description: "Se canceló o cerró la solicitud de autenticación.",
        });
        return;
      }

      const isPopupBlocked = error?.code === 'auth/popup-blocked' || 
                             error?.message?.includes('popup-blocked') ||
                             error?.message?.includes('popup blocked');

      if (isPopupBlocked) {
        toast({
          title: "Ventana emergente bloqueada",
          description: "El navegador bloqueó la ventana de inicio de sesión.",
          variant: "destructive"
        });
        return;
      }

      console.error(`Error de login con ${providerType}:`, error);

      const isDomainError = error?.code === 'auth/unauthorized-domain' || 
                           error?.message?.includes('unauthorized-domain');
      if (isDomainError) {
        setDomainError({
          show: true,
          domain: typeof window !== 'undefined' ? window.location.hostname : 'ais-dev-cxra4jpdiazkigux5gxcbj-801374469814.us-east1.run.app',
          projectId: 'gen-lang-client-0673094537'
        });
        setErrorMsg("Este dominio de vista previa no está autorizado en tu proyecto de Firebase.");
      } else {
        setErrorMsg(`No se pudo completar la autenticación con ${providerType}.`);
      }
    }
  };

  const handleGoogleLogin = () => handleSocialLogin('google');
  const handleFacebookLogin = () => handleSocialLogin('facebook');
  const handleTikTokLogin = () => handleSocialLogin('tiktok');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !auth) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      setIsRedirecting(true);
      toast({
        title: "Iniciando sesión",
        description: "Redireccionando a tu panel de control seguro...",
      });
    } catch (error: any) {
      setLoading(false);
      setErrorMsg("Credenciales incorrectas. Verifique sus datos.");
      toast({
        title: "Acceso denegado",
        description: "Credenciales de seguridad incorrectas.",
        variant: "destructive"
      });
    }
  };

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0a0a0f]">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">Cargando panel de control seguro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060913] text-white flex flex-col justify-center items-center px-4 sm:px-6 relative py-12">
      {/* Back button to homepage */}
      <div className="absolute top-6 left-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/5">
            <ChevronLeft className="h-4 w-4 text-blue-400" /> Volver a Inicio
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-[460px]">
        <Card className="w-full border border-blue-950/60 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-3xl overflow-hidden bg-[#0A0F1E] p-1">
          <div className="bg-[#0A0F1E] rounded-3xl p-6 sm:p-10">
            
            <div className="text-center mb-8">
              <div className="flex justify-center mb-5">
                <SyncConnectLogo size="lg" variant="dark" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-headline font-black text-white uppercase italic tracking-tight leading-none mb-2">
                Iniciar <span className="text-blue-500">Sesión</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">Ingresa a tu cuenta de Sync Connect</p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-950/30 border border-red-800/50 rounded-2xl flex gap-3">
                <Triangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black text-red-200 uppercase">Error de Acceso</h4>
                  <p className="text-xs text-red-300 font-medium">{errorMsg}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-300 ml-1">Dirección de Correo</Label>
                <div className="relative">
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    className="h-12 rounded-xl bg-[#0D1527] border border-blue-900/40 font-medium px-4 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                    placeholder="tu-correo@ejemplo.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-xs font-bold uppercase text-slate-300">Contraseña</Label>
                  <Link href="/auth/forgot-password" className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline">¿Olvidaste tu clave?</Link>
                </div>
                <div className="relative flex items-center">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    className="h-12 rounded-xl bg-[#0D1527] border border-blue-900/40 font-medium px-4 pr-12 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors focus:outline-none"
                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5 text-blue-400" /> : <Eye className="h-5 w-5 text-slate-400" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit"
                className="w-full h-13 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-colors cursor-pointer" 
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "ENTRAR AHORA"}
              </Button>
            </form>

            <div className="relative py-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <span className="relative flex justify-center text-[10px] text-slate-500 bg-[#0A0F1E] px-4 font-bold uppercase tracking-wider">
                O continúa con
              </span>
            </div>

            <div className="space-y-2.5">
              <Button 
                onClick={handleGoogleLogin}
                variant="outline"
                className="w-full h-12 border-slate-800 bg-[#0D1527] hover:bg-slate-800 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm flex items-center justify-center gap-3 transition-colors text-white cursor-pointer"
                disabled={loading}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.16H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.84l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.16l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
                </svg>
                GOOGLE
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handleFacebookLogin}
                  variant="outline"
                  className="w-full h-11 border-blue-900/30 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-blue-400 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  disabled={loading}
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  FACEBOOK
                </Button>

                <Button 
                  onClick={handleTikTokLogin}
                  variant="outline"
                  className="w-full h-11 border-slate-800 bg-[#0D1527] hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  disabled={loading}
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.98-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.57-1.31 1.56-1.3 2.56.01.94.5 1.86 1.28 2.37.89.58 2.05.67 3.01.25.95-.41 1.63-1.31 1.81-2.31.12-.82.08-1.66.08-2.49V.02z"/>
                  </svg>
                  TIKTOK
                </Button>
              </div>
            </div>

            {domainError && (
              <div className="mt-6 p-4 bg-amber-950/30 border border-amber-800/50 rounded-2xl space-y-3 text-slate-200">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Configuración de Firebase Requerida</span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Firebase requiere que autorices el dominio de esta vista previa para permitir el inicio de sesión con Google.
                </p>
                <div className="text-[11px] bg-[#0D1527] p-3 rounded-xl font-mono break-all text-slate-300 flex items-center justify-between gap-2 border border-slate-800">
                  <span className="select-all">{domainError.domain}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 hover:bg-slate-800 shrink-0 text-slate-400 hover:text-white"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(domainError.domain);
                        toast({ title: "Dominio copiado" });
                      }
                    }}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </Button>
                </div>
              </div>
            )}
            
          </div>
        </Card>

        <div className="mt-6 text-center space-y-2 p-4 bg-blue-950/20 border border-blue-900/30 rounded-2xl max-w-sm mx-auto">
          <p className="text-blue-400 font-bold text-xs uppercase tracking-wider">
            ✨ Registro 100% Gratuito y Abierto
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
            ¿Aún no eres miembro? Crea tu cuenta de afiliado gratis hoy mismo.
          </p>
          <Button asChild variant="outline" className="w-full h-9 border-blue-900/40 text-blue-400 hover:bg-blue-900/20 font-bold text-xs uppercase tracking-wider rounded-xl">
            <Link href="/auth/register">
              Registrarme 100% Gratis
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RootLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0a0a0f]">
        <div className="h-12 w-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}

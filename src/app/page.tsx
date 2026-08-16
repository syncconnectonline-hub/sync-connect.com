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
  Lock
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth, useFirestore, useUser } from '@/firebase'
import { 
  setPersistence, 
  browserLocalPersistence, 
  signInWithEmailAndPassword
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { SyncConnectLogo } from '@/components/SyncConnectLogo'
import { loginWithGoogle, loginWithFacebook, loginWithTikTok } from '@/lib/social-auth'

const ADMIN_EMAIL = 'affiliatesync0@gmail.com';

function DirectLoginPageContent() {
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

  useEffect(() => {
    if (user && !isUserLoading) {
      setIsRedirecting(true);
      checkUserRole(user.uid, user.email);
    }
  }, [user, isUserLoading]);

  const checkUserRole = async (uid: string, userEmail: string | null) => {
    const cleanEmail = userEmail?.toLowerCase().trim() || '';

    let isUserAdmin = false;

    if (cleanEmail === ADMIN_EMAIL || cleanEmail === 'syncconnect.online@gmail.com' || cleanEmail === 'urielroques604@gmail.com' || cleanEmail === 'roquescarlos143@gmail.com') {
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
      
      const errorText = "Error al conectar con la base de datos de usuarios.";
      toast({
        title: "Error de inicio de sesión",
        description: errorText,
        variant: "destructive"
      });
      setErrorMsg(errorText);
    }
  };

  const handleSocialLogin = async (providerType: 'google' | 'facebook' | 'tiktok') => {
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
                            error?.message?.includes('cancelled-popup-request');
                             
      if (isPopupClosed) {
        toast({
          title: "Inicio de sesión cancelado",
          description: "Se canceló la solicitud de autenticación.",
        });
        return;
      }

      setErrorMsg(`No se pudo completar la autenticación con ${providerType}.`);
    }
  };

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
        description: "Redireccionando a tu panel de control...",
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b132b] text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">Cargando panel de control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b132b] text-slate-100 flex flex-col justify-between items-center px-4 py-8 font-sans">
      
      {/* Header Logo */}
      <header className="w-full max-w-md flex justify-center py-4">
        <SyncConnectLogo size="lg" variant="dark" />
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md my-auto">
        <Card className="border-white/10 shadow-2xl rounded-3xl overflow-hidden bg-[#111827] text-white p-6 md:p-8">
          
          <div className="text-center mb-6 space-y-1">
            <h1 className="text-2xl font-black uppercase italic tracking-tight text-white">
              Iniciar Sesión
            </h1>
            <p className="text-xs text-slate-400">
              Ingresa tus credenciales para acceder a SyncConnect
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-950/40 border border-red-500/40 rounded-xl flex gap-2.5 items-start">
              <Triangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 font-medium">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-0.5">Correo Electrónico</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required 
                className="h-12 rounded-xl bg-slate-900 border-white/10 font-medium px-4 text-white placeholder:text-slate-500 focus-visible:ring-[#FF5500]" 
                placeholder="tu.correo@ejemplo.com"
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-0.5">
                <Label className="text-[10px] font-black uppercase text-slate-400">Contraseña</Label>
                <Link href="/auth/forgot-password" className="text-[10px] font-bold text-[#FF5500] hover:underline uppercase">¿Olvidaste tu clave?</Link>
              </div>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="h-12 rounded-xl bg-slate-900 border-white/10 font-medium px-4 text-white placeholder:text-slate-500 focus-visible:ring-[#FF5500]"
                placeholder="••••••••"
              />
            </div>

            <Button 
              type="submit"
              className="w-full h-12 rounded-xl bg-[#FF5500] hover:bg-[#E63900] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[#FF5500]/25 transition-all cursor-pointer mt-2" 
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "INICIAR SESIÓN"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative py-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <span className="relative flex justify-center text-[9px] text-slate-400 bg-[#111827] px-3 font-black uppercase tracking-widest">
              O accede con
            </span>
          </div>

          {/* Social Logins */}
          <div className="space-y-2">
            <Button 
              onClick={() => handleSocialLogin('google')}
              variant="outline"
              className="w-full h-11 border-white/10 bg-slate-900 hover:bg-slate-800 text-slate-200 text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm flex items-center justify-center gap-2.5 cursor-pointer"
              disabled={loading}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.16H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.84l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.16l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </Button>
          </div>

          {/* Free Registration Callout */}
          <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-black text-xs uppercase tracking-wider">
              ✨ ¡Versión 100% Gratuita para Todo el Mundo!
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              ¿Aún no tienes cuenta? Regístrate hoy mismo sin costo y accede a todas las herramientas de socio.
            </p>
            <Button
              asChild
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20"
            >
              <Link href="/auth/register">
                CREAR CUENTA 100% GRATIS
              </Link>
            </Button>
          </div>

        </Card>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full max-w-md text-center py-4 text-slate-500 text-[11px]">
        © 2026 SyncConnect Inc. Todos los derechos reservados.
      </footer>

    </div>
  )
}

export default function RootHomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b132b]">
        <div className="h-10 w-10 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DirectLoginPageContent />
    </Suspense>
  )
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Target,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, role } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoadingRole, setDemoLoadingRole] = useState<'student' | 'coach' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase veritabanı bağlantısı yapılandırılmamış: VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ortam değişkenleri (.env) bulunamadı.');
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage('Lütfen e-posta adresinizi ve şifrenizi girin.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          setErrorMessage('Supabase sunucusuna bağlanılamadı (Ağ hatası / Failed to fetch). Lütfen ağ bağlantınızı ve VITE_SUPABASE_URL adresini kontrol edin.');
        } else if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('E-posta adresi veya şifre hatalı.');
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMessage('E-posta adresiniz henüz doğrulanmamış.');
        } else {
          setErrorMessage(error.message);
        }
      } else {
        // Fetch current user profile role for instant accurate redirection
        const { data: { user } } = await supabase.auth.getUser();
        let targetRole = role || 'student';
        if (user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          if (prof?.role) targetRole = prof.role;
        }
        navigate(`/${targetRole}/dashboard`, { replace: true });
      }
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
        setErrorMessage('Supabase sunucusuna bağlanılamadı (Ağ hatası / Failed to fetch). Lütfen ağ bağlantınızı ve VITE_SUPABASE_URL adresini kontrol edin.');
      } else {
        setErrorMessage(err.message || 'Giriş yapılırken beklenmedik bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Login Handler (Uses standard Supabase Auth signIn)
  const handleQuickDemoLogin = async (demoEmail: string, targetRole: 'student' | 'coach') => {
    setErrorMessage(null);

    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase veritabanı bağlantısı yapılandırılmamış: VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ortam değişkenleri (.env) bulunamadı.');
      return;
    }

    setDemoLoadingRole(targetRole);

    try {
      const { error } = await signIn(demoEmail, 'mahfaza123');
      if (error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          setErrorMessage('Supabase sunucusuna bağlanılamadı (Ağ hatası / Failed to fetch). Lütfen ağ bağlantınızı ve VITE_SUPABASE_URL adresini kontrol edin.');
        } else if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('Demo hesabı kimlik bilgileri geçersiz.');
        } else {
          setErrorMessage(error.message || 'Demo hesabına giriş yapılamadı.');
        }
      } else {
        navigate(`/${targetRole}/dashboard`, { replace: true });
      }
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
        setErrorMessage('Supabase sunucusuna bağlanılamadı (Ağ hatası / Failed to fetch). Lütfen ağ bağlantınızı ve VITE_SUPABASE_URL adresini kontrol edin.');
      } else {
        setErrorMessage(err.message || 'Demo girişi sırasında bir hata oluştu.');
      }
    } finally {
      setDemoLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Subtle Background Radial */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-6 sm:mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-3 shadow-sm">
          <span className="font-serif font-bold text-amber-400 text-xl tracking-widest">M</span>
        </div>
        <h1 className="font-serif text-2xl font-bold tracking-wider text-zinc-100 uppercase">
          MAHFAZA<span className="text-amber-400 font-mono text-lg">.CO</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1 font-medium">
          Planını Kur. Disiplinini Koru. Hedefine Ulaş.
        </p>
        <span className="inline-block text-[11px] text-amber-400/80 tracking-wide mt-0.5">
          Akademik İşletim Sistemi
        </span>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 sm:p-8 shadow-xl relative z-10 backdrop-blur-md">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-zinc-100">Giriş Yap</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Hesabınıza erişmek için kurumsal veya bireysel bilgilerinizi girin.
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 p-3 rounded-lg bg-amber-950/40 border border-amber-900/60 text-amber-300 text-xs flex flex-col gap-1.5">
            <div className="flex items-center gap-2 font-semibold text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Supabase Bağlantısı Yapılandırılmadı</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Kimlik doğrulama ve veritabanı bağlantısı için <code className="text-amber-300 font-mono">.env</code> dosyasında <code className="text-amber-300 font-mono">VITE_SUPABASE_URL</code> ve <code className="text-amber-300 font-mono">VITE_SUPABASE_ANON_KEY</code> tanımlanmalıdır.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Standard Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Input
            label="E-Posta Adresi"
            type="email"
            required
            placeholder="ornek@mahfaza.co"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-300">Şifre</label>
              <Link
                to="/auth/forgot-password"
                className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
              >
                Şifremi Unuttum
              </Link>
            </div>
            <Input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-1"
            isLoading={loading}
          >
            Sisteme Giriş Yap
          </Button>
        </form>

        {/* Quick Demo Login Section */}
        <div className="mt-6 pt-5 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Hızlı Demo Girişi
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Sunum & Test</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Demo Student */}
            <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800 hover:border-amber-500/40 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                    Demo Öğrenci
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Öğrenci
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono truncate mb-2.5">
                  demo.ogrenci@mahfaza.co
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                isLoading={demoLoadingRole === 'student'}
                disabled={loading || !!demoLoadingRole}
                onClick={() => handleQuickDemoLogin('demo.ogrenci@mahfaza.co', 'student')}
              >
                Hızlı Giriş
              </Button>
            </div>

            {/* Demo Coach */}
            <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800 hover:border-purple-500/40 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-purple-400" />
                    Demo Akademik Koç
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Koç
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono truncate mb-2.5">
                  demo.koc@mahfaza.co
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                isLoading={demoLoadingRole === 'coach'}
                disabled={loading || !!demoLoadingRole}
                onClick={() => handleQuickDemoLogin('demo.koc@mahfaza.co', 'coach')}
              >
                Hızlı Giriş
              </Button>
            </div>
          </div>
        </div>

        {/* Register Link */}
        <div className="mt-5 pt-4 border-t border-zinc-800/80 text-center">
          <p className="text-xs text-zinc-400">
            Hesabınız yok mu?{' '}
            <Link
              to="/auth/register"
              className="text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1"
            >
              Kayıt Olun <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>

        {/* Security Notice */}
        <div className="mt-4 pt-3 border-t border-zinc-800/60 text-center">
          <div className="flex items-center justify-center gap-1.5 text-zinc-500 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supabase Auth & PostgreSQL RLS Korumalı</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { UserRole } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MahfazaLogo } from '../../utils/logoConstants';
import {
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Building2,
  GraduationCap,
  Target,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, loginLocally, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isServiceUnavailable, setIsServiceUnavailable] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Quick Demo Role Preview (Explicit, isolated demo bypass for interface exploration)
  const handleQuickRoleLogin = (demoEmail: string, quickRole: UserRole) => {
    setErrorMessage(null);
    setIsServiceUnavailable(false);
    setLoading(true);
    try {
      const res = loginLocally(demoEmail, quickRole);
      const dest =
        res.targetRole === 'admin'
          ? '/admin/dashboard'
          : `/${res.targetRole === 'head_coach' ? 'coach' : res.targetRole}/dashboard`;
      navigate(dest, { replace: true });
    } catch {
      // Direct navigation fallback
      navigate(quickRole === 'admin' ? '/admin/dashboard' : `/${quickRole}/dashboard`, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setIsServiceUnavailable(false);
      setErrorMessage('Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setIsServiceUnavailable(false);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const { error, isAdmin, targetRole } = await signIn(cleanEmail, password);

      if (error) {
        const msg = (error.message || '').toLowerCase();
        const errName = error.name || '';
        const status = (error as any).status || (error as any).statusCode;

        const isNetworkOrServiceError =
          msg.includes('failed to fetch') ||
          msg.includes('authretryablefetcherror') ||
          msg.includes('network') ||
          msg.includes('load failed') ||
          msg.includes('timeout') ||
          errName.includes('AuthRetryableFetchError') ||
          errName === 'TypeError' ||
          status === 502 ||
          status === 503 ||
          status === 504;

        if (isNetworkOrServiceError) {
          setIsServiceUnavailable(true);
          setErrorMessage(
            'Kimlik doğrulama sunucusuna şu anda ulaşılamıyor. Bir süre sonra tekrar deneyin. Girdiğiniz bilgiler ve hesabınız korunur.'
          );
        } else if (msg.includes('invalid login credentials')) {
          setIsServiceUnavailable(false);
          setErrorMessage('Giriş bilgileri hatalı. Lütfen e-posta adresinizi ve şifrenizi kontrol ediniz.');
        } else if (msg.includes('email not confirmed')) {
          setIsServiceUnavailable(false);
          setErrorMessage('E-posta adresiniz henüz doğrulanmamış. Lütfen e-posta gelen kutunuzu kontrol ediniz.');
        } else {
          setIsServiceUnavailable(false);
          setErrorMessage(error.message);
        }
        return;
      }

      // Successful authentic login
      const from = (location.state as any)?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
        return;
      }

      const dest =
        targetRole === 'admin' || isAdmin
          ? '/admin/dashboard'
          : `/${targetRole === 'head_coach' ? 'coach' : targetRole || 'student'}/dashboard`;
      navigate(dest, { replace: true });
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      const errName = err?.name || '';
      const status = err?.status || err?.statusCode;

      const isNetworkOrServiceError =
        msg.includes('failed to fetch') ||
        msg.includes('authretryablefetcherror') ||
        msg.includes('network') ||
        msg.includes('load failed') ||
        msg.includes('timeout') ||
        errName.includes('AuthRetryableFetchError') ||
        errName === 'TypeError' ||
        status === 502 ||
        status === 503 ||
        status === 504;

      if (isNetworkOrServiceError) {
        setIsServiceUnavailable(true);
        setErrorMessage(
          'Kimlik doğrulama sunucusuna şu anda ulaşılamıyor. Bir süre sonra tekrar deneyin. Girdiğiniz bilgiler ve hesabınız korunur.'
        );
      } else {
        setIsServiceUnavailable(false);
        setErrorMessage(
          err?.message || 'Giriş işlemi sırasında bir hata oluştu. Lütfen tekrar deneyiniz.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Subtle Background Radial */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-6 sm:mb-8 relative z-10 flex flex-col items-center">
        <MahfazaLogo size="lg" className="mb-3" />
        <h1 className="font-serif text-2xl font-bold tracking-wider text-slate-900 uppercase">
          MAHFAZA<span className="text-amber-600 font-mono text-lg">.CO</span>
        </h1>
        <p className="text-xs text-slate-600 mt-1 font-medium">
          Planını Kur. Disiplinini Koru. Hedefine Ulaş.
        </p>
        <span className="inline-block text-[11px] text-amber-800 font-semibold tracking-wide mt-0.5">
          Akademik & Kurumsal İşletim Sistemi (Mahfaza.co)
        </span>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xl relative z-10">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Giriş Yap</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hesabınıza erişmek için kurumsal veya bireysel bilgilerinizi girin.
          </p>
        </div>

        {/* Warning if Supabase config is missing */}
        {!isConfigured && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              Supabase yapılandırması eksik (VITE_SUPABASE_URL veya VITE_SUPABASE_ANON_KEY tanımlanmamış).
            </span>
          </div>
        )}

        {/* Quick Demo Role Preview Bar */}
        <div className="mb-5 p-3 rounded-xl bg-slate-50/90 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Hızlı Önizleme (Demo Rolü — Veritabanı Bağımsız)
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {/* Quick Mudur */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickRoleLogin('mudurdemo@mahfaza.com', 'admin')}
              className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-white hover:shadow-xs border border-transparent hover:border-amber-300 transition-all cursor-pointer group"
              title="Kurum Müdürü paneline anında giriş yap"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:ring-2 group-hover:ring-amber-400/50 transition-all">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 group-hover:text-amber-700">Müdür</span>
              <span className="text-[9px] text-amber-700 bg-amber-100 font-semibold px-1 rounded-full">Admin</span>
            </button>

            {/* Quick Coach */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickRoleLogin('demo.koc@mahfaza.co', 'coach')}
              className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-white hover:shadow-xs border border-transparent hover:border-indigo-300 transition-all cursor-pointer group"
              title="Koçluk paneline anında giriş yap"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:ring-2 group-hover:ring-indigo-400/50 transition-all">
                <Target className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 group-hover:text-indigo-700">Koç</span>
              <span className="text-[9px] text-indigo-700 bg-indigo-100 font-semibold px-1 rounded-full">Rehber</span>
            </button>

            {/* Quick Student */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickRoleLogin('demo.ogrenci@mahfaza.co', 'student')}
              className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-white hover:shadow-xs border border-transparent hover:border-emerald-300 transition-all cursor-pointer group"
              title="Öğrenci paneline anında giriş yap"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:ring-2 group-hover:ring-emerald-400/50 transition-all">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-700">Öğrenci</span>
              <span className="text-[9px] text-emerald-700 bg-emerald-100 font-semibold px-1 rounded-full">YKS</span>
            </button>

            {/* Quick Teacher */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickRoleLogin('demo.ogretmen@mahfaza.co', 'teacher')}
              className="flex flex-col items-center gap-1 p-1.5 rounded-xl hover:bg-white hover:shadow-xs border border-transparent hover:border-sky-300 transition-all cursor-pointer group"
              title="Öğretmen paneline anında giriş yap"
            >
              <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:ring-2 group-hover:ring-sky-400/50 transition-all">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 group-hover:text-sky-700">Öğretmen</span>
              <span className="text-[9px] text-sky-700 bg-sky-100 font-semibold px-1 rounded-full">Branş</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          isServiceUnavailable ? (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col gap-1.5 shadow-xs"
            >
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span className="text-[13px]">Hizmet Durumu</span>
              </div>
              <p className="text-amber-800 leading-relaxed pl-6 font-medium">
                {errorMessage}
              </p>
            </div>
          ) : (
            <div
              role="alert"
              aria-live="polite"
              className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )
        )}

        {/* Standard Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-Posta Adresi"
            type="email"
            required
            placeholder="ornek@mahfaza.co"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) setErrorMessage(null);
              if (isServiceUnavailable) setIsServiceUnavailable(false);
            }}
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Şifre</label>
              <Link
                to="/auth/forgot-password"
                className="text-[11px] text-amber-700 hover:text-amber-800 font-medium transition-colors"
              >
                Şifremi unuttum
              </Link>
            </div>
            <Input
              ref={passwordInputRef}
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
                if (isServiceUnavailable) setIsServiceUnavailable(false);
              }}
              leftIcon={<Lock className="w-4 h-4" />}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white font-bold"
            isLoading={loading}
          >
            Giriş Yap
          </Button>
        </form>

        {/* Register Link */}
        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600">
            Hesabınız yok mu?{' '}
            <Link
              to="/auth/register"
              className="text-amber-700 hover:text-amber-800 font-bold inline-flex items-center gap-1"
            >
              Kayıt Olun <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>

        {/* Security Notice */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mahfaza.co Kesintisiz ve Güvenli Giriş</span>
          </div>
        </div>
      </div>
    </div>
  );
};

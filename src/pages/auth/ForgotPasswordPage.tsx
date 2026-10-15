import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { MahfazaLogo } from '../../utils/logoConstants';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const { error } = await resetPasswordForEmail(email);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Şifre sıfırlama bağlantısı gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8 relative z-10 flex flex-col items-center">
        <Link to="/auth/login" className="inline-flex items-center justify-center mb-4">
          <MahfazaLogo size="lg" />
        </Link>
        <h1 className="font-serif text-2xl font-bold tracking-wider text-zinc-100 uppercase">
          MAHFAZA<span className="text-amber-400 font-mono text-lg">.CO</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1.5 font-medium">
          Planını Kur. Disiplinini Koru. Hedefine Ulaş.
        </p>
      </div>

      <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800 rounded-lg p-6 sm:p-8 shadow-xl relative z-10 backdrop-blur-xs">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-zinc-100">Şifremi Unuttum</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Hesabınıza kayıtlı e-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3 rounded bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Sıfırlama Bağlantısı Gönderildi</h3>
              <p className="text-xs text-zinc-400 mt-1">
                <span className="font-mono text-amber-400">{email}</span> adresine sıfırlama yönergeleri iletildi. Lütfen gelen kutunuzu kontrol edin.
              </p>
            </div>
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium pt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Giriş Sayfasına Dön
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-Posta Adresi"
              type="email"
              required
              placeholder="ornek@mahfaza.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={loading}
            >
              Sıfırlama Bağlantısı Gönder
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Giriş Sayfasına Dön
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('Yeni şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Girdiğiniz yeni şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await updatePassword(password);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/auth/login', { replace: true });
        }, 2000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Şifre güncellenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-4 shadow-sm">
          <span className="font-serif font-bold text-amber-400 text-xl tracking-widest">M</span>
        </div>
        <h1 className="font-serif text-2xl font-bold tracking-wider text-zinc-100 uppercase">
          MAHFAZA<span className="text-amber-400 font-mono text-lg">.CO</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1.5 font-medium">
          Yeni Şifre Belirleme
        </p>
      </div>

      <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800 rounded-lg p-6 sm:p-8 shadow-xl relative z-10 backdrop-blur-xs">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-zinc-100">Yeni Şifrenizi Girin</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Güvenliğiniz için en az 6 karakterden oluşan güçlü bir şifre seçin.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3 rounded bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-100">Şifreniz Başarıyla Güncellendi</h3>
            <p className="text-xs text-zinc-400">
              Giriş sayfasına yönlendiriliyorsunuz...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Yeni Şifre"
              type="password"
              required
              placeholder="En az 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Input
              label="Yeni Şifre Tekrarı"
              type="password"
              required
              placeholder="Yeni şifrenizi tekrar girin"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={loading}
            >
              Şifreyi Güncelle ve Giriş Yap
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

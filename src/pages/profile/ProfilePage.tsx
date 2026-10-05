import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { profileService } from '../../services/profileService';
import { subscriptionService } from '../../services/subscriptionService';
import { Profile, UserSubscription } from '../../types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  User,
  Camera,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  GraduationCap,
  Save,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { user, profile: authProfile, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(authProfile);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [gradeLevel, setGradeLevel] = useState<number | undefined>(undefined);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // UI feedback states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadProfileData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [prof, sub] = await Promise.all([
        profileService.getProfile(user.id),
        subscriptionService.getUserSubscription(user.id),
      ]);

      if (prof) {
        setProfile(prof);
        setFirstName(prof.first_name || '');
        setLastName(prof.last_name || '');
        setUsername(prof.username || '');
        setBio(prof.bio || '');
        setSchoolName(prof.school_name || '');
        setGradeLevel(prof.grade_level || undefined);
        setAvatarUrl(prof.avatar_url || null);
      }
      setSubscription(sub);
    } catch (err) {
      console.error('Error loading profile data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Lütfen geçerli bir görsel formatı (PNG, JPG, WebP) yükleyin.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Profil fotoğrafı en fazla 5MB boyutunda olabilir.' });
      return;
    }

    setUploadingAvatar(true);
    setFeedback(null);

    try {
      const publicUrl = await profileService.uploadAvatar(user.id, file);
      setAvatarUrl(publicUrl);
      setFeedback({ type: 'success', message: 'Profil fotoğrafı yüklendi. Değişiklikleri kaydedin.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Fotoğraf yüklenemedi.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!firstName.trim() || !lastName.trim()) {
      setFeedback({ type: 'error', message: 'Ad ve soyad alanları zorunludur.' });
      return;
    }

    setSavingProfile(true);
    setFeedback(null);

    try {
      const updated = await profileService.updateProfile(user.id, {
        first_name: firstName,
        last_name: lastName,
        username: username.trim() || null,
        bio: bio.trim() || null,
        school_name: schoolName.trim() || null,
        grade_level: gradeLevel,
        avatar_url: avatarUrl,
      });

      setProfile(updated);
      await refreshProfile();
      setFeedback({ type: 'success', message: 'Profil bilgileriniz başarıyla güncellendi.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Profil güncellenirken bir hata oluştu.' });
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return <LoadingState message="Profil bilgileri yükleniyor..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
            Hesap & Kimlik Masası
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Kullanıcı Profili
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Kişisel bilgilerinizi, akademik durumunuzu ve hesap ayarlarınızı yönetin.
          </p>
        </div>

        {/* Subscription Plan Badge */}
        <Link
          to="/pricing"
          className="inline-flex items-center gap-2 p-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 transition-colors"
        >
          <CreditCard className="w-4 h-4 text-amber-400" />
          <div className="text-left">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Aktif Paket</div>
            <div className="text-xs font-bold text-zinc-200">
              {subscription?.plan?.name || 'Başlangıç (Ücretsiz)'}
            </div>
          </div>
          <span className="text-[10px] text-amber-400 underline ml-1">Yönet</span>
        </Link>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg text-xs flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Profile Form Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Avatar Upload Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-zinc-800">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-2xl overflow-hidden shadow-lg">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  firstName.charAt(0) || 'M'
                )}
              </div>

              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white cursor-pointer transition-opacity"
              >
                <Camera className="w-5 h-5 mb-0.5 text-amber-400" />
                <span>Değiştir</span>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
                disabled={uploadingAvatar}
              />
            </div>

            <div className="text-center sm:text-left space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base font-bold text-zinc-100">
                  {firstName} {lastName}
                </h3>
                <Badge variant="warning">{profile?.role || 'Öğrenci'}</Badge>
              </div>
              <p className="text-xs text-zinc-400">{user?.email}</p>
              <p className="text-[11px] text-zinc-500">
                {uploadingAvatar
                  ? 'Fotoğraf yükleniyor...'
                  : 'PNG, JPG veya WebP &bull; En fazla 5 MB'}
              </p>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Ad"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Adınız"
            />

            <Input
              label="Soyad"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Soyadınız"
            />

            <Input
              label="Kullanıcı Adı"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ahmet_yilmaz"
              helperText="Özel profil bağlantınız için benzersiz kullanıcı adı."
            />

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Akademik Rol (Değiştirilemez)
              </label>
              <div className="flex items-center gap-2 p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-md text-xs text-zinc-400 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="capitalize">{profile?.role}</span>
                <span className="text-[10px] text-zinc-600 ml-auto">Veritabanı Korumalı</span>
              </div>
            </div>

            <Input
              label="Okul / Kurum Adı"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Örn: Kadıköy Anadolu Lisesi"
            />

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Sınıf Düzeyi</label>
              <select
                value={gradeLevel || ''}
                onChange={(e) => setGradeLevel(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500"
              >
                <option value="">Seçiniz</option>
                {[5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    {g}. Sınıf
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Hakkımda / Akademik Hedefler
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Hedeflediğim üniversite, bölüm veya çalışma felsefem..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-4 border-t border-zinc-800">
            <Button
              type="submit"
              variant="primary"
              size="md"
              leftIcon={<Save className="w-4 h-4" />}
              isLoading={savingProfile}
            >
              Değişiklikleri Kaydet
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

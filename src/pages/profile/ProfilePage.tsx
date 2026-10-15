import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { profileService } from '../../services/profileService';
import { subscriptionService } from '../../services/subscriptionService';
import { Profile, UserSubscription } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingState } from '../../components/ui/EmptyState';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Save,
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
  const [avatarLoadError, setAvatarLoadError] = useState(false);

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

      const meta = user.user_metadata || {};
      const resolvedProfile = prof || authProfile;

      if (resolvedProfile) {
        setProfile(resolvedProfile);
        setFirstName(resolvedProfile.first_name || meta.first_name || '');
        setLastName(resolvedProfile.last_name || meta.last_name || '');
        setUsername(resolvedProfile.username || meta.username || '');
        setBio(resolvedProfile.bio || meta.bio || '');
        setSchoolName(resolvedProfile.school_name || meta.school_name || '');
        setGradeLevel(resolvedProfile.grade_level ?? meta.grade_level ?? undefined);
        setAvatarUrl(resolvedProfile.avatar_url || meta.avatar_url || null);
        setAvatarLoadError(false);
      }
      setSubscription(sub);
    } catch (err) {
      console.error('Error loading profile data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, authProfile]);

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
      setAvatarLoadError(false);

      // Immediately persist new avatar_url to profiles table and auth state
      await profileService.updateProfile(user.id, {
        first_name: firstName || profile?.first_name || 'Kullanıcı',
        last_name: lastName || profile?.last_name || '',
        avatar_url: publicUrl,
      });
      await refreshProfile();

      setFeedback({ type: 'success', message: 'Profil fotoğrafınız başarıyla yüklendi ve kaydedildi.' });
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
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim() || null,
        bio: bio.trim() || null,
        school_name: schoolName.trim() || null,
        grade_level: gradeLevel ?? null,
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

  const initials =
    `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() ||
    'M';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 bg-slate-50 text-gray-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <span className="text-xs font-mono text-amber-600 font-bold uppercase tracking-wider">
            Hesap & Kimlik Masası
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
            Kullanıcı Profili
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Kişisel bilgilerinizi, akademik durumunuzu ve hesap ayarlarınızı yönetin.
          </p>
        </div>

        {/* Subscription Plan Badge */}
        <Link
          to="/pricing"
          className="inline-flex items-center gap-2.5 p-2.5 px-3.5 rounded-xl bg-white border border-gray-200 hover:border-amber-400 shadow-2xs transition-colors"
        >
          <CreditCard className="w-4 h-4 text-amber-600" />
          <div className="text-left">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
              Aktif Paket
            </div>
            <div className="text-xs font-bold text-gray-900">
              {subscription?.plan?.name || 'Başlangıç (Ücretsiz)'}
            </div>
          </div>
          <span className="text-[11px] font-semibold text-amber-700 underline ml-1">Yönet</span>
        </Link>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2 border shadow-2xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Profile Form Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Avatar Upload Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-200">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-full bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-amber-800 font-bold text-2xl overflow-hidden shadow-xs">
                {avatarUrl && !avatarLoadError ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    onError={() => setAvatarLoadError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 rounded-full bg-gray-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[11px] font-semibold text-white cursor-pointer transition-opacity"
              >
                <Camera className="w-5 h-5 mb-0.5 text-amber-400" />
                <span>Fotoğraf Seç</span>
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

            <div className="text-center sm:text-left space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h3 className="text-base font-bold text-gray-900">
                  {firstName} {lastName}
                </h3>
                <Badge variant="warning">{profile?.role || 'Öğrenci'}</Badge>
              </div>
              <p className="text-xs text-gray-600 font-mono">{user?.email}</p>
              <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
                <label
                  htmlFor="avatar-upload"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-gray-200 text-xs font-semibold text-gray-700 cursor-pointer transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-600" />
                  <span>{uploadingAvatar ? 'Yükleniyor...' : 'Fotoğrafı Değiştir'}</span>
                </label>
                <span className="text-[11px] text-gray-500">
                  PNG, JPG veya WebP • En fazla 5 MB
                </span>
              </div>
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
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Akademik Rol (Değiştirilemez)
              </label>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="capitalize font-semibold">{profile?.role}</span>
                <span className="text-[10px] text-gray-500 ml-auto">Veritabanı Korumalı</span>
              </div>
            </div>

            <Input
              label="Okul / Kurum Adı"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Örn: Kadıköy Anadolu Lisesi"
            />

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Sınıf Düzeyi
              </label>
              <select
                value={gradeLevel || ''}
                onChange={(e) => setGradeLevel(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-sm text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
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
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Hakkımda / Akademik Hedefler
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Hedeflediğim üniversite, bölüm veya çalışma felsefem..."
              className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
            />
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
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

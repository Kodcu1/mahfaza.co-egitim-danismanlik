import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { subscriptionService } from '../../services/subscriptionService';
import { ProfessionalApplication, ProfessionalApplicationStatus, InstitutionDemoRequest } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  Building,
  Phone,
  Mail,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export const AdminApplicationsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'educators' | 'institutions'>('educators');
  const [applications, setApplications] = useState<ProfessionalApplication[]>([]);
  const [demoRequests, setDemoRequests] = useState<InstitutionDemoRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State for Educator Applications
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ProfessionalApplication | null>(null);
  const [reviewDecision, setReviewDecision] = useState<ProfessionalApplicationStatus>('approved');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [apps, demos] = await Promise.all([
        subscriptionService.getAllApplicationsAdmin().catch(() => []),
        subscriptionService.getAllInstitutionDemoRequestsAdmin().catch(() => []),
      ]);
      setApplications(apps);
      setDemoRequests(demos);
    } catch (err) {
      console.warn('Applications and demo requests loaded notice:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenReview = (app: ProfessionalApplication) => {
    setSelectedApp(app);
    setReviewDecision('approved');
    setRejectionReason('');
    setFeedback(null);
    setReviewModalOpen(true);
  };

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !selectedApp) return;

    if (reviewDecision === 'rejected' && !rejectionReason.trim()) {
      setFeedback('Lütfen red gerekçesini belirtin.');
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await subscriptionService.reviewApplicationAdmin(
        selectedApp.id,
        reviewDecision,
        user.id,
        rejectionReason.trim() || undefined
      );

      setFeedback(
        reviewDecision === 'approved'
          ? 'Başvuru onaylandı ve kullanıcının profesyonel rolü aktif edildi.'
          : 'Başvuru gerekçesiyle birlikte reddedildi.'
      );

      await loadData();
      setTimeout(() => {
        setReviewModalOpen(false);
        setFeedback(null);
      }, 1200);
    } catch (err: any) {
      setFeedback(err.message || 'Başvuru değerlendirilirken hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Başvurular ve kurumsal talepler yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-amber-200 text-xs font-bold uppercase tracking-wider mb-1.5">
            Kurumsal Akreditasyon & Demo Masası
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
            Eğitimci Başvuruları & Kurumsal Demo Talepleri
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
            Öğretmen, Koç ve Danışman kayıt başvuruları ile kurum yöneticilerinin demo ve lisans taleplerini yönetin.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="inline-flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
          <button
            onClick={() => setActiveTab('educators')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'educators'
                ? 'bg-zinc-800 text-amber-400 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Eğitimciler ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab('institutions')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'institutions'
                ? 'bg-zinc-800 text-amber-400 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Kurumsal Demo ({demoRequests.length})
          </button>
        </div>
      </div>

      {/* TAB 1: EDUCATOR APPLICATIONS */}
      {activeTab === 'educators' && (
        <div>
          {applications.length === 0 ? (
            <EmptyState
              title="Henüz Başvuru Bulunmuyor"
              description="Bekleyen veya incelenmiş profesyonel eğitimci başvurusu bulunmamaktadır."
              icon={<Briefcase className="w-8 h-8 text-zinc-500" />}
            />
          ) : (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-950 text-zinc-400 font-mono text-[10px] border-b border-zinc-800 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Aday Eğitimci</th>
                      <th className="py-2.5 px-3">Talep Edilen Rol</th>
                      <th className="py-2.5 px-3">Kurum & Deneyim</th>
                      <th className="py-2.5 px-3">Durum</th>
                      <th className="py-2.5 px-3">Başvuru Tarihi</th>
                      <th className="py-2.5 px-3 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-zinc-850/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-zinc-100">{app.full_name}</div>
                          <div className="text-[11px] text-zinc-500">{app.email}</div>
                          {app.phone && <div className="text-[10px] text-zinc-500">{app.phone}</div>}
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-mono text-amber-400 capitalize font-bold">
                            {app.requested_role}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="text-zinc-200">{app.institution || 'Belirtilmedi'}</div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            {app.experience_years ? `${app.experience_years} yıl deneyim` : '-'}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              app.status === 'approved'
                                ? 'success'
                                : app.status === 'rejected'
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {app.status === 'approved'
                              ? 'Onaylandı'
                              : app.status === 'rejected'
                              ? 'Reddedildi'
                              : 'İnceleme Bekliyor'}
                          </Badge>
                        </td>

                        <td className="py-3 px-3 font-mono text-zinc-500 text-[11px]">
                          {new Date(app.created_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <Button
                            variant={app.status === 'pending' ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => handleOpenReview(app)}
                          >
                            {app.status === 'pending' ? 'Değerlendir' : 'İncele'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INSTITUTIONAL DEMO REQUESTS */}
      {activeTab === 'institutions' && (
        <div>
          {demoRequests.length === 0 ? (
            <EmptyState
              title="Henüz Kurumsal Demo Talebi Yok"
              description="Kurum yöneticilerinden gelen demo ve teklif talepleri burada listelenir."
              icon={<Building className="w-8 h-8 text-zinc-500" />}
            />
          ) : (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-950 text-zinc-400 font-mono text-[10px] border-b border-zinc-800 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Kurum Adı</th>
                      <th className="py-2.5 px-3">Yetkili Kişi</th>
                      <th className="py-2.5 px-3">İletişim</th>
                      <th className="py-2.5 px-3">Kurum Türü & Kapasite</th>
                      <th className="py-2.5 px-3">Durum</th>
                      <th className="py-2.5 px-3 font-mono">Tarih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {demoRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-zinc-850/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-zinc-100">
                          {req.institution_name}
                          {req.notes && (
                            <div className="text-[10px] text-zinc-400 italic font-normal mt-0.5 line-clamp-1">
                              «{req.notes}»
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-zinc-200">{req.contact_person}</td>
                        <td className="py-3 px-3">
                          <div className="text-zinc-300">{req.email}</div>
                          {req.phone && (
                            <div className="text-[11px] text-zinc-500 font-mono">{req.phone}</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-zinc-200">{req.institution_type || 'Okul'}</div>
                          <div className="text-[10px] text-amber-400 font-mono">
                            ~{req.student_count || 100} Öğrenci
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="warning">{req.status || 'Bekliyor'}</Badge>
                        </td>
                        <td className="py-3 px-3 font-mono text-zinc-500 text-[11px]">
                          {new Date(req.created_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && selectedApp && (
        <Modal
          isOpen={true}
          onClose={() => setReviewModalOpen(false)}
          title={`Başvuru Değerlendirme: ${selectedApp.full_name}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmReview} className="space-y-4">
            {feedback && (
              <div
                className={`p-3 rounded text-xs border ${
                  feedback.includes('onaylandı')
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}
              >
                {feedback}
              </div>
            )}

            <div className="p-3.5 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Talep Edilen Rol:</span>
                <span className="font-bold text-amber-400 capitalize">{selectedApp.requested_role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">E-Posta:</span>
                <span className="text-zinc-200">{selectedApp.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Kurum:</span>
                <span className="text-zinc-200">{selectedApp.institution || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Deneyim:</span>
                <span className="text-zinc-200">{selectedApp.experience_years} yıl</span>
              </div>
              {selectedApp.bio && (
                <div className="pt-2 border-t border-zinc-850">
                  <span className="text-zinc-500 block mb-1">Biyografi:</span>
                  <p className="text-zinc-300 italic">{selectedApp.bio}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Karar</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewDecision('approved')}
                  className={`p-3 rounded-lg border text-center text-xs font-bold transition-all ${
                    reviewDecision === 'approved'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
                  Onayla & Rolü Aktif Et
                </button>

                <button
                  type="button"
                  onClick={() => setReviewDecision('rejected')}
                  className={`p-3 rounded-lg border text-center text-xs font-bold transition-all ${
                    reviewDecision === 'rejected'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <XCircle className="w-4 h-4 mx-auto mb-1" />
                  Reddet
                </button>
              </div>
            </div>

            {reviewDecision === 'rejected' && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Red Gerekçesi</label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Başvuru şartları sağlanamadı..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setReviewModalOpen(false)}
              >
                Vazgeç
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={submitting}
              >
                Kararı Kaydet
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { relationshipService } from '../../services/relationshipService';
import { academicService } from '../../services/academicService';
import { subscriptionService, ALL_COMMERCIAL_PLANS } from '../../services/subscriptionService';
import { Profile, AcademicClass, UserSubscription, SubscriptionPlanId } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Users,
  Link2,
  Check,
  Trash2,
  Crown,
  UserPlus,
  Search,
  GraduationCap,
  BookOpen,
  HeartHandshake,
  ShieldAlert,
  Building,
  Target,
  Mail,
  Phone,
  Key,
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [subMap, setSubMap] = useState<Record<string, UserSubscription>>({});
  const [updatingSubUserId, setUpdatingSubUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Assign to Class Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Create User Modal
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [newRole, setNewRole] = useState<'student' | 'teacher' | 'counselor' | 'parent' | 'coach' | 'admin'>('student');
  const [newPhone, setNewPhone] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allUsers, cls, allSubs] = await Promise.all([
        relationshipService.getAllUsersAdmin().catch(() => []),
        academicService.getClasses().catch(() => []),
        subscriptionService.getAllUserSubscriptionsAdmin().catch(() => []),
      ]);
      setUsers(allUsers || []);
      setClasses(cls || []);
      const map: Record<string, UserSubscription> = {};
      (allSubs || []).forEach((s: any) => {
        if (s?.user_id) map[s.user_id] = s;
      });
      setSubMap(map);
      if (allUsers && allUsers.length > 0) setSelectedStudentId(allUsers[0].id);
      if (cls && cls.length > 0) {
        setSelectedClassId(cls[0].id);
        setNewClassId(cls[0].id);
      }
    } catch (err) {
      console.warn('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) {
      setCreateFeedback('Lütfen ad, soyad ve e-posta alanlarını doldurun.');
      return;
    }

    setCreatingUser(true);
    setCreateFeedback(null);
    try {
      const created = await relationshipService.createUserAdmin({
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        password: newPassword.trim() || '123456',
        phone: newPhone.trim() || undefined,
        class_id: newRole === 'student' && newClassId ? newClassId : undefined,
      });

      setUsers((prev) => [created, ...prev.filter((u) => u.id !== created.id)]);
      setActionFeedback(
        `${newFirstName} ${newLastName} (${newEmail}) sisteme '${newRole}' rolüyle başarıyla kaydedildi.`
      );
      setCreateFeedback(null);
      setCreateUserModalOpen(false);

      // Reset form
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setNewPassword('123456');
      setNewPhone('');
    } catch (err: any) {
      setCreateFeedback(err.message || 'Kullanıcı oluşturulurken bir hata oluştu.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleAssignStudent = async () => {
    if (!selectedStudentId || !selectedClassId) return;
    setAssigning(true);
    setActionFeedback(null);
    try {
      await relationshipService.assignStudentToClass(selectedClassId, selectedStudentId);
      setActionFeedback('Öğrenci sınıfa başarıyla kaydedildi.');
      setAssignModalOpen(false);
      await loadData();
    } catch (err: any) {
      setActionFeedback(err.message || 'Öğrenci zaten bu sınıfta olabilir.');
    } finally {
      setAssigning(false);
    }
  };

  const handleChangeUserPlan = async (targetUser: Profile, newPlanId: SubscriptionPlanId) => {
    setUpdatingSubUserId(targetUser.id);
    setActionFeedback(null);
    try {
      const updated = await subscriptionService.assignPlanAdmin(targetUser.id, newPlanId, 'active', 'yearly');
      setSubMap((prev) => ({ ...prev, [targetUser.id]: updated }));
      const planLabel = ALL_COMMERCIAL_PLANS.find((p) => p.id === newPlanId)?.name || newPlanId;
      setActionFeedback(
        `${targetUser.first_name} ${targetUser.last_name} (${targetUser.email}) kullanıcısının paketi '${planLabel}' olarak güncellendi.`
      );
    } catch (err: any) {
      setActionFeedback(err.message || 'Paket güncellenirken bir hata oluştu.');
    } finally {
      setUpdatingSubUserId(null);
    }
  };

  const handleDeleteUser = async (targetUser: Profile) => {
    if (!targetUser?.id) return;
    setDeletingUserId(targetUser.id);
    setActionFeedback(null);
    try {
      const { fullAuthDeleted } = await relationshipService.deleteUserAdmin(targetUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      setActionFeedback(
        fullAuthDeleted
          ? `${targetUser.first_name} ${targetUser.last_name} (${targetUser.email}) hem Auth hem de veritabanından kalıcı olarak silindi.`
          : `${targetUser.first_name} ${targetUser.last_name} (${targetUser.email}) profili ve ilişkili tüm verileri sistemden silindi.`
      );
    } catch (err: any) {
      setActionFeedback(err.message || 'Kullanıcı silinirken bir hata oluştu.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole =
        filterRole === 'all' ||
        u.role === filterRole ||
        (filterRole === 'coach' && (u.role === 'coach' || u.role === 'head_coach'));
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.email?.toLowerCase().includes(q) ||
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        (u as any).phone?.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [users, filterRole, searchQuery]);

  if (loading) {
    return <LoadingState message="Kurumsal kullanıcı rehberi yükleniyor..." />;
  }

  const roleCounts = {
    all: users.length,
    student: users.filter((u) => u.role === 'student').length,
    teacher: users.filter((u) => u.role === 'teacher').length,
    counselor: users.filter((u) => u.role === 'counselor').length,
    parent: users.filter((u) => u.role === 'parent').length,
    coach: users.filter((u) => u.role === 'coach' || u.role === 'head_coach').length,
    admin: users.filter((u) => u.role === 'admin').length,
  };

  return (
    <div className="space-y-6 bg-slate-50 text-gray-800 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <span className="text-xs font-mono text-amber-600 font-bold uppercase tracking-wider">
            Kurumsal Kullanıcı & Kadro Yönetimi
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-0.5 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-600" />
            Kullanıcılar & Şube İlişkileri
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Öğrenci, öğretmen, rehberlik, koç ve veli hesapları, paket atamaları ve kurumsal kayıtlar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateUserModalOpen(true)}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            + Yeni Kullanıcı Ekle
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAssignModalOpen(true)}
            leftIcon={<Link2 className="w-3.5 h-3.5" />}
          >
            Öğrenciyi Sınıfa Ata
          </Button>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Role filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'Tümü', count: roleCounts.all },
            { key: 'student', label: 'Öğrenciler', count: roleCounts.student },
            { key: 'teacher', label: 'Öğretmenler', count: roleCounts.teacher },
            { key: 'counselor', label: 'Rehberlik / PDR', count: roleCounts.counselor },
            { key: 'parent', label: 'Veliler', count: roleCounts.parent },
            { key: 'coach', label: 'Koçlar', count: roleCounts.coach },
            { key: 'admin', label: 'Müdür / Yönetici', count: roleCounts.admin },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterRole(f.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                filterRole === f.key
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-slate-100 border border-gray-200'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[10px] font-mono px-1 rounded-full ${
                  filterRole === f.key ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İsim, e-posta veya tel ara..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-amber-500 font-sans"
          />
        </div>
      </div>

      <Card
        title={`Kullanıcı Listesi (${filteredUsers.length})`}
        subtitle="Sistemde kayıtlı profiller, rol yetkileri ve aktif paketler"
      >
        {filteredUsers.length === 0 ? (
          <EmptyState
            title="Kullanıcı Bulunamadı"
            description="Arama kriterlerine veya seçilen role uygun bir kullanıcı kaydı bulunamadı."
            icon={<Users className="w-6 h-6 text-gray-400" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-slate-50 text-gray-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Ad Soyad</th>
                  <th className="py-3 px-4">E-Posta</th>
                  <th className="py-3 px-4">Kurumsal Rol</th>
                  <th className="py-3 px-4">Aktif Paket / Yükselt</th>
                  <th className="py-3 px-4">Kayıt Tarihi</th>
                  <th className="py-3 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono">
                {filteredUsers.map((u) => {
                  const currentSub = subMap[u.id];
                  const defaultPlan =
                    u.role === 'coach' || u.role === 'head_coach'
                      ? 'coach_starter'
                      : u.role === 'teacher'
                      ? 'teacher_starter'
                      : u.role === 'counselor'
                      ? 'counselor_starter'
                      : 'free';
                  const currentPlanId = currentSub?.plan_id || u.package_tier || defaultPlan;

                  const rolePlans =
                    u.role === 'coach' || u.role === 'head_coach'
                      ? ALL_COMMERCIAL_PLANS.filter((p) => p.category === 'coach' || p.category === 'student')
                      : u.role === 'teacher'
                      ? ALL_COMMERCIAL_PLANS.filter((p) => p.category === 'teacher' || p.category === 'student')
                      : u.role === 'counselor'
                      ? ALL_COMMERCIAL_PLANS.filter((p) => p.category === 'counselor' || p.category === 'student')
                      : ALL_COMMERCIAL_PLANS.filter((p) => p.category === 'student');

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                            {u.first_name?.[0] || u.name?.[0] || 'K'}
                          </div>
                          <div>
                            <div>{u.first_name} {u.last_name}</div>
                            {(u as any).phone && (
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                                <Phone className="w-2.5 h-2.5" /> {(u as any).phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{u.email}</td>
                      <td className="py-3 px-4 font-sans capitalize">
                        <Badge
                          variant={
                            u.role === 'admin'
                              ? 'danger'
                              : u.role === 'student'
                              ? 'amber'
                              : u.role === 'teacher'
                              ? 'success'
                              : u.role === 'counselor'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {u.role === 'admin'
                            ? 'Müdür / Yönetici'
                            : u.role === 'student'
                            ? 'Öğrenci'
                            : u.role === 'teacher'
                            ? 'Öğretmen'
                            : u.role === 'counselor'
                            ? 'Rehberlik / PDR'
                            : u.role === 'parent'
                            ? 'Veli'
                            : u.role === 'coach'
                            ? 'Koç'
                            : u.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                            <Crown className="w-3 h-3 text-amber-600" /> Kurum Lisansı (Sınırsız)
                          </span>
                        ) : (
                          <select
                            aria-label={`${u.first_name} paket seçimi`}
                            disabled={updatingSubUserId === u.id}
                            value={currentPlanId}
                            onChange={(e) => handleChangeUserPlan(u, e.target.value as SubscriptionPlanId)}
                            className="bg-amber-50/70 border border-amber-300 text-amber-950 font-semibold text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
                          >
                            {rolePlans.map((pl) => (
                              <option key={pl.id} value={pl.id}>
                                {pl.name} ({((pl as any).price_yearly ?? (pl as any).yearly_price ?? 0).toLocaleString('tr-TR')} ₺/yıl)
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-[11px]">
                        {new Date(u.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        {u.role !== 'admin' && (
                          <Button
                            variant="danger"
                            size="sm"
                            isLoading={deletingUserId === u.id}
                            disabled={deletingUserId === u.id}
                            onClick={() => handleDeleteUser(u)}
                            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          >
                            Sil
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Yeni Kullanıcı Ekle */}
      <Modal
        isOpen={createUserModalOpen}
        onClose={() => setCreateUserModalOpen(false)}
        title="Yeni Kurumsal Kullanıcı Ekle"
        subtitle="Öğrenci, öğretmen, rehberlik veya veli hesabı açın"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ad"
              required
              placeholder="Ahmet"
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
            />
            <Input
              label="Soyad"
              required
              placeholder="Yılmaz"
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
            />
          </div>

          <Input
            label="E-Posta Adresi"
            type="email"
            required
            placeholder="kullanici@mahfaza.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Başlangıç Şifresi"
              type="text"
              required
              placeholder="123456"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              leftIcon={<Key className="w-4 h-4" />}
            />
            <Input
              label="Telefon (İsteğe Bağlı)"
              type="tel"
              placeholder="05xx xxx xx xx"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Kurumsal Rol & Yetki
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'student', label: 'Öğrenci', icon: GraduationCap },
                { key: 'teacher', label: 'Öğretmen', icon: BookOpen },
                { key: 'counselor', label: 'PDR / Rehberlik', icon: Users },
                { key: 'parent', label: 'Veli', icon: HeartHandshake },
                { key: 'coach', label: 'Koç', icon: Target },
                { key: 'admin', label: 'Yönetici / Müdür', icon: Crown },
              ].map((r) => {
                const IconComponent = r.icon;
                const isSelected = newRole === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setNewRole(r.key as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/80 text-amber-900 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="text-xs">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {newRole === 'student' && classes.length > 0 && (
            <Select
              label="Atanacak Sınıf / Şube"
              value={newClassId}
              onChange={(e) => setNewClassId(e.target.value)}
              options={[
                { value: '', label: 'Şube Atanmasın (Daha sonra atanabilir)' },
                ...classes.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.grade_level}. Sınıf)`,
                })),
              ]}
            />
          )}

          {createFeedback && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {createFeedback}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCreateUserModalOpen(false)}
              disabled={creatingUser}
            >
              Vazgeç
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={creatingUser}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Kullanıcıyı Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Öğrenci Sınıf Ataması */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Öğrenci Sınıf Ataması"
        subtitle="Öğrenciyi bir şubeye kaydet"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <Select
            label="Öğrenci"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            options={users
              .filter((u) => u.role === 'student')
              .map((s) => ({
                value: s.id,
                label: `${s.first_name} ${s.last_name} (${s.email})`,
              }))}
          />

          <Select
            label="Hedef Sınıf / Şube"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            options={classes.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.grade_level}. Sınıf)`,
            }))}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAssignModalOpen(false)}
              disabled={assigning}
            >
              Kapat
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAssignStudent}
              isLoading={assigning}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Atamayı Onayla
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

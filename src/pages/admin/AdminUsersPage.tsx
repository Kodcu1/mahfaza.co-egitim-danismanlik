import React, { useState, useEffect, useCallback } from 'react';
import { relationshipService } from '../../services/relationshipService';
import { academicService } from '../../services/academicService';
import { Profile, AcademicClass } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { Users, Link2, Plus, Check } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('all');

  // Assign to Class Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allUsers, cls] = await Promise.all([
        relationshipService.getAllUsersAdmin(),
        academicService.getClasses(),
      ]);
      setUsers(allUsers);
      setClasses(cls);
      if (allUsers.length > 0) setSelectedStudentId(allUsers[0].id);
      if (cls.length > 0) setSelectedClassId(cls[0].id);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssignStudent = async () => {
    if (!selectedStudentId || !selectedClassId) return;
    setAssigning(true);
    setFeedback(null);
    try {
      await relationshipService.assignStudentToClass(selectedClassId, selectedStudentId);
      setFeedback('Öğrenci sınıfa başarıyla kaydedildi.');
      setTimeout(() => {
        setAssignModalOpen(false);
        setFeedback(null);
      }, 1500);
    } catch (err: any) {
      setFeedback(err.message || 'Öğrenci zaten bu sınıfta olabilir.');
    } finally {
      setAssigning(false);
    }
  };

  const filteredUsers = filterRole === 'all'
    ? users
    : users.filter((u) => u.role === filterRole);

  if (loading) {
    return <LoadingState message="Kullanıcı rehberi yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Kullanıcı & Kadro Yönetimi</span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Kullanıcılar & İlişkiler
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Öğrenci, öğretmen, rehberlik, koç ve veli hesapları yetki ve şube ilişkileri.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setAssignModalOpen(true)}
            leftIcon={<Link2 className="w-3.5 h-3.5" />}
          >
            Öğrenciyi Sınıfa Ata
          </Button>
        </div>
      </div>

      {/* Role filter buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'Tüm Kullanıcılar' },
          { key: 'student', label: 'Öğrenciler' },
          { key: 'teacher', label: 'Öğretmenler' },
          { key: 'counselor', label: 'Danışmanlar' },
          { key: 'coach', label: 'Koçlar' },
          { key: 'parent', label: 'Veliler' },
          { key: 'admin', label: 'Yöneticiler' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterRole(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer shrink-0 ${
              filterRole === f.key
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card
        title={`Kullanıcı Listesi (${filteredUsers.length})`}
        subtitle="Sistemde kayıtlı ve Supabase Auth tarafından doğrulanmış profiller"
      >
        {filteredUsers.length === 0 ? (
          <EmptyState
            title="Kullanıcı Bulunamadı"
            description="Seçilen rolde kayıtlı bir kullanıcı bulunmuyor."
            icon={<Users className="w-6 h-6 text-zinc-500" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 text-zinc-500 font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Ad Soyad</th>
                  <th className="py-2.5 px-3">E-Posta</th>
                  <th className="py-2.5 px-3">Yetki Rolü</th>
                  <th className="py-2.5 px-3">Kayıt Tarihi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-900/40">
                    <td className="py-3 px-3 font-sans font-semibold text-zinc-200">
                      {u.first_name} {u.last_name}
                    </td>
                    <td className="py-3 px-3 text-zinc-400">{u.email}</td>
                    <td className="py-3 px-3 font-sans capitalize">
                      <Badge
                        variant={
                          u.role === 'admin'
                            ? 'danger'
                            : u.role === 'student'
                            ? 'amber'
                            : u.role === 'teacher'
                            ? 'success'
                            : 'neutral'
                        }
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-zinc-500 text-[11px]">
                      {new Date(u.created_at).toLocaleDateString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Assign Student to Class */}
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
              .map((s) => ({ value: s.id, label: `${s.first_name} ${s.last_name} (${s.email})` }))}
          />

          <Select
            label="Hedef Sınıf / Şube"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.grade_level}. Sınıf)` }))}
          />

          {feedback && (
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 text-amber-400 text-center font-medium">
              {feedback}
            </div>
          )}

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

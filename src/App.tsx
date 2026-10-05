import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Student Pages
import { StudentDashboardPage } from './pages/student/StudentDashboardPage';
import { StudentSessionsPage } from './pages/student/StudentSessionsPage';
import { StudentSchedulePage } from './pages/student/StudentSchedulePage';
import { StudentHomeworkPage } from './pages/student/StudentHomeworkPage';
import { StudentExamsPage } from './pages/student/StudentExamsPage';
import { StudentRewardsPage } from './pages/student/StudentRewardsPage';
import { StudentXPHistoryPage } from './pages/student/StudentXPHistoryPage';
import { StudentLearningPage } from './pages/student/StudentLearningPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminClassesPage } from './pages/admin/AdminClassesPage';
import { AdminRewardsPage } from './pages/admin/AdminRewardsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';
import { AdminContentPage } from './pages/admin/AdminContentPage';
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage';
import { AdminSubscriptionsPage } from './pages/admin/AdminSubscriptionsPage';
import { AdminApplicationsPage } from './pages/admin/AdminApplicationsPage';

// Shared Production Pages
import { PricingPage } from './pages/pricing/PricingPage';
import { MessagingPage } from './pages/messaging/MessagingPage';
import { ProfilePage } from './pages/profile/ProfilePage';

// Teacher Pages
import { TeacherDashboardPage } from './pages/teacher/TeacherDashboardPage';
import { TeacherAttendancePage } from './pages/teacher/TeacherAttendancePage';
import { TeacherHomeworkPage } from './pages/teacher/TeacherHomeworkPage';
import { TeacherExamsPage } from './pages/teacher/TeacherExamsPage';
import { TeacherContentPage } from './pages/teacher/TeacherContentPage';

// Counselor Pages
import { CounselorDashboardPage } from './pages/counselor/CounselorDashboardPage';

// Coach Pages
import { CoachDashboardPage } from './pages/coach/CoachDashboardPage';
import { CoachStudentsPage } from './pages/coach/CoachStudentsPage';
import { Student360Page } from './pages/coach/Student360Page';
import { CoachApprovalsPage } from './pages/coach/CoachApprovalsPage';
import { CoachTasksPage } from './pages/coach/CoachTasksPage';
import { CoachParentMeetingsPage } from './pages/coach/CoachParentMeetingsPage';
import { CoachAnalyticsPage } from './pages/coach/CoachAnalyticsPage';
import { CoachAICopilotPage } from './pages/coach/CoachAICopilotPage';
import { CoachRewardsPage } from './pages/coach/CoachRewardsPage';

// Parent Pages
import { ParentDashboardPage } from './pages/parent/ParentDashboardPage';

const RootRedirect: React.FC = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-xs text-zinc-500 font-mono">
        Mahfaza.co yükleniyor...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  const targetRole = role === 'head_coach' ? 'coach' : (role || 'student');
  return <Navigate to={`/${targetRole}/dashboard`} replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public / Auth */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Student Protected Workspace */}
          <Route element={<DashboardLayout allowedRoles={['student', 'admin']} />}>
            <Route path="/student/dashboard" element={<StudentDashboardPage />} />
            <Route path="/student/sessions" element={<StudentSessionsPage />} />
            <Route path="/student/learning" element={<StudentLearningPage />} />
            <Route path="/student/schedule" element={<StudentSchedulePage />} />
            <Route path="/student/homework" element={<StudentHomeworkPage />} />
            <Route path="/student/exams" element={<StudentExamsPage />} />
            <Route path="/student/rewards" element={<StudentRewardsPage />} />
            <Route path="/student/xp" element={<StudentXPHistoryPage />} />
            <Route path="/student/xp-history" element={<StudentXPHistoryPage />} />
          </Route>

          {/* Admin Protected Workspace */}
          <Route element={<DashboardLayout allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/classes" element={<AdminClassesPage />} />
            <Route path="/admin/content" element={<AdminContentPage />} />
            <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptionsPage />} />
            <Route path="/admin/applications" element={<AdminApplicationsPage />} />
            <Route path="/admin/rewards" element={<AdminRewardsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/attendance" element={<TeacherAttendancePage />} />
            <Route path="/admin/audit" element={<AdminAuditPage />} />
          </Route>

          {/* Shared Authenticated Workspace (All Roles) */}
          <Route element={<DashboardLayout allowedRoles={['admin', 'teacher', 'counselor', 'coach', 'student', 'parent']} />}>
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/messages" element={<MessagingPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Teacher Protected Workspace */}
          <Route element={<DashboardLayout allowedRoles={['teacher', 'admin']} />}>
            <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
            <Route path="/teacher/schedule" element={<StudentSchedulePage />} />
            <Route path="/teacher/content" element={<TeacherContentPage />} />
            <Route path="/teacher/attendance" element={<TeacherAttendancePage />} />
            <Route path="/teacher/homework" element={<TeacherHomeworkPage />} />
            <Route path="/teacher/exams" element={<TeacherExamsPage />} />
          </Route>

          {/* Counselor Protected Workspace (Isolated High Sensitivity) */}
          <Route element={<DashboardLayout allowedRoles={['counselor', 'admin']} />}>
            <Route path="/counselor/dashboard" element={<CounselorDashboardPage />} />
            <Route path="/counselor/notes" element={<CounselorDashboardPage />} />
            <Route path="/counselor/students" element={<AdminUsersPage />} />
            <Route path="/counselor/interviews" element={<StudentSchedulePage />} />
          </Route>

          {/* Coach Protected Workspace */}
          <Route element={<DashboardLayout allowedRoles={['coach', 'head_coach', 'admin']} />}>
            <Route path="/coach/dashboard" element={<CoachDashboardPage />} />
            <Route path="/coach/students" element={<CoachStudentsPage />} />
            <Route path="/coach/students/:studentId" element={<Student360Page />} />
            <Route path="/coach/approvals" element={<CoachApprovalsPage />} />
            <Route path="/coach/tasks" element={<CoachTasksPage />} />
            <Route path="/coach/rewards" element={<CoachRewardsPage />} />
            <Route path="/coach/parent-meetings" element={<CoachParentMeetingsPage />} />
            <Route path="/coach/analytics" element={<CoachAnalyticsPage />} />
            <Route path="/coach/analysis" element={<CoachAnalyticsPage />} />
            <Route path="/coach/ai-copilot" element={<CoachAICopilotPage />} />
          </Route>

          {/* Parent Protected Workspace */}
          <Route element={<DashboardLayout allowedRoles={['parent', 'admin']} />}>
            <Route path="/parent/dashboard" element={<ParentDashboardPage />} />
            <Route path="/parent/attendance" element={<ParentDashboardPage />} />
            <Route path="/parent/homework" element={<ParentDashboardPage />} />
            <Route path="/parent/exams" element={<ParentDashboardPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

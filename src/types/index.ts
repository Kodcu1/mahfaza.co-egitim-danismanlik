/**
 * Mahfaza.co - Genesis Master Type Definitions
 * Strict alignment with PostgreSQL database schema and RLS policies
 */

export type UserRole = 'admin' | 'teacher' | 'counselor' | 'coach' | 'head_coach' | 'student' | 'parent';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type RewardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type RewardCategory = 'mahfaza' | 'digital' | 'academic' | 'legendary';

export type RewardRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type HomeworkStatus = 'pending' | 'submitted' | 'graded' | 'late';

export type ExamType = 'TYT' | 'AYT' | 'LGS';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  avatar_url?: string | null;
  name?: string | null;
  full_name?: string | null;
  username?: string | null;
  bio?: string | null;
  school_name?: string | null;
  grade_level?: number | null;
  created_at: string;
  updated_at: string;
}

export interface AcademicClass {
  id: string;
  name: string;
  grade_level: number;
  academic_year: string;
  created_at: string;
  updated_at: string;
  students_count?: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface ScheduleItem {
  id: string;
  class_id: string;
  teacher_id: string;
  subject_id: string;
  day_of_week: number; // 1-7
  period: number; // 1-12
  room?: string | null;
  academic_year: string;
  created_at: string;
  updated_at: string;
  class_name?: string;
  teacher_name?: string;
  subject_name?: string;
}

export interface AttendanceSession {
  id: string;
  class_id: string;
  teacher_id: string;
  date: string;
  period: number;
  status: string;
  created_at: string;
  updated_at: string;
  class_name?: string;
  records?: AttendanceRecord[];
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  note?: string | null;
  created_at: string;
  updated_at: string;
  student?: Profile;
}

export interface Homework {
  id: string;
  class_id: string;
  teacher_id: string;
  subject_id: string;
  title: string;
  description?: string | null;
  due_at: string;
  created_at: string;
  updated_at: string;
  class_name?: string;
  subject_name?: string;
  teacher_name?: string;
  submissions_count?: number;
  my_submission?: HomeworkSubmission;
}

export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  content: string;
  submitted_at: string;
  grade?: number | null;
  teacher_feedback?: string | null;
  status: HomeworkStatus;
  created_at: string;
  updated_at: string;
  student?: Profile;
  homework?: Homework;
}

export interface Exam {
  id: string;
  title: string;
  exam_type: ExamType;
  exam_date: string;
  class_id?: string | null;
  created_by: string;
  created_at: string;
  class_name?: string;
}

export interface ExamResult {
  id: string;
  exam_id: string;
  student_id: string;
  turkish_net: number;
  math_net: number;
  social_net: number;
  science_net: number;
  total_net: number;
  score: number;
  rank?: number | null;
  created_at: string;
  updated_at: string;
  exam?: Exam;
  student?: Profile;
}

export interface GuidanceNote {
  id: string;
  student_id: string;
  counselor_id: string;
  category: string;
  private_note: string;
  created_at: string;
  updated_at: string;
  student?: Profile;
  counselor?: Profile;
}

export interface StudentXPData {
  student_id: string;
  lifetime_xp: number;
  wallet_xp: number;
  current_streak_days: number;
  last_activity_date: string | null;
  today_earned_xp: number;
  updated_at: string;
}

export interface XPTransaction {
  id: string;
  student_id: string;
  amount: number;
  transaction_type?: string;
  description?: string;
  reference_id?: string | null;
  reason?: string;
  source_type?: string;
  source_id?: string | null;
  created_at: string;
}

export interface Reward {
  id: string;
  coach_id?: string | null;
  title: string;
  description: string;
  category: RewardCategory | string;
  rarity?: RewardRarity;
  cost_xp?: number;
  xp_price: number;
  real_cost?: number;
  icon?: string;
  stock: number | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface RewardRequest {
  id: string;
  student_id: string;
  reward_id: string;
  cost_xp?: number;
  status: RewardRequestStatus;
  coach_notes?: string | null;
  requested_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  admin_note?: string | null;
  reward?: Reward;
  student?: Profile;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  actor?: Profile;
}

export interface LevelInfo {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
  progressPercent: number;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string | null;
  created_at: string;
}

export interface BranchTeacherFeedback {
  id: string;
  student_id: string;
  coach_id?: string | null;
  subject: string; // e.g. Matematik, Fizik, Kimya, Biyoloji, Tarih, Coğrafya, Türk Dili ve Edebiyatı, İngilizce
  teacher_name: string;
  topic?: string;
  academic_status: 'Pekiyi' | 'İyi' | 'Orta' | 'Geliştirilmeli' | 'Kritik';
  opinion: string;
  recommendations?: string;
  date: string;
  created_at: string;
}

export type AcademicContentType = 'lesson_note' | 'pdf' | 'video' | 'image' | 'text' | 'test';

export type AcademicCategory =
  | 'TYT Tarih'
  | 'AYT Tarih'
  | 'KPSS Tarih'
  | 'LGS İnkılap Tarihi'
  | '5. Sınıf'
  | '6. Sınıf'
  | '7. Sınıf'
  | '8. Sınıf'
  | '9. Sınıf'
  | '10. Sınıf'
  | '11. Sınıf'
  | '12. Sınıf';

export interface AcademicContent {
  id: string;
  title: string;
  description?: string | null;
  category: AcademicCategory | string;
  subject_id?: string | null;
  content_type: AcademicContentType;
  thumbnail_url?: string | null;
  body?: string | null;
  file_url?: string | null;
  author_id: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile;
  subject?: Subject;
}

export type SubscriptionPlanId =
  | 'free'
  | 'standard'
  | 'pro'
  | 'premium'
  | 'coach_starter'
  | 'coach_pro'
  | 'coach_elite'
  | 'teacher_starter'
  | 'teacher_pro'
  | 'teacher_elite'
  | 'counselor_starter'
  | 'counselor_pro'
  | 'counselor_elite'
  | string;

export type SubscriptionCategory = 'student' | 'coach' | 'teacher' | 'counselor' | 'institution';

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  description: string;
  category: SubscriptionCategory;
  monthly_price: number;
  yearly_price: number;
  student_capacity?: number | null;
  features: string[];
  limits: {
    daily_xp_cap?: number;
    max_active_tasks?: number;
    can_message_teachers?: boolean;
    vip_content?: boolean;
    student_capacity?: number;
    [key: string]: unknown;
  };
  entitlements: string[];
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: SubscriptionPlanId;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

export type ProfessionalApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface ProfessionalApplication {
  id: string;
  user_id: string;
  requested_role: 'teacher' | 'coach' | 'counselor';
  full_name: string;
  email: string;
  phone?: string | null;
  institution?: string | null;
  experience_years?: number | null;
  bio?: string | null;
  status: ProfessionalApplicationStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  user?: Profile;
  reviewer?: Profile;
}

export interface Conversation {
  id: string;
  title?: string | null;
  created_at: string;
  updated_at: string;
  participants?: Profile[];
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  created_at: string;
  profile?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  target_role?: UserRole | null;
  author_id: string;
  is_published: boolean;
  priority: 'normal' | 'important' | 'urgent';
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface InstitutionDemoRequest {
  id: string;
  institution_name: string;
  contact_person: string;
  email: string;
  phone?: string | null;
  institution_type?: string | null;
  student_count?: number | null;
  notes?: string | null;
  status: 'pending' | 'contacted' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface CoachTask {
  id: string;
  coach_id: string;
  student_id: string;
  title: string;
  description?: string | null;
  due_date: string;
  xp_reward: number;
  status: 'pending' | 'completed' | 'submitted' | 'verified' | 'cancelled' | 'pending_review' | 'approved' | 'rejected';
  student_note?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  student?: Profile;
}

export interface CoachParentMeeting {
  id: string;
  coach_id: string;
  student_id: string;
  parent_id?: string | null;
  title: string;
  meeting_date: string;
  meeting_time?: string | null;
  meeting_type: 'online' | 'in_person' | 'phone';
  student_name?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  person_contacted?: string | null;
  teacher_opinions?: string | null;
  academic_evaluation?: string | null;
  raw_notes?: string | null;
  refined_notes?: string | null;
  psychological_status?: string | null;
  coach_recommendations?: string | null;
  action_plan?: string | null;
  next_meeting_date?: string | null;
  next_followup_date?: string | null;
  status: 'Planlandı' | 'Tamamlandı' | 'İptal Edildi' | 'scheduled' | 'completed' | 'cancelled';
  notes?: string | null;
  action_items?: string | null;
  created_at: string;
  updated_at: string;
  student?: Profile;
  parent?: Profile;
}






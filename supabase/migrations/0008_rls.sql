-- 0008_rls.sql
-- Mahfaza.co Row Level Security (RLS) & Role Isolation Policies

-- 1. Helper Security Functions (SECURITY DEFINER with strict search_path)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'teacher'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_counselor()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'counselor'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'coach'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_student()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'student'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_parent()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'parent'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_class_teacher(p_class_id UUID)
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.class_teachers
        WHERE class_id = p_class_id AND teacher_id = auth.uid()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_parent_of_student(p_student_id UUID)
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.parent_students
        WHERE parent_id = auth.uid() AND student_id = p_student_id
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_coach_of_student(p_student_id UUID)
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.coach_students
        WHERE coach_id = auth.uid() AND student_id = p_student_id
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidance_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students_xp_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_requests ENABLE ROW LEVEL SECURITY;

-- 3. Profiles Policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR public.is_admin()
        OR (public.is_teacher() AND EXISTS (
            SELECT 1 FROM public.class_teachers ct
            JOIN public.class_students cs ON ct.class_id = cs.class_id
            WHERE ct.teacher_id = auth.uid() AND cs.student_id = profiles.id
        ))
        OR (public.is_coach() AND public.is_coach_of_student(profiles.id))
        OR (public.is_parent() AND public.is_parent_of_student(profiles.id))
    );

-- Role escalation hardening trigger
CREATE OR REPLACE FUNCTION public.check_profile_role_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Allow system operations without JWT (e.g., migrations, internal triggers)
        IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Users cannot modify their assigned role.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_profile_role_mutation();

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (
        public.is_admin()
        OR (id = auth.uid() AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
    );


-- 4. Classes Policies
DROP POLICY IF EXISTS "classes_admin_all" ON public.classes;
CREATE POLICY "classes_admin_all" ON public.classes
    FOR ALL TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "classes_read_members" ON public.classes;
CREATE POLICY "classes_read_members" ON public.classes
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.class_students WHERE class_id = classes.id AND student_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.class_teachers WHERE class_id = classes.id AND teacher_id = auth.uid())
        OR public.is_counselor()
    );

-- 5. Subjects Policies
DROP POLICY IF EXISTS "subjects_read" ON public.subjects;
CREATE POLICY "subjects_read" ON public.subjects
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "subjects_admin" ON public.subjects;
CREATE POLICY "subjects_admin" ON public.subjects
    FOR ALL TO authenticated USING (public.is_admin());

-- 6. Master Schedule Policies
DROP POLICY IF EXISTS "schedule_admin_manage" ON public.master_schedule;
CREATE POLICY "schedule_admin_manage" ON public.master_schedule
    FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "schedule_read_involved" ON public.master_schedule;
CREATE POLICY "schedule_read_involved" ON public.master_schedule
    FOR SELECT TO authenticated
    USING (
        teacher_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.class_students cs WHERE cs.class_id = master_schedule.class_id AND cs.student_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.parent_students ps
            JOIN public.class_students cs ON cs.student_id = ps.student_id
            WHERE ps.parent_id = auth.uid() AND cs.class_id = master_schedule.class_id
        )
    );

-- 7. Guidance Notes Policies (HIGH SENSITIVITY: NO ACCESS FOR TEACHER, COACH, STUDENT, PARENT)
DROP POLICY IF EXISTS "guidance_admin_counselor_select" ON public.guidance_notes;
CREATE POLICY "guidance_admin_counselor_select" ON public.guidance_notes
    FOR SELECT TO authenticated
    USING (public.is_admin() OR (public.is_counselor() AND counselor_id = auth.uid()));

DROP POLICY IF EXISTS "guidance_admin_counselor_insert" ON public.guidance_notes;
CREATE POLICY "guidance_admin_counselor_insert" ON public.guidance_notes
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin() OR (public.is_counselor() AND counselor_id = auth.uid()));

DROP POLICY IF EXISTS "guidance_admin_counselor_modify" ON public.guidance_notes;
CREATE POLICY "guidance_admin_counselor_modify" ON public.guidance_notes
    FOR UPDATE TO authenticated
    USING (public.is_admin() OR (public.is_counselor() AND counselor_id = auth.uid()));

DROP POLICY IF EXISTS "guidance_admin_delete" ON public.guidance_notes;
CREATE POLICY "guidance_admin_delete" ON public.guidance_notes
    FOR DELETE TO authenticated
    USING (public.is_admin() OR (public.is_counselor() AND counselor_id = auth.uid()));

-- 8. Attendance Policies
DROP POLICY IF EXISTS "attendance_admin_all" ON public.attendance_sessions;
CREATE POLICY "attendance_admin_all" ON public.attendance_sessions
    FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "attendance_teacher_manage" ON public.attendance_sessions;
CREATE POLICY "attendance_teacher_manage" ON public.attendance_sessions
    FOR ALL TO authenticated
    USING (teacher_id = auth.uid() OR public.is_class_teacher(class_id));

DROP POLICY IF EXISTS "attendance_records_select" ON public.attendance_records;
CREATE POLICY "attendance_records_select" ON public.attendance_records
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_admin()
        OR public.is_parent_of_student(student_id)
        OR EXISTS (
            SELECT 1 FROM public.attendance_sessions s
            WHERE s.id = attendance_records.session_id AND s.teacher_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "attendance_records_teacher_modify" ON public.attendance_records;
CREATE POLICY "attendance_records_teacher_modify" ON public.attendance_records
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.attendance_sessions s
            WHERE s.id = attendance_records.session_id AND s.teacher_id = auth.uid()
        )
    );

-- 9. Homework & Submissions Policies
DROP POLICY IF EXISTS "homeworks_select" ON public.homeworks;
CREATE POLICY "homeworks_select" ON public.homeworks
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR teacher_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.class_students cs WHERE cs.class_id = homeworks.class_id AND cs.student_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.parent_students ps
            JOIN public.class_students cs ON cs.student_id = ps.student_id
            WHERE ps.parent_id = auth.uid() AND cs.class_id = homeworks.class_id
        )
    );

DROP POLICY IF EXISTS "homeworks_teacher_admin" ON public.homeworks;
CREATE POLICY "homeworks_teacher_admin" ON public.homeworks
    FOR ALL TO authenticated
    USING (public.is_admin() OR (public.is_teacher() AND teacher_id = auth.uid()));

DROP POLICY IF EXISTS "submissions_select" ON public.homework_submissions;
CREATE POLICY "submissions_select" ON public.homework_submissions
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_admin()
        OR public.is_parent_of_student(student_id)
        OR EXISTS (
            SELECT 1 FROM public.homeworks h
            WHERE h.id = homework_submissions.homework_id AND h.teacher_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "submissions_student_insert" ON public.homework_submissions;
CREATE POLICY "submissions_student_insert" ON public.homework_submissions
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "submissions_grade_teacher" ON public.homework_submissions;
CREATE POLICY "submissions_grade_teacher" ON public.homework_submissions
    FOR UPDATE TO authenticated
    USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.homeworks h
            WHERE h.id = homework_submissions.homework_id AND h.teacher_id = auth.uid()
        )
    );

-- 10. Exams & Exam Results Policies
DROP POLICY IF EXISTS "exams_select" ON public.exams;
CREATE POLICY "exams_select" ON public.exams
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "exams_modify" ON public.exams;
CREATE POLICY "exams_modify" ON public.exams
    FOR ALL TO authenticated USING (public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "exam_results_select" ON public.exam_results;
CREATE POLICY "exam_results_select" ON public.exam_results
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_admin()
        OR public.is_teacher()
        OR public.is_coach_of_student(student_id)
        OR public.is_parent_of_student(student_id)
    );

DROP POLICY IF EXISTS "exam_results_modify" ON public.exam_results;
CREATE POLICY "exam_results_modify" ON public.exam_results
    FOR ALL TO authenticated USING (public.is_admin() OR public.is_teacher());

-- 11. Students XP Data Policies (Mutations only via atomic security definer function)
DROP POLICY IF EXISTS "xp_data_select" ON public.students_xp_data;
CREATE POLICY "xp_data_select" ON public.students_xp_data
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_admin()
        OR public.is_coach_of_student(student_id)
        OR public.is_parent_of_student(student_id)
    );

DROP POLICY IF EXISTS "xp_transactions_select" ON public.xp_transactions;
CREATE POLICY "xp_transactions_select" ON public.xp_transactions
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.is_admin()
        OR public.is_coach_of_student(student_id)
        OR public.is_parent_of_student(student_id)
    );

-- 12. Rewards & Requests Policies
DROP POLICY IF EXISTS "rewards_select_active" ON public.rewards;
CREATE POLICY "rewards_select_active" ON public.rewards
    FOR SELECT TO authenticated USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "rewards_admin_modify" ON public.rewards;
CREATE POLICY "rewards_admin_modify" ON public.rewards
    FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "requests_select" ON public.reward_requests;
CREATE POLICY "requests_select" ON public.reward_requests
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "requests_insert_student" ON public.reward_requests;
CREATE POLICY "requests_insert_student" ON public.reward_requests
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid() AND status = 'pending');

-- 13. Class Memberships Policies
DROP POLICY IF EXISTS "class_students_select" ON public.class_students;
CREATE POLICY "class_students_select" ON public.class_students
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR student_id = auth.uid()
        OR public.is_class_teacher(class_id)
        OR public.is_counselor()
    );

DROP POLICY IF EXISTS "class_students_admin_all" ON public.class_students;
CREATE POLICY "class_students_admin_all" ON public.class_students
    FOR ALL TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "class_teachers_select" ON public.class_teachers;
CREATE POLICY "class_teachers_select" ON public.class_teachers
    FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR teacher_id = auth.uid()
        OR public.is_counselor()
        OR EXISTS (
            SELECT 1 FROM public.class_students cs
            WHERE cs.class_id = class_teachers.class_id AND cs.student_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "class_teachers_admin_all" ON public.class_teachers;
CREATE POLICY "class_teachers_admin_all" ON public.class_teachers
    FOR ALL TO authenticated
    USING (public.is_admin());

-- 14. Relationships Policies (Parent-Student & Coach-Student)
DROP POLICY IF EXISTS "parent_students_select" ON public.parent_students;
CREATE POLICY "parent_students_select" ON public.parent_students
    FOR SELECT TO authenticated
    USING (public.is_admin() OR parent_id = auth.uid());

DROP POLICY IF EXISTS "parent_students_admin_all" ON public.parent_students;
CREATE POLICY "parent_students_admin_all" ON public.parent_students
    FOR ALL TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "coach_students_select" ON public.coach_students;
CREATE POLICY "coach_students_select" ON public.coach_students
    FOR SELECT TO authenticated
    USING (public.is_admin() OR coach_id = auth.uid());

DROP POLICY IF EXISTS "coach_students_admin_all" ON public.coach_students;
CREATE POLICY "coach_students_admin_all" ON public.coach_students
    FOR ALL TO authenticated
    USING (public.is_admin());


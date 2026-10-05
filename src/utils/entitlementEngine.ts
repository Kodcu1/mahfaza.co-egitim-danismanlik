import { SubscriptionPlan, SubscriptionPlanId } from '../types';

/**
 * Mahfaza.co - Centralized Entitlement Engine
 * Real plan + entitlement + capacity architecture.
 * Strictly prevents hardcoded `if (plan === 'pro')` frontend checks.
 */

export const ENTITLEMENTS = {
  // Student Entitlements
  STUDENT_PROFILE_BASIC: 'student.profile.basic',
  STUDENT_CONTENT_BASIC: 'student.content.basic',
  STUDENT_CONTENT_EXPANDED: 'student.content.expanded',
  STUDENT_CONTENT_PREMIUM: 'student.content.premium',
  STUDENT_CONTENT_FULL_PREMIUM: 'student.content.full_premium',
  STUDENT_TASKS_BASIC: 'student.tasks.basic',
  STUDENT_TASKS_EXPANDED: 'student.tasks.expanded',
  STUDENT_TASKS_ADVANCED: 'student.tasks.advanced',
  STUDENT_SCHEDULE_BASIC: 'student.schedule.basic',
  STUDENT_XP_BASIC: 'student.xp.basic',
  STUDENT_STREAK_BASIC: 'student.streak.basic',
  STUDENT_EXAM_BASIC: 'student.exam.basic',
  STUDENT_EXAM_RESULTS: 'student.exam.results',
  STUDENT_EXAM_ANALYSIS_STANDARD: 'student.exam.analysis_standard',
  STUDENT_EXAM_ANALYSIS_ADVANCED: 'student.exam.analysis_advanced',
  STUDENT_PROGRESS_EXPANDED: 'student.progress.expanded',
  STUDENT_REPORTS_STANDARD: 'student.reports.standard',
  STUDENT_REPORTS_ADVANCED: 'student.reports.advanced',
  STUDENT_REPORTS_FULL: 'student.reports.full',
  STUDENT_ANALYTICS_ADVANCED: 'student.analytics.advanced',
  STUDENT_ANALYTICS_COMPREHENSIVE: 'student.analytics.comprehensive',
  STUDENT_PLANNING_ADVANCED: 'student.planning.advanced',
  STUDENT_GOAL_TRACKING: 'student.goal_tracking',
  STUDENT_PERFORMANCE_TRENDS: 'student.performance_trends',
  STUDENT_PARENT_SHARING_STANDARD: 'student.parent_sharing.standard',
  STUDENT_PARENT_REPORTS_ADVANCED: 'student.parent_reports.advanced',
  STUDENT_PARENT_EXPERIENCE_FULL: 'student.parent_experience.full',
  STUDENT_PERSONALIZATION_ADVANCED: 'student.personalization.advanced',
  STUDENT_PRODUCTIVITY_FULL: 'student.productivity.full',
  STUDENT_ACADEMIC_TOOLS_EXPANDED: 'student.academic_tools.expanded',
  STUDENT_MESSAGING_BASIC: 'student.messaging.basic',
  STUDENT_MESSAGING_STANDARD: 'student.messaging.standard',
  STUDENT_ANNOUNCEMENTS: 'student.announcements',
  STUDENT_NOTIFICATIONS_BASIC: 'student.notifications.basic',
  STUDENT_NOTIFICATIONS_ADVANCED: 'student.notifications.advanced',

  // Coach Entitlements
  COACH_STUDENT_MANAGEMENT: 'coach.student_management',
  COACH_STUDENT_MANAGEMENT_EXPANDED: 'coach.student_management.expanded',
  COACH_TASK_MANAGEMENT: 'coach.task_management',
  COACH_STUDY_PLANNING: 'coach.study_planning',
  COACH_STUDY_PLANNING_ADVANCED: 'coach.study_planning.advanced',
  COACH_STUDENT_PROGRESS: 'coach.student_progress',
  COACH_REPORTS_BASIC: 'coach.reports.basic',
  COACH_REPORTS_ADVANCED: 'coach.reports.advanced',
  COACH_ANALYTICS_ADVANCED: 'coach.analytics.advanced',
  COACH_ANALYTICS_PROFESSIONAL: 'coach.analytics.professional',
  COACH_PERFORMANCE_RISK_TRACKING: 'coach.performance_risk_tracking',
  COACH_PARENT_VISIBILITY: 'coach.parent_visibility',
  COACH_PARENT_REPORTING_EXPANDED: 'coach.parent_reporting.expanded',
  COACH_BULK_OPERATIONS: 'coach.bulk_operations',
  COACH_BULK_MANAGEMENT: 'coach.bulk_management',
  COACH_DASHBOARD_PROFESSIONAL: 'coach.dashboard.professional',
  COACH_MESSAGING: 'coach.messaging',
  COACH_NOTIFICATIONS_ADVANCED: 'coach.notifications.advanced',
  COACH_EXAM_ANALYSIS_BASIC: 'coach.exam_analysis.basic',

  // Teacher Entitlements
  TEACHER_CLASS_MANAGEMENT: 'teacher.class_management',
  TEACHER_CLASS_MANAGEMENT_EXPANDED: 'teacher.class_management.expanded',
  TEACHER_STUDENT_MANAGEMENT: 'teacher.student_management',
  TEACHER_STUDENT_MANAGEMENT_LARGE_SCALE: 'teacher.student_management.large_scale',
  TEACHER_CONTENT_PUBLISHING: 'teacher.content_publishing',
  TEACHER_CONTENT_MANAGEMENT_EXPANDED: 'teacher.content_management.expanded',
  TEACHER_CONTENT_TOOLS_EXPANDED: 'teacher.content_tools.expanded',
  TEACHER_HOMEWORK: 'teacher.homework',
  TEACHER_EXAMS: 'teacher.exams',
  TEACHER_ATTENDANCE: 'teacher.attendance',
  TEACHER_REPORTS_BASIC: 'teacher.reports.basic',
  TEACHER_REPORTS_ADVANCED: 'teacher.reports.advanced',
  TEACHER_ANALYTICS_ADVANCED: 'teacher.analytics.advanced',
  TEACHER_STUDENT_PROGRESS_ADVANCED: 'teacher.student_progress.advanced',
  TEACHER_BULK_OPERATIONS: 'teacher.bulk_operations',
  TEACHER_ADMINISTRATIVE_AUTHORIZED: 'teacher.administrative.authorized',
  TEACHER_MESSAGING: 'teacher.messaging',

  // Counselor Entitlements
  COUNSELOR_STUDENT_DEVELOPMENT: 'counselor.student_development',
  COUNSELOR_GUIDANCE_NOTES: 'counselor.guidance_notes',
  COUNSELOR_STUDENT_FOLLOW_UP: 'counselor.student_follow_up',
  COUNSELOR_PARENT_REPORTING: 'counselor.parent_reporting',
  COUNSELOR_ACADEMIC_PROGRESS: 'counselor.academic_progress',
  COUNSELOR_COMMUNICATION: 'counselor.communication',
  COUNSELOR_REPORTS: 'counselor.reports',
  COUNSELOR_ANALYTICS_ADVANCED: 'counselor.analytics.advanced',
  COUNSELOR_ANALYTICS_PROFESSIONAL: 'counselor.analytics.professional',
  COUNSELOR_LARGE_SCALE: 'counselor.large_scale',
  COUNSELOR_BULK_OPERATIONS: 'counselor.bulk_operations',
} as const;

export type EntitlementKey = (typeof ENTITLEMENTS)[keyof typeof ENTITLEMENTS] | string;

/**
 * Check whether a plan grants a specific capability
 */
export function hasEntitlement(
  plan: SubscriptionPlan | null | undefined,
  entitlement: EntitlementKey
): boolean {
  if (!plan) return false;
  if (Array.isArray(plan.entitlements) && plan.entitlements.includes(entitlement)) {
    return true;
  }
  return false;
}

/**
 * Get maximum student capacity for a professional plan
 */
export function getStudentCapacity(plan: SubscriptionPlan | null | undefined): number {
  if (!plan) return 10;
  if (typeof plan.student_capacity === 'number') {
    return plan.student_capacity;
  }
  if (typeof plan.limits?.student_capacity === 'number') {
    return plan.limits.student_capacity;
  }
  return 10;
}

/**
 * Check if professional user can add more students within authorized capacity
 */
export function checkCapacityLimit(
  currentStudentCount: number,
  plan: SubscriptionPlan | null | undefined
): {
  allowed: boolean;
  maxCapacity: number;
  remaining: number;
} {
  const maxCapacity = getStudentCapacity(plan);
  const remaining = Math.max(0, maxCapacity - currentStudentCount);
  const allowed = currentStudentCount < maxCapacity;

  return {
    allowed,
    maxCapacity,
    remaining,
  };
}

export interface TeacherAvailabilityMatrix {
  [dayOfWeek: number]: number[]; // day (1-7) -> array of periods that are UNAVAILABLE (busy/off)
}

const AVAILABILITY_STORAGE_KEY = 'mahfaza_teacher_availability_store_v1';

// Default mock availability for demo teachers
const DEFAULT_AVAILABILITIES: Record<string, TeacherAvailabilityMatrix> = {
  // Demo teacher 1: Off on Saturday and Friday afternoon
  '99999999-0000-0000-0000-000000000004': {
    6: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // Saturday off
    5: [9, 10, 11, 12], // Friday late afternoon off
    7: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // Sunday off
  },
};

export const teacherAvailabilityService = {
  getAllAvailabilities(): Record<string, TeacherAvailabilityMatrix> {
    try {
      const raw = localStorage.getItem(AVAILABILITY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_AVAILABILITIES, ...parsed };
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_AVAILABILITIES;
  },

  getTeacherAvailability(teacherId: string): TeacherAvailabilityMatrix {
    const all = this.getAllAvailabilities();
    return all[teacherId] || { 7: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }; // Sunday default off
  },

  setTeacherAvailability(teacherId: string, matrix: TeacherAvailabilityMatrix): void {
    try {
      const all = this.getAllAvailabilities();
      all[teacherId] = matrix;
      localStorage.setItem(AVAILABILITY_STORAGE_KEY, JSON.stringify(all));
    } catch {
      // ignore
    }
  },

  isTeacherAvailable(teacherId: string, dayOfWeek: number, period: number): boolean {
    const matrix = this.getTeacherAvailability(teacherId);
    const unavailablePeriods = matrix[dayOfWeek] || [];
    return !unavailablePeriods.includes(period);
  },

  toggleSlot(teacherId: string, dayOfWeek: number, period: number): boolean {
    const matrix = { ...this.getTeacherAvailability(teacherId) };
    const currentList = matrix[dayOfWeek] ? [...matrix[dayOfWeek]] : [];
    let isNowAvailable = false;

    if (currentList.includes(period)) {
      // Currently unavailable -> make available
      matrix[dayOfWeek] = currentList.filter((p) => p !== period);
      isNowAvailable = true;
    } else {
      // Currently available -> make unavailable
      matrix[dayOfWeek] = [...currentList, period];
      isNowAvailable = false;
    }

    this.setTeacherAvailability(teacherId, matrix);
    return isNowAvailable;
  },

  setDayAllAvailable(teacherId: string, dayOfWeek: number): void {
    const matrix = { ...this.getTeacherAvailability(teacherId) };
    matrix[dayOfWeek] = [];
    this.setTeacherAvailability(teacherId, matrix);
  },

  setDayAllUnavailable(teacherId: string, dayOfWeek: number, allPeriods: number[]): void {
    const matrix = { ...this.getTeacherAvailability(teacherId) };
    matrix[dayOfWeek] = [...allPeriods];
    this.setTeacherAvailability(teacherId, matrix);
  },
};

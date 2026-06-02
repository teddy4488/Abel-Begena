/**
 * Scheduling constants for the self-paced package model.
 *
 * A "class" is a package (instrument + duration). A student picks one (day, time)
 * slot per session/week. Each session is 1.5h within the operating day 08:00–19:30.
 */

export type WeekDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export const WEEK_DAYS: WeekDay[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export type DurationMonths = 3 | 6 | 9;

/** Duration (months) → number of sessions a student attends per week. */
export const SESSIONS_PER_WEEK: Record<DurationMonths, number> = {
  3: 5,
  6: 3,
  9: 2,
};

export function sessionsPerWeek(duration?: number | null): number | undefined {
  if (duration === 3 || duration === 6 || duration === 9) {
    return SESSIONS_PER_WEEK[duration];
  }
  return undefined;
}

/** Length of a single class session, in minutes. */
export const SESSION_MINUTES = 90;

/** Operating day boundaries (local time), in minutes from midnight. */
export const DAY_START_MIN = 8 * 60; // 08:00
export const DAY_END_MIN = 19 * 60 + 30; // 19:30
/** Latest start so a full 90-min session still ends by DAY_END (18:00). */
export const LATEST_START_MIN = DAY_END_MIN - SESSION_MINUTES; // 18:00

/** Bucket size for the admin occupancy visualization. */
export const BUCKET_MINUTES = 30;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimeString(value: string): boolean {
  return TIME_RE.test(value);
}

/** "HH:mm" → minutes from midnight. Returns NaN for malformed input. */
export function toMinutes(hhmm: string): number {
  if (!isValidTimeString(hhmm)) return NaN;
  const [h, m] = hhmm.split(':').map((p) => parseInt(p, 10));
  return h * 60 + m;
}

/** minutes from midnight → "HH:mm". */
export function toHHmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** True when a start time is within the allowed session-start window [08:00, 18:00]. */
export function isStartWithinHours(startMinutes: number): boolean {
  return startMinutes >= DAY_START_MIN && startMinutes <= LATEST_START_MIN;
}

/**
 * Whether a 90-min session beginning at `slotStartMin` is in progress during the
 * 30-min bucket beginning at `bucketStartMin`. Half-open intervals.
 */
export function slotOverlapsBucket(
  slotStartMin: number,
  bucketStartMin: number,
): boolean {
  const slotEnd = slotStartMin + SESSION_MINUTES;
  const bucketEnd = bucketStartMin + BUCKET_MINUTES;
  return slotStartMin < bucketEnd && slotEnd > bucketStartMin;
}

/** Normalize an id-ish value (ObjectId, populated doc, or string) to its string id. */
function idToString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  const obj = value as { _id?: { toString: () => string }; toString?: () => string };
  if (obj._id) return obj._id.toString();
  return obj.toString?.();
}

/**
 * True when `userId` is a teacher of this class — checking the legacy `instructorId`,
 * the `primaryInstructorId`, AND membership in `teacherIds` (multi-teacher support).
 */
export function userMatchesClassTeacher(
  classEntity: {
    instructorId?: unknown;
    primaryInstructorId?: unknown;
    teacherIds?: unknown[];
  },
  userId: string,
): boolean {
  if (idToString(classEntity.instructorId) === userId) return true;
  if (idToString(classEntity.primaryInstructorId) === userId) return true;
  const teachers = classEntity.teacherIds ?? [];
  return teachers.some((t) => idToString(t) === userId);
}

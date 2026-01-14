import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";
import type { InstrumentType } from "./storeApi";

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type LearningType = 'physical' | 'online';
export type AttendanceStatus = 'present' | 'late' | 'excused';

export type TeachingTimeRange = {
  day: DayOfWeek;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
};

export type TeacherParticipant = {
  _id: string;
  fullName: string;
  instruments: InstrumentType[];
  teachingDays: DayOfWeek[];
  timeRanges: TeachingTimeRange[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type StudentParticipant = {
  _id: string;
  fullName: string;
  attendanceNumber: string;
  branchId: {
    _id: string;
    name: string;
    slug: string;
  } | string;
  learningType: LearningType;
  instrumentType: InstrumentType;
  programDurationMonths: 3 | 6 | 9;
  preferredLearningDays: DayOfWeek[];
  registrationStartDate: string;
  learningDaysPerWeek: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type InstrumentLesson = {
  _id: string;
  instrumentType: InstrumentType;
  title: string;
  code?: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TeacherAttendanceRecord = {
  _id: string;
  participantId: {
    _id: string;
    fullName: string;
    instruments: InstrumentType[];
    teachingDays: DayOfWeek[];
  } | string;
  checkInAt: string;
  checkOutAt?: string;
  durationMinutes?: number;
  recordedBy?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

export type RegisterTeacherParticipantBody = {
  fullName: string;
  instruments: InstrumentType[];
  teachingDays: DayOfWeek[];
  timeRanges: TeachingTimeRange[];
};

export type RegisterStudentParticipantBody = {
  fullName: string;
  branchId: string;
  learningType: LearningType;
  instrumentType: InstrumentType;
  programDurationMonths: 3 | 6 | 9;
  preferredLearningDays: DayOfWeek[];
  registrationStartDate: string;
  attendanceNumber?: string;
};

export type RecordStudentAttendanceBody = {
  participantId: string;
  lessonId: string;
  revisedLessonId?: string;
  status?: AttendanceStatus;
};

export const attendanceApi = createApi({
  reducerPath: "attendanceApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["TeacherParticipants", "StudentParticipants", "TeacherToday", "Lessons"],
  endpoints: (builder) => ({
    getTeacherParticipants: builder.query<TeacherParticipant[], void>({
      query: () => "/attendance/teachers/participants",
      providesTags: ["TeacherParticipants"],
    }),
    getStudentParticipants: builder.query<StudentParticipant[], void>({
      query: () => "/attendance/students/participants",
      providesTags: ["StudentParticipants"],
    }),
    getStudentByAttendanceNumber: builder.query<StudentParticipant, string>({
      query: (attendanceNumber) => `/attendance/students/lookup/${attendanceNumber}`,
    }),
    registerTeacherParticipant: builder.mutation<
      TeacherParticipant,
      RegisterTeacherParticipantBody
    >({
      query: (body) => ({
        url: "/attendance/teachers/register",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TeacherParticipants"],
    }),
    registerStudentParticipant: builder.mutation<
      StudentParticipant,
      RegisterStudentParticipantBody
    >({
      query: (body) => ({
        url: "/attendance/students/register",
        method: "POST",
        body,
      }),
      invalidatesTags: ["StudentParticipants"],
    }),
    teacherCheckIn: builder.mutation<
      TeacherAttendanceRecord,
      { participantId: string }
    >({
      query: (body) => ({
        url: "/attendance/teachers/check-in",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TeacherToday"],
    }),
    teacherCheckOut: builder.mutation<
      TeacherAttendanceRecord,
      { participantId: string }
    >({
      query: (body) => ({
        url: "/attendance/teachers/check-out",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TeacherToday"],
    }),
    getTodayTeacherAttendance: builder.query<TeacherAttendanceRecord[], void>({
      query: () => "/attendance/teachers/today",
      providesTags: ["TeacherToday"],
    }),
    recordStudentAttendance: builder.mutation<
      unknown,
      RecordStudentAttendanceBody
    >({
      query: (body) => ({
        url: "/attendance/students/record",
        method: "POST",
        body,
      }),
      invalidatesTags: ["StudentParticipants"],
    }),
    getInstrumentLessons: builder.query<
      InstrumentLesson[],
      string | undefined
    >({
      query: (instrumentType) => ({
        url: "/attendance/lessons",
        params: instrumentType ? { instrumentType } : {},
      }),
      providesTags: ["Lessons"],
    }),
    createLesson: builder.mutation<
      InstrumentLesson,
      { instrumentType: InstrumentType; title: string; code?: string; order?: number }
    >({
      query: (body) => ({
        url: "/attendance/lessons",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Lessons"],
    }),
    updateLesson: builder.mutation<
      InstrumentLesson,
      { id: string; title?: string; code?: string; order?: number; isActive?: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: `/attendance/lessons/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Lessons"],
    }),
    deleteLesson: builder.mutation<
      { success: boolean },
      string
    >({
      query: (id) => ({
        url: `/attendance/lessons/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Lessons"],
    }),
  }),
});

export const {
  useGetTeacherParticipantsQuery,
  useGetStudentParticipantsQuery,
  useGetStudentByAttendanceNumberQuery,
  useRegisterTeacherParticipantMutation,
  useRegisterStudentParticipantMutation,
  useTeacherCheckInMutation,
  useTeacherCheckOutMutation,
  useGetTodayTeacherAttendanceQuery,
  useRecordStudentAttendanceMutation,
  useGetInstrumentLessonsQuery,
  useCreateLessonMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
} = attendanceApi;

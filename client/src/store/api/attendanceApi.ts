import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";
import type { InstrumentType } from "./storeApi";

export type TeacherParticipant = {
  _id: string;
  userId: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role?: string;
  };
  displayName?: string;
  isActive: boolean;
};

export type StudentParticipant = {
  _id: string;
  userId: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role?: string;
  };
  attendanceNumber: string;
  instrumentType: InstrumentType;
  programDurationMonths: 3 | 6 | 9;
  isActive: boolean;
};

export type InstrumentLesson = {
  _id: string;
  instrumentType: InstrumentType;
  title: string;
  code?: string;
  order: number;
  isActive: boolean;
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
    registerTeacherParticipant: builder.mutation<
      TeacherParticipant,
      { userId: string; displayName?: string }
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
      {
        userId: string;
        instrumentType: InstrumentType;
        programDurationMonths: 3 | 6 | 9;
        classId?: string;
        attendanceNumber?: string;
      }
    >({
      query: (body) => ({
        url: "/attendance/students/register",
        method: "POST",
        body,
      }),
      invalidatesTags: ["StudentParticipants"],
    }),
    teacherCheckIn: builder.mutation<
      unknown,
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
      unknown,
      { participantId: string }
    >({
      query: (body) => ({
        url: "/attendance/teachers/check-out",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TeacherToday"],
    }),
    getTodayTeacherAttendance: builder.query<
      any[],
      void
    >({
      query: () => "/attendance/teachers/today",
      providesTags: ["TeacherToday"],
    }),
    recordStudentAttendance: builder.mutation<
      unknown,
      {
        attendanceNumber: string;
        lessonId: string;
        revisedLessonId?: string;
        status: "present" | "late" | "excused";
      }
    >({
      query: (body) => ({
        url: "/attendance/students/record",
        method: "POST",
        body,
      }),
    }),
    getInstrumentLessons: builder.query<
      InstrumentLesson[],
      void
    >({
      query: () => "/attendance/lessons",
      providesTags: ["Lessons"],
    }),
  }),
});

export const {
  useGetTeacherParticipantsQuery,
  useGetStudentParticipantsQuery,
  useRegisterTeacherParticipantMutation,
  useRegisterStudentParticipantMutation,
  useTeacherCheckInMutation,
  useTeacherCheckOutMutation,
  useGetTodayTeacherAttendanceQuery,
  useRecordStudentAttendanceMutation,
  useGetInstrumentLessonsQuery,
} = attendanceApi;


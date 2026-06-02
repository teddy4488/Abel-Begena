"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";

export type PaymentRequestType = "enrollment" | "order" | "student_monthly_fee";
export type PaymentRequestStatus = "pending" | "approved" | "rejected";

export type PaymentRequest = {
  _id: string;
  userId: string | { _id: string; firstName?: string; lastName?: string; email?: string };
  type: PaymentRequestType;
  targetId?: string | null;
  amount: number;
  currency: string;
  method: string;
  reference?: string;
  receiptUrl?: string;
  status: PaymentRequestStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  conversionData?: string; // JSON string for storing metadata (e.g., month/year for student monthly fees)
  /** Agreed monthly fee for the payer (expected amount) — for expected-vs-submitted display. */
  expectedFee?: number;
  sideEffectsApplied?: boolean;
  appliedPeriod?: number;
  createdAt: string;
  updatedAt?: string;
};

export type PaymentHistoryFilters = {
  status?: "pending" | "approved" | "rejected" | "all";
  type?: PaymentRequestType;
  from?: string;
  to?: string;
  q?: string;
};

export type CreatePaymentRequestBody = {
  type: PaymentRequestType;
  targetId?: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string;
  receiptUrl?: string;
  reviewNote?: string;
  conversionData?: string; // JSON string for enrollment (e.g. student profile for convertUserToStudent)
};

export type UpdatePaymentStatusBody = {
  status: "approved" | "rejected";
  reason?: string;
};

export const paymentApi = createApi({
  reducerPath: "paymentApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["PaymentRequests"],
  endpoints: (builder) => ({
    getMyPaymentRequests: builder.query<PaymentRequest[], void>({
      query: () => "/payments/me",
      providesTags: ["PaymentRequests"],
    }),
    getPendingPaymentRequests: builder.query<
      PaymentRequest[],
      { type?: PaymentRequestType } | void
    >({
      query: (params) => ({
        url: "/payments",
        params: params ? { type: params.type, status: "pending" } : { status: "pending" },
      }),
      providesTags: ["PaymentRequests"],
    }),
    // Admin payment history/ledger with filters (status pending|approved|rejected|all).
    getPaymentHistory: builder.query<PaymentRequest[], PaymentHistoryFilters | void>({
      query: (params) => ({
        url: "/payments",
        params: params ?? { status: "all" },
      }),
      providesTags: ["PaymentRequests"],
    }),
    createPaymentRequest: builder.mutation<PaymentRequest, CreatePaymentRequestBody>({
      query: (body) => ({
        url: "/payments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PaymentRequests"],
    }),
    updatePaymentStatus: builder.mutation<
      PaymentRequest,
      { id: string; body: UpdatePaymentStatusBody }
    >({
      query: ({ id, body }) => ({
        url: `/payments/${id}/decision`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["PaymentRequests"],
    }),
    // Admin repair: re-run the side effects of an already-approved payment.
    retryPaymentSideEffects: builder.mutation<PaymentRequest, { id: string }>({
      query: ({ id }) => ({
        url: `/payments/${id}/retry-side-effects`,
        method: "POST",
      }),
      invalidatesTags: ["PaymentRequests"],
    }),
    submitStudentMonthlyPayment: builder.mutation<
      PaymentRequest,
      {
        month: number;
        year: number;
        amount: number;
        receiptUrl?: string;
        reference?: string;
        reviewNote?: string;
      }
    >({
      query: (body) => ({
        url: "/payments/student/monthly",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PaymentRequests"],
    }),
  }),
});

export const {
  useGetMyPaymentRequestsQuery,
  useGetPendingPaymentRequestsQuery,
  useGetPaymentHistoryQuery,
  useCreatePaymentRequestMutation,
  useUpdatePaymentStatusMutation,
  useRetryPaymentSideEffectsMutation,
  useSubmitStudentMonthlyPaymentMutation,
} = paymentApi;

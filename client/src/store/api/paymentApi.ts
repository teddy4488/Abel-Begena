"use client";

import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";

export type PaymentRequestType = "enrollment" | "order" | "tuition" | "student_conversion" | "student_monthly_fee";
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
  createdAt: string;
  updatedAt?: string;
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
  conversionData?: string; // JSON string for student_conversion type
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
  useCreatePaymentRequestMutation,
  useUpdatePaymentStatusMutation,
  useSubmitStudentMonthlyPaymentMutation,
} = paymentApi;

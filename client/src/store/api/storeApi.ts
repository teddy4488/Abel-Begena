"use client";

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";

export type Product = {
  _id: string;
  name: string;
  instrumentType: string;
  shortDescription?: string;
  price: number;
  stock: number;
  images?: string[];
  attributes?: Record<string, unknown>;
};

export type CartItemResponse = {
  productId: string;
  product: { name: string; images?: string[] } | null;
  quantity: number;
  priceAtCheckout: number;
  subtotal: number;
};

export type CartSummary = {
  items: CartItemResponse[];
  totalAmount: number;
  itemCount: number;
};

export type Order = {
  _id: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  isPaid: boolean;
  createdAt: string;
  items: CartItemResponse[];
};

export const storeApi = createApi({
  reducerPath: "storeApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
    credentials: "include",
  }),
  tagTypes: ["Products", "Cart", "Orders"],
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], void>({
      query: () => "/products",
      providesTags: ["Products"],
    }),
    getProductById: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Products", id }],
    }),
    addToCart: builder.mutation<
      CartSummary,
      { productId: string; quantity: number }
    >({
      query: (body) => ({
        url: "/orders/cart/add",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Cart"],
    }),
    getCart: builder.query<CartSummary, void>({
      query: () => "/orders/cart",
      providesTags: ["Cart"],
    }),
    checkout: builder.mutation<
      Order,
      {
        shippingAddress: {
          city: string;
          street: string;
          postalCode: string;
          phone: string;
        };
        paymentMethod: string;
      }
    >({
      query: (body) => ({
        url: "/orders/checkout",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Cart", "Orders"],
    }),
    getMyOrders: builder.query<Order[], void>({
      query: () => "/orders/my-orders",
      providesTags: ["Orders"],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useAddToCartMutation,
  useGetCartQuery,
  useCheckoutMutation,
  useGetMyOrdersQuery,
} = storeApi;


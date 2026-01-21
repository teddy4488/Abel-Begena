import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";

export type InstrumentType = "Begena" | "Kirar" | "Masinko" | "Washint" | "Kebero" | "Other";

export type Product = {
  _id: string;
  name: string;
  instrumentType: InstrumentType;
  shortDescription?: string;
  price: number;
  stock: number;
  images?: string[];
  attributes?: Record<string, unknown>;
  discountPrice?: number;
  promoActive?: boolean;
  isActive?: boolean;
  createdAt?: string;
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
  receiptUrl?: string;
  createdAt: string;
  updatedAt?: string;
  items: CartItemResponse[];
};

export const storeApi = createApi({
  reducerPath: "storeApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["Products", "Cart", "Orders"],
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], void>({
      query: () => "/products",
      providesTags: ["Products"],
    }),
    getManageProducts: builder.query<Product[], void>({
      query: () => "/products/manage",
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
        deliveryOption: "Pickup" | "Delivery";
        pickupBranchId?: string;
        shippingAddress?: {
          city: string;
          street: string;
          postalCode: string;
          phone: string;
        };
        paymentMethod: string;
        receiptUrl?: string;
      }
    >({
      query: (body) => ({
        url: "/orders/checkout",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Cart", "Orders"],
    }),
    uploadReceipt: builder.mutation<{ url: string }, { file: File }>({
      query: ({ file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: "/uploads/receipt",
          method: "POST",
          body: formData,
        };
      },
    }),
    getMyOrders: builder.query<Order[], void>({
      query: () => "/orders/my-orders",
      providesTags: ["Orders"],
    }),
    getAllOrders: builder.query<Order[], void>({
      query: () => "/orders",
      providesTags: ["Orders"],
    }),
    createProduct: builder.mutation<Product, Partial<Product>>({
      query: (body) => ({
        url: "/products",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Products"],
    }),
    updateProduct: builder.mutation<
      Product,
      { id: string; data: Partial<Product> }
    >({
      query: ({ id, data }) => ({
        url: `/products/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Products"],
    }),
    deleteProduct: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Products"],
    }),
    updateOrderStatus: builder.mutation<
      Order,
      { id: string; status?: string; isPaid?: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: `/orders/${id}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Orders"],
    }),
    uploadProductImage: builder.mutation<
      Product,
      { id: string; file: File }
    >({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: `/products/${id}/images`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Products"],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetManageProductsQuery,
  useGetProductByIdQuery,
  useAddToCartMutation,
  useGetCartQuery,
  useCheckoutMutation,
  useUploadReceiptMutation,
  useGetMyOrdersQuery,
  useGetAllOrdersQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUpdateOrderStatusMutation,
  useUploadProductImageMutation,
} = storeApi;


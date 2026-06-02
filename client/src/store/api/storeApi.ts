import { createApi } from "@reduxjs/toolkit/query/react";
import { authorizedBaseQuery } from "./baseQuery";

export type InstrumentType = "Begena" | "Kirar" | "Masinko" | "Washint" | "Kebero" | "Other";

export type Product = {
  _id: string;
  name: string;
  instrumentType: InstrumentType;
  shortDescription?: string;
  description?: string;
  price: number;
  stock: number;
  lowStockThreshold?: number;
  images?: string[];
  attributes?: Record<string, unknown>;
  discountPrice?: number;
  promoActive?: boolean;
  isActive?: boolean;
  createdAt?: string;
};

export type ProductListResponse = {
  items: Product[];
  total: number;
};

export type ProductListArgs = {
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
};

export type CartItemResponse = {
  productId: string;
  productName?: string | null;
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
  deliveryOption?: "Pickup" | "Delivery" | string;
  shippingAddress?: {
    city: string;
    street: string;
    postalCode: string;
    phone: string;
  };
  pickupBranchId?:
    | string
    | {
        _id: string;
        name: string;
        address?: string;
        city?: string;
        region?: string;
      };
  user?:
    | string
    | {
        _id: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
      };
  trackingNumber?: string;
  trackingCarrier?: string;
  createdAt: string;
  updatedAt?: string;
  items: CartItemResponse[];
};

function buildProductQuery(args?: ProductListArgs): string {
  const params = new URLSearchParams();
  if (args?.search) params.set("search", args.search);
  if (args?.type) params.set("type", args.type);
  if (args?.page) params.set("page", String(args.page));
  if (args?.limit) params.set("limit", String(args.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const storeApi = createApi({
  reducerPath: "storeApi",
  baseQuery: authorizedBaseQuery,
  tagTypes: ["Products", "Cart", "Orders"],
  endpoints: (builder) => ({
    getProducts: builder.query<ProductListResponse, ProductListArgs | void>({
      query: (args) => `/products${buildProductQuery(args ?? undefined)}`,
      providesTags: ["Products"],
    }),
    getManageProducts: builder.query<ProductListResponse, ProductListArgs | void>({
      query: (args) => `/products/manage${buildProductQuery(args ?? undefined)}`,
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
      {
        id: string;
        status?: string;
        isPaid?: boolean;
        trackingNumber?: string;
        trackingCarrier?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/orders/${id}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Orders"],
    }),
    cancelOrder: builder.mutation<Order, string>({
      query: (id) => ({
        url: `/orders/${id}/cancel`,
        method: "POST",
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
    updateProductImages: builder.mutation<
      Product,
      { id: string; images: string[] }
    >({
      query: ({ id, images }) => ({
        url: `/products/${id}/images`,
        method: "PATCH",
        body: { images },
      }),
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
  useCancelOrderMutation,
  useUploadProductImageMutation,
  useUpdateProductImagesMutation,
} = storeApi;


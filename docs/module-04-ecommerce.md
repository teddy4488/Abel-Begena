# Module 4 — E-commerce

## Purpose
Fixes two data-integrity blockers (IDOR on order endpoint, missing stock restoration), closes four server-side correctness gaps, and adds nine missing e-commerce features that were approved for inclusion.

---

## User stories

| ID | Story | Acceptance criteria |
|---|---|---|
| U-007 | As a user, I want to browse and filter instruments before buying. | Product list supports search by name and filter by instrument type; paginated. |
| U-007b | As a user, I want to see full instrument details before buying. | Product detail shows long description, stock status, stock-capped quantity, and related instruments. |
| U-007c | As a user, I want to add items to my cart and check out. | Cart prevents quantities above stock; checkout shows "contact us for shipping" when delivery is selected. |
| U-007d | As a user, I want to track and manage my orders. | Orders list shows tracking number when available; user can cancel orders that are still Pending or PaymentPending. |
| A-005 | As an admin, I want to manage products fully. | Product form includes long description; images can be deleted and reordered; low-stock stat uses each product's threshold; currency is ETB throughout. |
| A-005b | As an admin, I want to be notified when stock is low. | When stock drops to or below a product's lowStockThreshold, all Admin users receive an in-app notification. |
| A-005c | As an admin, I want to add tracking info when I ship an order. | Status update to Shipped includes optional tracking number and carrier; customer sees it in their order history. |

---

## Decision log

| Topic | Decision |
|---|---|
| Shipping cost | No calculation — show "Contact us for shipping cost" message when Delivery is selected at checkout. No backend change needed. |
| Image management endpoint | Single `PATCH /products/:id/images` that accepts the full new images array — covers both delete and reorder in one call. Client builds the new array and sends it. |
| Low-stock notification trigger | Fires inside `OrderService` after every `reduceStock` call (checkout + payment approval). If new stock ≤ `lowStockThreshold`, notifies all Admin users via the existing `NotificationService`. |
| Customer cancel scope | Only allowed when `status` is `Pending` (COD) or `PaymentPending` (offline). Stock restored only for `Pending` orders (COD reserved stock at checkout). |
| Product name snapshot | Added `productName` to `OrderItem` subdocument; set at checkout so historical orders show correct name even if product is later renamed or deleted. |
| Tracking number | Two fields: `trackingNumber` (string) and `trackingCarrier` (string). Admin sets both when marking an order `Shipped`. |

---

## Schema changes

### `server/src/product/schemas/product.schema.ts`
- Add `description?: string` — long-form product description (markdown, max 5000 chars)

### `server/src/order/schemas/order.schema.ts`
- `OrderItem`: add `productName: string` — snapshot of product name at checkout time
- `Order`: add `trackingNumber?: string` and `trackingCarrier?: string`

---

## Step-by-step implementation plan

### Step 1 — Schema updates (server)

**1a. `product.schema.ts`**
Add after `shortDescription`:
```
@Prop({ trim: true, maxlength: 5000 })
description?: string;
```

**1b. `order.schema.ts` — OrderItem**
Add after `_id`:
```
@Prop({ trim: true, maxlength: 200 })
productName: string;
```

**1c. `order.schema.ts` — Order**
Add near the end of the class:
```
@Prop({ trim: true, maxlength: 120 })
trackingNumber?: string;

@Prop({ trim: true, maxlength: 80 })
trackingCarrier?: string;
```

---

### Step 2 — DTO updates (server)

**2a. `create-product.dto.ts`**
Add `@IsOptional() @IsString() @MaxLength(5000) description?: string`

**2b. `update-product.dto.ts`**
Same field addition. Also add `@IsOptional() @IsArray() @IsString({ each: true }) images?: string[]` for the image-replace endpoint.

**2c. `update-order-status.dto.ts`**
Add:
- `@IsOptional() @IsString() @MaxLength(120) trackingNumber?: string`
- `@IsOptional() @IsString() @MaxLength(80) trackingCarrier?: string`

**2d. New `cancel-order.dto.ts`** (in `order/dto/`)
Empty DTO or optional `@IsOptional() @IsString() reason?: string` for future use. The endpoint needs no body but a DTO keeps it consistent.

---

### Step 3 — `product.service.ts` changes

**3a. `findAll` — add search, filter, pagination**
Change signature to:
```typescript
async findAll(options?: {
  includeInactive?: boolean;
  search?: string;
  instrumentType?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: Product[]; total: number }>
```
Build a Mongoose filter from `search` (regex on name + shortDescription) and `instrumentType` (exact match). Apply `.skip((page-1)*limit).limit(limit)`. Return `{ items, total }`.

**3b. `reduceStock` — make atomic**
Replace the current read-modify-write with:
```typescript
const result = await this.productModel.findOneAndUpdate(
  { _id: id, stock: { $gte: quantity } },
  { $inc: { stock: -quantity } },
  { new: true },
);
if (!result) throw new BadRequestException('Insufficient stock or product not found');
return result.toObject();
```
This is a single atomic DB operation — eliminates the race condition.

**3c. New `restoreStock(id, quantity)` method**
```typescript
async restoreStock(id: string, quantity: number): Promise<void> {
  await this.productModel.updateOne(
    { _id: id },
    { $inc: { stock: quantity } },
  );
}
```

**3d. New `updateImages(id, images)` method**
Replaces the entire images array:
```typescript
async updateImages(id: string, images: string[]): Promise<Product> {
  const product = await this.productModel
    .findByIdAndUpdate(id, { images }, { new: true })
    .exec();
  if (!product) throw new NotFoundException('Product not found');
  return product.toObject();
}
```

---

### Step 4 — `product.controller.ts` changes

**4a. `GET /products`**
Add `@Query` params: `search`, `type`, `page`, `limit`. Pass to `findAll`. Return the `{ items, total }` shape.

**4b. `GET /products/manage`**
Same pagination support for admin.

**4c. `POST /products` — remove Teacher**
Change `@Roles('Admin', 'Teacher')` → `@Roles('Admin')`. Permission matrix is Admin-only.

**4d. New `PATCH /products/:id/images`**
Accepts `{ images: string[] }` body — the full new ordered array. Calls `productService.updateImages`. Admin only. Handles both reorder and delete (client builds the new array).

---

### Step 5 — `order.service.ts` changes

**5a. `checkout` — snapshot productName**
In the `normalizedItems.push(...)` block, add:
```typescript
productName: product.name,
```
so each order item permanently records the name it was checked out with.

**5b. `findById` — add ownership check**
Add an optional `requestingUserId?: string` parameter. If provided and the requesting user is not an Admin, add a `user: new Types.ObjectId(requestingUserId)` filter to the query. Returns null (→ 404) if the order belongs to a different user.

**5c. `updateStatus` — add stock restore on CANCELLED + tracking fields**
At the start of `updateStatus`, if `nextStatus === OrderStatus.CANCELLED` and `existing.status` was `Pending` (meaning stock was already reserved for COD), restore stock for each item:
```typescript
if (nextStatus === OrderStatus.CANCELLED && existing.status === OrderStatus.PENDING) {
  for (const item of existing.items) {
    await this.productService.restoreStock(item.productId.toString(), item.quantity);
  }
}
```
Also, when `trackingNumber` is provided in the DTO, set it on the order:
```typescript
if (dto.trackingNumber) existing.trackingNumber = dto.trackingNumber;
if (dto.trackingCarrier) existing.trackingCarrier = dto.trackingCarrier;
```

**5d. New `cancelOrder(orderId, userId)` method**
- Find order where `_id === orderId` AND `user === userId` (ownership enforced)
- Reject if status is not `Pending` or `PaymentPending`
- If `Pending` (COD — stock reserved): call `restoreStock` for each item
- If `PaymentPending` (offline — stock not yet reserved): no stock action
- Set `status = OrderStatus.CANCELLED`
- Save and return

**5e. Low-stock notification after reduceStock**
After each `this.productService.reduceStock(...)` call in `checkout` (and the equivalent in `payment.service`), check the returned product's stock. If `product.stock <= (product.lowStockThreshold ?? 0)` and threshold is > 0, find all Admin users via `this.userService.findAdmins()` and call `notificationService.createForUser` for each with type `low_stock` and the product name + stock count in the message.

*(Requires injecting `NotificationService` in `OrderService` and importing `NotificationModule` in `OrderModule`.)*

---

### Step 6 — `order.controller.ts` changes

**6a. `GET /orders/:id` — fix IDOR**
Change from:
```typescript
async findOne(@Param('id') id: string) {
  const order = await this.orderService.findById(id);
```
To:
```typescript
async findOne(
  @Param('id') id: string,
  @Request() req: { user: { sub: string; role: string } },
) {
  const isAdmin = req.user.role === 'Admin' || req.user.role === 'SuperAdmin';
  const order = await this.orderService.findById(
    id,
    isAdmin ? undefined : req.user.sub,
  );
```
Non-admin users can only see their own orders; Admins see any.

**6b. New `POST /orders/:id/cancel`**
Customer-only endpoint (JwtAuthGuard, no RoleGuard):
```typescript
@Post(':id/cancel')
cancelOrder(
  @Param('id') id: string,
  @Request() req: { user: { sub: string } },
) {
  return this.orderService.cancelOrder(id, req.user.sub);
}
```

**6c. `PATCH /orders/:id/status` — pass tracking fields**
Forward `updateOrderStatusDto.trackingNumber` and `updateOrderStatusDto.trackingCarrier` from controller to service.

---

### Step 7 — `payment.service.ts` — stock restore on rejection

In the rejection branch (`dto.status === 'rejected'` and `payment.type === 'order'`), after setting `PAYMENT_REJECTED`, also restore stock — **only if the order was previously approved** (meaning stock was reserved on approval). Check if `order.status === OrderStatus.PROCESSING` (or similar "stock-reserved" state) before restoring. Since stock is reserved on payment approval (`reduceStock` called then), restore it on rejection:
```typescript
for (const item of order.items) {
  await this.productService.restoreStock(item.productId.toString(), item.quantity);
}
```

---

### Step 8 — `order.module.ts`
Import `NotificationModule` and add `NotificationService` to providers (or use `forwardRef` if circular).

---

### Step 9 — Client: `storeApi.ts`

Update types:
- `Product`: add `description?: string`, `lowStockThreshold?: number`
- `Order`: add `trackingNumber?: string`, `trackingCarrier?: string`

Update endpoints:
- `getProducts`: change to accept `{ search?: string; type?: string; page?: number; limit?: number }` arg; URL becomes `/products?search=...&type=...&page=...&limit=...`; return type changes to `{ items: Product[]; total: number }`
- Add `cancelOrder` mutation: `POST /orders/:id/cancel`
- Add `updateProductImages` mutation: `PATCH /products/:id/images` with `{ images: string[] }`
- Add `getRelatedProducts` query: `GET /products?type={type}&limit=4` (reuses getProducts)

---

### Step 10 — Client: `store/page.tsx`

- Add search input (debounced, wires to `search` query param)
- Add instrument type filter (dropdown: All, Begena, Kirar, Masinko, Washint, Kebero, Other)
- Add pagination controls (Previous / Next, page indicator) based on `total`
- Fix currency: all `"USD"` → `"ETB"` in `toLocaleString` calls

---

### Step 11 — Client: `store/[id]/page.tsx`

- Fix currency: `"USD"` → `"ETB"`
- Clamp quantity: `+` button max = `data.stock`; disable when `quantity >= data.stock`
- Out-of-stock state: when `data.stock === 0`, disable Add to Cart + show "Out of Stock" badge
- Show `data.description` in an expandable section below the short description (if present)
- Add Related Products section at the bottom: fetches `getProducts({ type: data.instrumentType, limit: 4 })` and filters out the current product

---

### Step 12 — Client: `checkout/page.tsx`

When `form.deliveryOption === 'Delivery'`, show a note below the address fields:
> "Shipping cost is not included. Our team will contact you with the shipping fee before dispatch."

No backend change. UI-only.

---

### Step 13 — Client: `account/orders/page.tsx` + `student/orders/page.tsx`

- Add "Cancel Order" button: visible when `order.status === 'Pending' || order.status === 'PaymentPending'`; calls `cancelOrder` mutation; shows confirmation before calling
- Show tracking info: when `order.status === 'Shipped'` and `order.trackingNumber` is present, display carrier + tracking number in the order card

---

### Step 14 — Client: `admin/store/page.tsx`

- Fix currency: `"USD"` → `"ETB"` in product listing and form displays
- Fix low-stock stat: change `(p.stock ?? 0) < 10` → `(p.stock ?? 0) <= (p.lowStockThreshold ?? 0) && (p.lowStockThreshold ?? 0) > 0`
- Add `description` field to create/edit product form (textarea, markdown hint)
- Image management UI: show each image thumbnail with a ✕ delete button; add up/down arrow buttons for reorder; on any change, call `updateProductImages` with the new array

---

### Step 15 — Client: `admin/orders/page.tsx`

When admin selects status `Shipped` in the status update form, show two extra fields: Tracking Number (text input) and Carrier (text input, optional). Include in the `updateStatus` mutation payload.

---

## Verification checklist

- [ ] `GET /orders/:id` returns 404 for a user trying to access another user's order
- [ ] Cancel a COD order → product stock is restored; confirm in admin product view
- [ ] Cancel an offline-payment order → no stock change (stock not yet reserved)
- [ ] Admin rejects offline payment → stock restored
- [ ] Two concurrent COD checkouts for the last item → only one succeeds (atomic check)
- [ ] Teacher account cannot create products (`POST /products` returns 403)
- [ ] Cart: adding beyond available stock → blocked at cart level
- [ ] Store listing shows ETB currency everywhere (listing, detail, admin store)
- [ ] Product detail: `+` button disabled at stock limit; "Out of Stock" shown when stock = 0
- [ ] Product description field saves, loads, and shows on detail page
- [ ] Related products appear on product detail page (same instrument type)
- [ ] Search + type filter + pagination work on store listing
- [ ] Checkout delivery option shows "contact us for shipping" message
- [ ] Admin sets tracking number when shipping → customer sees it on orders page
- [ ] Customer cancel button visible on Pending/PaymentPending orders, hidden on others
- [ ] Admin image delete + reorder persists correctly
- [ ] Low-stock notification appears for Admin users when stock hits threshold
- [ ] Admin low-stock stat uses per-product `lowStockThreshold` (not hardcoded 10)
- [ ] `npx tsc --noEmit` passes in server/ and client/

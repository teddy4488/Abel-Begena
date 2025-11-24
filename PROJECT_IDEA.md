Overview of the project :- The Abel Begena website needs to be:
An Informational Site: Showcasing the company, the instruments (Begena, Masinko, Kirar, etc.), and the teaching philosophy.
An E-commerce Site: For selling physical instruments.
A Student Portal: Handling registration for both online and physical classes.
A Learning Management System (LMS): Facilitating online teaching, which currently happens via video calls.

TECH STACK
Layer
Tech
Frontend
Next.js (App Router), TailwindCSS, Redux Toolkit (if needed), NextAuth
Backend
NestJS (Modular Architecture), Swagger Docs, JWT Auth, RBAC, Guards
Database
MongoDB (Mongoose or Prisma Mongo) or postgress
Realtime
Socket.IO or NestJS WebSockets 
Payments
Chapa / Telebirr / Stripe Integration 
Deployment
Docker + Nginx + VPS (Scaleway, Hetzner, etc) (to be decided later)

 







USER STORIES TABLES (by User Type)
1.      Standard Authenticated User (Student / Customer)
Story ID
User Story
Acceptance Criteria
UI/UX Flow
Notes
U-001
As a user, I want to register with email/phone so I can access platform services.
Registration form validates input, creates account, sends verification email/SMS.
Register → Verify email/phone → Login
Users are not automatically enrolled in classes.
U-002
As a user, I want to log in securely.
JWT session, protected routes, error messages on invalid credentials.
Login → Dashboard
Supports email/password or phone login.
U-003
As a user, I want to view available classes and enrollment fees.
Displays full class list, pagination, schedule details.
Dashboard → Classes → View Class
Data fetched via REST API.
U-004
As a user, I want to enroll in a class after I pay.
Payment gateway integration, auto-update enrollment status.
Class Page → Pay → Enrollment Status Page
Payment receipts stored in DB.
U-005
As a user, I want to attend online classes.
Access only if enrolled, embedded video/live link visible.
Dashboard → My Classes → Join Class
Supports Zoom/Meet/Live stream embed.
U-006
As a user, I want to view my payment history.
List of transactions, success/pending/failed.
Dashboard → Payment History
Payment verification via webhook.
U-007
As a user, I want to shop items from the platform store.
Product list, cart, checkout.
Store → Product → Checkout
Item delivery optional.
U-008
As a user, I want to update my profile.
Editable profile fields and validation.
Dashboard → Profile Edit
Avatar upload + phone editing allowed.


2.      Instructor / Blogger / Teacher
Story ID
User Story
Acceptance Criteria
UI/UX Flow
Notes
T-001
As a teacher, I want to create and publish blog posts or lessons.
Create form, save draft, publish option.
Teacher Dashboard → Create Post
Markdown editor.
T-002
As a teacher, I want to upload class materials (PDF, slides, videos).
Supported file upload with size limit.
Teacher Dashboard → Materials
Auto-versioning optional.
T-003
As a teacher, I want to view all students enrolled in my classes.
List with filters by class.
Teacher Dashboard → Students
No access to payment data.
T-004
As a teacher, I want to schedule class times.
Calendar UI, conflict detection.
Teacher Dashboard → Schedule
Admin override possible.
T-005
As a teacher, I want to manage online class sessions.
Start/stop session, post link.
Teacher Dashboard → Live Class
Only visible to enrolled users.










 
 
3.      Admin / Super Admin
Story ID
User Story
Acceptance Criteria
UI/UX Flow
Notes
A-001
As an admin, I want to manage users (activate/deactivate accounts).
CRUD operations visible only to Admin.
Admin Dashboard → Users
Soft delete recommended.
A-002
As an admin, I want to manage teachers.
Approve, suspend, assign classes.
Admin Dashboard → Teachers
Admin sets teacher roles.
A-003
As an admin, I want to manage classes and courses.
CRUD on classes, schedule mgmt.
Admin Dashboard → Classes
Includes capacity management.
A-004
As an admin, I want to manage payments.
View all transactions with filter.
Dashboard → Payments
Admin can manually verify failed payments.
A-005
As an admin, I want to manage store products.
CRUD on items, control stock.
Dashboard → Store Items
Discount and promo features.
A-006
As an admin, I want analytics dashboards.
User growth, revenue, class attendance stats.
Dashboard → Analytics
Charts powered via Chart.js or Recharts.
A-007
As an admin, I want to manage content (blogs, FAQ, homepage).
Approval workflow.
Dashboard → Content
Teachers write, admin approves.

 





 
4.      Guest (Unauthenticated Visitor)
Story ID
User Story
Acceptance Criteria
UI/UX Flow
Notes
G-001
As a guest, I want to browse courses before I register.
Class list visible, no premium content.
Homepage → Explore
CTA to register.
G-002
As a guest, I want to read blog posts.
Posts visible but comments locked.
Blog → View Post
Login prompt for comment.
G-003
As a guest, I want to register.
Registration UI accessible everywhere.
Header → Register
Standard.

 














 
PERMISSION MATRIX (DETAILED)
Action / Feature
Guest
User
Teacher
Admin
Register
✔️
❌
❌
❌// Admin should register users.
Login
❌
✔️
✔️
✔️
View Classes
✔️
✔️
✔️
✔
Enroll in Class
❌
✔️
❌
✔️ (override)
Attend Online Class
❌
✔️ (if enrolled)
✔️ (owner)
✔️ 
View Payment Status
❌
✔️
❌
✔️
Make Payment
❌
✔️
❌
✔️ (manual)
Add Blog Post
❌
❌
✔️
✔️
Approve Blog Post
❌
❌
❌
✔️
Add/Edit Products
❌
❌
❌
✔️
Manage Users
❌
❌
❌
✔️
Manage Classes
❌
❌
✔️ (own classes)
✔️ (all classes)
Manage Store
❌
❌
❌
✔️
View Analytics
❌
❌
❌
✔️
Upload Materials
❌
❌
✔️
✔️
Access Admin Panel
❌
❌
❌
✔️

 
What should be added?

A Content Management System (CMS): How will the company owners update the text on their website, add new instruments for sale, or blog about their teachings? With this stack, you'd be building a custom admin panel. You might consider integrating a headless CMS like Strapi or Payload CMS (which fits perfectly with Next.js) to make non-technical content updates easy.

File Storage: A plan for where to store and serve images of the instruments and potentially video lesson materials (e.g., AWS S3, Cloudflare R2).


💡 KEY TECHNICAL RECOMMENDATIONS
Consider PostgreSQL or MongoDB

Add Redis for session management and caching

Use a dedicated file storage service (AWS S3 or similar) from day one





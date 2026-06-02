/**
 * Phase 5 seed: single User collection (all roles), Enrollment collection, branches.
 * Run: npm run seed
 * No migrations needed if DB is empty; seed creates data in current shape.
 */
import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

config({ path: '.env' });

if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: seed.ts must not be run in production.');
  process.exit(1);
}
const FORCE_DROP = process.argv.includes('--force-drop');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/abel-begena';
const SALT_ROUNDS = 10;

const InstrumentType = {
  BEGENA: 'Begena',
  KIRAR: 'Kirar',
  MASINKO: 'Masinko',
  WASHINT: 'Washint',
  KEBERO: 'Kebero',
  OTHER: 'Other',
};

// ----- User (Phase 5: single identity, all roles) -----
const TeacherProfileSchema = new mongoose.Schema(
  { teacherStatus: { type: String, enum: ['pending', 'approved', 'suspended'], default: 'pending' } },
  { _id: false },
);
const StudentProfileSchema = new mongoose.Schema(
  {
    attendanceNumber: { type: String, required: true, trim: true, maxlength: 20 },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    learningType: { type: String, enum: ['physical', 'online'] },
    instrumentType: { type: String },
    programDurationMonths: { type: Number, enum: [3, 6, 9] },
    preferredLearningDays: { type: [String], enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
    registrationStartDate: { type: Date },
    learningDaysPerWeek: { type: Number },
    isActive: { type: Boolean, default: true },
    missedLessonsCount: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    role: {
      type: String,
      enum: ['User', 'Teacher', 'Admin', 'Student', 'SuperAdmin'],
      default: 'User',
      required: true,
      index: true,
    },
    isActive: { type: Boolean, default: true, required: true },
    isVerified: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    verificationCode: { type: String, default: null },
    verificationCodeExpiresAt: { type: Date, default: null },
    passwordResetCode: { type: String, default: null },
    passwordResetCodeExpiresAt: { type: Date, default: null },
    teacherProfile: { type: TeacherProfileSchema },
    studentProfile: { type: StudentProfileSchema },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    avatarUrl: { type: String },
    bio: { type: String, trim: true },
    languagePreference: { type: String, enum: ['en', 'am'], default: 'en' },
    refreshTokenHash: { type: String, default: null },
    refreshTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// ----- Branch -----
const BranchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    region: { type: String, trim: true },
    location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], required: true } },
    radiusMeters: { type: Number, default: 500 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ----- Class (instructorId ref User; enrollments live in Enrollment collection) -----
const ClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, trim: true },
    instrumentType: { type: String, enum: Object.values(InstrumentType) },
    level: { type: String, enum: ['beginner', 'advanced'], default: 'beginner' },
    classType: { type: String, enum: ['online', 'physical', 'both'], default: 'online' },
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    startDate: { type: Date },
    endDate: { type: Date },
    materials: { type: [{ title: String, url: String, uploadedAt: { type: Date, default: Date.now } }], default: [] },
    isLive: { type: Boolean, default: false },
    liveRoomCode: { type: String },
    schedule: {
      type: [{
        _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
        title: String,
        startTime: Date,
        endTime: Date,
        location: String,
        notes: String,
      }],
      default: [],
    },
    tuition: { type: Number, min: 0 },
    currency: { type: String, trim: true, maxlength: 12, default: 'ETB' },
    enrollmentDeadline: { type: Date },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// ----- Enrollment (Phase 5.2) -----
const EnrollmentSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    enrolledAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'pending', 'withdrawn'], default: 'active' },
    amountPaid: { type: Number, min: 0 },
    currency: { type: String, trim: true, maxlength: 12 },
    paymentMethod: { type: String, trim: true, maxlength: 40 },
    paymentReference: { type: String, trim: true, maxlength: 120 },
    note: { type: String, trim: true, maxlength: 400 },
    fullName: { type: String, trim: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 40 },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true },
);
EnrollmentSchema.index({ classId: 1, studentId: 1 }, { unique: true });

// ----- StudentAttendanceParticipant (with required userId ref User, no auth fields) -----
const StudentAttendanceParticipantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 40 },
    attendanceNumber: { type: String, required: true, unique: true, trim: true, maxlength: 20, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    learningType: { type: String, enum: ['physical', 'online'], required: true },
    instrumentType: { type: String, enum: Object.values(InstrumentType), required: true },
    programDurationMonths: { type: Number, enum: [3, 6, 9], required: true },
    preferredLearningDays: { type: [String], enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], required: true },
    registrationStartDate: { type: Date, required: true },
    learningDaysPerWeek: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// ----- TeacherAttendanceParticipant (with required userId ref User, no auth fields) -----
const TeacherAttendanceParticipantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    instruments: { type: [String], enum: Object.values(InstrumentType), required: true },
    teachingDays: { type: [String], enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], required: true },
    timeRanges: { type: [{ day: String, startTime: String, endTime: String }], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ----- InstrumentLesson, StudentAttendance, TeacherAttendance, StudentPayment -----
const InstrumentLessonSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    instrumentType: { type: String, enum: Object.values(InstrumentType) },
    level: { type: String, enum: ['beginner', 'advanced'], default: 'beginner' },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, trim: true, maxlength: 60 },
    order: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const StudentAttendanceSchema = new mongoose.Schema(
  {
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentAttendanceParticipant', required: true, index: true },
    attendanceNumber: { type: String, required: true, trim: true, index: true },
    studentName: { type: String, required: true, trim: true },
    sessionDate: { type: Date, required: true, index: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstrumentLesson', required: true },
    revisedLessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstrumentLesson' },
    status: { type: String, enum: ['present', 'late', 'excused'], default: 'present' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const TeacherAttendanceSchema = new mongoose.Schema(
  {
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherAttendanceParticipant', required: true, index: true },
    checkInAt: { type: Date, required: true },
    checkOutAt: { type: Date },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const StudentPaymentSchema = new mongoose.Schema(
  {
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentAttendanceParticipant', required: true, index: true },
    amount: { type: Number, min: 2000, max: 999999, required: true },
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, min: 2000, max: 9999, required: true },
    status: { type: String, enum: ['paid', 'unpaid'], default: 'paid' },
    dueDate: { type: Date },
    dueDates: { type: [Date] },
    paidAt: { type: Date },
    period: { type: Number, min: 1 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true, maxlength: 240 },
    receiptUrl: { type: String, trim: true, maxlength: 400 },
  },
  { timestamps: true },
);

// ----- BlogPost (author ref User), Comment, FAQ, InstrumentMaterial (uploadedBy ref User) -----
const BlogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coverImage: { type: String, required: true },
    isPublished: { type: Boolean, default: false },
    status: { type: String, enum: ['draft', 'pending', 'published'], default: 'draft' },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

const CommentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true },
);

const FaqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const InstrumentMaterialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    url: { type: String, required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    instrumentType: { type: String, enum: Object.values(InstrumentType) },
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'InstrumentLesson' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
    description: { type: String, trim: true, maxlength: 500 },
    fileType: { type: String, enum: ['pdf', 'image', 'video', 'other'], default: 'other' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ----- PaymentRequest, Product, Order, Cart -----
const PaymentRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['enrollment', 'order', 'student_monthly_fee'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    amount: { type: Number, min: 0, required: true },
    currency: { type: String, trim: true, maxlength: 12, default: 'ETB' },
    method: { type: String, trim: true, maxlength: 40 },
    reference: { type: String, trim: true, maxlength: 120 },
    receiptUrl: { type: String, trim: true, maxlength: 400 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String, trim: true, maxlength: 400 },
    conversionData: { type: String },
  },
  { timestamps: true },
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    instrumentType: { type: String, enum: Object.values(InstrumentType), required: true },
    shortDescription: { type: String },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'ETB' },
    stock: { type: Number, default: 0 },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const OrderItemSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtCheckout: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);
const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [OrderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    shippingAddress: { type: { city: String, street: String, postalCode: String, phone: String }, required: false },
    deliveryOption: { type: String, enum: ['Pickup', 'Delivery'], required: true },
    pickupBranchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    paymentMethod: { type: String, enum: ['BankTransfer', 'Telebirr', 'CBEBirr', 'CashOnDelivery', 'Manual', 'Other'], required: true },
    status: { type: String, enum: ['Pending', 'PaymentPending', 'PaymentRejected', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' },
    isPaid: { type: Boolean, default: false },
    receiptUrl: { type: String, trim: true, maxlength: 500 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const CartItemSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtCheckout: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);
const CartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, index: true },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true },
);

// Models
const User = mongoose.model('User', UserSchema);
const Branch = mongoose.model('Branch', BranchSchema);
const Class = mongoose.model('Class', ClassSchema);
const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);
const StudentAttendanceParticipant = mongoose.model('StudentAttendanceParticipant', StudentAttendanceParticipantSchema);
const TeacherAttendanceParticipant = mongoose.model('TeacherAttendanceParticipant', TeacherAttendanceParticipantSchema);
const InstrumentLesson = mongoose.model('InstrumentLesson', InstrumentLessonSchema);
const StudentAttendance = mongoose.model('StudentAttendance', StudentAttendanceSchema);
const TeacherAttendance = mongoose.model('TeacherAttendance', TeacherAttendanceSchema);
const StudentPayment = mongoose.model('StudentPayment', StudentPaymentSchema);
const BlogPost = mongoose.model('BlogPost', BlogPostSchema);
const Comment = mongoose.model('Comment', CommentSchema);
const Faq = mongoose.model('Faq', FaqSchema);
const InstrumentMaterial = mongoose.model('InstrumentMaterial', InstrumentMaterialSchema);
const PaymentRequest = mongoose.model('PaymentRequest', PaymentRequestSchema);
const Product = mongoose.model('Product', ProductSchema);
const Order = mongoose.model('Order', OrderSchema);
const Cart = mongoose.model('Cart', CartSchema);

async function seed() {
  try {
    console.log('🌱 Starting database reset and base SuperAdmin seed...');

    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    if (FORCE_DROP) {
      if (mongoose.connection.db) {
        const collections =
          await mongoose.connection.db.listCollections().toArray();
        for (const collection of collections) {
          await mongoose.connection.db
            .dropCollection(collection.name)
            .catch(() => {});
        }
        console.log('🗑️  Dropped all existing collections');
      }
    } else {
      console.log('Skipping drop. Pass --force-drop to enable.');
    }

    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error('SEED_ADMIN_PASSWORD env var is not set. Set it before seeding.');
    }
    const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);

    // Create only a single SuperAdmin; everything else will be created via the app.
    const superAdmin = await User.create({
      email: 'abel@abelbegena.com',
      password: hashedPassword,
      firstName: 'Abel',
      lastName: 'Admin',
      role: 'SuperAdmin',
      isActive: true,
      isVerified: true,
    });
    console.log('✅ Created SuperAdmin:', superAdmin.email);

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📋 Credentials:');
    console.log('   SuperAdmin: abel@abelbegena.com');
    console.log('   Password:   (value of SEED_ADMIN_PASSWORD)');

    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();

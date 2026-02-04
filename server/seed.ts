import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/abel-begena';

// Instrument types enum
const InstrumentType = {
  BEGENA: 'Begena',
  KIRAR: 'Kirar',
  MASINKO: 'Masinko',
  WASHINT: 'Washint',
  KEBERO: 'Kebero',
  OTHER: 'Other',
};

// User Schema (website users only)
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    role: {
      type: String,
      enum: ['User'],
      default: 'User',
      required: true,
    },
    isActive: { type: Boolean, default: true, required: true },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: null },
    verificationCodeExpiresAt: { type: Date, default: null },
    passwordResetCode: { type: String, default: null },
    passwordResetCodeExpiresAt: { type: Date, default: null },
    teacherStatus: {
      type: String,
      enum: ['pending', 'approved', 'suspended'],
    },
    avatarUrl: { type: String },
    bio: { type: String, trim: true },
    languagePreference: { type: String, enum: ['en', 'am'], default: 'en' },
  },
  { timestamps: true },
);

// Teacher Schema
const TeacherSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: null },
    verificationCodeExpiresAt: { type: Date, default: null },
    passwordResetCode: { type: String, default: null },
    passwordResetCodeExpiresAt: { type: Date, default: null },
    teacherStatus: {
      type: String,
      enum: ['pending', 'approved', 'suspended'],
      default: 'pending',
    },
    avatarUrl: { type: String },
    bio: { type: String, trim: true },
    languagePreference: { type: String, enum: ['en', 'am'], default: 'en' },
  },
  { timestamps: true },
);

// AdminUser Schema
const AdminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: null },
    verificationCodeExpiresAt: { type: Date, default: null },
    passwordResetCode: { type: String, default: null },
    passwordResetCodeExpiresAt: { type: Date, default: null },
    avatarUrl: { type: String },
    languagePreference: { type: String, enum: ['en', 'am'], default: 'en' },
  },
  { timestamps: true },
);

// StudentAttendanceParticipant Schema
const StudentAttendanceParticipantSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
    password: { type: String },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    attendanceNumber: { type: String, required: true, unique: true, trim: true, index: true, maxlength: 20 },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: false },
    learningType: { type: String, enum: ['physical', 'online'], required: true },
    instrumentType: { type: String, enum: Object.values(InstrumentType), required: true },
    programDurationMonths: { type: Number, enum: [3, 6, 9], required: true },
    preferredLearningDays: { type: [String], required: true },
    registrationStartDate: { type: Date, required: true },
    learningDaysPerWeek: { type: Number, required: true },
    preferredSchedule: { type: String, trim: true, maxlength: 240 },
    phone: { type: String, trim: true, maxlength: 40 },
    emergencyContactName: { type: String, trim: true, maxlength: 120 },
    emergencyContactPhone: { type: String, trim: true, maxlength: 40 },
    occupation: { type: String, trim: true, maxlength: 120 },
    city: { type: String, trim: true, maxlength: 120 },
    address: { type: String, trim: true, maxlength: 240 },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: null },
    verificationCodeExpiresAt: { type: Date, default: null },
    passwordResetCode: { type: String, default: null },
    passwordResetCodeExpiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// TeacherAttendanceParticipant Schema
const TeacherAttendanceParticipantSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
    password: { type: String },
    isVerified: { type: Boolean, default: false },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    instruments: {
      type: [String],
      enum: Object.values(InstrumentType),
      required: true,
      validate: {
        validator: (instruments: string[]) => instruments.length > 0,
        message: 'Teacher must teach at least one instrument',
      },
    },
    teachingDays: {
      type: [String],
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true,
    },
    timeRanges: {
      type: [
        {
          day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
          startTime: { type: String, required: true },
          endTime: { type: String, required: true },
        },
      ],
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// InstrumentLesson Schema
const InstrumentLessonSchema = new mongoose.Schema(
  {
    instrumentType: { type: String, enum: Object.values(InstrumentType), required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, trim: true, maxlength: 60 },
    order: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// StudentAttendance Schema
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

// TeacherAttendance Schema
const TeacherAttendanceSchema = new mongoose.Schema(
  {
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherAttendanceParticipant', required: true, index: true },
    checkInAt: { type: Date, required: true },
    checkOutAt: { type: Date },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// StudentPayment Schema (mirrors src/attendance/schemas/student-payment.schema.ts)
const StudentPaymentSchema = new mongoose.Schema(
  {
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentAttendanceParticipant',
      required: true,
      index: true,
    },
    amount: { type: Number, min: 2000, max: 999999, required: true },
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, min: 2000, max: 9999, required: true },
    status: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'paid' },

    paidAt: { type: Date },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true, maxlength: 240 },
  },
  { timestamps: true },
);
StudentPaymentSchema.index({ participantId: 1, year: 1, month: 1 }, { unique: true });
StudentPaymentSchema.index({ year: 1, month: 1 });

// Class Schema
const ClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, trim: true },
    classType: { type: String, enum: ['online', 'physical', 'both'], default: 'online' },
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    startDate: { type: Date },
    endDate: { type: Date },
    capacity: { type: Number, min: 0 },
    materials: {
      type: [
        {
          title: { type: String, required: true },
          url: { type: String, required: true },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    isLive: { type: Boolean, default: false },
    liveRoomCode: { type: String },
    enrollments: {
      type: [
        {
          student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          enrolledAt: { type: Date, default: Date.now },
          status: { type: String, enum: ['active', 'pending', 'withdrawn'], default: 'active' },
          amountPaid: { type: Number, min: 0 },
          currency: { type: String, trim: true, maxlength: 12 },
          paymentMethod: { type: String, trim: true, maxlength: 40 },
          paymentReference: { type: String, trim: true, maxlength: 120 },
          note: { type: String, trim: true, maxlength: 400 },
          fullName: { type: String, trim: true, maxlength: 160 },
          phone: { type: String, trim: true, maxlength: 40 },
          emergencyContactName: { type: String, trim: true, maxlength: 120 },
          emergencyContactPhone: { type: String, trim: true, maxlength: 40 },
          occupation: { type: String, trim: true, maxlength: 120 },
          city: { type: String, trim: true, maxlength: 120 },
          address: { type: String, trim: true, maxlength: 240 },
          preferredDaysPerWeek: { type: Number, min: 1 },
          preferredSchedule: { type: String, trim: true, maxlength: 240 },
          learningGoals: { type: String, trim: true, maxlength: 240 },
          notesForTeacher: { type: String, trim: true, maxlength: 400 },
          receiptUrl: { type: String, trim: true, maxlength: 400 },
          approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          approvedAt: { type: Date },
        },
      ],
      default: [],
    },
    schedule: {
      type: [
        {
          _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
          title: { type: String, required: true, trim: true, maxlength: 160 },
          startTime: { type: Date, required: true },
          endTime: { type: Date },
          location: { type: String, trim: true, maxlength: 160 },
          notes: { type: String, trim: true, maxlength: 800 },
        },
      ],
      default: [],
    },
    tuition: { type: Number, min: 0 },
    currency: { type: String, trim: true, maxlength: 12, default: 'ETB' },
    enrollmentDeadline: { type: Date },
  },
  { timestamps: true },
);

// Branch Schema
const BranchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    region: { type: String, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    radiusMeters: { type: Number, default: 500 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// BlogPost Schema
const BlogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    coverImage: { type: String, required: true },
    isPublished: { type: Boolean, default: false },
    status: { type: String, enum: ['draft', 'pending', 'published'], default: 'draft' },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

// Comment Schema
const CommentSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true },
);

// FAQ Schema
const FaqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// InstrumentMaterial Schema
const InstrumentMaterialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    url: { type: String, required: true },
    instrumentType: { type: String, enum: Object.values(InstrumentType), required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    uploadedAt: { type: Date, default: Date.now },
    description: { type: String, trim: true, maxlength: 500 },
    fileType: { type: String, enum: ['pdf', 'image', 'video', 'other'], default: 'other' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// PaymentRequest Schema (keep this aligned with src/payment/schemas/payment-request.schema.ts)
const PaymentRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['enrollment', 'order', 'tuition', 'student_conversion', 'student_monthly_fee'],
      required: true,
    },
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

// Product Schema (simplified)
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

// Order Schema (aligned with src/order/schemas/order.schema.ts)
const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [
        {
          _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
          productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
          quantity: { type: Number, required: true, min: 1 },
          priceAtCheckout: { type: Number, required: true, min: 0 },
        },
      ],
      required: true,
    },
    totalAmount: { type: Number, required: true, min: 0 },
    shippingAddress: {
      type: {
        city: String,
        street: String,
        postalCode: String,
        phone: String,
      },
      required: false,
    },
    deliveryOption: {
      type: String,
      enum: ['Pickup', 'Delivery'],
      required: true,
    },
    pickupBranchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    paymentMethod: {
      type: String,
      enum: ['BankTransfer', 'Telebirr', 'CBEBirr', 'CashOnDelivery', 'Manual', 'Other'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'PaymentPending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    isPaid: { type: Boolean, default: false },
    receiptUrl: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

// Cart Schema (aligned with src/order/schemas/cart.schema.ts)
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

// Create models
const User = mongoose.model('User', UserSchema);
const Teacher = mongoose.model('Teacher', TeacherSchema);
const AdminUser = mongoose.model('AdminUser', AdminUserSchema);
const StudentAttendanceParticipant = mongoose.model('StudentAttendanceParticipant', StudentAttendanceParticipantSchema);
const TeacherAttendanceParticipant = mongoose.model('TeacherAttendanceParticipant', TeacherAttendanceParticipantSchema);
const InstrumentLesson = mongoose.model('InstrumentLesson', InstrumentLessonSchema);
const StudentAttendance = mongoose.model('StudentAttendance', StudentAttendanceSchema);
const TeacherAttendance = mongoose.model('TeacherAttendance', TeacherAttendanceSchema);
const StudentPayment = mongoose.model('StudentPayment', StudentPaymentSchema);
const Class = mongoose.model('Class', ClassSchema);
const Branch = mongoose.model('Branch', BranchSchema);
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
    console.log('🌱 Starting database seed...');

    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Drop ALL existing collections
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.listCollections().toArray();
      for (const collection of collections) {
        await mongoose.connection.db.dropCollection(collection.name).catch(() => {
          // Ignore errors for non-existent collections
        });
      }
      console.log('🗑️  Dropped all existing collections');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Admin User in AdminUser table (verified & active, ready for testing)
    const admin = await AdminUser.create({
      email: 'admin@abelbegena.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      isVerified: true,
      verificationCode: null,
      verificationCodeExpiresAt: null,
      passwordResetCode: null,
      passwordResetCodeExpiresAt: null,
    });
    console.log('✅ Created Admin user (verified & ready for testing):', admin.email);

    // Create Teacher User in Teacher table (verified, active, approved, ready for testing)
    const teacher = await Teacher.create({
      email: 'teacher@abelbegena.com',
      password: hashedPassword,
      firstName: 'Master',
      lastName: 'Instructor',
      isActive: true,
      isVerified: true,
      teacherStatus: 'approved',
      bio: 'Experienced Begena master with 20+ years of teaching experience.',
      verificationCode: null,
      verificationCodeExpiresAt: null,
      passwordResetCode: null,
      passwordResetCodeExpiresAt: null,
    });
    console.log('✅ Created Teacher user (verified & ready for testing):', teacher.email);

    // Create sample branches in Addis Ababa (must be created before student)
    const branches = await Branch.insertMany([
      {
        name: 'Bole Main Studio',
        slug: 'bole-main-studio',
        description: 'Primary conservatory studio near Bole Medhane Alem.',
        address: 'Bole Medhane Alem area',
        city: 'Addis Ababa',
        region: 'Addis Ababa',
        location: { type: 'Point', coordinates: [38.788, 8.993] }, // [lng, lat]
        radiusMeters: 600,
        isActive: true,
      },
      {
        name: 'Piassa Heritage Branch',
        slug: 'piassa-heritage-branch',
        description: 'Heritage-focused atelier near Piassa and St. George Cathedral.',
        address: 'Piassa, near St. George Cathedral',
        city: 'Addis Ababa',
        region: 'Addis Ababa',
        location: { type: 'Point', coordinates: [38.753, 9.037] },
        radiusMeters: 500,
        isActive: true,
      },
      {
        name: 'CMC Practice Studio',
        slug: 'cmc-practice-studio',
        description: 'Quiet practice studio in the CMC residential area.',
        address: 'CMC area, Yeka Sub-City',
        city: 'Addis Ababa',
        region: 'Addis Ababa',
        location: { type: 'Point', coordinates: [38.86, 9.03] },
        radiusMeters: 700,
        isActive: true,
      },
    ]);
    console.log('✅ Created branches:', branches.map((b) => b.name).join(', '));

    // Create Instrument Lessons for each instrument type
    const begenaLessons = await InstrumentLesson.insertMany([
      { instrumentType: InstrumentType.BEGENA, title: 'Introduction to Begena', code: 'BEG-001', order: 1, isActive: true },
      { instrumentType: InstrumentType.BEGENA, title: 'Basic Posture and Holding', code: 'BEG-002', order: 2, isActive: true },
      { instrumentType: InstrumentType.BEGENA, title: 'String Tuning Fundamentals', code: 'BEG-003', order: 3, isActive: true },
      { instrumentType: InstrumentType.BEGENA, title: 'First Melodies', code: 'BEG-004', order: 4, isActive: true },
      { instrumentType: InstrumentType.BEGENA, title: 'Traditional Mezmur Patterns', code: 'BEG-005', order: 5, isActive: true },
    ]);

    const masinkoLessons = await InstrumentLesson.insertMany([
      { instrumentType: InstrumentType.MASINKO, title: 'Introduction to Masinko', code: 'MAS-001', order: 1, isActive: true },
      { instrumentType: InstrumentType.MASINKO, title: 'Bow Technique Basics', code: 'MAS-002', order: 2, isActive: true },
      { instrumentType: InstrumentType.MASINKO, title: 'Finger Positioning', code: 'MAS-003', order: 3, isActive: true },
      { instrumentType: InstrumentType.MASINKO, title: 'Basic Scales', code: 'MAS-004', order: 4, isActive: true },
    ]);

    const keberoLessons = await InstrumentLesson.insertMany([
      { instrumentType: InstrumentType.KEBERO, title: 'Introduction to Kebero', code: 'KEB-001', order: 1, isActive: true },
      { instrumentType: InstrumentType.KEBERO, title: 'Hand Techniques', code: 'KEB-002', order: 2, isActive: true },
      { instrumentType: InstrumentType.KEBERO, title: 'Rhythm Patterns', code: 'KEB-003', order: 3, isActive: true },
    ]);

    const kirarLessons = await InstrumentLesson.insertMany([
      { instrumentType: InstrumentType.KIRAR, title: 'Introduction to Kirar', code: 'KIR-001', order: 1, isActive: true },
      { instrumentType: InstrumentType.KIRAR, title: 'Plucking Techniques', code: 'KIR-002', order: 2, isActive: true },
    ]);

    const washintLessons = await InstrumentLesson.insertMany([
      { instrumentType: InstrumentType.WASHINT, title: 'Introduction to Washint', code: 'WAS-001', order: 1, isActive: true },
      { instrumentType: InstrumentType.WASHINT, title: 'Breathing and Embouchure', code: 'WAS-002', order: 2, isActive: true },
    ]);

    console.log('✅ Created instrument lessons for all instrument types');

    // Create Teacher Attendance Participant (with email to match new requirements - verified & ready for testing)
    const teacherParticipant = await TeacherAttendanceParticipant.create({
      email: 'teacher@abelbegena.com', // Same email as Teacher account
      password: hashedPassword,
      isVerified: true,
      verificationCode: null,
      verificationCodeExpiresAt: null,
      passwordResetCode: null,
      passwordResetCodeExpiresAt: null,
      fullName: 'Master Instructor',
      instruments: [InstrumentType.BEGENA, InstrumentType.MASINKO],
      teachingDays: ['monday', 'wednesday', 'friday'],
      timeRanges: [
        { day: 'monday', startTime: '09:00', endTime: '12:00' },
        { day: 'wednesday', startTime: '09:00', endTime: '12:00' },
        { day: 'friday', startTime: '09:00', endTime: '12:00' },
      ],
      isActive: true,
    });
    console.log('✅ Created Teacher Attendance Participant (verified & active)');

    // Create a Test Student for testing (after branches are created)
    // Use sequential attendance number starting from 1 - verified & ready for testing
    const firstBranch = branches[0];
    const student = await StudentAttendanceParticipant.create({
      email: 'student@abelbegena.com',
      password: hashedPassword,
      fullName: 'Test Student',
      attendanceNumber: '1', // Sequential number starting from 1
      branchId: firstBranch._id,
      learningType: 'physical',
      instrumentType: InstrumentType.BEGENA,
      programDurationMonths: 6,
      preferredLearningDays: ['monday', 'wednesday', 'friday'],
      registrationStartDate: new Date(),
      learningDaysPerWeek: 3,
      phone: '+251911234567',
      city: 'Addis Ababa',
      isActive: true,
      isVerified: true,
      verificationCode: null,
      verificationCodeExpiresAt: null,
      passwordResetCode: null,
      passwordResetCodeExpiresAt: null,
    });
    console.log('✅ Created Student (verified & active):', student.email, 'with attendance number:', student.attendanceNumber);

    // Create Sample Class taught by the teacher
    const sampleClass = await Class.create({
      title: 'Introduction to Begena: The Harp of David',
      description: 'Learn the fundamentals of playing the Begena, Ethiopia\'s sacred harp.',
      classType: 'both',
      instructorId: teacher._id,
      startDate: new Date(),
      isLive: false,
      liveRoomCode: 'begena-101',
      materials: [
        {
          title: 'Week 1: Historical Context',
          url: 'https://example.com/material1.pdf',
          uploadedAt: new Date(),
        },
      ],
      tuition: 5000,
      currency: 'ETB',
    });
    console.log('✅ Created sample class:', sampleClass.title);

    // Create a Standard Website User for testing (verified & ready for testing)
    const websiteUser = await User.create({
      email: 'user@abelbegena.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'User',
      isActive: true,
      isVerified: true,
      verificationCode: null,
      verificationCodeExpiresAt: null,
      passwordResetCode: null,
      passwordResetCodeExpiresAt: null,
    });
    console.log('✅ Created Website user (verified & active):', websiteUser.email);

    // Create Sample Blog Posts
    const blogPost1 = await BlogPost.create({
      title: 'The Sacred History of Begena',
      slug: 'sacred-history-begena',
      content: 'The Begena, also known as the Harp of David, holds a special place in Ethiopian Orthodox Christian tradition...',
      author: teacher._id,
      coverImage: 'https://example.com/begena-history.jpg',
      isPublished: true,
      status: 'published',
      publishedAt: new Date(),
    });

    const blogPost2 = await BlogPost.create({
      title: 'Learning Traditional Ethiopian Instruments',
      slug: 'learning-traditional-instruments',
      content: 'Ethiopia has a rich musical heritage with instruments like Begena, Masinko, and Kebero...',
      author: teacher._id,
      coverImage: 'https://example.com/instruments.jpg',
      isPublished: true,
      status: 'published',
      publishedAt: new Date(),
    });
    console.log('✅ Created blog posts');

    // Create Sample Comments
    await Comment.create({
      postId: blogPost1._id,
      authorId: websiteUser._id,
      content: 'This is a wonderful article about Begena! Thank you for sharing.',
      status: 'approved',
    });
    console.log('✅ Created sample comments');

    // Create Sample FAQs
    await Faq.insertMany([
      {
        question: 'What instruments do you teach?',
        answer: 'We teach Begena, Masinko, Kebero, Kirar, Washint, and other traditional Ethiopian instruments.',
        order: 1,
        isActive: true,
      },
      {
        question: 'Do you offer online classes?',
        answer: 'Yes, we offer both online and physical classes. You can choose based on your preference.',
        order: 2,
        isActive: true,
      },
      {
        question: 'What is the duration of the programs?',
        answer: 'We offer 3-month, 6-month, and 9-month programs with different learning schedules.',
        order: 3,
        isActive: true,
      },
      {
        question: 'How do I enroll as a student?',
        answer: 'You can register on our website and fill out the enrollment form. An admin will review your application.',
        order: 4,
        isActive: true,
      },
    ]);
    console.log('✅ Created FAQs');

    // Create Sample Instrument Materials
    await InstrumentMaterial.insertMany([
      {
        title: 'Begena Basic Exercises',
        url: 'https://example.com/begena-exercises.pdf',
        instrumentType: InstrumentType.BEGENA,
        lessonId: begenaLessons[0]?._id,
        uploadedBy: teacher._id,
        description: 'Basic exercises for beginners learning Begena',
        fileType: 'pdf',
        isActive: true,
      },
      {
        title: 'Masinko Technique Guide',
        url: 'https://example.com/masinko-technique.pdf',
        instrumentType: InstrumentType.MASINKO,
        lessonId: masinkoLessons[0]?._id,
        uploadedBy: teacher._id,
        description: 'Comprehensive guide to Masinko playing techniques',
        fileType: 'pdf',
        isActive: true,
      },
    ]);
    console.log('✅ Created instrument materials');

    // Create Sample Products
    await Product.insertMany([
      {
        name: 'Traditional Begena',
        instrumentType: InstrumentType.BEGENA,
        shortDescription: 'Handcrafted traditional Begena',
        description: 'Beautifully crafted traditional Begena made by master artisans.',
        price: 15000,
        currency: 'ETB',
        stock: 5,
        images: ['https://images.unsplash.com/photo-1525283117698-859fc07a86e8?auto=format&fit=crop&w=800&q=80'],
        isActive: true,
      },
      {
        name: 'Masinko Instrument',
        instrumentType: InstrumentType.MASINKO,
        shortDescription: 'Authentic Masinko',
        description: 'Traditional Masinko with high-quality materials.',
        price: 3000,
        currency: 'ETB',
        stock: 10,
        images: ['https://images.unsplash.com/photo-1445985543470-41fba5c3144a?auto=format&fit=crop&w=800&q=80'],
        isActive: true,
      },
    ]);
    console.log('✅ Created sample products');

    // Create Sample Student Attendance Record
    await StudentAttendance.create({
      participantId: student._id,
      attendanceNumber: student.attendanceNumber,
      studentName: student.fullName,
      sessionDate: new Date(),
      lessonId: begenaLessons[0]._id,
      status: 'present',
      recordedBy: admin._id,
    });
    const today = new Date();
    await StudentPayment.create({
      participantId: student._id,
      amount: 2500,
      month: today.getMonth() + 1,
      year: today.getFullYear(),
      status: 'paid',
      paidAt: today,
      recordedBy: admin._id,
      note: 'Seed tuition payment',
    });
    console.log('✅ Created sample student attendance record and payment');

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📋 Test Credentials (ALL VERIFIED & ACTIVE - Ready for Testing):');
    console.log('   ✅ Admin:   admin@abelbegena.com / password123');
    console.log('   ✅ Teacher: teacher@abelbegena.com / password123');
    console.log('   ✅ Website User: user@abelbegena.com / password123');
    console.log('   ✅ Student: student@abelbegena.com / password123');
    console.log('\n💡 All accounts are verified and active - no verification needed for testing!');
    console.log('\n📚 Created Data:');
    console.log(`   - ${begenaLessons.length} Begena lessons`);
    console.log(`   - ${masinkoLessons.length} Masinko lessons`);
    console.log(`   - ${keberoLessons.length} Kebero lessons`);
    console.log(`   - ${kirarLessons.length} Kirar lessons`);
    console.log(`   - ${washintLessons.length} Washint lessons`);
    console.log(`   - ${branches.length} branches`);
    console.log('   - 1 sample class');
    console.log('   - 2 blog posts');
    console.log('   - 4 FAQs');
    console.log('   - 2 instrument materials');
    console.log('   - 2 products');
    console.log('   - 1 attendance record');

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

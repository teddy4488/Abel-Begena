import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/abel-begena';

// User Schema (website users only)
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: String,
    lastName: String,
    phone: String,
    role: {
      type: String,
      enum: ['User'],
      default: 'User',
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Teacher Schema
const TeacherSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: String,
    lastName: String,
    phone: String,
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    teacherStatus: {
      type: String,
      enum: ['pending', 'approved', 'suspended'],
      default: 'pending',
    },
    avatarUrl: String,
    bio: String,
    languagePreference: { type: String, enum: ['en', 'am'], default: 'en' },
  },
  { timestamps: true },
);

// AdminUser Schema
const AdminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: String,
    lastName: String,
    phone: String,
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    avatarUrl: String,
    languagePreference: { type: String, enum: ['en', 'am'], default: 'en' },
  },
  { timestamps: true },
);

// StudentAttendanceParticipant Schema
const StudentAttendanceParticipantSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true },
    password: { type: String },
    fullName: { type: String, required: true },
    attendanceNumber: { type: String, required: true, unique: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    learningType: { type: String, enum: ['physical', 'online'], required: true },
    instrumentType: { type: String, required: true },
    programDurationMonths: { type: Number, enum: [3, 6, 9], required: true },
    preferredLearningDays: { type: [String], required: true },
    registrationStartDate: { type: Date, required: true },
    learningDaysPerWeek: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    verificationCode: String,
    verificationCodeExpiresAt: Date,
    passwordResetCode: String,
    passwordResetCodeExpiresAt: Date,
  },
  { timestamps: true },
);

// Class Schema (simplified for seeding)
const ClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    materials: {
      type: [
        {
          title: String,
          url: String,
          uploadedAt: Date,
        },
      ],
      default: [],
    },
    isLive: { type: Boolean, default: false },
    liveRoomCode: String,
  },
  { timestamps: true },
);

// Branch Schema (simplified for seeding)
const BranchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
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

const User = mongoose.model('User', UserSchema);
const Teacher = mongoose.model('Teacher', TeacherSchema);
const AdminUser = mongoose.model('AdminUser', AdminUserSchema);
const StudentAttendanceParticipant = mongoose.model('StudentAttendanceParticipant', StudentAttendanceParticipantSchema);
const Class = mongoose.model('Class', ClassSchema);
const Branch = mongoose.model('Branch', BranchSchema);

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
          console.log(`⚠️  Collection ${collection.name} does not exist, skipping drop`);
        });
      }
      console.log('🗑️  Dropped all existing collections');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Admin User in AdminUser table (verified & active)
    const admin = await AdminUser.create({
      email: 'admin@abelbegena.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
      isVerified: true,
    });
    console.log('✅ Created Admin user:', admin.email);

    // Create Teacher User in Teacher table (verified, active, approved)
    const teacher = await Teacher.create({
      email: 'teacher@abelbegena.com',
      password: hashedPassword,
      firstName: 'Master',
      lastName: 'Instructor',
      isActive: true,
      isVerified: true,
      teacherStatus: 'approved',
    });
    console.log('✅ Created Teacher user:', teacher.email);

    // Create Sample Class taught by the teacher
    const sampleClass = await Class.create({
      title: 'Introduction to Begena: The Harp of David',
      instructorId: teacher._id,
      isLive: false,
      liveRoomCode: 'begena-101',
      materials: [
        {
          title: 'Week 1: Historical Context',
          url: 'https://example.com/material1.pdf',
          uploadedAt: new Date(),
        },
      ],
    });
    console.log('✅ Created sample class:', sampleClass.title);

    // Create a Standard Website User for testing
    const websiteUser = await User.create({
      email: 'user@abelbegena.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'User',
      isActive: true,
      isVerified: true,
    });
    console.log('✅ Created Website user:', websiteUser.email);

    // Create sample branches in Addis Ababa (must be created before student)
    const branches = await Branch.insertMany([
      {
        name: 'Bole Main Studio',
        slug: 'bole-main-studio',
        description: 'Primary conservatory studio near Bole Medhane Alem.',
        address: 'Bole Medhane Alem area',
        city: 'Addis Ababa',
        region: 'Addis Ababa',
        // [lng, lat]
        location: { type: 'Point', coordinates: [38.788, 8.993] },
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

    // Create a Test Student for testing (after branches are created)
    const firstBranch = branches[0];
    const student = await StudentAttendanceParticipant.create({
      email: 'student@abelbegena.com',
      password: hashedPassword,
      fullName: 'Test Student',
      attendanceNumber: 'STU001',
      branchId: firstBranch._id,
      learningType: 'physical',
      instrumentType: 'Begena',
      programDurationMonths: 6,
      preferredLearningDays: ['monday', 'wednesday', 'friday'],
      registrationStartDate: new Date(),
      learningDaysPerWeek: 3,
      isActive: true,
      isVerified: true,
    });
    console.log('✅ Created Student:', student.email);

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📋 Test Credentials (all verified & active):');
    console.log('   Admin:   admin@abelbegena.com / password123');
    console.log('   Teacher: teacher@abelbegena.com / password123');
    console.log('   Website User: user@abelbegena.com / password123');
    console.log('   Student: student@abelbegena.com / password123');

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

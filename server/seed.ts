import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/abel-begena';

// User Schema (aligned with main application for seeding)
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: String,
    lastName: String,
    phone: String,
    role: {
      type: String,
      enum: ['User', 'Teacher', 'Admin'],
      default: 'User',
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    teacherStatus: {
      type: String,
      enum: ['pending', 'approved', 'suspended'],
      default: undefined,
    },
  },
  { timestamps: true },
);

// Class Schema (simplified for seeding)
const ClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

const User = mongoose.model('User', UserSchema);
const Class = mongoose.model('Class', ClassSchema);

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Drop existing collections
    await User.collection.drop().catch(() => {
      console.log('⚠️  Users collection does not exist, skipping drop');
    });
    await Class.collection.drop().catch(() => {
      console.log('⚠️  Classes collection does not exist, skipping drop');
    });
    console.log('🗑️  Dropped existing collections');

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Admin User (verified & active)
    const admin = await User.create({
      email: 'admin@abelbegena.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'Admin',
      isActive: true,
      isVerified: true,
    });
    console.log('✅ Created Admin user:', admin.email);

    // Create Teacher User (verified, active, approved)
    const teacher = await User.create({
      email: 'teacher@abelbegena.com',
      password: hashedPassword,
      firstName: 'Master',
      lastName: 'Instructor',
      role: 'Teacher',
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

    // Create a Standard User for testing
    const student = await User.create({
      email: 'user@abelbegena.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Student',
      role: 'User',
      isActive: true,
      isVerified: true,
    });
    console.log('✅ Created Student user:', student.email);

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📋 Test Credentials (all verified & active):');
    console.log('   Admin:   admin@abelbegena.com / password123');
    console.log('   Teacher: teacher@abelbegena.com / password123');
    console.log('   User:    user@abelbegena.com / password123');

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


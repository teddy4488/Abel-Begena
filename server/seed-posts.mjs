/**
 * Seed script: inserts 15 sample blog posts authored by the SuperAdmin.
 * Run from the server directory: node seed-posts.mjs
 */
import { MongoClient, ObjectId } from "mongodb";

const MONGO_URI =
  "mongodb://abelbegena_db_user:abel2025begena@ac-oplbe9v-shard-00-00.exdq0a7.mongodb.net:27017,ac-oplbe9v-shard-00-01.exdq0a7.mongodb.net:27017,ac-oplbe9v-shard-00-02.exdq0a7.mongodb.net:27017/abel-begena-db?ssl=true&replicaSet=atlas-z7ozt8-shard-0&authSource=admin&retryWrites=true&w=majority&appName=AbelBegenaCluster";

const DB_NAME = "abel-begena-db";

const posts = [
  { title: "The History of Begena", slug: "history-of-begena", status: "published", isPublished: true },
  { title: "Kirar Scales for Beginners", slug: "kirar-scales-beginners", status: "published", isPublished: true },
  { title: "Masinko Bowing Techniques", slug: "masinko-bowing-techniques", status: "published", isPublished: true },
  { title: "Washint Breath Control", slug: "washint-breath-control", status: "published", isPublished: true },
  { title: "Kebero Rhythm Patterns", slug: "kebero-rhythm-patterns", status: "published", isPublished: true },
  { title: "Ethiopian Pentatonic Scales", slug: "ethiopian-pentatonic-scales", status: "pending", isPublished: false },
  { title: "Begena Tuning Guide", slug: "begena-tuning-guide", status: "pending", isPublished: false },
  { title: "Traditional vs Modern Kirar", slug: "traditional-vs-modern-kirar", status: "draft", isPublished: false },
  { title: "Understanding Zema Chant", slug: "understanding-zema-chant", status: "draft", isPublished: false },
  { title: "Practice Routines for Students", slug: "practice-routines-students", status: "published", isPublished: true },
  { title: "Care and Maintenance of String Instruments", slug: "care-maintenance-string-instruments", status: "published", isPublished: true },
  { title: "Music Theory in Ethiopian Context", slug: "music-theory-ethiopian-context", status: "pending", isPublished: false },
  { title: "Reading Ethiopian Musical Notation", slug: "reading-ethiopian-notation", status: "draft", isPublished: false },
  { title: "The Role of Music in Ethiopian Culture", slug: "music-ethiopian-culture", status: "published", isPublished: true },
  { title: "Advanced Begena Techniques", slug: "advanced-begena-techniques", status: "draft", isPublished: false },
  { title: "Ensemble Playing for Beginners", slug: "ensemble-playing-beginners", status: "published", isPublished: true },
];

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log("Connected to MongoDB");

  const db = client.db(DB_NAME);

  // Seed posts under the teacher so they appear on the teacher posts page
  const admin = await db.collection("users").findOne({ role: "Teacher", "teacherProfile.teacherStatus": "approved" });
  if (!admin) {
    console.error("No approved Teacher found.");
    await client.close();
    process.exit(1);
  }
  console.log("Found Teacher:", admin.email, "id:", admin._id);

  // Remove any previously seeded posts (by slug) to allow re-runs
  const slugs = posts.map((p) => p.slug);
  const deleted = await db.collection("blogposts").deleteMany({ slug: { $in: slugs } });
  if (deleted.deletedCount > 0) {
    console.log(`Removed ${deleted.deletedCount} existing seeded posts`);
  }

  const docs = posts.map((p) => ({
    _id: new ObjectId(),
    title: p.title,
    slug: p.slug,
    content: `# ${p.title}\n\nThis is a sample post about **${p.title.toLowerCase()}**.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n## Overview\n\nContent for this lesson covers fundamental concepts and practical exercises.\n\n- Point one\n- Point two\n- Point three\n\n## Conclusion\n\nPractice daily for best results.`,
    author: admin._id,
    coverImage: "",
    isPublished: p.isPublished,
    status: p.status,
    publishedAt: p.isPublished ? new Date() : null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  await db.collection("blogposts").insertMany(docs);
  console.log(`Inserted ${docs.length} blog posts.`);

  await client.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { MongoClient, ObjectId } from "mongodb";

const MONGO_URI = "mongodb://abelbegena_db_user:abel2025begena@ac-oplbe9v-shard-00-00.exdq0a7.mongodb.net:27017,ac-oplbe9v-shard-00-01.exdq0a7.mongodb.net:27017,ac-oplbe9v-shard-00-02.exdq0a7.mongodb.net:27017/abel-begena-db?ssl=true&replicaSet=atlas-z7ozt8-shard-0&authSource=admin&retryWrites=true&w=majority&appName=AbelBegenaCluster";

const client = new MongoClient(MONGO_URI);
await client.connect();
const db = client.db("abel-begena-db");

const teacher = await db.collection("users").findOne({ _id: new ObjectId("6a21d2619bf0bc77a6beb5a0") });
console.log("Email:", teacher.email);
console.log("Role:", teacher.role);
console.log("teacherProfile:", JSON.stringify(teacher.teacherProfile));
console.log("isActive:", teacher.isActive);
console.log("isVerified:", teacher.isVerified);

await client.close();

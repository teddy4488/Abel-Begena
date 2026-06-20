import { MongoClient } from "mongodb";

const MONGO_URI = "mongodb://abelbegena_db_user:abel2025begena@ac-oplbe9v-shard-00-00.exdq0a7.mongodb.net:27017,ac-oplbe9v-shard-00-01.exdq0a7.mongodb.net:27017,ac-oplbe9v-shard-00-02.exdq0a7.mongodb.net:27017/abel-begena-db?ssl=true&replicaSet=atlas-z7ozt8-shard-0&authSource=admin&retryWrites=true&w=majority&appName=AbelBegenaCluster";

const client = new MongoClient(MONGO_URI);
await client.connect();
const users = await client.db("abel-begena-db").collection("users")
  .find({ role: { $in: ["Teacher", "Admin", "SuperAdmin"] } }, { projection: { email: 1, role: 1, firstName: 1, lastName: 1 } })
  .toArray();
users.forEach(u => console.log(u.role.padEnd(12), String(u._id), u.email, u.firstName ?? ""));
await client.close();

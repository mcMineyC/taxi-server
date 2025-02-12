// Just some crazy stuff I found in a Stack Overflow
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { MongoClient } from "mongodb";

var dbConnection = new MongoClient(
  "mongodb://amdin:supersecure123@192.168.196.111:27017/?authSource=admin",
);
await dbConnection.connect();

//const db = dbConnection.db("taxi"); // cannot do a close with this
const db = dbConnection;
export default db;

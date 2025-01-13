import fs from "fs";
//Just some crazy stuff I found in a Stack Overflow
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import db from "./db.js";

console.log("Added collections");
var auth = db.collection("auth");
//auth.insertOne({
//  loginName: "jedi",
//  displayName: "Jedi",
//  authtoken: "",
//  roles: ["view", "add", "dj", "admin", "sudoadmin", "recruiter"],
//  password: "",
//});
//auth.insertOne({
//  loginName: "testguy",
//  displayName: "Test Guy",
//  authtoken: "",
//  password: "",
//  roles: ["view", "add", "dj"],
//})

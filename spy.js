import dbCon from "./db.js";
const db = dbCon.db("taxi")

var results = await db.collection("auth").find().toArray()

console.table(results.map((r) => ({
    displayName: r.displayName,
    loginName: r.loginName,
    password: r.password,
    haveLoggedIn: r.authoken != "",

})))
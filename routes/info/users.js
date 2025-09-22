import express from "express";
import roleRequirement from "../../authMiddleware/roleRequirement";
const router = express.Router();

export default (db) => {
  router.post("/", async function (req, res) {
    var u = await db
      .collection("auth")
      .findOne({ authtoken: req.body.authtoken });
    if (u == null) {
      res.send({
        authed: false,
        error: "Not authorized",
        success: false,
        users: [],
      });
      return;
    }
    var results = [];
    var dbResults = await db.collection("auth").find().toArray();
    if (u.roles.includes("sudoadmin")) {
      results = dbResults.map((U) => ({
        loginName: U.loginName,
        displayName: U.displayName,
        authtoken: U.authtoken,
        password: U.password,
        roles: U.roles,
      }));
    } else {
      results = dbResults.map((U) => ({
        loginName: U.loginName,
        displayName: U.displayName,
        roles: U.roles,
      }));
    }
    res.send({ authed: true, success: true, users: results });
  });
  
  router.post("/:username", async function (req, res) {
    var u = await db
      .collection("auth")
      .findOne({ authtoken: req.body.authtoken });
    if (
      u == null ||
      (u.roles.includes("sudoadmin") == false &&
        req.params.username != u.loginName)
    ) {
      res.send({ authed: false, user: {} });
      return;
    }
    var sudoadmin = u.roles.includes("sudoadmin");
    var queried = await db
      .collection("auth")
      .findOne({ loginName: req.params.username });
    if (queried == null) {
      res.send({ authed: true, success: false, user: {} });
      return;
    }
    res.send({
      authed: true,
      user: {
        type: sudoadmin ? "full" : "incomplete",
        loginName: queried.loginName,
        displayName: queried.displayName,
        password: sudoadmin ? queried.password : "",
        authtoken: sudoadmin ? queried.authtoken : "",
        roles: queried.roles,
      },
    });
  });

  router.post("/:username/roles", roleRequirement(db, "sudoadmin"), async function (req, res) {
    var queried = await db
      .collection("auth")
      .findOne({ loginName: req.params.username });
    if (queried == null) {
      res.send({
        authed: true,
        error: "User not found",
        success: false,
        roles: [],
      });
      return;
    }
    res.send({ authed: true, success: true, roles: queried.roles });
  });
  
  // router.post("/info/usernames", async function (req, res) {
  //   if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
  //     res.send({ authed: false, error: "Invalid authtoken", success: false });
  //     return;
  //   }
  //   var users = await db.collection("auth").find().toArray();
  //   res.send({ authed: true, usernames: users.map((u) => u.loginName) });
  // });
  
  return router;
}
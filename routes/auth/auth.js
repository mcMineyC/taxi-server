import express from "express";
const router = express.Router();

export default (db) => {

  // TODO: send user object to client also
  //  (so we can store more advanced props like settings and such)
  router.post("/auth/signup", async function (req, res) {
    var u = await db
      .collection("auth")
      .findOne({ authtoken: req.body.authtoken, roles: "recruiter" });
    if (u == null) {
      res.send({ authed: false, success: false });
      return;
    }
    var roles = ["view", "add", "dj", "admin", "recruiter"];
    if (u.roles.includes("sudoadmin") && req.body.trusted)
      roles.push("sudoadmin");
    console.log("Signing up", req.body.name);
  
    var newUser = {
      loginName:
        req.body.name.substring(0, 1).toLowerCase() + req.body.name.substring(1),
      displayName: req.body.name,
      password: "",
      authtoken: "",
      roles: roles,
    };
    if (req.body.password != null) {
      newUser.password = req.body.password;
    }
    await db.collection("changelog").updateOne(
      {
        time: Date.now(),
        user: u.loginName,
        type: "signup",
      },
      {
        $set: {
          time: Date.now(),
          user: u.loginName,
          type: "signup",
          field: "all",
          old: null,
          new: newUser,
        },
      },
      { upsert: true },
    );
    await db
      .collection("auth")
      .updateOne(
        { loginName: newUser.loginName },
        { $set: newUser },
        { upsert: true },
      );
    res.send({ authed: true, success: true });
  });
  
  router.post("/auth/login", async function (req, res) {
    var authed = false;
    var authtoken = "";
    var result = await db
      .collection("auth")
      .findOne({ loginName: req.body.username });
    var username = result == null ? "" : result.loginName;
    authed = await (async () => {
      if (!result || result.loginName != req.body.username) {
        console.error("Wat da refrigerator is going on here");
        return Promise.resolve(false);
      }
  
      if (result.password == req.body.password) {
        console.log("Authorizing user " + result.loginName);
        authtoken = crypto.randomBytes(64).toString("hex");
        if (req.body.username == "testguy") authtoken = "1234567890";
        await db.collection("auth").updateOne(
          {
            loginName: req.body.username,
          },
          {
            $set: {
              authtoken: authtoken,
            },
          },
        );
        return Promise.resolve(true);
      } else if (result.password == "") {
        console.log(
          "Authorizing user " +
            result.loginName +
            " and changing password to " +
            req.body.password,
        );
        authtoken = crypto.randomBytes(64).toString("hex");
        if (req.body.username == "testguy") authtoken = "1234567890";
        await db.collection("auth").updateOne(
          {
            loginName: req.body.username,
          },
          {
            $set: {
              authtoken: authtoken,
              password: req.body.password,
            },
          },
        );
        return Promise.resolve(true);
      } else {
        return Promise.resolve(false);
      }
    })();
  
    if (authed == false) {
      console.log("Failed to authorize user " + req.body.username);
      res.send({ authorized: authed, error: "Invalid username or password" });
      return;
    }
    res.send({
      authorized: authed,
      authtoken: authtoken,
      username: username,
      roles: result.roles,
    });
  });
  
  router.post("/auth/token", async function (req, res) {
    const result = await db
      .collection("auth")
      .findOne({ authtoken: req.body.authtoken });
    var username = "";
    var authtoken = "";
    console.log("Checking authtoken for", result);
    var authed = await (async () => {
      if (!result) {
        return Promise.resolve(false);
      }
      username = result.loginName;
      authtoken =
        username == "testguy"
          ? "1234567890"
          : crypto.randomBytes(64).toString("hex");
      await db.collection("auth").updateOne(
        {
          loginName: username,
        },
        {
          $set: {
            authtoken: authtoken,
          },
        },
      );
      return Promise.resolve(true);
    })();
    if (!authed) {
      res.send({ authorized: authed, error: "Invalid authtoken" });
      return;
    }
  
    res.send({
      authorized: authed,
      authtoken: authtoken,
      username: username,
      roles: result.roles,
    });
  });
  
  router.post("/auth/username", async function (req, res) {
    const result = await db
      .collection("auth")
      .findOne({ authtoken: req.body.authtoken });
    var username = "";
    var authtoken = "";
    var authed = await (async () => {
      if (!result) {
        return Promise.resolve(false);
      }
      username = result.loginName;
      authtoken = result.authtoken;
      return Promise.resolve(true);
    })();
  
    if (!authed) {
      res.send({ authorized: authed, error: "Invalid authtoken", username: "" });
      return;
    }
    res.send({ authorized: authed, authtoken: authtoken, username: username });
  });
  return router;
}
//Just some crazy stuff I found in a Stack Overflow
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const path = require("path");
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

import crypto from "crypto";
const { waitUntil } = require("async-wait-until");

import SpotifyHandler from "./spotify.js";
//const { SpotifyApi } = require("@spotify/web-api-ts-sdk");
import dbConnection from "./db.js";
var db = dbConnection.db("taxi");
import ts from "./typesense_module.js";
import adder from "./adder.js";
import utils from "./utils.js";
console.log("Added collections");

const spotifyHandler = new SpotifyHandler(
  adder.clientId,
  adder.clientSecret,
  "http://localhost:8080/callback",
);
await spotifyHandler.initialize();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
const port = 3000;
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms"),
);
//const spotify = new Spotify(adder.clientId, adder.clientSecret);
// const api = SpotifyApi.withClientCredentials(
//   adder.clientId,
//   adder.clientSecret,
// );

// app.use('/',express.static(path.join(__dirname, 'static')));

app.post("/latestCommit", async function (_, res) {
  exec("git rev-parse HEAD", (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      res.send({ commit: "error" });
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      res.send({ commit: "error" });
      return;
    }
    res.send({ commit: stdout.replace("\n", "") });
  });
});

app.post("/status", function (_, res) {
  res.send({ status: "ok" });
});

app.get("/status", function (_, res) {
  res.send({ status: "ok" });
});

app.post("/signup", async function (req, res) {
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

app.post("/auth", async function (req, res) {
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

app.post("/authtoken", async function (req, res) {
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

app.post("/username", async function (req, res) {
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

app.post("/info/users/:username/roles", async function (req, res) {
  var u = await db.collection("auth").findOne({
    authtoken: req.body.authtoken,
  });
  if (
    u == null ||
    (u.roles.includes("sudoadmin") == false &&
      req.params.username != u.loginName)
  ) {
    res.send({
      authed: false,
      error: "Not authorized",
      success: false,
      roles: [],
    });
    return;
  }
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

app.post("/info/users", async function (req, res) {
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

app.post("/info/users/:username", async function (req, res) {
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

app.post("/info/albums", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, albums: [] });
    return;
  }
  var user = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;

  var query = {};
  if (!ignore) {
    query.$or = [{ visibleTo: user }, { visibleTo: "all" }];
  }
  var privateLibrary = req.query.mine || false;
  if (privateLibrary) {
    delete query.$or;
    query.inLibrary = user;
  }
  const data = await db
    .collection("albums")
    .find(query)
    .sort({ artistId: 1, added: 1 })
    .toArray();
  res.send({ authed: true, albums: data });
});

app.post("/info/artists", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, artists: [] });
    return;
  }

  var user = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;
  var query = {};
  if (!ignore) {
    query.$or = [{ visibleTo: user }, { visibleTo: "all" }];
  }
  var privateLibrary = req.query.mine || false;
  if (privateLibrary) {
    delete query.$or;
    query.inLibrary = user;
  }
  const data = await db
    .collection("artists")
    .find(query)
    .sort({ displayName: 1 })
    .toArray();
  res.send({ authed: true, artists: data });
});

app.post("/info/songs", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, songs: [] });
    return;
  }
  var user = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;
  var data = [];
  var query = {};
  if (!ignore) query.$or = [{ visibleTo: user }, { visibleTo: "all" }];

  var privateLibrary = req.query.mine || false;
  if (privateLibrary) {
    delete query.$or;
    query.inLibrary = user;
  }

  let options = {
    sort: { added: -1 },
  };

  if (typeof req.query.limit == "int" || typeof req.query.limit == "string") {
    options.limit = parseInt(req.query.limit);
  }

  data = await db.collection("songs").find(query, options).toArray();
  // console.log(data[0]);
  console.log("Sending songs");
  res.send({ authed: true, songs: data });
});

app.post("/info/artist/:id", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, artist: {} });
    return;
  }
  var user = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;
  var query = {
    id: req.params.id,
  };
  if (!ignore) {
    query.$or = [{ visibleTo: user }, { visibleTo: "all" }];
  }

  var privateLibrary = req.query.mine || false;
  if (privateLibrary) {
    delete query.$or;
    query.inLibrary = user;
  }
  const data = await db.collection("artists").findOne(query);
  res.send({ authed: true, artist: data });
});

app.post("/info/album/:id", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, album: {} });
    return;
  }
  var user = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;

  const data = await db.collection("albums").findOne({
    id: req.params.id,
    $or: ignore ? [] : [{ visibleTo: user }, { visibleTo: "all" }],
  });
  res.send({ authed: true, album: data });
});
app.post("/info/albums/by/artist/:id", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, albums: [] });
    return;
  }
  var user = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;

  var albumsData = [];
  if (req.query.excludeSingles == "true") {
    const query = {
      artistId: req.params.id,
      songCount: 1,
    };
    const data = await db
      .collection("albums")
      .find(query)
      .sort({ added: -1 })
      .toArray();

    var excludeIds = data.map((a) => a.id);
    console.log(data.map((a) => a.id));

    var fullQuery = {
      artistId: req.params.id,
    };
    if (!ignore) {
      fullQuery.$or = [{ visibleTo: user }, { visibleTo: "all" }];
    }

    var privateLibrary = req.query.mine || false;
    if (privateLibrary) {
      delete query.$or;
      query.inLibrary = user;
    }

    var abD = await db
      .collection("albums")
      .find(fullQuery)
      .sort({ added: -1 })
      .toArray();

    albumsData = abD.filter((a) => !excludeIds.includes(a.id));
  } else {
    var query = {
      artistId: req.params.id,
    };
    if (!ignore) {
      query.$or = [{ visibleTo: user }, { visibleTo: "all" }];
    }

    var privateLibrary = req.query.mine || false;
    if (privateLibrary) {
      delete query.$or;
      query.inLibrary = user;
    }

    albumsData = await db
      .collection("albums")
      .find(query)
      .sort({ added: -1 })
      .toArray();
  }
  res.send({ authed: true, albums: albumsData });
});
app.post("/info/singles/by/artist/:id", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, songs: [] });
    return;
  }
  var user = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;

  var query = {
    artistId: req.params.id,
    songCount: 1,
  };

  if (!ignore) {
    query.$or = [{ visibleTo: user }, { visibleTo: "all" }];
  }

  var privateLibrary = req.query.mine || false;
  if (privateLibrary) {
    delete query.$or;
    query.inLibrary = user;
  }

  const data = await db
    .collection("albums")
    .find(query)
    .sort({ added: -1 })
    .toArray();

  var songsQuery = {
    albumId: { $in: data.map((a) => a.id) },
  };

  if (!ignore) {
    songsQuery.$or = [{ visibleTo: user }, { visibleTo: "all" }];
  }

  const songsData = await db
    .collection("songs")
    .find(songsQuery)
    .sort({ added: -1 })
    .toArray();

  res.send({ authed: true, songs: songsData });
});

app.post("/info/songs/by/album/:id", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, songs: [] });
    return;
  }
  var user = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;

  var query = {
    albumId: req.params.id,
  };

  if (!ignore) {
    query.$or = [{ visibleTo: user }, { visibleTo: "all" }];
  }

  var privateLibrary = req.query.mine || false;
  if (privateLibrary) {
    delete query.$or;
    query.inLibrary = user;
  }

  const data = await db
    .collection("songs")
    .find(query)
    .sort({ trackNumber: 1 })
    .toArray();
  console.log(data);

  console.log("Sending songs");
  res.send({ authed: true, songs: data });
});

app.post("/info/songs/by/artist/:id", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, songs: [] });
    return;
  }
  var user = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;

  var query = {
    artistId: req.params.id,
  };

  if (!ignore) {
    query.$or = [{ visibleTo: user }, { visibleTo: "all" }];
  }

  var privateLibrary = req.query.mine || false;
  if (privateLibrary) {
    delete query.$or;
    query.inLibrary = user;
  }

  const data = await db
    .collection("songs")
    .find(query)
    .sort({ artistId: 1, albumId: 1 })
    .toArray();

  res.send({ authed: true, songs: data });
});

app.post("/info/songs/batch", async function (req, res) {
  console.log("/info/songs/batch - Checking auth");
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, results: {} });
    return;
  }
  console.log("/info/songs/batch - Authed");
  var user = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;
  var query = {
    id: { $in: req.body.ids },
  };
  if (!ignore) {
    query.$or = [{ visibleTo: user }, { visibleTo: "all" }];
  }

  var privateLibrary = req.query.mine || false;
  if (privateLibrary) {
    delete query.$or;
    query.inLibrary = user;
  }
  // console.log("/info/songs/batch - Querying");
  var data = await db.collection("songs").find(query).toArray();
  // console.log("/info/songs/batch - Query done");
  var results = {};
  // console.log("/info/songs/batch - Mapping");
  data.forEach((d) => (results[d.id] = d));
  // console.log("/info/songs/batch - Sending results");
  res.send({ authed: true, results: results });
});

app.post("/info/songs/:id", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, songs: [] });
    return;
  }
  var user = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;
  var query = {
    id: req.params.id,
  };
  if (!ignore) {
    query.$or = [{ visibleTo: user }, { visibleTo: "all" }];
  }

  var privateLibrary = req.query.mine || false;
  if (privateLibrary) {
    delete query.$or;
    query.inLibrary = user;
  }
  const result = await db.collection("songs").findOne(query);
  res.send({ authed: true, song: result ? result : {} });
});

app.post("/playlists", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, playlists: [] });
    return;
  }

  var u = await utils.getUser(req.body.authtoken, db);
  var ignore = JSON.parse(req.query.ignore || false);
  var editable = JSON.parse(req.query.editable || false);
  var privateLibrary = JSON.parse(req.query.mine || false);
  var playlists = [];

  var query = {
    $or: [
      // { allowedCollaborators: u },
      { visibleTo: u },
      { visibleTo: "all" },
    ],
  };

  const options = req.query.sort == "new" ? { sort: { added: -1 } } : {};
  if (privateLibrary == true) {
    query.$or = [{ owner: u }, { inLibrary: u }];
  }
  if (editable == true)
    query = {allowedCollaborators: u};
  if (ignore == true)
    query = {};

  playlists = await db
    .collection("playlists")
    .find(query)
    .sort(options.sort || {})
    .toArray();

  res.send({ authed: true, playlists: playlists });
});

app.post("/playlists/user/:id", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, playlists: [] });
    return;
  }
  var u = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;
  var privateLibrary = req.query.mine || false;

  var query = {
    owner: req.params.id,
    $or: [{ visibleTo: u }, { visibleTo: "all" }],
  };

  if (privateLibrary) {
    delete query.$or;
    query.$or = [{ owner: u }, { inLibrary: u }];
  }

  var d = await db.collection("playlists").find(query).toArray();
  res.send({ authed: true, playlists: d });
});

app.post("/playlists/:id", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, playlists: [] });
    return;
  }
  var u = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;
  var privateLibrary = req.query.mine || false;

  var query = {
    id: req.params.id,
    $or: [{ visibleTo: "all" }, { visibleTo: u }],
  };

  if (privateLibrary) {
    delete query.$or;
    query.$or = [{ owner: u }, { inLibrary: u }];
  }

  var d = await db.collection("playlists").find(query).toArray();

  res.send({ authed: true, playlists: d });
});

app.post("/playlists/modify/:playlist", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false });
    return;
  }
  var u = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;
  if (req.params.playlist == "create") {
    console.log("Creating new playlist");
    const newPlaylist = {
      id: utils.hash(req.body.name),
      owner: u || "testguy",
      displayName: req.body.name || "Banana",
      description: req.body.description || "Banana",
      visibleTo: req.body.visibleTo || [u],
      inLibrary: [u],
      allowedCollaborators: req.body.allowedCollaborators || [u],
      songs: req.body.songs || [],
      added: Date.now(),
      inLibrary: [u],
    };
    await db
      .collection("playlists")
      .updateOne(
        { id: newPlaylist.id },
        { $set: newPlaylist },
        { upsert: true },
      );
    res.send({ authed: true, playlist: newPlaylist, success: true });
    return;
  }
  var p = await db.collection("playlists").findOne({ id: req.params.playlist });
  if (p == null) {
    console.log("Playlist does not exist. Creating new playlist.");
  } else {
    if (p.owner == undefined || p.owner == null) {
      await db.collection("playlists").updateOne(
        { id: req.params.playlist },
        {
          $set: { owner: u, allowedCollaborators: [p.allowedCollaborators] },
        },
      );
    } else if (!p.allowedCollaborators.includes(u)) {
      console.log(
        '"' + u + '" is not in allowedCollaborators:',
        p.allowedCollaborators,
      );
      res.send({ authed: false, error: "Not authorized", success: false });
      return;
    }
    var newdata = {};
    console.log("Attempting to modify playlist " + req.params.playlist);
    if (req.body.name !== undefined) {
      console.log("Name: " + req.body.name);
      newdata["displayName"] = req.body.name;
    } else {
      newdata["displayName"] = p.displayName;
    }
    if (req.body.description !== undefined) {
      console.log("Description: " + req.body.description);
      newdata["description"] = req.body.description;
    } else {
      newdata["description"] = p.description;
    }
    if (req.body.visibleTo !== undefined) {
      console.log("VisibleTo: " + req.body.visibleTo);
      if (req.body.visibleTo.includes("all")) {
        newdata["visibleTo"] = ["all"];
      } else {
        newdata["visibleTo"] = req.body.visibleTo;
      }
    } else {
      newdata["visibleTo"] = p.visibleTo;
    }
    if (req.body.allowedCollaborators !== undefined) {
      newdata["allowedCollaborators"] = req.body.allowedCollaborators;
      if (!newdata["allowedCollaborators"].includes(p.owner)) {
        newdata["allowedCollaborators"].push(p.owner);
      }
      var newVisibleTo = newdata["visibleTo"];
      var newCollaborators = newdata["allowedCollaborators"];
      newVisibleTo = newVisibleTo.concat(newVisibleTo, newCollaborators.filter((x) => !newVisibleTo.includes(x)));
      newdata["visibleTo"] = newVisibleTo;
      console.log("VisibleTo: " + newdata["visibleTo"]);
      console.log("AllowedCollaborators: " + newdata["allowedCollaborators"]);
    }
    if (
      typeof req.body.songs !== "undefined" &&
      req.body.songs != null &&
      req.body.songs.length > 0
    ) {
      newdata["songs"] = req.body.songs;
    } else {
      newdata["songs"] = p.songs;
    }
    console.log("Patching existing playlist");
    await db
      .collection("playlists")
      .updateOne({ id: req.params.playlist }, { $set: newdata });
  }
  const playlists = await db
    .collection("playlists")
    .find({
      $or: [
        { owner: u },
        // { allowedCollaborators: u },
        { visibleTo: u },
        { visibleTo: "all" },
      ],
    })
    .toArray();
  res.send({
    authed: true,
    success: true,
    playlists: playlists,
  });
});

app.post("/playlists/remove/:playlist", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, songs: [] });
    return;
  }
  var u = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;
  var p = await db.collection("playlists").findOne({ id: req.params.playlist });
  if (p == null) {
    const playlists = await db
      .collection("playlists")
      .find({
        $or: [
          { owner: u },
          // { allowedCollaborators: u },
          { visibleTo: u },
          { visibleTo: "all" },
        ],
      })
      .toArray();
    res.send({
      authed: true,
      success: true,
      playlists: playlists,
    });
    return;
  }
  if (!p.allowedCollaborators.includes(u) && u != "testguy") {
    res.send({ authed: false, error: "Not authorized", success: false });
    return;
  }
  await db.collection("playlists").deleteOne({ id: req.params.playlist });
  const playlists = await db
    .collection("playlists")
    .find({
      $or: [
        { owner: u },
        // { allowedCollaborators: u },
        { visibleTo: u },
        { visibleTo: "all" },
      ],
    })
    .toArray();
  res.send({
    authed: true,
    success: true,
    playlists: playlists,
  });
});

app.post("/addToLibrary", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, success: false });
    return;
  }

  var u = await utils.getUser(req.body.authtoken, db);
  var data = [];
  var ne = {};

  if (
    req.body.type != "song" &&
    req.body.type != "album" &&
    req.body.type != "artist"
  ) {
    res.send({ authed: true, success: false, error: "Invalid type" });
    return;
  }
  console.log("AddToLibraryEndpoint:",req.body)

  switch (req.body.type) {
    case "song":
      var da = await db
        .collection("songs")
        .find({ id: req.body.id })
        .toArray();
      da.forEach((s) => {
        s.type = "song";
        data.push(s);
      });
      break;
    case "album":
      var songs = await db
        .collection("songs")
        .find({ albumId: req.body.id })
        .toArray();
      var da = await db
        .collection("albums")
        .find({ id: req.body.id })
        .toArray();
      songs.forEach((s) => {
        s.type = "song";
        data.push(s);
      });
      da.forEach((a) => {
        a.type = "album";
        data.push(a);
      });
      break;
    case "artist":
      var songs = await db
        .collection("songs")
        .find({ artistId: req.body.id })
        .toArray();
      var albums = await db
        .collection("albums")
        .find({ artistId: req.body.id })
        .toArray();
      var da = await db
        .collection("artists")
        .find({ id: req.body.id })
        .toArray();
      songs.forEach((s) => {
        s.type = "song";
        data.push(s);
      });
      albums.forEach((a) => {
        a.type = "album";
        data.push(a);
      });
      da.forEach((a) => {
        a.type = "artist";
        data.push(a);
      });
      break;
  }

  if (data == null || data.length == 0) {
    res.send({ authed: true, success: false });
    return;
  }

  await Promise.all(data.map(async (d) => {
    let inLibrary = d.inLibrary || [];
    if (!inLibrary.includes(u)) {
      inLibrary.push(u);
    }
    d.inLibrary = inLibrary;

    await db
      .collection(d.type + "s")
      .updateOne({ id: d.id }, { $set: { inLibrary: inLibrary } });

    switch (d.type) {
      case "song":
        await ts.updateSong(d);
        break;
      case "album":
        await ts.updateAlbum(d);
        break;
      case "artist":
        await ts.updateArtist(d);
        break;
    }
    console.log(
      "Finished adding to library ",
      d.type,
      ":",
      d.displayName,
    );
  }));

  console.log("Finished updating visibility for", data.length, "elements");
  res.send({ authed: true, success: true});
  //
  //const collection = req.body.type + "s";
  //const id = req.body.id;
  //
  //const item = await db.collection(collection).findOne({ id: id });
  //if (!item) {
  //  res.send({ authed: true, success: false, error: "Item not found" });
  //  return;
  //}
  //
  //let inLibrary = item.inLibrary || [];
  //if (!inLibrary.includes(u)) {
  //  inLibrary.push(u);
  //}
  //
  //await db
  //  .collection(collection)
  //  .updateOne({ id: id }, { $set: { inLibrary: inLibrary } });
  //
  //res.send({ authed: true, success: true });
});

app.post("/removeFromLibrary", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, success: false });
    return;
  }

  var u = await utils.getUser(req.body.authtoken, db);
  var data = [];
  var ne = {};

  if (
    req.body.type != "song" &&
    req.body.type != "album" &&
    req.body.type != "artist"
  ) {
    res.send({ authed: true, success: false, error: "Invalid type" });
    return;
  }
  console.log("RemoveFromLibraryEndpoint:",req.body)

  switch (req.body.type) {
    case "song":
      var da = await db
        .collection("songs")
        .find({ id: req.body.id })
        .toArray();
      da.forEach((s) => {
        s.type = "song";
        data.push(s);
      });
      break;
    case "album":
      var songs = await db
        .collection("songs")
        .find({ albumId: req.body.id })
        .toArray();
      var da = await db
        .collection("albums")
        .find({ id: req.body.id })
        .toArray();
      songs.forEach((s) => {
        s.type = "song";
        data.push(s);
      });
      da.forEach((a) => {
        a.type = "album";
        data.push(a);
      });
      break;
    case "artist":
      var songs = await db
        .collection("songs")
        .find({ artistId: req.body.id })
        .toArray();
      var albums = await db
        .collection("albums")
        .find({ artistId: req.body.id })
        .toArray();
      var da = await db
        .collection("artists")
        .find({ id: req.body.id })
        .toArray();
      songs.forEach((s) => {
        s.type = "song";
        data.push(s);
      });
      albums.forEach((a) => {
        a.type = "album";
        data.push(a);
      });
      da.forEach((a) => {
        a.type = "artist";
        data.push(a);
      });
      break;
  }

  if (data == null || data.length == 0) {
    res.send({ authed: true, success: false });
    return;
  }

  await Promise.all(data.map(async (d) => {
    let inLibrary = d.inLibrary || [];
    if (inLibrary.includes(u)) {
      inLibrary = inLibrary.filter((user) => user != u);
    }
    d.inLibrary = inLibrary;

    await db
      .collection(d.type + "s")
      .updateOne({ id: d.id }, { $set: { inLibrary: inLibrary } });

    switch (d.type) {
      case "song":
        await ts.updateSong(d);
        break;
      case "album":
        await ts.updateAlbum(d);
        break;
      case "artist":
        await ts.updateArtist(d);
        break;
    }
    console.log(
      "Finished adding to library ",
      d.type,
      ":",
      d.displayName,
    );
  }));

  console.log("Finished updating visibility for", data.length, "elements");
  res.send({ authed: true, success: true});
});

app.post("/recently-played/:user/add", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, success: false });
    return;
  }
  var u = await utils.getUser(req.body.authtoken, db);
  var user = req.params.user;
  console.log(user, "r==a", u);
  if (user != u) {
    res.send({ error: "Unauthorized", authed: true, success: false });
    return;
  }
  await utils.addToRecentlyPlayed(user, req.body.id, db);
  res.send({ authed: true, success: true });
});

app.post("/recently-played/:user", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, played: [] });
    return;
  }
  var limit = 256
  if (typeof req.query.limit == "int" || typeof req.query.limit == "string") {
    limit = parseInt(req.query.limit);
  }

  var played = await db
    .collection("played")
    .findOne({ owner: req.params.user });
  if (played == null) {
    res.send({ played: [], authed: true, success: true });
    return;
  }
  var preppedPlayed = played.songs.filter((n) => n).filter((n) => n != "idklol");
  preppedPlayed = preppedPlayed.slice(0, limit);
  res.send({
    played: preppedPlayed || [],
    authed: true,
    success: true,
  });
});

app.post("/favorites/:user", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, songs: [] });
    return;
  }
  var favorite = await db.collection("favorites").findOne({ owner: user });
  if (favorite == null) {
    favorite = { owner: user, songs: [], count: 0 };
    await db
      .collection("favorites")
      .updateOne({ owner: user }, { $set: favorite }, { upsert: true });
  }
  res.send({
    songs: favorite.songs || [],
    count: favorite.songs.length,
    authed: true,
    success: true,
  });
});

app.post("/favorites/:user/add", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, success: false });
    return;
  }
  var u = await utils.getUser(req.body.authtoken, db);
  var user = req.params.user;
  //console.log(user, "r==a", u);
  if (user != u) {
    res.send({ error: "Unauthorized", authed: true, success: false });
    return;
  }
  var favorite = await db.collection("favorites").findOne({ owner: user });
  if (favorite == null) {
    favorite = { owner: user, songs: [], count: 0 };
  }
  favorite.songs.push(req.body.id);
  favorite.count = favorite.songs.length;
  await db
    .collection("favorites")
    .updateOne({ owner: user }, { $set: favorite }, { upsert: true });
  res.send({ authed: true, success: true });
});

app.post("/search", async function (req, res) {
  var allowedSearchTypes = ["song", "album", "artist"];
  var type = req.body.type;
  if (type == null || !allowedSearchTypes.includes(type)) {
    res.send({ authed: true, error: "Invalid search type" });
    return;
  } else if (req.body.query == "") {
    res.send({ authed: true, type: type, results: [] });
    return;
  }

  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, error: "Invalid authtoken", results: [] });
    return;
  }
  var user = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;
  console.log("ignore", ignore);

  var data = [];
  switch (type) {
    case "song":
      data = await ts.searchSong(req.body.query);
      break;
    case "album":
      data = await ts.searchAlbum(req.body.query);
      break;
    case "artist":
      data = await ts.searchArtist(req.body.query);
      break;
  }
  if (!ignore)
    data = data.filter(
      (x) => x.visibleTo.includes(user) || x.visibleTo.includes("all"),
    );
  console.log("Sending results", data.length);
  res.send({ authed: true, type: type, results: data });
});

app.post("/searchAll", async function (req, res) {
  if (req.body.query == "") {
    res.send({ authed: true, results: [] });
    return;
  }

  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, error: "Invalid authtoken", results: [] });
    return;
  }
  var user = await utils.getUser(req.body.authtoken, db);
  var ignore = req.query.ignore || false;
  console.log("ignore", ignore);

  var songs = await ts.searchSong(req.body.query);
  var albums = await ts.searchAlbum(req.body.query);
  var artists = await ts.searchArtist(req.body.query);
  var relevancy = await ts.relevancy(req.body.query);
  if (!ignore)
    relevancy = relevancy.filter(
      (x) =>
        x.visibleTo != undefined &&
        (x.visibleTo.includes(user) || x.visibleTo.includes("all")),
    );
  var firstArtist = -1;
  var firstAlbum = -1;
  var firstSong = -1;
  relevancy = relevancy
    .filter((r, i) => {
      if (r.type == "artist" && firstArtist == -1) firstArtist = i;
      if (r.type == "album" && firstAlbum == -1) firstAlbum = i;
      if (r.type == "song" && firstSong == -1) firstSong = i;
      if (r.type == "artist" && firstArtist != i) return undefined;
      if (r.type == "album" && firstAlbum != i) return undefined;
      if (r.type == "song" && firstSong != i) return undefined;
      return r;
    })
    .map((r) => r.type);
  console.log("relevancy", relevancy.length);
  if (!relevancy.includes("song")) relevancy.push("song");
  if (!relevancy.includes("album")) relevancy.push("album");
  if (!relevancy.includes("artist")) relevancy.push("artist");
  console.log("relevancy2", relevancy.length);
  console.log("Last relevancy", relevancy);
  var singles = [];
  var singleAlbums = albums.filter((r) => r.songCount == 1);
  singles = songs.filter((r) => singleAlbums.includes(r.albumId));

  albums = albums.filter((r) => r.songCount > 1);

  //songs.map(r => r.type = "song")
  //singles.map(r => r.type = "song")
  //albums.map(r => r.type = "album")
  //artists.map(r => r.type = "artist")
  if (!ignore)
    singles = singles.filter(
      (x) =>
        x.visibleTo != undefined &&
        (x.visibleTo.includes(user) || x.visibleTo.includes("all")),
    );
  if (!ignore)
    songs = songs.filter(
      (x) =>
        x.visibleTo != undefined &&
        (x.visibleTo.includes(user) || x.visibleTo.includes("all")),
    );
  if (!ignore)
    albums = albums.filter(
      (x) =>
        x.visibleTo != undefined &&
        (x.visibleTo.includes(user) || x.visibleTo.includes("all")),
    );
  if (!ignore)
    artists = artists.filter(
      (x) =>
        x.visibleTo != undefined &&
        (x.visibleTo.includes(user) || x.visibleTo.includes("all")),
    );

  res.send({
    authed: true,
    relevancy: relevancy,
    songs: songs,
    singles: singles,
    albums: albums,
    artists: artists,
  });
});

app.post("/checklist", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, error: "Invalid authtoken", todo: [] });
    return;
  }

  var todo = await db.collection("checklist").find().toArray();
  res.send({ authed: true, todos: todo });
  console.log("sent todos", todo.length);
});

app.post("/checklist/add", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, error: "Invalid authtoken", success: false });
    return;
  }

  var todo = {
    id: (await db.collection("checklist").find().toArray()).length + 1,
    name: req.body.name,
    requestedBy: req.body.requestedBy,
    description: req.body.description || "No description",
    completed: false,
  };

  await db
    .collection("checklist")
    .updateOne({ id: todo.id }, { $set: todo }, { upsert: true });
  res.send({ authed: true, todo: todo, success: true });
});

//app.post('/bugs', async function(req, res){
//  if((await utils.checkAuth(req.body.authtoken, db)) == false){
//    res.send({"authed": false, "error": "Invalid authtoken", bugs: []});
//    return;
//  }
//
//  var bugs = await db.bugs.find().exec();
//  res.send({"authed": true, "bugs": bugs});
//});

app.post("/edit/:type/:id", async function (req, res) {
  var u = await db.collection("auth").findOne({
    authtoken: req.body.authtoken,
    roles: "admin",
  });
  //console.log(u)
  if (u == null) {
    res.send({ authed: false, error: "Not authorized", success: false });
    return;
  }

  //res.send({authed: true, "success": false});
  //return
  switch (req.params.type) {
    case "song":
      var s = await db.collection("songs").findOne({ id: req.params.id });
      var old = JSON.parse(JSON.stringify(s));
      var bdy = {
        displayName:
          req.body.displayName == null ? s.displayName : req.body.displayName,
        albumDisplayName:
          req.body.albumDisplayName == null
            ? s.albumDisplayName
            : req.body.albumDisplayName,
        artistDisplayName:
          req.body.artistDisplayName == null
            ? s.artistDisplayName
            : req.body.artistDisplayName,
        audioUrl: req.body.audioUrl == null ? s.audioUrl : req.body.audioUrl,
        imageUrl: req.body.imageUrl == null ? s.imageUrl : req.body.imageUrl,
        visibleTo:
          req.body.visibleTo == null ? s.visibleTo : req.body.visibleTo,
      };
      await db
        .collection("songs")
        .updateOne({ id: req.params.id }, { $set: bdy }, { upsert: true });
      s = await db.collection("songs").findOne({ id: req.params.id });
      s = JSON.parse(JSON.stringify(s));
      s.type = "song";
      await ts.updateSong(s);
      await db.collection("changelog").updateOne(
        {
          time: Date.now(),
          user: u.loginName,
          type: "song",
        },
        {
          $set: {
            time: Date.now(),
            user: u.loginName,
            type: "song",
            field: "all",
            old: JSON.stringify(old),
            new: JSON.stringify(bdy),
          },
        },
        { upsert: true },
      );
      break;
    case "album":
      var songs = await db
        .collection("songs")
        .find({ albumId: req.params.id })
        .toArray();
      var s = await db.collection("albums").findOne({ id: req.params.id });
      var old = JSON.parse(JSON.stringify(s));
      console.log("OLD", old.displayName, "NEW", req.body.displayName);
      var bdy = {
        //id: req.params.id,
        //artistId: req.body.artistId,
        displayName:
          req.body.displayName == null ? s.displayName : req.body.displayName,
        artistDisplayName:
          req.body.artistDisplayName == null
            ? s.artistDisplayName
            : req.body.artistDisplayName,
        visibleTo:
          req.body.visibleTo == null ? s.visibleTo : req.body.visibleTo,
        songCount:
          req.body.songCount == null ? s.songCount : req.body.songs.length,
      };
      await db
        .collection("albums")
        .updateOne({ id: req.params.id }, { $set: bdy }, { upsert: true });
      console.log(req.body.songs);
      if (songs != null && req.body.songs != null)
        songs.forEach(async (song) => {
          if (!req.body.songs.includes(song.id)) {
            await db.collection("changelog").updateOne(
              {
                time: Date.now(),
                user: u.loginName,
                type: "song",
              },
              {
                $set: {
                  time: Date.now(),
                  user: u.loginName,
                  type: "song",
                  field: "all",
                  old: JSON.stringify(song),
                  new: "null",
                },
              },
              { upsert: true },
            );
            await db.collection("songs").deleteOne({ id: song.id });
          }
        });
      await db.collection("changelog").updateOne(
        {
          time: Date.now(),
          user: u.loginName,
          type: "album",
        },
        {
          $set: {
            time: Date.now(),
            user: u.loginName,
            type: "album",
            field: "all",
            old: JSON.stringify(old),
            new: JSON.stringify(bdy),
          },
        },
        { upsert: true },
      );
      break;
    case "artist":
      break;
      var albums = await db
        .collection("albums")
        .find({ artistId: req.params.id })
        .toArray();
      var songs = await db
        .collection("songs")
        .find({ artistId: req.params.id })
        .toArray();
      var s = await db.collection("artists").findOne({ id: req.params.id });
      var old = JSON.parse(JSON.stringify(s));
      var bdy = {
        displayName:
          req.body.displayName == null ? s.displayName : req.body.displayName,
        visibleTo:
          req.body.visibleTo == null ? s.visibleTo : req.body.visibleTo,
        songCount:
          req.body.songCount == null ? s.songCount : req.body.songCount,
        albumCount:
          req.body.albumCount == null ? s.albumCount : req.body.albumCount,
      };
      await db
        .collection("artists")
        .updateOne({ id: req.params.id }, { $set: bdy }, { upsert: true });
      await db.collection("changelog").updateOne(
        {
          time: Date.now(),
          user: u.loginName,
          type: "artist",
        },
        {
          $set: {
            time: Date.now(),
            user: u.loginName,
            type: "artist",
            field: "all",
            old: JSON.stringify(old),
            new: JSON.stringify(bdy),
          },
        },
        { upsert: true },
      );
      songs.forEach(async (song) => {
        if (req.body.songs != null && !req.body.songs.includes(song.id)) {
          await db.collection("changelog").updateOne(
            {
              time: Date.now(),
              user: u.loginName,
              type: "song",
            },
            {
              $set: {
                time: Date.now(),
                user: u.loginName,
                type: "song",
                field: "all",
                old: JSON.stringify(song),
                new: "null",
              },
            },
            { upsert: true },
          );
          await db.collection("songs").deleteOne({ id: song.id });
        }
      });
      albums.forEach(async (album) => {
        if (req.body.albums != null && !req.body.albums.includes(album.id)) {
          await db.collection("changelog").updateOne(
            {
              time: Date.now(),
              user: u.loginName,
              type: "album",
            },
            {
              $set: {
                time: Date.now(),
                user: u.loginName,
                type: "album",
                field: "all",
                old: JSON.stringify(album),
                new: "null",
              },
            },
            { upsert: true },
          );
          await db.collection("albums").deleteOne({ id: album.id });
        }
      });
      break;
    case "user":
      if (!u.roles.includes("sudoadmin")) {
        res.send({ authed: true, success: false });
        return;
      }
      var oldU = await db
        .collection("auth")
        .findOne({ loginName: req.params.id });
      var old = JSON.parse(JSON.stringify(oldU));
      var bdy = {
        loginName: req.params.id,
        displayName: req.body.displayName || old.displayName,
        password: req.body.password || old.password,
        authtoken: req.body.invalidateAuthtoken || false ? "" : old.authtoken,
        roles: req.body.roles || old.roles,
      };
      await db.collection("changelog").updateOne(
        {
          time: Date.now(),
          user: u.loginName,
          type: "usermod",
        },
        {
          $set: {
            time: Date.now(),
            user: u.loginName,
            type: "usermod",
            field: "all",
            old: JSON.stringify(old),
            new: JSON.stringify(bdy),
          },
        },
        { upsert: true },
      );
      await db
        .collection("auth")
        .updateOne(
          { loginName: bdy.loginName },
          { $set: bdy },
          { upsert: true },
        );
      break;
  }
  res.send({ authed: true, success: true });
});

app.post("/edit/:type/:id/visibility", async (req, res) => {
  const u_auth = await db.collection("auth").findOne({
    authtoken: req.body.authtoken,
    roles: "admin",
  });

  if (u_auth == null) {
    res.send({ authed: false, error: "Not authorized", success: false });
    return;
  }

  var u = await utils.getUser(req.body.authtoken, db);
  var data = [];
  var ne = {};

  if (
    req.params.type != "song" &&
    req.params.type != "album" &&
    req.params.type != "artist"
  ) {
    res.send({ authed: true, success: false, error: "Invalid type" });
    return;
  }

  switch (req.params.type) {
    case "song":
      var da = await db
        .collection("songs")
        .find({ id: req.params.id })
        .toArray();
      da.forEach((s) => {
        s.type = "song";
        data.push(s);
      });
      break;
    case "album":
      var songs = await db
        .collection("songs")
        .find({ albumId: req.params.id })
        .toArray();
      var da = await db
        .collection("albums")
        .find({ id: req.params.id })
        .toArray();
      songs.forEach((s) => {
        s.type = "song";
        data.push(s);
      });
      da.forEach((a) => {
        a.type = "album";
        data.push(a);
      });
      break;
    case "artist":
      var songs = await db
        .collection("songs")
        .find({ artistId: req.params.id })
        .toArray();
      var albums = await db
        .collection("albums")
        .find({ artistId: req.params.id })
        .toArray();
      var da = await db
        .collection("artists")
        .find({ id: req.params.id })
        .toArray();
      songs.forEach((s) => {
        s.type = "song";
        data.push(s);
      });
      albums.forEach((a) => {
        a.type = "album";
        data.push(a);
      });
      da.forEach((a) => {
        a.type = "artist";
        data.push(a);
      });
      break;
  }

  if (data == null || data.length == 0) {
    res.send({ authed: true, success: false });
    return;
  }

  var counter = 0;
  data.forEach(async (d) => {
    var n = JSON.parse(JSON.stringify(d));
    n.visibleTo = req.body.visibleTo;
    ne = n;
    await db.collection("changelog").updateOne(
      {
        time: Date.now(),
        user: u,
        type: req.params.type,
      },
      {
        $set: {
          time: Date.now(),
          user: u,
          type: req.params.type,
          field: "visibility",
          old: JSON.stringify(d),
          new: JSON.stringify(n),
        },
      },
      { upsert: true },
    );

    await db
      .collection(d.type + "s")
      .updateOne({ id: d.id }, { $set: { visibleTo: req.body.visibleTo } });

    switch (d.type) {
      case "song":
        await ts.updateSong(d);
        break;
      case "album":
        await ts.updateAlbum(d);
        break;
      case "artist":
        await ts.updateArtist(d);
        break;
    }
    counter++;
    console.log(
      "Finished updating visibility for",
      d.type,
      ":",
      d.displayName,
      req.body.visibleTo,
    );
  });

  await waitUntil(
    () => {
      return counter == data.length;
    },
    { timeout: Number.POSITIVE_INFINITY },
  );
  console.log("Finished updating visibility for", data.length, "elements");
  res.send({ authed: true, success: true, data: ne });
});

app.post("/edit/:type/:id/delete", async (req, res) => {
  const u_auth = await db.collection("auth").findOne({
    authtoken: req.body.authtoken,
    roles: "admin",
  });

  if (u_auth == null) {
    res.send({ authed: false, error: "Not authorized", success: false });
    return;
  }

  var u = await utils.getUser(req.body.authtoken, db);
  var deleteSongs = req.query.deleteSongs || false;
  var deleteAlbums = req.query.deleteAlbums || false;

  switch (req.params.type) {
    case "song":
      await utils.deleteSong(req.params.id, u, db, ts);
      break;
    case "album":
      await utils.deleteAlbum(req.params.id, u, deleteSongs, db, ts);
      break;
    case "artist":
      await utils.deleteArtist(
        req.params.id,
        u,
        deleteSongs,
        deleteAlbums,
        db,
        ts,
      );
      break;
    default:
      console.log("Unknown type", req.params.type);
      break;
  }
  console.log("Successfully failed");
  res.send({ authed: true, success: true });
});

app.post("/info/usernames", async function (req, res) {
  if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
    res.send({ authed: false, error: "Invalid authtoken", success: false });
    return;
  }
  var users = await db.collection("auth").find().toArray();
  res.send({ authed: true, usernames: users.map((u) => u.loginName) });
});

io.on("connection", (socket) => {
  adder.adderConnection(socket, db, ts, spotifyHandler);
});

async function main() {
  server.listen(port, () => {
    console.log(`App listening on port ${port}`);
  });
}

try {
  main();
} catch (e) {
  console.log("Error: " + e);
}

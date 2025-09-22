import express from "express";
const router = express.Router();

export default (db) => {
  // /info/songs/ - Get all songs, with optional limit and mine filter
  router.post("/", async function (req, res) {
    var user = req.user;
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

  // /info/songs/by/album/:id - Get all songs from a specific album
  router.post("/by/album/:id", async function (req, res) {
    var user = req.user;
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

  // /info/songs/by/artist/:id - Get all songs from a specific artist
  router.post("/by/artist/:id", async function (req, res) {
    var user = req.user;
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
      .sort({ artistId: 1, albumId: 1, trackNumber: 1 })
      .toArray();

    res.send({ authed: true, songs: data });
  });

  // /info/songs/batch - Get songs by a list of IDs or externalIds
  router.post("/batch", async function (req, res) {
    var user = req.user;
    var ignore = req.query.ignore || false;
    var externalIds = !(typeof(req.body.externalIds) == "undefined");
    var query = {};
    if(req.body.ids){
      query.id = { $in: req.body.ids };
    }else if(externalIds){
      console.log("/info/songs/batch - using "+req.body.externalIds.length+" externalIds");
      query.externalId = { $in: req.body.externalIds };
    }
    if (!ignore) {
      query.$or = [{ visibleTo: user }, { visibleTo: "all" }];
    }

    var privateLibrary = req.query.mine || false;
    if (privateLibrary == true) {
      delete query.$or;
      query.inLibrary = user;
    }
    // console.log("/info/songs/batch - Querying");
    var data = await db.collection("songs").find(query).toArray();
    // console.log("/info/songs/batch - Query done");
    var results = {};
    // console.log("/info/songs/batch - Mapping");
    if(externalIds == false)
      data.forEach((d) => (results[d.id] = d));
    else
      data.forEach((d) => (results[d.externalId] = d.id));
    // console.log("/info/songs/batch - Sending results");
    res.send({ authed: true, results: results });
  });

  // /info/songs/:id - Get a specific song by ID
  router.post("/:id", async function (req, res) {
    var user = req.user;
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
  return router;
}

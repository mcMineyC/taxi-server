import express from "express";
const router = express.Router();

export default (db) => {
  router.post("/", async function (req, res) {
    var user = req.user;
    var ignore = req.query.ignore || false;

    var query = {};
    if (!ignore)
      query.$or = [{ visibleTo: user }, { visibleTo: "all" }];

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

  router.post("/:id", async function (req, res) {
    var user = req.user;
    var ignore = req.query.ignore || false;

    const data = await db.collection("albums").findOne({
      id: req.params.id,
      $or: ignore ? [] : [{ visibleTo: user }, { visibleTo: "all" }],
    });
    res.send({ authed: true, album: data });
  });

  router.post("/by/artist/:id", async function (req, res) {
    var user = req.user;
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
  return router;
}
import express from "express";

import songsRouter from "./songs.js";
import albumsRouter from "./albums.js";
import artistsRouter from "./artists.js";

const router = express.Router();

export default (db) => {
  router.post("/singles/by/artist/:id", async function (req, res) {
    var user = req.user;
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
  });// Songs but under a different name
  
  router.use("/songs", songsRouter(db));
  router.use("/albums", albumsRouter(db));
  router.use("/artists", artistsRouter(db));
  return router;
}

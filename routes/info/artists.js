import express from "express";
const router = express.Router();

export default (db) => {

  router.post("/", async function (req, res) {
    if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
      res.send({ authed: false, artists: [] });
      return;
    }
  
    var user = req.user;
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
  
  router.post("/:id", async function (req, res) {
    if ((await utils.checkAuth(req.body.authtoken, db)) == false) {
      res.send({ authed: false, artist: {} });
      return;
    }
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
    const data = await db.collection("artists").findOne(query);
    res.send({ authed: true, artist: data });
  });
  return router;
}

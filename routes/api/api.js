import express from "express";
import authWare from "../../authMiddleware/standardAuth.js";
import kuscRouter from "./kusc.js";
const router = express.Router();

export default (db, spotifyHandler) => {

  router.use("/kusc", kuscRouter(db));
  router.post("/getArtistImageFromName", authWare(db), async (req, res) => {
    var url = await spotifyHandler.getArtistImageUrlFromName(req.body.query);
    res.send({authed: true, error: "", url: url});
  })
  router.post("/latestCommit", authWare(db), async function (_, res) {
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

  router.post("/status", function (_, res) {
    res.send({ status: "ok" });
  });
  router.get("/status", function (_, res) {
    res.send({ status: "ok" });
  });
  return router;
}
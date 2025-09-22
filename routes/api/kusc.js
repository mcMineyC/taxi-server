import express from "express";
import kusc from "kusc_api";
const router = express.Router();

export default (db) => {
  router.get("/streams", async function (req, res) {
    try{
      res.send(await kusc.getStreams());
    }catch (e){
      res.status(501).send("There was an error...");
    }
  })

  router.get("/streams/:id/audio", async function (req, res) {
    try{
      var url = await kusc.getStreamUrl(req.params.id, req.query.type || "AAC96");
      res.redirect(url);
      //next();
      return;
    }catch(e){
      res.status(501).send("There was an error processing your request.  Did you double check your stream id and/or type?");
    }
  })

  router.get("/streams/:id/metadata", async function (req, res) {
    try{
      var info = await kusc.getCurrentMetadata(req.params.id);
      res.send(info);
    }catch(e){
      res.status(501).send("There was an error processing your request.  Did you double check your stream id?");
    }
  })
  return router;
}
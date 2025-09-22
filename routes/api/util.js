import express from "express";
const router = express.Router();

export default (db) => {
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
  
  return router;
}
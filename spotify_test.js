import express from "express";
import SpotifyHandler from "./spotify.js";

const clientID = "0a65ebdec6ec4983870a7d2f51af2aa1";
const secretKey = "22714014e04f46cebad7e03764beeac8";
const spotifyHandler = new SpotifyHandler(
  clientID,
  secretKey,
  "http://localhost:8080/callback",
);
await spotifyHandler.initialize();
var app = express();

app.get("/log", (req, res) => res.redirect("/login"));
// app.get("/log", (req, res) => res.send("hi"));
app.get("/error", (req, res) => res.send("There was an error"));

app.get("/login", (req, res) => {
  const userId = "main"; // Get user ID from session
  const authUrl = spotifyHandler.getAuthorizationUrl(userId);
  res.redirect(authUrl);
});

app.get("/callback", async (req, res) => {
  const { code } = req.query;

  try {
    const userId = await spotifyHandler.handleCallback(code);
    var user = await spotifyHandler.getUserProfile();
    res.send("Logged in as " + user.display_name);
  } catch (error) {
    console.error("Authentication error:", error);
    res.redirect("/error");
  }
});
app.get("/getplaylist", async (req, res) => {
  res.send(await spotifyHandler.getFullPlaylist("7FEeFB1KFRNUWlPKJ8hjH8"));
});
app.get("/getplaylists", async (req, res) => {
  res.send(await spotifyHandler.getUserPlaylists());
});

app.listen(8080, () => {
  console.log("Server running on port 8080");
});

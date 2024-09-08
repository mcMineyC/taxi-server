//Just some crazy stuff I found in a Stack Overflow
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import axios from 'axios';
import db from './db.js';
const { io } = require("socket.io-client");

var id = "95c4ee023914cc8e17ceb50e8d4ec4d2b96938ce09e6e7d84d34cffd90de18d7";
var string = `[{"name":"Wicked","album":"Wicked","artist":"Avenza","imageUrl":"https://i.scdn.co/image/ab67616d0000b27398c70da307a751d93ed21981","type":"song","songs":[{"title":"Wicked","id":"mdOwY01GAZw","trackNumber":0}]}]`;
var items = JSON.parse(string);

var authtoken = await db.auth.findOne({selector: {"loginName": "jedi"}}).exec()
authtoken = authtoken.authtoken;
//var res = await axios.post("http://localhost:3000/edit/artist/"+id+"/delete?deleteSongs=true&deleteAlbums=true",{authtoken: authtoken})
//if(res.status == 200){
//  console.log("Request has 200 status");
//  if(res.data.success) console.log("Request was successful");
//  else console.log("Request failed");
//}

const socket = io("http://localhost:3000");
socket.on("connect", async () => {
  console.log("Socket connected");
})
socket.on("disconnect", async () => {
  console.log("Socket disconnected");
  await db.destroy();
})
socket.on("authprompt", () => socket.emit("auth", {"authtoken": authtoken}));
socket.on("authresult", (data) => {
  if(data.success) console.log("Auth success!");
  else { console.log("Auth failed"); return;}
  socket.emit("add", {"items": items});
})
socket.on("addresult", async (data) => {
  if(data.success) console.log("Add success!");
  else { console.log("Add failed"); return;}
  console.log(`Added ${data.count.artists} artists, ${data.count.albums} albums, ${data.count.songs} songs.`);
  var artist = await db.artists.findOne({selector: {displayName: "Avenza"}}).exec();
  console.log("Artist:");
  console.log("\tID:", artist.id);
  console.log("\tName:", artist.displayName);
  console.log("\tSongcount:", artist.songCount);
  console.log("\tAlbumcount:", artist.albumCount);
})


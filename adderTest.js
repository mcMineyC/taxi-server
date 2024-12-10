import fs from "fs";

import adder from "./adder.js";

var input = JSON.parse(fs.readFileSync("../taxi_native/out.json"));
var songs = JSON.parse(fs.readFileSync("./backup/songs.json"));
var albums = JSON.parse(fs.readFileSync("./backup/albums.json"));
var artists = JSON.parse(fs.readFileSync("./backup/artists.json"));

var output = await adder.adderMergeLogic(artists, albums, songs, input);
fs.writeFileSync("./backup/new_songs.json",
                 JSON.stringify(output.songs, null, 2));
fs.writeFileSync("./backup/new_albums.json",
                 JSON.stringify(output.albums, null, 2));
fs.writeFileSync("./backup/new_artists.json",
                 JSON.stringify(output.artists, null, 2));

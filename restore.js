import fs from 'fs';
//Just some crazy stuff I found in a Stack Overflow
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import schemas from './schemas.js';

const { createRxDatabase, addRxPlugin } = require('rxdb');
import { getRxStorageMongoDB } from 'rxdb/plugins/storage-mongodb';
import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBJsonDumpPlugin);

//var dbName = "rxdb-taxi";
//
//var db = await createRxDatabase({
//  name: dbName,
//  storage: getRxStorageMongoDB({
//    connection: 'mongodb://admin:supersecure123@192.168.30.36:27017/?authSource=admin',
//  }),
//});
//
//await schemas.register(db, 8);
//// Delete
//await db.remove();

// Reinitialize
var db = await createRxDatabase({
  name: dbName,
  storage: getRxStorageMongoDB({
    connection: 'mongodb://admin:supersecure123@192.168.30.36:27017/?authSource=admin',
  }),
});

await schemas.register(db, 8);

console.log("Added collections");

var songs = JSON.parse(fs.readFileSync('./backup/songs.json', 'utf8'));
var albums = JSON.parse(fs.readFileSync('./backup/albums.json', 'utf8'));
var artists = JSON.parse(fs.readFileSync('./backup/artists.json', 'utf8'));
var users = JSON.parse(fs.readFileSync('./backup/auth.json', 'utf8'));
var checklist = JSON.parse(fs.readFileSync('./backup/checklist.json', 'utf8'));
var playlists = JSON.parse(fs.readFileSync('./backup/playlists.json', 'utf8'));
var recentlyPlayed = JSON.parse(fs.readFileSync('./backup/played.json', 'utf8'));

console.log("Remapping");
songs = songs.map((song) => {
  song.addedBy = "jedi";
  song.visibleTo = ["all"];
  return song;
});
albums = albums.map((album) => {
  album.addedBy = "jedi";
  album.visibleTo = ["all"];

  album.songCount = 0;
  songs.forEach(song => {if (song.albumId == album.id) album.songCount++});
  return album;
});
artists = artists.map((artist) => {
  artist.addedBy = "jedi";
  artist.visibleTo = ["all"];

  //Count songs and albums
  artist.songCount = 0;
  artist.albumCount = 0;
  songs.forEach(song => {if (song.artistId == artist.id) artist.songCount++});
  albums.forEach(album => {if (album.artistId == artist.id) artist.albumCount++});
  return artist;
});
playlists = playlists.map((playlist) => {
  playlist.visibleTo = playlist.public ? ["all"] : [playlist.owner];
  playlist.songCount = playlist.songs.length;
  return playlist;
});
users = users.map((user) => {
  user.roles = ["view", "add", "dj"];
  if (user.loginName == "jedi" || user.loginName == "connor") user.roles.push("admin");
  return user;
});

console.log("Upserting");
console.log("\tsongs", songs.length);
db.songs.bulkUpsert(songs);
console.log("\talbums", albums.length);
db.albums.bulkUpsert(albums);
console.log("\tartists", artists.length);
db.artists.bulkUpsert(artists);
console.log("\tusers", users.length);
db.auth.bulkUpsert(users);
console.log("\tchecklist", checklist.length);
db.checklist.bulkUpsert(checklist);
console.log("\tplaylists", playlists.length);
db.playlists.bulkUpsert(playlists);
console.log("\tplayed", recentlyPlayed.length);
db.played.bulkUpsert(recentlyPlayed);
console.log("Done");

await db.destroy();

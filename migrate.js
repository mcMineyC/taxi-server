import { createRequire } from "module";
const require = createRequire(import.meta.url);

const path = require('path');
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fs = require('fs');
import schemas from './schemas.js';

const { RxDBDevModePlugin } = require('rxdb/plugins/dev-mode');
const { createRxDatabase, removeRxDatabase, addRxPlugin } = require('rxdb');
import { getRxStorageMongoDB } from 'rxdb/plugins/storage-mongodb';
import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBJsonDumpPlugin);

var dbName = "rxdb-taxi";

// await removeRxDatabase(dbName, getRxStorageMongoDB({connection: 'mongodb://rxdb-taxi:dexiewasbad@192.168.30.36:27017/?authSource=admin'}));  console.log("Removed database");

var db = await createRxDatabase({
  name: dbName,
  storage: getRxStorageMongoDB({
    connection: 'mongodb://admin:supersecure123@192.168.30.36:27017/?authSource=admin',
  }),
});

await schemas.register(db, 0);
console.log("Added collections");

var playlists = [];
var files = fs.readdirSync(path.join(__dirname, 'config', 'playlists'));
for (const file of files) {
  for (const list of JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'playlists', file)))["playlists"]){
    playlists.push(list);
  }
}

// var songs = fs.readFileSync(path.join(__dirname, 'config', 'songs.json'));
// songs = JSON.parse(songs);
//
// var albums = fs.readFileSync(path.join(__dirname, 'config', 'albums.json'));
// albums = JSON.parse(albums);
//
// var artists = fs.readFileSync(path.join(__dirname, 'config', 'artists.json'));
// artists = JSON.parse(artists);
//
var auth = fs.readFileSync(path.join(__dirname, 'config', 'auth.json'));
auth = JSON.parse(auth);
//
// var recentlyPlayed = fs.readFileSync(path.join(__dirname, 'config', 'recently-played.json'));
// recentlyPlayed = JSON.parse(recentlyPlayed);
//
// var upserted = await db.songs.bulkUpsert(songs["songs"]);
// console.log("Upserted", upserted.success.length, "songs");
//
// var upserted = await db.albums.bulkUpsert(albums["albums"]);
// console.log("Upserted", upserted.success.length, "albums");
//
// var upserted = await db.artists.bulkUpsert(artists["artists"]);
// console.log("Upserted", upserted.success.length, "artists");
//
// var upserted = await db.playlists.bulkUpsert(playlists);
// console.log("Upserted", upserted.success.length, "playlists");

var upserted = await db.auth.bulkUpsert(auth["users"]);
console.log("Upserted", upserted.success.length, "users");

// var users = 0;
// var songs = 0;
// var played = [];
// Object.keys(recentlyPlayed["recently-played"]).forEach((key) => {
//   users++;
//   songs += recentlyPlayed["recently-played"][key].length
//   played.push({
//     owner: key,
//     songs: recentlyPlayed["recently-played"][key]
//   });
// });
// var upserted = await db.played.bulkUpsert(played);
// console.log("Upserted", songs, "recently played songs for", users, "users");

console.log("Finished importing v0 schema");
console.log("Destroying database");
await db.destroy();
console.log("Starting v1 schema");
var db = await createRxDatabase({
  name: dbName,
  storage: getRxStorageMongoDB({
    connection: 'mongodb://admin:supersecure123@192.168.30.36:27017/?authSource=admin',
  }),
});

console.log("Adding v1 schema");
await schemas.register(db, 1);
console.log("Added collections for v1");

console.log("Destroying database");
await db.destroy();
console.log("Starting v2 schema");
var db = await createRxDatabase({
  name: dbName,
  storage: getRxStorageMongoDB({
    connection: 'mongodb://admin:supersecure123@192.168.30.36:27017/?authSource=admin',
  }),
});
await schemas.register(db, 2);

console.log("Destroying database");
await db.destroy();
console.log("Starting v3 schema");
var db = await createRxDatabase({
  name: dbName,
  storage: getRxStorageMongoDB({
    connection: 'mongodb://admin:supersecure123@192.168.30.36:27017/?authSource=admin',
  }),
});

console.log("Adding v3 schema");
await schemas.register(db, 3);
console.log("Added collections for v3");

// console.log("Starting post-migrate fixup");
// switch(1){
//   case 1:
    // var songs = await db.songs.find().exec();
    // var albums = await db.albums.find().exec();
    // var artists = await db.artists.find().exec();
    // var playlists = await db.playlists.find().exec();
    // var favorites = await db.favorites.find().exec();
//     for(const song of songs){
//       console.log("Fixing", song.displayName, "metadata");
//       if(song.albumDisplayName == "IGOTTAFIXTHISASAP"){
//         console.log("  Fixing album");
//         var album = await db.albums.findOne({selector: {id: song.albumId}}).exec();
//         song.incrementalPatch({
//           albumDisplayName: album.displayName
//         })
//       }
//       if(song.artistDisplayName == "IGOTTAFIXTHISASAP"){
//         console.log("  Fixing artist");
//         var artist = await db.artists.findOne({selector: {id: song.artistId}}).exec();
//         song.incrementalPatch({
//           artistDisplayName: artist.displayName
//         })
//       }
//     }
//     console.log("\nFIXING ALBUMS\n");
//     for (const album of albums){
//       if(album.artistDisplayName == "IGOTTAFIXTHISASAP"){
//         console.log("  Fixing album");
//         var artist = await db.artists.findOne({selector: {id: album.artistId}}).exec();
//         album.incrementalPatch({
//           artistDisplayName: artist.displayName
//         })
//       }
//       if(album.songCount == 0){
//         console.log("  Fixing song count");
//         var cnt = (await db.songs.find({selector: {albumId: album.id}}).exec()).length;
//         album.incrementalPatch({
//           songCount: cnt
//         });
//       }
//     }
//     for (const artist of artists){
//       if(artist.songCount == 0){
//         console.log("  Fixing song count");
//         var cnt = await db.songs.count({selector: {artistId: artist.id}}).exec();
//         artist.incrementalPatch({
//           songCount: cnt
//         })
//       }
//       if(artist.albumCount == 0){
//         console.log("  Fixing album count");
//         var cnt = (await db.albums.find({selector: {artistId: artist.id}}).exec()).length;
//         artist.incrementalPatch({
//           albumCount: cnt
//         })
//       }
//     }
//     break;
// }

console.log("Database migrated");

// console.log("0x01f21", await db.songs.findOne().exec());
// var doc = await db.played.findOne({
//   selector: {
//     owner: 'jedi'
//   }
// }).exec();
// doc.modify((doc) => {
//   doc.songs.push("5c3c8a7e-9f6e-4b5e-9a4f-7d5f5c3c8a7f");
//   return doc;
// });

// console.log("Dumping for diagnostic purposes");
// var dSongs = await db.songs.exportJSON();
// var dAlbums = await db.albums.exportJSON();
// var dArtists = await db.artists.exportJSON();
// var dPlaylists = await db.playlists.exportJSON();
// var dAuth = await db.auth.exportJSON();
// var dPlayed = await db.played.exportJSON();
// var dFavorites = await db.favorites.exportJSON();
// fs.writeFileSync(path.join(__dirname, 'dump', 'songs.json'), JSON.stringify(dSongs,null,2));
// fs.writeFileSync(path.join(__dirname, 'dump', 'albums.json'), JSON.stringify(dAlbums,null,2));
// fs.writeFileSync(path.join(__dirname, 'dump', 'artists.json'), JSON.stringify(dArtists,null,2));
// fs.writeFileSync(path.join(__dirname, 'dump', 'playlists.json'), JSON.stringify(dPlaylists,null,2));
// fs.writeFileSync(path.join(__dirname, 'dump', 'auth.json'), JSON.stringify(dAuth,null,2));
// fs.writeFileSync(path.join(__dirname, 'dump', 'played.json'), JSON.stringify(dPlayed,null,2));
// fs.writeFileSync(path.join(__dirname, 'dump', 'favorites.json'), JSON.stringify(dFavorites,null,2));
//
// console.log("Dumped");

await db.destroy();

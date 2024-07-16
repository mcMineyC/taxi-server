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

const db = await createRxDatabase({
  name: dbName,
  storage: getRxStorageMongoDB({
    connection: 'mongodb://admin:supersecure123@192.168.30.36:27017/?authSource=admin',
  }),
});

await schemas.register(db, 3);
console.log("Added collections");
// var artists = await db.artists.find().exec();
// for (const artist of artists){
//     console.log("Artist:", artist.id);
//     var cnt = await db.songs.find({selector: {artistId: artist.id}}).exec();
//     console.log(artist.displayName, "has", cnt.length, "songs");
//     cnt.forEach((song) => {
//       // console.log("\t", song.id, ":", song.displayName);
//     });
//     if(artist.displayName.includes("Miley")){
//       await artist.patch({imageUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Apple_Music_icon.svg"});
//       console.group("Updated mileys image");
//     }
// }
var albums = await db.albums.find().exec();
for(const album of albums){
  if(album.displayName.includes("Chipbreak")){
    await album.remove();
    console.log("Removed", album.displayName);
  }
}
await db.destroy();

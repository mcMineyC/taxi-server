import { createRequire } from "module";
const require = createRequire(import.meta.url);

import schemas from './schemas.js';

const { createRxDatabase, addRxPlugin } = require('rxdb');
import { getRxStorageMongoDB } from 'rxdb/plugins/storage-mongodb';
import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBJsonDumpPlugin);

var dbName = "rxdb-taxi";

var db = await createRxDatabase({
  name: dbName,
  storage: getRxStorageMongoDB({
    connection: 'mongodb://admin:supersecure123@192.168.30.36:27017/?authSource=admin',
  }),
});
await schemas.register(db, 3);

const typesense = require("typesense");
const client = new typesense.Client({
  nodes: [
    {
      host: "192.168.30.36",
      port: 8108,
      protocol: "http",
    },
  ],
  'apiKey': 'xyz123',
  'connection_timeout_seconds': 8,
});

try{
  await client.collections("taxi-songs").delete();
  await client.collections("taxi-albums").delete();
  await client.collections("taxi-artists").delete();
}catch(e){
  console.log("No collections to delete");
}

for(const schema of schemas.typesenseCollections){
  try{
    console.log("Creating collection "+schema.name);
    await client.collections().create(schema);
  }catch(e){
    console.log("Error creating collection "+schema.name, e);
  }
}
var songs = await db.songs.find().exec();
var albums = await db.albums.find().exec();
var artists = await db.artists.find().exec();

await client.collections('taxi-songs').documents().import(songs, {action: "upsert"});
await client.collections('taxi-albums').documents().import(albums, {action: "upsert"});
await client.collections('taxi-artists').documents().import(artists, {action: "upsert"});

var songC = (await client.collections('taxi-songs').retrieve()).num_documents;
var albumC = (await client.collections('taxi-albums').retrieve()).num_documents;
var artistC = (await client.collections('taxi-artists').retrieve()).num_documents;

console.log("Imported the following:");
console.table([
  {
    name: "songs",
    count: songC
  },
  {
    name: "albums",
    count: albumC
  },
  {
    name: "artists",
    count: artistC
  }
]);

await db.destroy();

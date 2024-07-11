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

var db = await createRxDatabase({
  name: dbName,
  storage: getRxStorageMongoDB({
    connection: 'mongodb://admin:supersecure123@192.168.30.36:27017/?authSource=admin',
  }),
});
await schemas.register(db, 3);
console.log("Added schemas");

const typesense = require("typesense");
const client = new typesense.Client({
  nodes: [
    {
      host: "192.168.30.36",
      port: 8108,
      protocol: "http",
    },
  ],
  'api_key': 'xyz123',
  'connection_timeout_seconds': 8,
});


await db.destroy();

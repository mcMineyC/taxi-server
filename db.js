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

var dbName = "rxdb-taxi";

var db = await createRxDatabase({
  name: dbName,
  storage: getRxStorageMongoDB({
    connection: 'mongodb://admin:supersecure123@192.168.30.36:27017/?authSource=admin',
  }),
});
await schemas.register(db, 9);
//console.log("Registered schemas");

export default db

import ts_mod from "./typesense_module.js";

console.log("Purging typesense data");
await ts_mod.purge();
await ts_mod.destroy();

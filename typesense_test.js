import ts_mod from "./typesense_module.js";

// await ts_mod.purge();
console.log("Starting test");
console.table((await ts_mod.searchSong("mario mart ii")).map((x) => x.displayName+": "+x.artistDisplayName));
await ts_mod.destroy()

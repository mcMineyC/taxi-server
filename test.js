import db from './db.js';
import ts from "./typesense_module.js";
console.log("Added collections");

var s = await db.songs.findOne({selector: {id: "c2ce09cb217d8d65cc7085546021ff3468401b68b634e963323f2bdfe030bc8e_bf019a6dc0e6d585f53a0a5a4c0ce03ef1c4988b6ec98b1308e795c6664efb5d_bbc8e36b4cbbcb604151f47a0a22bbc0fce3f17b649c30d90801fba8a6e30e94"}}).exec();
console.log("Got song", s.id, s.displayName);

await s.patch({visibleTo: ["norah", "eli"]});

s = await db.songs.findOne({selector: {id: "c2ce09cb217d8d65cc7085546021ff3468401b68b634e963323f2bdfe030bc8e_bf019a6dc0e6d585f53a0a5a4c0ce03ef1c4988b6ec98b1308e795c6664efb5d_bbc8e36b4cbbcb604151f47a0a22bbc0fce3f17b649c30d90801fba8a6e30e94"}}).exec();
console.log("Updated song");
console.log("\t visibleTo:", s.visibleTo);
console.log("\t id:", s.id);
console.log("\t title:", s.displayName);
//await ts.purge();
await db.destroy();

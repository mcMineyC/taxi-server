import db from './db.js';
import ts from "./typesense_module.js";
console.log("Added collections");

//var s = await db.songs.findOne({selector: {id: "c2ce09cb217d8d65cc7085546021ff3468401b68b634e963323f2bdfe030bc8e_bf019a6dc0e6d585f53a0a5a4c0ce03ef1c4988b6ec98b1308e795c6664efb5d_bbc8e36b4cbbcb604151f47a0a22bbc0fce3f17b649c30d90801fba8a6e30e94"}}).exec();
//console.log("Got song", s.id, s.displayName);
//
//await s.patch({visibleTo: ["norah", "eli", "braden", "jedi"]});
//
//s = await db.songs.findOne({selector: {id: "c2ce09cb217d8d65cc7085546021ff3468401b68b634e963323f2bdfe030bc8e_bf019a6dc0e6d585f53a0a5a4c0ce03ef1c4988b6ec98b1308e795c6664efb5d_bbc8e36b4cbbcb604151f47a0a22bbc0fce3f17b649c30d90801fba8a6e30e94"}}).exec();
//console.log("Updated song");
//console.log("\t visibleTo:", s.visibleTo);
//console.log("\t id:", s.id);
//console.log("\t title:", s.displayName);
var as = await db.songs.find().exec();
for(var x of as){
  //console.log(x.displayName)
  //console.log("\t"+x.visibleTo);
  if(x.visibleTo == undefined || x.visibleTo == []) await x.patch({visibleTo: ["all"]});
  if(x.addedBy == undefined) await x.patch({addedBy: "jedi"});
};
//while(counter < as.length-1);

console.log("Updating albums");
as = await db.albums.find().exec();
for(var x of as){
  //console.log(x.displayName)
  //console.log("\t"+x.visibleTo);
  if(x.visibleTo == undefined || x.visibleTo == []) await x.incrementalPatch({visibleTo: ["all"]});
  if(x.addedBy == undefined) await x.incrementalPatch({addedBy: "jedi"});
};
//while(counter < as.length-1);

console.log("Updating artists");
as = await db.artists.find().exec();
for(var x of as){
  //console.log(x.displayName)
  //console.log("\t"+x.visibleTo);
  if(x.visibleTo == undefined || x.visibleTo == []) await x.patch({visibleTo: ["all"]});
  if(x.addedBy == undefined) await x.patch({addedBy: "jedi"});
}
//while(counter < as.length-1);

db.songs.find().exec().then(x => console.table((x || []).map(x => ({
  //id: x.id,
  //albumId: x.albumId,
  //artistId: x.artistId,
  displayName: x.displayName,
  albumDisplayName: x.albumDisplayName,
  artistDisplayName: x.artistDisplayName,
  duration: x.duration,
  youtubeId: x.youtubeId,
  visibleTo: x.visibleTo,
  addedBy: x.addedBy
}))));
console.log("Updating typesense");
//await ts.purge();
console.log("Done");
await db.destroy();

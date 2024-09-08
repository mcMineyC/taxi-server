import db from './db.js';

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
//var albums = await db.songs.find().exec();
//console.table(JSON.parse(JSON.stringify(albums)));
//console.table(albums.map((album) => 
//  ({
//    displayName: album.displayName,
//    addedBy: album.addedBy,
//  })
//));
//for (const album of albums){
//  console.log(album.displayName);
//  //console.log("\thas", album.songCount, "songs");
//  console.log("\twas added by", album.addedBy);
//  //console.log("\tis visible to", JSON.stringify(album.visibleTo));
//}
// for(const album of albums){
//   if(album.displayName.includes("Chipbreak")){
//     await album.remove();
//     console.log("Removed", album.displayName);
//   }
// }
//var bugs = await db.bugnana.find().exec();
//console.log(bugs.length, "bugs reported");
//for (const bug of bugs) {
//  console.log(bug.id, ":", bug.displayName);
//}
//var played = await db.played.find({selector: {"owner": "jedi"}}).exec();
//console.log(JSON.stringify(played, null, 2));
var uu = await db.auth.findOne({selector: {"loginName": "testguy"}}).exec();
console.log(JSON.stringify(uu, null, 2));
//var testGuyUser = {
//  loginName: "testguy",
//  displayName: "Test Account",
//  password: "test1234",
//  authtoken: "1234567890",
//  roles: ["view", "dj", "admin", "add", "recruiter"]
//};
await db.destroy();

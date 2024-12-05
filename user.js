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
// for(const album of albums){
//   if(album.displayName.includes("Chipbreak")){
//     await album.remove();
//     console.log("Removed", album.displayName);
//   }
// }

db.auth.upsert({
  "loginName": "colt",
  "displayName": "Colt",
  "password": "",
  "authToken": "",
})

await db.destroy();

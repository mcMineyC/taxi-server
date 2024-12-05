import db from './db.js';
<<<<<<< HEAD

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
=======
import readline from 'readline-sync';
import waitUntilPkg from 'async-wait-until';
const waitUntil = waitUntilPkg.waitUntil;

while (true) {
  var length = (await db.auth.find().exec()).length
  var act = readline.question('(user admin, '+length+' signed in) ');
  switch (act) {
    case 'create':
      console.log();
      var name = readline.question("Name: ");
      var displayName = readline.question("Display Name: ");
      var password = readline.question("Password (optional): ", {hideEchoBack: true});
      await db.auth.insert({loginName: name, displayName: displayName, authtoken: "", password: password});
      console.log("Added");
      break;
    case 'show':
      var list = await db.auth.find().exec();
      console.table(list.map(x => ({name: x.loginName, loggedIn: x.authtoken != "" })));
      break;
    case 'help':
      console.table([
        {
          "command": "create",
          "description": "Create a new item",
        },
        {
          "command": "exit",
          "description": "Exit the CLI"
        },
        {
          "command": "help",
          "description": "Show this list"
        },
      ]);
      break;
    case 'exit':
      await db.destroy();
      process.exit();
    default:
      console.log("Command not found: \""+act+"\"");
      break;;
  }
}
>>>>>>> 8a048e535029e36d5100a84ad9b8d2ff43e7834a

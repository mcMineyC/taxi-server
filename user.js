import db from './db.js';
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

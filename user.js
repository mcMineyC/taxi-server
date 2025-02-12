import dbConnection from './db.js';
import readline from 'readline-sync';
import waitUntilPkg from 'async-wait-until';
const waitUntil = waitUntilPkg.waitUntil;
const db = dbConnection.db("taxi");

while (true) {
  var length = (await db.collection("auth").find().toArray()).length
  var act = readline.question('(user admin, '+length+' signed in) ');
  switch (act) {
    case 'create':
      console.log();
      var name = readline.question("Name: ");
      var displayName = readline.question("Display Name: ");
      var password = readline.question("Password (optional): ", {hideEchoBack: true});
      var roles = readline.question("Roles (comma separated, default view,admin,dj,add,recruiter can be sudoadmin): ");
      if (roles == "") roles = "view,admin,dj,add,recruiter";
      roles = roles.split(",");
      await db.collection("auth").insertOne({loginName: name}, {$set: {loginName: name, displayName: displayName, authtoken: "", password: password, roles: roles}});
      console.log("Added");
      break;
    case 'show':
      var list = await db.collection("auth").find().toArray();
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

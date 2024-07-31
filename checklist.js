import db from './db.js';
import readline from 'readline-sync';
import waitUntilPkg from 'async-wait-until';
const waitUntil = waitUntilPkg.waitUntil;

while (true) {
  var length = (await db.checklist.find().exec()).length
  var act = readline.question('(ccli, '+length+' items) ');
  switch (act) {
    case 'add':
      console.log();
      var name = readline.question("Name: ");
      var requestedBy = readline.question("Requested by: ");
      var description = readline.question("Description: ")
      var id = (await db.checklist.find().exec()).length + 1; 
      await db.checklist.insert({id: id, name: name, requestedBy: requestedBy, description: description, completed: false});
      console.log("Added");
      break;
    case 'complete':
      var list = await db.checklist.find().exec();
      console.table(list.map(x => ({id: x.id, name: x.name, completed: x.completed ? 'Yes' : 'No'})));
      var id = parseInt(readline.question("ID: "));
      var task = await db.checklist.findOne({
        selector: {
          id: id
        },
      }).exec();
      await task.patch({completed: true});
      console.log("Task marked completed");
      break;
    case 'list':
      var list = await db.checklist.find().exec();
      console.table(list.map(x => ({id: x.id, name: x.name, requestedBy: x.requestedBy, completed: x.completed })));
      break;
    // case 'move':
    //   var list = await db.checklist.find({sort: [{id: 'asc'}]}).exec();
    //   console.table(list.map(x => ({id: x.id, name: x.name, requestedBy: x.requestedBy, completed: x.completed })));
    //   var from = parseInt(readline.question("From: "));
    //   var to = parseInt(readline.question("To: "));
    //   if (from > list.length || to > list.length || from < 0 || to < 0) {
    //     console.log("Invalid selection");
    //     continue;
    //   }
    //   let t = list.splice(from-1, 1)[0];
    //   console.log(t.name);
    //   list.splice(to-1, 0, t);
    //   await db.checklist.bulkUpsert(list);
    //   console.log("Moved");
    //   console.table(list.map(x => ({id: x.id, name: x.name, requestedBy: x.requestedBy, completed: x.completed })));
    //   break;
    case 'delete':
      var list = await db.checklist.find().exec();
      console.table(list.map(x => ({id: x.id, name: x.name, requestedBy: x.requestedBy, completed: x.completed })));
      var id = parseInt(readline.question("ID: "));
      var task = await db.checklist.findOne({
        selector: {
          id: id
        },
      }).exec();
      await task.remove();
      console.log("Deleted", task.name);
      break;
    case 'help':
      console.table([
        {
          "command": "add",
          "description": "Add a task"
        },
        {
          "command": "complete",
          "description": "Mark a task as completed"
        },
        {
          "command": "list",
          "description": "List all tasks"
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

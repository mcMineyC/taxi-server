import db from './db.js';
import readline from 'readline-sync';

while (true) {
  var length = (await db.checklist.find().exec()).length
  var act = readline.question('(ccli, '+length+' items) ');
  switch (act) {
    case 'add':
      console.log();
      var name = readline.question("Name: ");
      var requestedBy = readline.question("Requested by: ");
      var id = (await db.checklist.find().exec()).length + 1; 
      await db.checklist.insert({id: id, name: name, requestedBy: requestedBy, completed: false});
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
  }
}

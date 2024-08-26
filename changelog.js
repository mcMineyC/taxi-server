import db from "./db.js";
var stuff = await db.changelog.find({sort: [{"time": "asc"}]}).exec();
console.table(stuff.map(x => ({
  time: x.time,
  user: x.user,
  type: x.type,
  old: x.old == "null" || x.old == "undefined" || JSON.parse(x.old) == null ? null : JSON.parse(x.old).displayName,
  new: x.new == "null" || x.new == "undefined" || JSON.parse(x.new) == null ? null : JSON.parse(x.new).displayName
  //old: x.old,
  //new: x.new,
})))
await db.destroy();

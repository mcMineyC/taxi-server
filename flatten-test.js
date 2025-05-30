import { fstat } from "fs-extra";
import adder from "./adder.js";
var find = JSON.parse(fstat.readFileSync("adder-in.json", "utf-8"));
var out = adder.flattenData(find.hierarchy, "jedi");
fs.writeFileSync("test-flattened.json", JSON.stringify(out, null, 2));
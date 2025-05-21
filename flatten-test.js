import { fstat } from "fs-extra";
import adder from "./adder.js";
var find = JSON.parse(fstat.readFileSync("test.json", "utf-8"));
var out = adder.flattenData(find, "jedi");
fs.writeFileSync("test-flattened.json", JSON.stringify(out, null, 2));
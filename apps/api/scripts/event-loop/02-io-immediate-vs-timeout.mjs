import fs from "node:fs";

fs.readFile(new URL(import.meta.url), () => {
  console.log("I/O callback")

  setTimeout(() => console.log("setTimeout 0 in I/O"), 0);
  setImmediate(() => console.log("setImmediate in I/O"));
});

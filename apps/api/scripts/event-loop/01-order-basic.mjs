console.log("A: sync start");

setTimeout(() => console.log("D: setTimeout 0"), 0);
setImmediate(() => console.log("E: setImmediate"));

Promise.resolve().then(() => console.log("C: promise.then (microtask)"));
process.nextTick(() => console.log("B: process.nextTick"));

console.log("F: sync end");

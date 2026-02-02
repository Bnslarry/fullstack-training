let n = 0;

function spin() {
  if (n++ >= 200000) return;
  process.nextTick(spin);
}

setTimeout(() => {
  console.log(
    'setTimeout fired (if you see this late, nextTick starved the loop)',
  );
}, 0);

console.time('nextTick spin');
spin();
console.timeEnd('nextTick spin');

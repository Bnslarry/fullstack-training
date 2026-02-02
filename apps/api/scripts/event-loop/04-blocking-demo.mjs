function busy(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

setInterval(() => {
  console.log('tick', Date.now());
}, 100);

console.log('start busy 2000ms...');
busy(2000);
console.log('busy done');

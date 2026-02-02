let i = 0;
const total = 5_000_000;

function workChunk() {
  const start = Date.now();
  while (i < total && Date.now() - start < 10) {
    i++;
  }
  if (i < total) {
    setImmediate(workChunk); // 或 setTimeout(workChunk, 0)
  } else {
    console.log('done', i);
  }
}

setInterval(() => console.log('tick', Date.now()), 100);

workChunk();

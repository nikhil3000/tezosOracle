const sleep = (ms) => {
  // return new Promise((resolve) => setTimeout(resolve, ms));
  const P = ['\\', '|', '/', '-'];
  let x = 0;
  console.log('sleeping...');
  const loader = setInterval(() => {
    process.stdout.write(`\r${P[x++]}`);
    x %= P.length;
  }, ms / 200);

  return new Promise((resolve) => {
    setTimeout(() => {
      clearInterval(loader);
      process.stdout.write('\r');
      console.log('Continuing ..');
      resolve();
    }, ms);
  });
};

module.exports = {
sleep
};
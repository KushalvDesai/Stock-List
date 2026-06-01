const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1,
});

async function test() {
  const req = { ip: '127.0.0.1' };
  const res = { setHeader: () => {}, status: () => ({ send: () => {} }) };
  const next = () => {};

  await new Promise(r => limiter(req, res, r));
  console.log("Req 1 done");

  // This should be blocked
  let blocked = false;
  const res2 = { setHeader: () => {}, status: () => ({ send: () => { blocked = true; } }) };
  await new Promise(r => limiter(req, res2, r));
  console.log("Req 2 blocked?", blocked);

  limiter.resetKey('127.0.0.1');

  // This should pass
  let blocked2 = false;
  const res3 = { setHeader: () => {}, status: () => ({ send: () => { blocked2 = true; } }) };
  await new Promise(r => limiter(req, res3, r));
  console.log("Req 3 blocked?", blocked2);
}

test();

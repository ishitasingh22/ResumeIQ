const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { app, startServer } = require("../src/server");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("health endpoint responds", async () => {
  const response = await fetch(`${baseUrl}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("protected account endpoint rejects requests without a session", async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);

  assert.equal(response.status, 401);
});

test("invalid registration is rejected without issuing a cookie", async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "", email: "invalid", password: "short" }),
  });

  assert.equal(response.status, 400);
  assert.equal(response.headers.has("set-cookie"), false);
});

test("startup rejects missing database configuration", async () => {
  const previousMongoUri = process.env.MONGODB_URI;
  const previousJwtSecret = process.env.JWT_SECRET;
  delete process.env.MONGODB_URI;
  delete process.env.JWT_SECRET;

  try {
    await assert.rejects(startServer(), /MONGODB_URI is required/);
  } finally {
    if (previousMongoUri === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = previousMongoUri;
    }
    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  }
});
const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { app } = require("../src/server");
const { COOKIE_NAME, createSessionToken } = require("../src/config/auth");

let server;
let baseUrl;
let sessionCookie;
const previousJwtSecret = process.env.JWT_SECRET;

before(async () => {
  process.env.JWT_SECRET = "history-route-test-secret-long-enough";
  const token = createSessionToken("507f1f77bcf86cd799439011");
  sessionCookie = `${COOKIE_NAME}=${token}`;
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
  if (previousJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = previousJwtSecret;
  }
});

test("analysis history requires an authenticated session", async () => {
  const response = await fetch(`${baseUrl}/api/resume/history`);

  assert.equal(response.status, 401);
});

test("analysis detail hides invalid IDs as not found", async () => {
  const response = await fetch(`${baseUrl}/api/resume/history/not-an-object-id`, {
    headers: { Cookie: sessionCookie },
  });

  assert.equal(response.status, 404);
  assert.equal((await response.json()).message, "Analysis not found.");
});

test("analysis detail requires an authenticated session", async () => {
  const response = await fetch(`${baseUrl}/api/resume/history/507f1f77bcf86cd799439011`);

  assert.equal(response.status, 401);
});
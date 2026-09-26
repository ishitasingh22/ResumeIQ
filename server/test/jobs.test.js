const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { app } = require("../src/server");
const { COOKIE_NAME, createSessionToken } = require("../src/config/auth");
const { createJobSuggestions } = require("../src/services/jobSuggestions");

let server;
let baseUrl;
let sessionCookie;
const previousJwtSecret = process.env.JWT_SECRET;

before(async () => {
  process.env.JWT_SECRET = "jobs-route-test-secret-long-enough";
  sessionCookie = `${COOKIE_NAME}=${createSessionToken("507f1f77bcf86cd799439011")}`;
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
  if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousJwtSecret;
});

test("sample suggestions adapt titles and role relevance to the search", () => {
  const jobs = createJobSuggestions("Product Designer");

  assert.equal(jobs.length, 6);
  assert.ok(jobs.every((job) => job.title.includes("Product Designer")));
  assert.ok(jobs.every((job) => job.matchPercent >= 0 && job.matchPercent <= 100));
  assert.equal(jobs[0].source, "sample");
});

test("job suggestions require authentication", async () => {
  const response = await fetch(`${baseUrl}/api/jobs/suggestions?role=Product%20Designer`);

  assert.equal(response.status, 401);
});

test("job suggestions return role-specific sample listings", async () => {
  const response = await fetch(`${baseUrl}/api/jobs/suggestions?role=Product%20Designer`, {
    headers: { Cookie: sessionCookie },
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.source, "sample");
  assert.ok(payload.jobs.length > 0);
  assert.ok(payload.jobs[0].title.includes("Product Designer"));
});

test("saved job routes reject unauthenticated requests", async () => {
  const response = await fetch(`${baseUrl}/api/jobs/saved`, { method: "POST" });

  assert.equal(response.status, 401);
});

test("saved job route validates input before database access", async () => {
  const response = await fetch(`${baseUrl}/api/jobs/saved`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ jobId: "sample-role" }),
  });

  assert.equal(response.status, 400);
});
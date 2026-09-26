const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { app } = require("../src/server");
const { COOKIE_NAME, createSessionToken } = require("../src/config/auth");

const llmVariables = ["LLM_API_URL", "LLM_API_KEY", "LLM_MODEL"];
const previousJwtSecret = process.env.JWT_SECRET;
const previousLlmConfig = Object.fromEntries(
  llmVariables.map((name) => [name, process.env[name]]),
);
let server;
let baseUrl;
let sessionCookie;

before(async () => {
  process.env.JWT_SECRET = "analysis-route-test-secret-long-enough";
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
  for (const name of llmVariables) {
    if (previousLlmConfig[name] === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previousLlmConfig[name];
    }
  }
});

test("analysis endpoint requires a session", async () => {
  const response = await fetch(`${baseUrl}/api/resume/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeText: "Resume", jobDescription: "Role" }),
  });

  assert.equal(response.status, 401);
});

test("analysis endpoint validates both text inputs", async () => {
  const response = await fetch(`${baseUrl}/api/resume/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ resumeText: "", jobDescription: "Role" }),
  });

  assert.equal(response.status, 400);
});

test("analysis endpoint stops before provider or database access when LLM is unconfigured", async () => {
  for (const name of llmVariables) delete process.env[name];

  try {
    const response = await fetch(`${baseUrl}/api/resume/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        resumeText: "Product designer with six years of experience.",
        jobDescription: "Senior product designer with research experience.",
      }),
    });

    assert.equal(response.status, 503);
    const payload = await response.json();
    assert.match(payload.message, /LLM_API_URL/);
    assert.equal(payload.code, "AI_NOT_CONFIGURED");
  } finally {
    for (const name of llmVariables) {
      if (previousLlmConfig[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = previousLlmConfig[name];
      }
    }
  }
});
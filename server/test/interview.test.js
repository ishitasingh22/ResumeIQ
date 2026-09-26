const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { app } = require("../src/server");
const { COOKIE_NAME, createSessionToken } = require("../src/config/auth");
const { generateInterviewQuestions } = require("../src/services/llm");

const questions = [
  { category: "Behavioral", difficulty: "Easy", question: "Tell me about your path into this field.", sampleAnswer: "Connect your interests to relevant work and learning.", interviewerIntent: "Understand motivation and communication." },
  { category: "Behavioral", difficulty: "Medium", question: "Describe a time you changed direction after feedback.", sampleAnswer: "Use a concise situation, action, and result structure.", interviewerIntent: "Assess adaptability and reflection." },
  { category: "Behavioral", difficulty: "Hard", question: "How would you handle conflicting priorities from partners?", sampleAnswer: "Clarify impact, align on trade-offs, and communicate a plan.", interviewerIntent: "Assess judgment and stakeholder skills." },
  { category: "Role-specific", difficulty: "Medium", question: "Tell me about a difficult collaboration.", sampleAnswer: "Focus on shared goals and specific steps taken.", interviewerIntent: "Assess collaboration in this role." },
  { category: "Technical", difficulty: "Easy", question: "How do you begin a new project?", sampleAnswer: "Describe how you clarify goals, users, and constraints.", interviewerIntent: "Check foundational process." },
  { category: "Technical", difficulty: "Medium", question: "How do you validate a proposed solution?", sampleAnswer: "Explain how evidence and iteration shape the work.", interviewerIntent: "Assess analytical approach." },
  { category: "Technical", difficulty: "Hard", question: "How would you evaluate a system under a new constraint?", sampleAnswer: "State assumptions, compare options, and define success measures.", interviewerIntent: "Assess structured problem solving." },
  { category: "Role-specific", difficulty: "Medium", question: "How do you balance quality and delivery time?", sampleAnswer: "Prioritize risks and make trade-offs explicit.", interviewerIntent: "Assess practical decision making in this role." },
];

let server;
let baseUrl;
let sessionCookie;
const previousJwtSecret = process.env.JWT_SECRET;
const llmVariables = ["LLM_API_URL", "LLM_API_KEY", "LLM_MODEL"];
const previousLlmConfig = Object.fromEntries(
  llmVariables.map((name) => [name, process.env[name]]),
);

before(async () => {
  process.env.JWT_SECRET = "interview-test-secret-that-is-long-enough";
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
  if (previousJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = previousJwtSecret;
  }
  for (const name of llmVariables) {
    if (previousLlmConfig[name] === undefined) delete process.env[name];
    else process.env[name] = previousLlmConfig[name];
  }
});

test("interview generator returns categorized questions from the configured provider", async () => {
  let sentBody;
  const result = await generateInterviewQuestions({
    role: "Product designer",
    jobDescription: "Lead research and prototyping for a design system.",
    config: {
      LLM_API_URL: "https://llm.example/v1/chat/completions",
      LLM_API_KEY: "test-only-secret",
      LLM_MODEL: "test-model",
    },
    fetchImpl: async (_url, options) => {
      sentBody = JSON.parse(options.body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ questions }) } }] }) };
    },
  });

  assert.equal(result.length, 8);
  assert.deepEqual(new Set(result.map((item) => item.category)), new Set(["Behavioral", "Technical", "Role-specific"]));
  assert.deepEqual(new Set(result.map((item) => item.difficulty)), new Set(["Easy", "Medium", "Hard"]));
  assert.match(sentBody.messages[1].content, /Product designer/);
});

test("interview endpoint requires authentication", async () => {
  const response = await fetch(`${baseUrl}/api/interview/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "Product designer" }),
  });

  assert.equal(response.status, 401);
});

test("interview endpoint requires a role or job description", async () => {
  const response = await fetch(`${baseUrl}/api/interview/questions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ role: "", jobDescription: "" }),
  });

  assert.equal(response.status, 400);
});

test("interview endpoint reports missing provider configuration safely", async () => {
  for (const name of llmVariables) delete process.env[name];

  try {
    const response = await fetch(`${baseUrl}/api/interview/questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ role: "Product designer" }),
    });

    assert.equal(response.status, 503);
    assert.match((await response.json()).message, /LLM_API_KEY/);
  } finally {
    for (const name of llmVariables) {
      if (previousLlmConfig[name] === undefined) delete process.env[name];
      else process.env[name] = previousLlmConfig[name];
    }
  }
});
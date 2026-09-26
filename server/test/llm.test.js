const assert = require("node:assert/strict");
const { test } = require("node:test");
const { analyzeResume } = require("../src/services/llm");

const validResult = {
  atsScore: 83,
  missingKeywords: ["accessibility testing"],
  bulletRewrite: {
    original: "Worked on design projects.",
    rewritten: "Delivered product design projects across research and prototyping.",
    rationale: "Clarifies the work while retaining the original scope.",
  },
  suggestions: [
    { section: "Summary", suggestion: "Lead with product outcomes.", rationale: "The role emphasizes measurable impact." },
    { section: "Skills", suggestion: "Add accessibility testing if accurate.", rationale: "It appears in the job requirements." },
    { section: "Experience", suggestion: "Quantify research-driven improvements.", rationale: "This makes your impact easier to assess." },
    { section: "Formatting", suggestion: "Keep section headings consistent.", rationale: "Consistent structure improves scanning." },
  ],
};

test("LLM service sends configured credentials and returns normalized analysis", async () => {
  let requestUrl;
  let requestOptions;
  const result = await analyzeResume({
    resumeText: "Product designer with six years of experience.",
    jobDescription: "Senior product designer with research experience.",
    config: {
      LLM_API_URL: "https://llm.example/v1/chat/completions",
      LLM_API_KEY: "test-only-secret",
      LLM_MODEL: "test-model",
    },
    fetchImpl: async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(validResult) } }],
        }),
      };
    },
  });

  assert.equal(requestUrl, "https://llm.example/v1/chat/completions");
  assert.equal(requestOptions.headers.Authorization, "Bearer test-only-secret");
  assert.equal(JSON.parse(requestOptions.body).model, "test-model");
  assert.deepEqual(result, validResult);
});

test("LLM service fails clearly when configuration is missing", async () => {
  let wasCalled = false;

  await assert.rejects(
    analyzeResume({
      resumeText: "Resume text",
      jobDescription: "Job description",
      config: {},
      fetchImpl: async () => { wasCalled = true; },
    }),
    (error) => error.statusCode === 503 && /LLM_API_KEY/.test(error.message),
  );
  assert.equal(wasCalled, false);
});

test("LLM service rejects malformed model output", async () => {
  await assert.rejects(
    analyzeResume({
      resumeText: "Resume text",
      jobDescription: "Job description",
      config: {
        LLM_API_URL: "https://llm.example/v1/chat/completions",
        LLM_API_KEY: "test-only-secret",
        LLM_MODEL: "test-model",
      },
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "not JSON" } }] }),
      }),
    }),
    /not valid JSON/,
  );
});

test("LLM service classifies provider status failures without exposing response bodies", async (t) => {
  const failures = [
    [401, /rejected the API key/, "AI_PROVIDER_HTTP_401"],
    [404, /endpoint or model was not found/, "AI_PROVIDER_HTTP_404"],
    [429, /rate limit or usage quota/, "AI_PROVIDER_HTTP_429"],
    [503, /temporarily unavailable/, "AI_PROVIDER_HTTP_503"],
  ];

  for (const [status, expectedMessage, expectedCode] of failures) {
    await t.test(`HTTP ${status}`, async () => {
      await assert.rejects(
        analyzeResume({
          resumeText: "Resume text",
          jobDescription: "Job description",
          config: {
            LLM_API_URL: "https://llm.example/v1/chat/completions",
            LLM_API_KEY: "test-only-secret",
            LLM_MODEL: "test-model",
          },
          fetchImpl: async () => ({
            ok: false,
            status,
            json: async () => ({ error: "provider-private-detail" }),
          }),
        }),
        (error) => {
          assert.equal(error.statusCode, 502);
          assert.equal(error.code, expectedCode);
          assert.match(error.message, expectedMessage);
          assert.doesNotMatch(error.message, /provider-private-detail/);
          assert.doesNotMatch(error.message, /test-only-secret/);
          return true;
        },
      );
    });
  }
});
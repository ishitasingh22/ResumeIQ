const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { app } = require("../src/server");
const { COOKIE_NAME, createSessionToken } = require("../src/config/auth");

let server;
let baseUrl;
let sessionCookie;
const previousJwtSecret = process.env.JWT_SECRET;

function createTestPdf(text) {
  const content = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];

  let document = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(document));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(document);
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    document += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(document);
}

before(async () => {
  process.env.JWT_SECRET = "step-five-test-secret-that-is-long-enough";
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

test("resume extraction requires an authenticated session", async () => {
  const formData = new FormData();
  formData.set("jobDescription", "A role description long enough for validation.");
  const response = await fetch(`${baseUrl}/api/resume/extract`, {
    method: "POST",
    body: formData,
  });

  assert.equal(response.status, 401);
});

test("resume extraction requires a resume file", async () => {
  const formData = new FormData();
  formData.set("jobDescription", "A role description long enough for validation.");
  const response = await fetch(`${baseUrl}/api/resume/extract`, {
    method: "POST",
    headers: { Cookie: sessionCookie },
    body: formData,
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Choose a PDF or DOCX resume/);
});

test("resume extraction rejects unsupported file types", async () => {
  const formData = new FormData();
  formData.set("jobDescription", "A role description long enough for validation.");
  formData.set("resume", new Blob(["plain text"] , { type: "text/plain" }), "resume.txt");
  const response = await fetch(`${baseUrl}/api/resume/extract`, {
    method: "POST",
    headers: { Cookie: sessionCookie },
    body: formData,
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /Upload a PDF or DOCX/);
});

test("resume extraction returns text from a PDF without persisting it", async () => {
  const formData = new FormData();
  formData.set("jobDescription", "A role description long enough for validation.");
  formData.set(
    "resume",
    new Blob([createTestPdf("Resume parsing works")], { type: "application/pdf" }),
    "resume.pdf",
  );
  const response = await fetch(`${baseUrl}/api/resume/extract`, {
    method: "POST",
    headers: { Cookie: sessionCookie },
    body: formData,
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.match(payload.resumeText, /Resume parsing works/);
  assert.equal(payload.jobDescription, "A role description long enough for validation.");
  assert.equal(payload.resumeFile.type, "pdf");
});
const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const { generateInterviewQuestions, LlmServiceError } = require("../services/llm");

const router = express.Router();
const MAX_JOB_DESCRIPTION_LENGTH = 30_000;

router.post("/questions", requireAuth, async (req, res) => {
  const role = typeof req.body?.role === "string" ? req.body.role.trim() : "";
  const jobDescription =
    typeof req.body?.jobDescription === "string" ? req.body.jobDescription.trim() : "";

  if (!role && !jobDescription) {
    return res.status(400).json({ message: "Add a role or job description to continue." });
  }
  if (role.length > 160 || jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
    return res.status(413).json({ message: "The role or job description is too long." });
  }

  try {
    const questions = await generateInterviewQuestions({ role, jobDescription });
    return res.json({ questions });
  } catch (error) {
    if (error instanceof LlmServiceError) {
      return res.status(error.statusCode).json({ message: error.message, code: error.code });
    }
    return res.status(502).json({ message: "Interview questions could not be generated. Please try again." });
  }
});

module.exports = router;
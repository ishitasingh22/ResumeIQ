const path = require("node:path");
const express = require("express");
const mongoose = require("mongoose");
const mammoth = require("mammoth");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const Analysis = require("../models/Analysis");
const requireAuth = require("../middleware/requireAuth");
const { analyzeResume, LlmServiceError } = require("../services/llm");

const router = express.Router();
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_JOB_DESCRIPTION_LENGTH = 30_000;
const MAX_RESUME_TEXT_LENGTH = 100_000;
const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 1,
    fieldSize: MAX_JOB_DESCRIPTION_LENGTH,
  },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    const validPdf = extension === ".pdf" && file.mimetype === "application/pdf";
    const validDocx =
      extension === ".docx" &&
      [DOCX_MIME_TYPE, "application/octet-stream"].includes(file.mimetype);

    if (!validPdf && !validDocx) {
      return callback(new Error("Upload a PDF or DOCX resume."));
    }

    return callback(null, true);
  },
});

function receiveResume(req, res, next) {
  upload.single("resume")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const isTooLarge = ["LIMIT_FILE_SIZE", "LIMIT_FIELD_VALUE"].includes(error.code);
      return res.status(isTooLarge ? 413 : 400).json({
        message: isTooLarge
          ? "The uploaded file or job description is too large."
          : "Upload one resume file and one job description.",
      });
    }

    return res.status(400).json({ message: error.message });
  });
}

async function extractResumeText(file) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (extension === ".pdf") {
    if (file.buffer.subarray(0, 5).toString() !== "%PDF-") {
      throw new Error("This file is not a valid PDF.");
    }

    const parser = new PDFParse({ data: file.buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  const hasZipSignature = file.buffer
    .subarray(0, 4)
    .equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (!hasZipSignature) {
    throw new Error("This file is not a valid DOCX document.");
  }

  const result = await mammoth.extractRawText({ buffer: file.buffer });
  return result.value;
}

router.post("/extract", requireAuth, receiveResume, async (req, res) => {
  const jobDescription =
    typeof req.body?.jobDescription === "string" ? req.body.jobDescription.trim() : "";

  if (!req.file) {
    return res.status(400).json({ message: "Choose a PDF or DOCX resume to continue." });
  }

  if (!jobDescription) {
    return res.status(400).json({ message: "Add a job description to continue." });
  }

  if (jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
    return res.status(413).json({ message: "The job description must be 30,000 characters or fewer." });
  }

  try {
    const resumeText = (await extractResumeText(req.file)).replace(/\u0000/g, "").trim();

    if (!resumeText) {
      return res.status(422).json({ message: "No readable text was found in this resume." });
    }

    if (resumeText.length > MAX_RESUME_TEXT_LENGTH) {
      return res.status(413).json({ message: "The extracted resume text is too long to process." });
    }

    return res.json({
      resumeText,
      jobDescription,
      resumeFile: {
        name: req.file.originalname,
        type: path.extname(req.file.originalname).slice(1).toLowerCase(),
        size: req.file.size,
      },
    });
  } catch (error) {
    return res.status(422).json({
      message: error.message || "Unable to read this resume. Try another PDF or DOCX file.",
    });
  }
});

router.post("/analyze", requireAuth, async (req, res) => {
  const resumeText = typeof req.body?.resumeText === "string" ? req.body.resumeText.trim() : "";
  const jobDescription =
    typeof req.body?.jobDescription === "string" ? req.body.jobDescription.trim() : "";

  if (!resumeText || !jobDescription) {
    return res.status(400).json({ message: "Resume text and job description are required." });
  }
  if (resumeText.length > MAX_RESUME_TEXT_LENGTH) {
    return res.status(413).json({ message: "The extracted resume text is too long to analyze." });
  }
  if (jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
    return res.status(413).json({ message: "The job description must be 30,000 characters or fewer." });
  }

  let result;
  try {
    result = await analyzeResume({ resumeText, jobDescription });
  } catch (error) {
    if (error instanceof LlmServiceError) {
      return res.status(error.statusCode).json({ message: error.message, code: error.code });
    }
    return res.status(502).json({ message: "The analysis service could not complete this request. Please try again." });
  }

  try {
    const analysis = await Analysis.create({
      userId: req.userId,
      resumeText,
      jobDescription,
      atsScore: result.atsScore,
      missingKeywords: result.missingKeywords,
      bulletRewrite: result.bulletRewrite,
      suggestions: result.suggestions,
    });

    return res.status(201).json({
      analysis: {
        id: analysis._id.toString(),
        atsScore: analysis.atsScore,
        missingKeywords: analysis.missingKeywords,
        bulletRewrite: analysis.bulletRewrite,
        suggestions: analysis.suggestions,
        createdAt: analysis.createdAt,
      },
    });
  } catch {
    return res.status(503).json({ message: "Analysis completed but could not be saved. Please try again." });
  }
});

router.get("/history", requireAuth, async (req, res) => {
  const requestedPage = Number.parseInt(req.query.page, 10);
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(50, Math.max(1, requestedLimit))
    : 20;
  const filter = { userId: req.userId };

  try {
    const [total, analyses] = await Promise.all([
      Analysis.countDocuments(filter),
      Analysis.find(filter)
        .select("atsScore missingKeywords jobDescription createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return res.json({
      analyses: analyses.map((analysis) => ({
        id: analysis._id.toString(),
        atsScore: analysis.atsScore,
        missingKeywords: analysis.missingKeywords,
        jobDescription: analysis.jobDescription,
        createdAt: analysis.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    return res.status(503).json({ message: "Unable to load analysis history right now." });
  }
});

router.get("/history/:analysisId", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.analysisId)) {
    return res.status(404).json({ message: "Analysis not found." });
  }

  try {
    const analysis = await Analysis.findOne({
      _id: req.params.analysisId,
      userId: req.userId,
    })
      .select("resumeText jobDescription atsScore missingKeywords bulletRewrite suggestions createdAt")
      .lean();

    if (!analysis) {
      return res.status(404).json({ message: "Analysis not found." });
    }

    return res.json({
      analysis: {
        id: analysis._id.toString(),
        resumeText: analysis.resumeText,
        jobDescription: analysis.jobDescription,
        atsScore: analysis.atsScore,
        missingKeywords: analysis.missingKeywords,
        bulletRewrite: analysis.bulletRewrite,
        suggestions: analysis.suggestions,
        createdAt: analysis.createdAt,
      },
    });
  } catch {
    return res.status(503).json({ message: "Unable to load this analysis right now." });
  }
});

module.exports = router;
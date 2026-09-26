const express = require("express");
const SavedJob = require("../models/SavedJob");
const requireAuth = require("../middleware/requireAuth");
const { createJobSuggestions, normalizeRole } = require("../services/jobSuggestions");

const router = express.Router();

router.get("/suggestions", requireAuth, (req, res) => {
  const role = typeof req.query.role === "string" ? req.query.role : "";
  if (!role.trim() || role.trim().length > 80) {
    return res.status(400).json({ message: "Enter a role title up to 80 characters." });
  }

  return res.json({ source: "sample", jobs: createJobSuggestions(role) });
});

router.get("/saved", requireAuth, async (req, res) => {
  try {
    const savedJobs = await SavedJob.find({ userId: req.userId }).sort({ savedAt: -1 }).lean();
    return res.json({ savedJobs });
  } catch {
    return res.status(503).json({ message: "Unable to load saved roles right now." });
  }
});

router.post("/saved", requireAuth, async (req, res) => {
  const { jobId, jobTitle, company, location, role, matchPercent, link = "" } = req.body || {};
  const textFields = [jobId, jobTitle, company, location, role, link];
  if (
    textFields.some((value) => typeof value !== "string") ||
    !jobId.trim() || !jobTitle.trim() || !company.trim() || !location.trim() || !role.trim() ||
    jobId.length > 180 || jobTitle.length > 160 || company.length > 120 ||
    location.length > 120 || role.length > 80 || link.length > 500 ||
    !Number.isInteger(matchPercent) || matchPercent < 0 || matchPercent > 100
  ) {
    return res.status(400).json({ message: "The saved role details are invalid." });
  }

  try {
    const savedJob = await SavedJob.findOneAndUpdate(
      { userId: req.userId, jobId },
      {
        $setOnInsert: {
          userId: req.userId,
          jobId,
          jobTitle: jobTitle.trim(),
          company: company.trim(),
          location: location.trim(),
          role: normalizeRole(role),
          matchPercent,
          link,
          savedAt: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    return res.status(201).json({ savedJob });
  } catch {
    return res.status(503).json({ message: "Unable to save this role right now." });
  }
});

router.delete("/saved/:jobId", requireAuth, async (req, res) => {
  try {
    const removed = await SavedJob.findOneAndDelete({
      userId: req.userId,
      jobId: req.params.jobId,
    });
    if (!removed) {
      return res.status(404).json({ message: "Saved role not found." });
    }
    return res.status(204).end();
  } catch {
    return res.status(503).json({ message: "Unable to remove this saved role right now." });
  }
});

module.exports = router;
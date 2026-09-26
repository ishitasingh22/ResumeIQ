const mongoose = require("mongoose");

const suggestionSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      enum: ["Summary", "Skills", "Experience", "Formatting"],
      required: true,
    },
    suggestion: { type: String, required: true, maxlength: 2500 },
    rationale: { type: String, required: true, maxlength: 1000 },
  },
  { _id: false },
);

const analysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resumeText: { type: String, required: true, maxlength: 100_000 },
    jobDescription: { type: String, required: true, maxlength: 30_000 },
    atsScore: { type: Number, required: true, min: 0, max: 100 },
    missingKeywords: { type: [String], default: [] },
    bulletRewrite: {
      type: new mongoose.Schema(
        {
          original: { type: String, required: true, maxlength: 1200 },
          rewritten: { type: String, required: true, maxlength: 1200 },
          rationale: { type: String, required: true, maxlength: 800 },
        },
        { _id: false },
      ),
      default: undefined,
    },
    suggestions: {
      type: [suggestionSchema],
      validate: (suggestions) => suggestions.length === 4,
    },
  },
  { timestamps: true },
);

analysisSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Analysis", analysisSchema);
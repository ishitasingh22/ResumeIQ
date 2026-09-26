const mongoose = require("mongoose");

const savedJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jobId: { type: String, required: true, maxlength: 180 },
    role: { type: String, required: true, maxlength: 80 },
    jobTitle: { type: String, required: true, maxlength: 160 },
    company: { type: String, required: true, maxlength: 120 },
    location: { type: String, required: true, maxlength: 120 },
    matchPercent: { type: Number, required: true, min: 0, max: 100 },
    link: { type: String, default: "", maxlength: 500 },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

savedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });
savedJobSchema.index({ userId: 1, savedAt: -1 });

module.exports = mongoose.model("SavedJob", savedJobSchema);
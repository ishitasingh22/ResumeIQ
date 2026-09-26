const ROLE_TEMPLATES = [
  {
    key: "product-research",
    prefix: "Senior ",
    suffix: " - Product Research",
    company: "Northstar Studio (sample)",
    location: "Remote - US",
    focus: ["product", "design", "ux", "research", "strategy"],
    offset: 4,
  },
  {
    key: "systems-accessibility",
    prefix: "Staff ",
    suffix: " - Systems & Accessibility",
    company: "Common Thread Labs (sample)",
    location: "Remote - North America",
    focus: ["design", "systems", "accessibility", "frontend", "engineering"],
    offset: 3,
  },
  {
    key: "growth-experiments",
    prefix: "Lead ",
    suffix: " - Growth Experiments",
    company: "Brightfield Works (sample)",
    location: "Remote - US or Canada",
    focus: ["growth", "marketing", "product", "analytics", "experiments"],
    offset: 1,
  },
  {
    key: "platform-team",
    prefix: "Senior ",
    suffix: " - Platform",
    company: "Morrow Digital (sample)",
    location: "Remote - Americas",
    focus: ["software", "engineering", "frontend", "backend", "platform", "data"],
    offset: 2,
  },
  {
    key: "insights-strategy",
    prefix: "Principal ",
    suffix: " - Insights & Strategy",
    company: "Open Field Collective (sample)",
    location: "Remote - Worldwide",
    focus: ["research", "data", "analytics", "strategy", "product"],
    offset: 0,
  },
  {
    key: "customer-experience",
    prefix: " ",
    suffix: " - Customer Experience",
    company: "Harborlight Group (sample)",
    location: "Remote - US",
    focus: ["customer", "support", "experience", "operations", "success"],
    offset: -2,
  },
];

const ROLE_LEVELS = new Set(["associate", "junior", "senior", "staff", "lead", "principal"]);

function normalizeRole(role) {
  return role.trim().replace(/\s+/g, " ").slice(0, 80);
}

function roleTerms(role) {
  return role
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((term) => term.length > 1 && !ROLE_LEVELS.has(term)) || [];
}

function createJobSuggestions(role) {
  const cleanRole = normalizeRole(role);
  const terms = roleTerms(cleanRole);
  const slug = cleanRole.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return ROLE_TEMPLATES.map((template) => {
    const matchingTerms = terms.filter((term) => template.focus.some((tag) => tag.includes(term)));
    const overlap = terms.length ? matchingTerms.length / terms.length : 0;
    const matchPercent = Math.min(97, Math.max(58, 64 + Math.round(overlap * 30) + template.offset));

    return {
      id: `sample-${slug}-${template.key}`,
      title: `${template.prefix}${cleanRole}${template.suffix}`.replace(/\s+/g, " ").trim(),
      company: template.company,
      location: template.location,
      matchPercent,
      tags: template.focus.slice(0, 3),
      role: cleanRole,
      link: "",
      source: "sample",
    };
  }).sort((left, right) => right.matchPercent - left.matchPercent);
}

module.exports = { createJobSuggestions, normalizeRole };
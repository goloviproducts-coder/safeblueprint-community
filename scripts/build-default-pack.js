// Regenerates site/questions/default.csv and default.json from the built-in questions.
// Usage: node scripts/build-default-pack.js
"use strict";
const fs = require("fs");
const path = require("path");
const { builtin } = require("./builtin-questions");
const { STEPS, Q, GROUPS } = builtin();

const ADM_SECTION = { type: "Scope", pi: "Scope", role: "Scope", effect: "Scope", review: "Safeguards", contest: "Safeguards", supplier: "Supplier", explained: "Supplier", turnover: "Entity coverage", health: "Entity coverage", trade: "Entity coverage", cth: "Entity coverage" };
// id: [weight, risk_if, severity, controls, pattern, finding, action, owner, audience]
const ADM_META = {
  type: [0, "", "", "APP1.7", "", "", "", "Product owner", "leaders"],
  pi: [0, "", "", "APP1.7", "", "", "", "Privacy officer", "leaders"],
  role: [0, "", "", "APP1.7", "PAT-05", "", "", "Solution architect", "leaders"],
  effect: [0, "", "", "APP1.7", "", "", "", "Product owner", "leaders"],
  review: [3, "1|2", "high", "APP1.7|NIST-GOVERN-1.1|ISO42001-8.4|AU-AI6", "PAT-01", "No person can review or override the outcome before it stands.", "Add a human review and override step for decisions that affect people.", "Product owner", "delivery"],
  contest: [3, "1|2", "high", "APP1.7|AU-AI6", "", "The affected person cannot ask for a review.", "Publish a simple way for people to ask for a second look.", "Privacy officer", "delivery"],
  supplier: [0, "", "", "", "PAT-02", "", "", "Procurement", "delivery"],
  explained: [2, "1|2", "medium", "APP1.8|ISO42001-8.3|NIST-MAP-4.1", "PAT-02", "The supplier has not explained how the program works.", "Ask the supplier for a plain account of inputs, logic and outputs.", "Procurement", "architects"],
  turnover: [0, "", "", "APP1.7", "", "", "", "Privacy officer", "leaders"],
  health: [0, "", "", "APP1.7", "", "", "", "Privacy officer", "leaders"],
  trade: [0, "", "", "APP1.7", "", "", "", "Privacy officer", "leaders"],
  cth: [0, "", "", "APP1.7", "", "", "", "Privacy officer", "leaders"]
};
const AI_META = {
  buyer: [0, "", "", "", "", "", "", "Product owner", "leaders"],
  model: [1, "1|2", "low", "NIST-MAP-4.1|ISO42001-8.3", "PAT-02", "The model runs in more than one place, so failure modes differ.", "Pin model versions and record where each model runs.", "Solution architect", "architects"],
  agent: [2, "2", "high", "OWASP-LLM06|ATLAS-AML.T0053|AU-AI6", "PAT-04", "The AI can act on its own.", "Put a human approval step or allow-list on high-impact tool calls.", "Solution architect", "architects"],
  least: [2, "1|2", "high", "OWASP-LLM06|ASD-AGENTIC-IDENTITY", "PAT-04", "The agent lacks least privilege or its own identity.", "Give the agent its own identity with least-privilege, per-tenant credentials.", "Security architect", "architects"],
  approve: [2, "2", "high", "OWASP-LLM06|AU-AI6|NIST-MANAGE-2.4", "PAT-01", "No person approves agent actions.", "Add a human approval step before the agent changes data or sends a message.", "Product owner", "delivery"],
  rag: [2, "2", "high", "OWASP-LLM08|ATLAS-AML.T0070|ISO42001-A.7", "PAT-03", "Retrieval uses a shared index across customers.", "Enforce tenant isolation in retrieval before the model sees content.", "Solution architect", "architects"],
  vectors: [1, "1|2", "medium", "OWASP-LLM08|OWASP-LLM02", "PAT-03", "The vector store is readable too broadly.", "Restrict vector store access to named users and services.", "Security architect", "architects"],
  train: [2, "2", "high", "OWASP-LLM02|ISO42001-A.7|NIST-MAP-4.1", "", "Customer data may train a model without opt-in.", "Keep training off by default and record any opt-in.", "Privacy officer", "delivery"],
  inject: [2, "1|2", "high", "OWASP-LLM01|ATLAS-AML.T0051|NIST-MEASURE-2.7", "", "Prompt injection is not tested in CI.", "Add a prompt-injection test suite to CI and treat output as untrusted.", "Developer", "delivery"],
  prompt: [1, "1|2", "medium", "OWASP-LLM07", "", "Secrets may sit in the system prompt.", "Move secrets out of the system prompt into a secrets manager.", "Developer", "delivery"],
  mfa: [2, "1|2", "high", "ASD-E8-MFA", "", "MFA is not on for every console.", "Turn on phishing-resistant MFA for every console.", "Security architect", "delivery"],
  keys: [2, "1|2", "high", "ASD-E8-ADMIN|OWASP-LLM02", "", "API keys are not in a secrets manager.", "Move API keys into a secrets manager and rotate them.", "Developer", "delivery"],
  logs: [1, "1|2", "medium", "NIST-MEASURE-2.7|ISO42001-9.1", "", "Prompts and tool calls are not fully logged.", "Log prompts and tool calls with retention limits.", "Developer", "delivery"],
  gov: [2, "1|2", "medium", "NIST-GOVERN-1.1|ISO42001-6.1|AU-AI1", "", "AI policy, register or plan is missing.", "Adopt an AI policy, keep an AI register and write an incident plan.", "Accountable executive", "leaders"]
};
const rows = [];
let order = 0;
STEPS.forEach((s) => {
  if (s.id === "name") return;
  order += 1;
  const m = ADM_META[s.id];
  const type = s.kind === "text" ? "text" : "choice";
  const options = s.kind === "text" ? "" : s.options.map((o) => o[0] + "=" + (s.id === "type" && o[2] ? o[2] : o[1])).join("|");
  rows.push({ id: "ADM-" + s.id, pack: "adm", section: ADM_SECTION[s.id], order, question: s.title, help_text: s.help || "", type, options, required: s.kind === "text" ? "false" : "true", weight: m[0], risk_if: m[1], severity: m[2], maps_to_control: m[3], pattern: m[4], finding_text: m[5], action_text: m[6], owner_role: m[7], show_if: "", audience: m[8] });
});
const byId = Object.fromEntries(Q.map((r) => [r[0], r]));
order = 0;
GROUPS.forEach(([section, ids]) => ids.forEach((id) => {
  order += 1;
  const r = byId[id], m = AI_META[id];
  rows.push({ id: "AIS-" + id, pack: "ai", section, order: 100 + order, question: r[1], help_text: r[2] || "", type: "choice", options: r[3].map((t, j) => j + "=" + t).join("|"), required: "false", weight: m[0], risk_if: m[1], severity: m[2], maps_to_control: m[3], pattern: m[4], finding_text: m[5], action_text: m[6], owner_role: m[7], show_if: id === "least" || id === "approve" ? "AIS-agent!=0" : "", audience: m[8] });
}));
const COLS = ["id", "pack", "section", "order", "question", "help_text", "type", "options", "required", "weight", "risk_if", "severity", "maps_to_control", "pattern", "finding_text", "action_text", "owner_role", "show_if", "audience"];
const cell = (v) => { const s = String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = ["# name: SafeBlueprint default", "# version: 1.0.0", COLS.join(",")].concat(rows.map((r) => COLS.map((c) => cell(r[c])).join(","))).join("\r\n") + "\r\n";
const dir = path.join(__dirname, "..", "site", "questions");
fs.writeFileSync(path.join(dir, "default.csv"), csv);
const json = { name: "SafeBlueprint default", version: "1.0.0", questions: rows.map((r) => Object.fromEntries(COLS.map((c) => [c, String(r[c])]))) };
fs.writeFileSync(path.join(dir, "default.json"), JSON.stringify(json, null, 2) + "\n");
console.log("wrote " + rows.length + " questions");

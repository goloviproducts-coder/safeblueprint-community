var Q = [
  ["buyer", "Who do you sell to?", "", ["Small businesses", "Enterprise", "Government"]],
  ["model", "Where does the model run?", "A hosted API and your own model fail differently.", ["Hosted API", "Our own model", "Both"]],
  ["agent", "Can the AI take actions?", "A tool call can change data, send email, or write records.", ["Text only", "With approval", "On its own"]],
  ["least", "Does the agent have least privilege and its own identity?", "ASD agentic guidance: a separate identity, and no shared admin rights.", ["Yes", "Partly", "No"]],
  ["approve", "Does a person approve the agent before it acts?", "A human approval step before the agent changes data or sends a message.", ["Yes, before it acts", "For some actions", "No"]],
  ["rag", "Does it read customer documents?", "Retrieved files can leak across customers.", ["No", "One customer", "Shared index"]],
  ["vectors", "Who can read the vector store?", "Embeddings can leak data even when the chat is locked down.", ["Named users only", "Shared broadly", "Not sure"]],
  ["train", "Can customer data train a model?", "Keep training off unless they opted in.", ["Blocked", "Opt-in only", "Not sure"]],
  ["inject", "Do you test prompt injection?", "", ["In CI", "Sometimes", "No"]],
  ["prompt", "Are secrets kept out of the system prompt?", "A leaked system prompt can expose keys and hidden instructions.", ["Yes", "Partly", "No"]],
  ["mfa", "Is MFA on for every console?", "", ["Yes", "Some consoles", "No"]],
  ["keys", "Where do API keys live?", "", ["Secrets manager", "Env vars", "In code"]],
  ["logs", "Do you log prompts and tool calls?", "", ["Yes, with limits", "Partly", "No"]],
  ["gov", "Do you have a policy, a register, and a plan?", "", ["All three", "Some", "None"]]
];
var GROUPS = [
  ["Context", ["buyer"]],
  ["Data", ["train", "rag", "vectors"]],
  ["Models and prompts", ["model", "inject", "prompt"]],
  ["Agents", ["agent", "least", "approve"]],
  ["Access", ["mfa", "keys"]],
  ["Monitoring", ["logs", "gov"]]
];
var picked = {};
var summaries = { ai: "" };
var aiRef = "";
var frozenStamp = null;

function renderForm() {
  var byId = {};
  Q.forEach(function (row) { byId[row[0]] = row; });
  var html = "";
  var number = 0;
  GROUPS.forEach(function (group) {
    html += '<h2 class="qsection">' + esc(group[0]) + "</h2>";
    group[1].forEach(function (id) {
      var row = byId[id];
      number += 1;
      var help = row[2] ? '<p class="help" id="help-' + id + '">' + esc(row[2]) + "</p>" : "";
      var described = row[2] ? ' aria-describedby="help-' + id + '"' : "";
      html += '<fieldset class="qcard"' + described + '><legend><span class="qnum">' + number + "</span> " + esc(row[1]) + "</legend>"
        + help + '<div class="chips">'
        + row[3].map(function (text, j) {
          return '<label class="opt"><input type="radio" name="' + id + '" value="' + j + '"><span>' + esc(text) + "</span></label>";
        }).join("")
        + "</div></fieldset>";
    });
  });
  document.getElementById("qcards").innerHTML = html;
}
function paintLive() {
  var riskKeys = ["train", "rag", "inject", "agent", "mfa", "keys", "logs", "gov"];
  var answered = riskKeys.filter(function (key) { return picked[key] != null; });
  var risk = 0;
  answered.forEach(function (key) { risk += picked[key]; });
  var scoreEl = document.getElementById("side-score");
  var head = document.getElementById("side-head");
  if (!answered.length) scoreEl.textContent = "—";
  else if (answered.length === 8) scoreEl.textContent = String(Math.round(100 * (1 - risk / 16)));
  else scoreEl.textContent = String(Math.round(100 * (1 - risk / (answered.length * 2))));
  if (head && (answered.length < 8 || document.getElementById("out").hidden)) head.textContent = answered.length === 8 ? "Score" : "Score so far";
  var countText = Object.keys(picked).length + " of " + Q.length + " answered";
  document.getElementById("side-count").textContent = countText;
  var formCount = document.getElementById("answered-count");
  if (formCount) formCount.textContent = countText;
  if (answered.length < 8 || document.getElementById("out").hidden) {
    document.getElementById("side-verdict").textContent = "Eight checks set the score. Buyer and model do not.";
  }
  var items = Q.filter(function (row) { return picked[row[0]] != null; }).map(function (row) {
    return "<li><b>" + esc(row[1]) + "</b> " + esc(row[3][picked[row[0]]]) + "</li>";
  });
  document.getElementById("live-answers").innerHTML = items.length ? items.join("") : '<li class="empty">None yet. Picks show up here.</li>';
}
document.getElementById("see-results").onclick = function () {
  var assumed = false;
  Q.forEach(function (row) {
    var chosen = document.querySelector('#qcards input[name="' + row[0] + '"]:checked');
    if (!chosen) {
      var input = document.querySelector('#qcards input[name="' + row[0] + '"][value="1"]');
      if (input) input.checked = true;
      picked[row[0]] = 1;
      assumed = true;
    } else picked[row[0]] = Number(chosen.value);
  });
  document.getElementById("assume-note").textContent = assumed
    ? "Unanswered questions were counted as a middle answer."
    : "Unanswered questions count as a middle answer.";
  frozenStamp = { time: stampNow(), when: new Date() };
  build(picked);
  paintLive();
};

function worst(vals) {
  if (vals.indexOf(2) !== -1) return "red";
  if (vals.indexOf(1) !== -1) return "amber";
  return "green";
}
function ragWord(level) {
  if (level === "red") return "Red";
  if (level === "amber") return "Amber";
  return "Green";
}
function dataLabel(train, rag) {
  if (train === 2) return "Training not blocked";
  if (rag === 2) return "Shared index risk";
  if (train === 1 && rag === 1) return "Data controls open";
  if (train === 1) return "Opt-in training only";
  if (rag === 1) return "Check retrieval scope";
  return "Training stays blocked";
}
function promptLabel(inject, agent) {
  if (inject === 2 && agent === 2) return "Prompt and agent gaps";
  if (agent === 2) return "Agent acts alone";
  if (inject === 2) return "No injection testing";
  if (inject === 1 && agent === 1) return "Prompt and agent gaps";
  if (inject === 1) return "Tests are ad hoc";
  if (agent === 1) return "Review agent tools";
  return "Injection tests in CI";
}
function accessLabel(mfa, keys) {
  if (mfa === 2 && keys === 2) return "Access controls open";
  if (keys === 2) return "Keys sit in code";
  if (mfa === 2) return "MFA not everywhere";
  if (mfa === 1 && keys === 1) return "Access partly set";
  if (keys === 1) return "Keys still in env";
  if (mfa === 1) return "MFA only partial";
  return "MFA and keys held";
}
function govLevel(gov, model) {
  if (gov === 2) return "red";
  if (gov === 1 || model > 0) return "amber";
  return "green";
}
function govLabel(gov, model) {
  if (gov === 2) return "No AI governance";
  if (gov === 1) return "Governance still unfinished";
  if (model > 0) return "Pin model versions";
  return "Policy register plan";
}
var FRAMEWORKS = [
  ["owasp", "OWASP LLM 2025"],
  ["au", "Guidance for AI Adoption"],
  ["e8", "Essential Eight"],
  ["nist", "NIST AI RMF 1.0"],
  ["nist600", "NIST AI 600-1"],
  ["iso", "ISO/IEC 42001:2023"],
  ["eu", "EU AI Act"],
  ["atlas", "MITRE ATLAS"]
];
function fw(id, label) { return { id: id, label: label }; }
function fwIds(item) {
  var seen = {};
  var ids = [];
  item.frameworks.forEach(function (entry) {
    if (!seen[entry.id]) { seen[entry.id] = true; ids.push(entry.id); }
  });
  return ids.join(" ");
}
function pillHtml(item) {
  return item.frameworks.slice(0, 2).map(function (entry) {
    return '<span class="pill">' + esc(entry.label) + "</span>";
  }).join("");
}
function alsoHtml(item) {
  if (item.frameworks.length <= 2) return "";
  return '<p class="also">Also: ' + esc(item.frameworks.slice(2).map(function (entry) { return entry.label; }).join("; ")) + "</p>";
}
function renderItem(item, extra) {
  return '<div class="t-item' + (extra ? " now-extra" : "") + '" data-fw="' + fwIds(item) + '"' + (extra ? " hidden" : "") + "><b>" + esc(item.headline) + "</b>" + pillHtml(item) + '<details><summary>Details</summary><p>' + esc(item.detail) + "</p>" + alsoHtml(item) + "</details></div>";
}
function column(title, range, items, cap) {
  var body;
  if (!items.length) body = "<p>Nothing in this tier from your answers.</p>";
  else if (cap && items.length > cap) {
    body = items.slice(0, cap).map(function (item) { return renderItem(item, false); }).join("")
      + items.slice(cap).map(function (item) { return renderItem(item, true); }).join("")
      + '<button type="button" class="text-btn noprint" id="now-toggle" data-n="' + items.length + '">Show all (' + items.length + ")</button>";
  } else body = items.map(function (item) { return renderItem(item, false); }).join("");
  return '<div class="t-col"' + (title === "Now" ? ' id="now-col"' : "") + "><h3>" + title + '</h3><p class="range">' + range + "</p>" + body + "</div>";
}
function reportStamp() {
  return new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}
function setPage() {}
function downloadHtml(filename, title, bodyHtml) {
  var style = "body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#14213D;margin:28px;line-height:1.45}h2,h3{line-height:1.2}.doc-title{margin:0 0 8px}.doc-control{width:100%;border-collapse:collapse;margin:0 0 16px}.doc-control th,.doc-control td{border:1px solid #14213D;padding:6px;text-align:left}table{width:100%;border-collapse:collapse;font-size:.92rem}th,td{border:1px solid #14213D;padding:6px;text-align:left;vertical-align:top}.tile{border:3px solid #ccc;border-radius:12px;padding:8px;display:inline-block;margin:4px;min-width:120px;vertical-align:top}.tile.red{border-color:#b42318}.tile.amber{border-color:#FCA311}.tile.green{border-color:#1f7a4d}.report-foot{margin-top:16px;color:#5c6578;font-size:.82rem}.print-only{display:block}a{color:#0b3a82}";
  var doc = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>" + esc(title) + "</title><style>" + style + "</style></head><body>" + bodyHtml + "</body></html>";
  var blob = new Blob([doc], { type: "text/html" });
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
}
function legendHtml() {
  var buttons = '<button type="button" class="on" data-fw="" aria-pressed="true">All</button>' + FRAMEWORKS.map(function (row) {
    return '<button type="button" data-fw="' + row[0] + '" aria-pressed="false">' + esc(row[1]) + "</button>";
  }).join("");
  return '<div class="fw-strip"><b>Frameworks covered</b><div class="fw-legend" id="fw-legend" data-on="">' + buttons + '</div><p class="fw-note">EU AI Act: relevant if you sell into the EU. High-risk articles apply only to high-risk systems.</p></div>';
}
function mapRows(items, when) {
  return items.map(function (item) {
    return "<tr><td>" + esc(item.headline) + "</td><td>" + when + "</td><td>" + esc(item.frameworks.map(function (entry) { return entry.label; }).join("; ")) + "</td></tr>";
  }).join("");
}
function reportItems(title, items) {
  if (!items.length) return "<h3>" + esc(title) + "</h3><p>Nothing in this tier from your answers.</p>";
  return "<h3>" + esc(title) + "</h3>" + items.map(function (item) {
    return "<p><b>" + esc(item.headline) + '</b> <span class="chip">' + esc(item.effort) + "</span><br>" + esc(item.detail) + "</p>";
  }).join("");
}
function gaugeSvg(score, withId) {
  var c = 2 * Math.PI * 52;
  var filled = Math.max(0, Math.min(100, score)) / 100 * c;
  var arc = score > 0
    ? '<circle cx="60" cy="60" r="52" fill="none" stroke="#FCA311" stroke-width="10" stroke-dasharray="' + filled.toFixed(2) + " " + c.toFixed(2) + '" transform="rotate(-90 60 60)"/>'
    : "";
  return '<div class="gauge" role="img" aria-label="Score ' + score + ' out of 100"><svg viewBox="0 0 120 120" width="150" height="150" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="none" stroke="#e6e8ee" stroke-width="10"/>' + arc + '</svg><div class="gauge-num"><b' + (withId ? ' id="score"' : "") + ">" + score + "</b><span>out of 100</span></div></div>";
}
var effortName = { S: "small", M: "medium", L: "large" };
function priorityCard(item) {
  return '<article class="prio" data-fw="' + fwIds(item) + '"><div class="prio-top"><strong>' + esc(item.headline) + '</strong><span class="chip" aria-label="Effort ' + effortName[item.effort] + '">' + esc(item.effort) + "</span></div><p>" + esc(item.impact) + "</p></article>";
}
function tileHtml(tile) {
  return '<div class="tile ' + tile.level + '" data-rag="' + tile.level + '"><span class="rag">' + ragWord(tile.level) + "</span><b>" + esc(tile.name) + '</b><span class="tlabel">' + esc(tile.label) + "</span></div>";
}
function ownerFor(headline) {
  if (/policy|incident plan/i.test(headline)) return "Privacy lead";
  if (/cannot do|vendor question|certificate/i.test(headline)) return "Product owner";
  return "Engineering lead";
}
function newRef() {
  var d = new Date();
  var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var x = "";
  for (var i = 0; i < 4; i++) x += alphabet[Math.floor(Math.random() * alphabet.length)];
  return "AI-" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-" + x;
}
function stampNow() {
  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short"
  }).format(new Date());
}
function mondayHtml(tasks) {
  return '<section class="monday"><h3>Your next 3 actions</h3><table><thead><tr><th>Action</th><th>Owner</th><th>Due</th></tr></thead><tbody>'
    + tasks.map(function (task) {
      return "<tr><td>" + esc(task.summary) + "</td><td>" + esc(task.owner) + "</td><td>" + esc(task.due) + "</td></tr>";
    }).join("")
    + "</tbody></table></section>";
}
function toTsv(tasks) {
  var lines = ["Summary\tDescription\tOwner\tDue date\tReference"];
  tasks.forEach(function (task) {
    var description = task.description;
    if (task.time) description += " Timestamp: " + task.time + ".";
    lines.push([task.summary, description, task.owner, task.due, task.ref].map(tsvCell).join("\t"));
  });
  return lines.join("\n");
}
function toCsv(tasks) {
  var lines = ["Summary,Description,Assignee,Due Date,Labels"];
  tasks.forEach(function (task) {
    var description = task.description;
    if (task.time) description += " Timestamp: " + task.time + ".";
    lines.push([task.summary, description, task.owner, task.dueIso, task.ref].map(csvCell).join(","));
  });
  return lines.join("\r\n");
}
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(function () { return fallbackCopy(text); });
  }
  return fallbackCopy(text);
}
function fallbackCopy(text) {
  var area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "0";
  area.style.top = "0";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  var ok = document.execCommand("copy");
  area.remove();
  return ok ? Promise.resolve() : Promise.reject();
}
function downloadCsv(filename, tasks) {
  var blob = new Blob([toCsv(tasks)], { type: "text/csv" });
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
}
async function build(answers) {
  Q.forEach(function (row) {
    if (answers[row[0]] == null) answers[row[0]] = 1;
  });
  var now = [], next = [], later = [];
  function add(list, headline, detail, impact, effort, frameworks) {
    list.push({ headline: headline, detail: detail, impact: impact, effort: effort, frameworks: frameworks });
  }
  var eu = " (if you sell into the EU)";
  var euHigh = ", high-risk (if you sell into the EU)";
  if (answers.inject > 0) add(now, "Treat output as untrusted", "Treat all model output and retrieved content as untrusted: input/output filters, strict output schemas, and a prompt-injection test suite in CI", "A prompt can otherwise trigger a real action.", "M", [
    fw("owasp", "OWASP LLM01 / LLM10"), fw("atlas", "ATLAS AML.T0051"), fw("nist", "NIST AI RMF MEASURE 2.7"), fw("nist600", "NIST AI 600-1 MS-2.7-007"), fw("iso", "ISO/IEC 42001: lifecycle controls"), fw("eu", "EU AI Act Art. 15" + euHigh)
  ]);
  if (answers.agent === 2) add(now, "Approve high-impact tool calls", "Put a human approval step or allow-list on high-impact tool calls; give the agent least-privilege, per-tenant credentials", "Stops an agent acting with full access.", "M", [
    fw("owasp", "OWASP LLM06: Excessive agency"), fw("atlas", "ATLAS AML.T0053"), fw("nist600", "NIST AI 600-1 MS-2.7-001"), fw("nist", "NIST AI RMF MEASURE 2.7"), fw("au", "AU Practice 6: Maintain human control"), fw("iso", "ISO/IEC 42001: lifecycle controls"), fw("eu", "EU AI Act Art. 14" + euHigh)
  ]);
  else if (answers.agent === 1) add(next, "Limit each tool the AI calls", "Inventory every tool the AI can call; scope each to least privilege and log approvals", "Least privilege makes offboarding one change.", "S", [
    fw("owasp", "OWASP LLM06: Excessive agency"), fw("atlas", "ATLAS AML.T0053"), fw("nist", "NIST AI RMF MEASURE 2.7"), fw("iso", "ISO/IEC 42001: lifecycle controls"), fw("eu", "EU AI Act Art. 14" + euHigh)
  ]);
  if (answers.rag === 2) add(now, "Separate tenants in retrieval", "Enforce tenant isolation in your vector store: filter retrieval by tenant and user permissions before the model sees it", "One customer's files must not reach another.", "L", [
    fw("owasp", "OWASP LLM08: Vector and embedding weaknesses"), fw("atlas", "ATLAS AML.T0070"), fw("nist", "NIST AI RMF MAP 4"), fw("iso", "ISO/IEC 42001: data governance"), fw("atlas", "ATLAS AML.T0082"), fw("eu", "EU AI Act Art. 15" + euHigh)
  ]);
  else if (answers.rag === 1) add(next, "Match retrieval to permissions", "Check retrieval honours document-level permissions; strip secrets and PII before embedding", "Stops secrets and personal data in answers.", "M", [
    fw("owasp", "OWASP LLM02: Sensitive info disclosure"), fw("atlas", "ATLAS AML.T0057"), fw("nist", "NIST AI RMF MEASURE 2.10"), fw("nist600", "NIST AI 600-1 MP-4.1-009"), fw("iso", "ISO/IEC 42001: data governance")
  ]);
  if (answers.train === 1) add(now, "Keep training off by default", "Keep model training off by default: record any opt-in, and say in the contract exactly when customer prompts or files are used to train or tune", "You can say exactly when data is used.", "S", [
    fw("au", "AU Practice 3: Measure and manage risks"), fw("nist", "NIST AI RMF MEASURE 2.10"), fw("nist600", "NIST AI 600-1 MP-4.1-005"), fw("nist", "NIST AI RMF GOVERN 1.1"), fw("iso", "ISO/IEC 42001: data governance"), fw("eu", "EU AI Act Art. 10" + euHigh)
  ]);
  if (answers.train === 2) add(now, "Stop customer data training models", "Stop customer prompts and files from training or tuning models. Put a contractual block in place and turn on zero-retention API settings with your model provider", "Closes an unknown path before a review.", "M", [
    fw("au", "AU Practice 3: Measure and manage risks"), fw("nist", "NIST AI RMF MEASURE 2.10"), fw("nist600", "NIST AI 600-1 GV-6.1-009"), fw("iso", "ISO/IEC 42001: data governance"), fw("eu", "EU AI Act Art. 10" + euHigh)
  ]);
  if (answers.mfa > 0) add(now, "Turn on MFA for every console", "Enforce phishing-resistant MFA on email, cloud, GitHub and model-provider consoles", "A stolen password should not open production.", "S", [
    fw("e8", "E8: MFA"), fw("nist", "NIST AI RMF MEASURE 2.7"), fw("iso", "ISO/IEC 42001: risk management")
  ]);
  if (answers.keys === 2) add(now, "Pull keys out of code", "Remove keys from code, rotate them all, and move to a secrets manager with secret scanning in CI", "A leaked repo must not expose the model.", "M", [
    fw("owasp", "OWASP LLM03: Supply chain"), fw("atlas", "ATLAS AML.T0010"), fw("e8", "E8: secrets"), fw("nist", "NIST AI RMF GOVERN 6"), fw("nist600", "NIST AI 600-1 GV-6.1-009"), fw("iso", "ISO/IEC 42001: risk management")
  ]);
  else if (answers.keys === 1) add(next, "Put keys in a secrets manager", "Move model and cloud keys to a secrets manager; set spend caps and rate limits per key", "Spend caps and rotation become routine.", "M", [
    fw("owasp", "OWASP LLM10: Unbounded consumption"), fw("atlas", "ATLAS AML.T0034"), fw("nist", "NIST AI RMF MEASURE 2.7"), fw("iso", "ISO/IEC 42001: risk management")
  ]);
  if (answers.logs === 2) add(now, "Log prompts and tool calls", "Log prompts, tool calls and outputs per tenant with retention limits and PII redaction, so you can investigate abuse", "You need a record when something goes wrong.", "M", [
    fw("au", "AU Practice 5: Test and monitor"), fw("nist", "NIST AI RMF MEASURE 3"), fw("nist", "NIST AI RMF MANAGE 4"), fw("nist600", "NIST AI 600-1 GV-1.5-002"), fw("iso", "ISO/IEC 42001: monitoring"), fw("eu", "EU AI Act Art. 12" + euHigh)
  ]);
  else if (answers.logs === 1) add(next, "Finish per-tenant logging", "Finish per-tenant logging of prompts, tool calls and outputs, with retention limits and PII redaction", "Partial logs fail an incident review.", "M", [
    fw("au", "AU Practice 5: Test and monitor"), fw("nist", "NIST AI RMF MEASURE 3"), fw("nist", "NIST AI RMF MANAGE 4"), fw("iso", "ISO/IEC 42001: monitoring"), fw("eu", "EU AI Act Art. 12" + euHigh)
  ]);
  if (answers.gov > 0) {
    var govMaps = [
      fw("au", "AU Practice 1: Decide who is accountable"), fw("nist", "NIST AI RMF GOVERN 1"), fw("nist600", "NIST AI 600-1 GV-1.6-001"), fw("iso", "ISO/IEC 42001: AI policy"), fw("eu", "EU AI Act Art. 9" + euHigh)
    ];
    if (answers.gov === 2) add(now, "Write the AI policy set", "Adopt the National AI Centre AI policy and AI register templates, plus a one-page AI incident plan", "Reviewers ask for policy, register and plan.", "M", govMaps);
    else add(next, "Finish policy and incident plan", "Adopt the National AI Centre AI policy and AI register templates, plus a one-page AI incident plan", "A partial set reads as unfinished.", "M", govMaps);
  }
  if (answers.model > 0) add(next, "Pin models before each change", "Pin model versions, keep a model/data bill of materials, and evaluate before each model change", "A silent model swap can change the risk.", "S", [
    fw("owasp", "OWASP LLM04: Data and model poisoning"), fw("atlas", "ATLAS AML.T0020"), fw("nist", "NIST AI RMF MAP 4"), fw("nist600", "NIST AI 600-1 MP-4.1-007"), fw("atlas", "ATLAS AML.T0010"), fw("iso", "ISO/IEC 42001: lifecycle controls"), fw("eu", "EU AI Act Art. 15" + euHigh)
  ]);
  add(next, "Say what the AI cannot do", "Publish a model card / AI transparency note: what the AI does, its limits and who to contact", "Buyers need a plain account of limits.", "S", [
    fw("au", "AU Practice 4: Share essential information"), fw("nist", "NIST AI RMF MEASURE 2.9"), fw("iso", "ISO/IEC 42001: transparency"), fw("nist600", "NIST AI 600-1 GV-1.2-001"), fw("eu", "EU AI Act Art. 50" + eu), fw("eu", "EU AI Act Art. 13" + euHigh)
  ]);
  add(next, "Patch automatically and test restore", "Patch dependencies automatically (Dependabot/Renovate) and back up with a tested restore", "An untested backup is not a plan.", "M", [
    fw("e8", "E8: Patching & backups"), fw("nist", "NIST AI RMF MANAGE 4"), fw("iso", "ISO/IEC 42001: risk management"), fw("atlas", "ATLAS AML.T0010")
  ]);
  if (answers.buyer > 0) add(now, "Answer the AI vendor questions", "Prepare answers for enterprise AI vendor questionnaires: data use, retention, sub-processors, model provider, red-team results", "The deal waits on these answers.", "M", [
    fw("review", "Enterprise AI security review"), fw("nist", "NIST AI RMF GOVERN 6"), fw("nist600", "NIST AI 600-1 GV-6.1-009"), fw("iso", "ISO/IEC 42001: risk management"), fw("eu", "EU AI Act Art. 50 and high-risk duties" + eu)
  ]);
  if (answers.buyer === 2) add(later, "Map controls for government buyers", "Map your controls to the ISM and Essential Eight Maturity Level 2, and scope OFFICIAL: Sensitive data before chasing IRAP", "Essential Eight and IRAP come up later.", "L", [
    fw("e8", "Gov: Essential Eight / IRAP readiness"), fw("nist", "NIST AI RMF GOVERN 1.1")
  ]);
  add(later, "Red-team the AI twice a year", "Run a red-team exercise on your AI features (MITRE ATLAS scenarios) twice a year", "Finds paths a questionnaire will miss.", "M", [
    fw("owasp", "OWASP LLM Top 10"), fw("atlas", "MITRE ATLAS"), fw("atlas", "ATLAS AML.T0051"), fw("nist", "NIST AI RMF MEASURE 2.7"), fw("nist600", "NIST AI 600-1 MS-2.7-007"), fw("iso", "ISO/IEC 42001: monitoring"), fw("eu", "EU AI Act Art. 15" + euHigh)
  ]);
  add(later, "Plan a certificate only when asked", "Consider ISO 42001 or SOC 2 once enterprise deals require a certificate", "ISO 42001 or SOC 2 is a later sale.", "L", [
    fw("path", "Compliance path"), fw("iso", "ISO/IEC 42001:2023"), fw("nist", "NIST AI RMF GOVERN 1")
  ]);
  add(later, "Threat-model the core flow", "Threat-model your core AI flow each quarter (STRIDE, 1 hour)", "Keeps the design honest as you ship.", "S", [
    fw("sabsa", "SABSA-style design review"), fw("nist", "NIST AI RMF MAP 5"), fw("atlas", "MITRE ATLAS")
  ]);
  if (answers.prompt === 2) add(now, "Keep secrets out of the system prompt", "Move keys, hidden instructions, and customer data out of the system prompt. Treat a leaked prompt as a credential incident.", "OWASP LLM07: a system prompt is not a secret store.", "S", [
    fw("owasp", "OWASP LLM07: System prompt leakage"), fw("nist", "NIST AI RMF MEASURE 2.7")
  ]);
  else if (answers.prompt === 1) add(next, "Check the system prompt for secrets", "Review the system prompt for keys and hidden instructions, and move anything sensitive out.", "A partial check still leaves LLM07 open.", "S", [
    fw("owasp", "OWASP LLM07: System prompt leakage")
  ]);
  if (answers.vectors === 2) add(now, "Limit who can read embeddings", "Name who can query the vector store, and block everyone else before the model sees a chunk.", "OWASP LLM08: embeddings are a data store.", "M", [
    fw("owasp", "OWASP LLM08: Vector and embedding weaknesses"), fw("atlas", "ATLAS AML.T0070")
  ]);
  else if (answers.vectors === 1) add(next, "Narrow vector-store access", "Replace broad internal access with named users and a permission check on each query.", "Shared access widens LLM08.", "M", [
    fw("owasp", "OWASP LLM08: Vector and embedding weaknesses")
  ]);
  if (answers.least === 2) add(now, "Give the agent least privilege and its own identity", "Create a separate identity for the agent and remove shared admin rights.", "ASD agentic guidance: least privilege, and an identity of its own.", "M", [
    fw("au", "AU Practice 6: Maintain human control"), fw("owasp", "OWASP LLM06: Excessive agency")
  ]);
  else if (answers.least === 1) add(next, "Separate the agent identity", "Finish least privilege and give the agent its own identity rather than a shared admin account.", "A shared login hides what the agent did.", "S", [
    fw("owasp", "OWASP LLM06: Excessive agency")
  ]);
  if (answers.approve === 2) add(now, "Require approval before the agent acts", "Put a person in the loop before the agent changes data, sends a message, or spends money.", "ASD agentic guidance: human approval before the agent acts.", "M", [
    fw("au", "AU Practice 6: Maintain human control"), fw("owasp", "OWASP LLM06: Excessive agency")
  ]);
  else if (answers.approve === 1) add(next, "Extend approval to every agent action", "List the actions that still run without a person, and add approval for each one.", "Some unattended actions are still excessive agency.", "S", [
    fw("owasp", "OWASP LLM06: Excessive agency")
  ]);
  var risk = answers.train + answers.rag + answers.inject + answers.agent + answers.mfa + answers.keys + answers.logs + answers.gov;
  var score = Math.round(100 * (1 - risk / 16));
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  var verdict = now.length === 0 ? "Ready for an enterprise AI review" : now.length < 4 ? "Close urgent gaps before review" : "Not ready for enterprise AI review";
  var tiles = [
    { name: "Data & training", level: worst([answers.train, answers.rag]), label: dataLabel(answers.train, answers.rag) },
    { name: "Prompt/agent safety", level: worst([answers.inject, answers.agent]), label: promptLabel(answers.inject, answers.agent) },
    { name: "Access & keys", level: worst([answers.mfa, answers.keys]), label: accessLabel(answers.mfa, answers.keys) },
    { name: "Monitoring", level: answers.logs === 2 ? "red" : answers.logs === 1 ? "amber" : "green", label: answers.logs === 2 ? "No prompt logging" : answers.logs === 1 ? "Logging still incomplete" : "Logging in place" },
    { name: "Governance", level: govLevel(answers.gov, answers.model), label: govLabel(answers.gov, answers.model) }
  ];
  if (answers.buyer === 2) tiles.push({ name: "Gov readiness", level: score < 50 ? "red" : "amber", label: "Gov pack still open" });
  var top = now.concat(next, later).slice(0, 3);
  var dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);
  var dueLabel = dueDate.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  var dueIso = dueDate.getFullYear() + "-" + String(dueDate.getMonth() + 1).padStart(2, "0") + "-" + String(dueDate.getDate()).padStart(2, "0");
  var aiTime = frozenStamp ? frozenStamp.time : stampNow();
  var reportWhen = frozenStamp ? frozenStamp.when : new Date();
  var aiTasks = top.slice(0, 3).map(function (item) {
    return {
      summary: item.headline,
      description: item.impact,
      owner: ownerFor(item.headline),
      due: dueLabel,
      dueIso: dueIso,
      ref: aiRef,
      initiative: "",
      time: aiTime
    };
  });
  summaries.ai = "Score " + score + ". " + tiles.map(function (t) { return t.name + ": " + ragWord(t.level) + ", " + t.label; }).join(". ") + ". Top 3: " + top.map(function (item) { return item.headline; }).join("; ") + ".";
  var pairs = Q.map(function (row) {
    return { id: row[0], value: picked[row[0]] == null ? "" : picked[row[0]] };
  });
  var fingerprint = await answerFingerprint(pairs);
  var actions = '<p class="noprint report-actions"><button class="btn save-pdf" type="button">Save full record (PDF)</button> <button class="btn secondary save-leader" type="button">Leader summary (1 page)</button> <button class="btn secondary save-html" type="button">Download HTML</button> <button class="btn secondary copy-tasks" type="button">Copy tasks</button> <button class="btn secondary csv-tasks" type="button">Download CSV</button> <button class="btn secondary restart" type="button">Check another product</button> <span class="task-status" role="status"></span></p>';
  var mondayBlock = mondayHtml(aiTasks);
  var out = document.getElementById("out");
  out.hidden = false;
  out.innerHTML = '<h2 class="noprint">Your results</h2>' + actions
    + '<div class="exec">'
    + '<h2 class="doc-title">AI Security Assessment</h2>'
    + '<p class="sheet-meta"></p>'
    + '<div class="score-row">' + gaugeSvg(score, true) + '<div><p id="summary" class="verdict">' + esc(verdict) + "</p></div></div>"
    + mondayBlock
    + legendHtml()
    + '<div class="tiles" id="tiles">' + tiles.map(tileHtml).join("") + "</div>"
    + "<h3>Top 3 priorities</h3>"
    + '<div class="prios" id="top3">' + top.map(priorityCard).join("") + "</div>"
    + '<div class="timeline" id="timeline">'
    + column("Now", "0–30 days", now, 5)
    + column("Next", "30–90 days", next)
    + column("Later", "90+ days", later)
    + "</div>"
    + "</div>"
    + '<div class="report print-only" id="ai-report"></div>'
    + actions;
  out.querySelector(".exec .sheet-meta").textContent = aiRef;
  var legal = node("div", "legal");
  var plain = node("div", "plain-box");
  [
    "Short references only. This checklist does not determine APP 1.7.",
    "It does not certify ISO/IEC 42001.",
    "APP means the Australian Privacy Principles.",
    "Buyers ask about that duty beside an AI review.",
    "The Guidance for AI Adoption is six voluntary practices.",
    "Australia has no mandatory AI guardrails for business.",
    "EU AI Act articles apply only if you sell into the EU."
  ].forEach(function (line) { plain.appendChild(node("p", "", line)); });
  legal.appendChild(plain);
  legal.appendChild(gridTable(["Framework", "What it asks", "Where you stand"], [
    ["OWASP LLM 2025", "Test prompts, supply chain, agency, and embeddings.", top[0] ? top[0].headline : "No urgent gap from these answers."],
    ["NIST AI RMF", "Govern, map, measure, and manage the system.", "References only. Not a score."],
    ["ISO/IEC 42001", "Themes such as transparency and data governance.", "Annex A numbers are not cited."],
    ["Essential Eight", "MFA, patching, backups, and admin rights.", answers.mfa === 0 && answers.keys === 0 ? "✓ Yes" : "✕ No"],
    ["Guidance for AI Adoption", "Six voluntary practices, including human control.", "Not a mandatory rule."]
  ]));
  var agentMap = { 0: "no", 1: "with-approval", 2: "on-its-own" };
  var patterns = matchPatterns({
    agentUse: agentMap[answers.agent] || "",
    ragUse: answers.rag > 0 ? "yes" : "no",
    ragScope: answers.rag === 2 ? "shared" : "",
    hosted: answers.model === 0 || answers.model === 2 ? "yes" : "",
    least: answers.least === 0 ? "yes" : answers.least === 2 ? "no" : "partly",
    approve: answers.approve === 0 ? "yes" : answers.approve === 2 ? "no" : "some",
    vectors: answers.vectors === 0 ? "named" : answers.vectors === 1 ? "shared" : "not-sure"
  });
  var delivery = [];
  var patternsNode = null;
  var sourcesHeading = "Sources";
  if (reportMode() === "full") {
    GROUPS.forEach(function (group) {
      delivery.push(node("h3", "", group[0]));
      delivery.push(gridTable(["Question", "Answer"], group[1].map(function (id) {
        var row = Q.filter(function (item) { return item[0] === id; })[0];
        var value = picked[row[0]];
        return [row[1], value == null ? "Not answered" : row[3][value]];
      })));
    });
    delivery.push(node("h3", "", "What the references ask"));
    delivery.push(legal);
    sourcesHeading = numberHeads(delivery, 1) + ". Sources";
    patternsNode = patternSection(patterns);
  }
  var ready = now.length === 0 ? "✓ Yes" : "✕ No";
  var leaderRisk = now.length === 0
    ? ["Little changes if these answers stay true.", "Run the check again after a model or vendor change.", "This score is not a certificate."]
    : ["A reviewer can ask for proof you do not have yet.", "The next 3 actions stay undone.", "This score is not a certificate."];
  var leaderAsks = now.length === 0
    ? [["File this note", "Keep it with the review pack."], ["No decision this week", "These answers show no urgent gap."], ["No extra budget", "Nothing new to fund from this score."]]
    : [["Approve an owner for the open gaps", "Someone must drive the next 3 actions."], ["Sign off the order of those actions", "Do the first one before the rest."], ["Fund the first fix if a vendor is involved", "A hosted model may need a contract change."]];
  buildRecord(document.getElementById("ai-report"), {
      title: "AI Security Assessment",
      ref: aiRef,
      version: reportVersion(),
      generated: aiTime,
      classification: reportClass(),
      fingerprint: fingerprint,
      nextReview: nextReviewLabel(reportWhen || new Date()),
      preparedFor: preparedForValue(),
      preparedByRole: preparedRoleValue(),
      verdict: verdict,
      note: "The score is " + score + " out of 100.",
      glance: [
        { label: "Verdict", value: verdict },
        { label: "Ready for review?", value: ready },
        { label: "Checks run", value: String(Q.length) },
        { label: "Top risk", value: now.length ? now[0].headline : "No urgent gap shows on these answers." },
        { label: "Next review", value: nextReviewLabel(reportWhen || new Date()) }
      ],
      asks: leaderAsks,
      risk: leaderRisk,
      initiative: "AI security checklist",
      nameLead: "Check: ",
      decisionType: "AI security review",
      org: orgValue(),
      mode: reportMode(),
      actionsHtml: mondayBlock,
      delivery: delivery,
      patternsNode: patternsNode,
      sourcesHeading: sourcesHeading,
      extraSources: [
        ["OWASP Top 10 for LLM Applications", "https://owasp.org/www-project-top-10-for-large-language-model-applications/"],
        ["MITRE ATLAS", "https://atlas.mitre.org/"],
        ["Essential Eight", "https://www.cyber.gov.au/resources-business-and-government/essential-cyber-security/essential-eight"]
      ]
    });
  out.querySelectorAll(".save-pdf").forEach(function (btn) {
    btn.onclick = function () {
      var input = document.querySelector('input[name="report-mode"][value="full"]');
      if (input) input.checked = true;
      build(picked).then(function () {
        document.body.dataset.print = "ai";
        syncPrintFooter().then(function () { window.print(); });
      });
    };
  });
  out.querySelectorAll(".save-leader").forEach(function (btn) {
    btn.onclick = function () {
      var input = document.querySelector('input[name="report-mode"][value="summary"]');
      if (input) input.checked = true;
      build(picked).then(function () {
        document.body.dataset.print = "leader";
        syncPrintFooter().then(function () { window.print(); });
      });
    };
  });
  out.querySelectorAll(".save-html").forEach(function (btn) {
    btn.onclick = function () {
      downloadReportHtml("safeblueprint-ai-report.html", "AI Security Assessment", document.getElementById("ai-report"));
    };
  });
  out.querySelectorAll(".copy-tasks").forEach(function (btn) {
    btn.onclick = function () {
      var status = btn.parentElement.querySelector(".task-status");
      copyText(toTsv(aiTasks)).then(function () { if (status) status.textContent = "Copied."; }).catch(function () { if (status) status.textContent = "Copy failed. Try Download CSV."; });
    };
  });
  out.querySelectorAll(".csv-tasks").forEach(function (btn) {
    btn.onclick = function () {
      downloadCsv("safeblueprint-ai-tasks.csv", aiTasks);
      var status = btn.parentElement.querySelector(".task-status");
      if (status) status.textContent = "Downloaded.";
    };
  });
  out.querySelectorAll(".restart").forEach(function (btn) {
    btn.onclick = function () {
      picked = {};
      document.querySelectorAll("#qcards input[type=radio]").forEach(function (input) { input.checked = false; });
      out.hidden = true;
      document.getElementById("check").hidden = false;
      document.getElementById("ai-playbook").hidden = true;
      document.getElementById("assume-note").textContent = "Unanswered questions count as a middle answer.";
      aiRef = newRef();
      frozenStamp = null;
      paintLive();
      document.getElementById("check").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    };
  });
  var legend = document.getElementById("fw-legend");
  function applyFw() {
    var fwOn = legend.getAttribute("data-on") || "";
    var expanded = document.getElementById("now-col").classList.contains("show-all");
    legend.querySelectorAll("button").forEach(function (el) {
      var on = el.getAttribute("data-fw") === fwOn;
      el.classList.toggle("on", on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll("#timeline .t-item, #top3 .prio").forEach(function (el) {
      var ids = (el.getAttribute("data-fw") || "").split(/\s+/);
      var match = !fwOn || ids.indexOf(fwOn) !== -1;
      var capped = el.classList.contains("now-extra") && !expanded && !fwOn;
      el.hidden = !match || capped;
    });
  }
  legend.addEventListener("click", function (event) {
    var btn = event.target.closest("button");
    if (!btn) return;
    var nextFw = btn.getAttribute("data-fw");
    legend.setAttribute("data-on", nextFw === legend.getAttribute("data-on") ? "" : nextFw);
    applyFw();
  });
  var nowToggle = document.getElementById("now-toggle");
  if (nowToggle) nowToggle.onclick = function () {
    document.getElementById("now-col").classList.toggle("show-all");
    var open = document.getElementById("now-col").classList.contains("show-all");
    nowToggle.textContent = open ? "Show less" : "Show all (" + nowToggle.getAttribute("data-n") + ")";
    applyFw();
  };
  document.getElementById("ai-playbook").hidden = true;
  refreshPlaybook("ai");
  var sideScore = document.getElementById("side-score");
  if (sideScore) sideScore.textContent = String(score);
  var sideHead = document.getElementById("side-head");
  if (sideHead) sideHead.textContent = "Score";
  var sideVerdict = document.getElementById("side-verdict");
  if (sideVerdict) sideVerdict.textContent = verdict;
  var sideCount = document.getElementById("side-count");
  if (sideCount) sideCount.textContent = Q.length + " of " + Q.length + " answered";
  out.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
window.addEventListener("afterprint", function () {
  delete document.body.dataset.print;
  setPage("A4 portrait");
});
aiRef = newRef();
renderForm();
bindOrg();
bindReportChrome(function () {
  if (!document.getElementById("out").hidden) build(picked);
});
paintLive();
document.getElementById("check").addEventListener("change", function (event) {
  if (!event.target || event.target.type !== "radio") return;
  if (!Q.some(function (row) { return row[0] === event.target.name; })) return;
  picked[event.target.name] = Number(event.target.value);
  paintLive();
});
bindPlaybook(document.getElementById("ai-play-form"));
function paintEu() {
  var out = document.getElementById("eu-out");
  if (!out) return;
  var role = document.querySelector('input[name="eu-role"]:checked');
  var annex = document.querySelector('input[name="eu-annex"]:checked');
  var users = document.querySelector('input[name="eu-users"]:checked');
  if (!role && !annex && !users) {
    out.textContent = "";
    return;
  }
  var annexVal = annex ? annex.value : "";
  var usersVal = users ? users.value : "";
  if (annexVal === "no" && usersVal === "no") {
    out.textContent = "These answers do not show Annex III high-risk duties. Transparency duties can still apply. Not legal advice.";
    return;
  }
  if (annexVal === "yes" || (usersVal === "yes" && annexVal !== "no") || annexVal === "not-sure") {
    out.textContent = "High-risk duties from 2 Dec 2027; transparency duties now. Not legal advice.";
    return;
  }
  out.textContent = "Not enough to call this high-risk. Transparency duties can still apply. Not legal advice.";
}
var euCard = document.getElementById("eu-card");
if (euCard) euCard.addEventListener("change", paintEu);

var ASSISTANT_WARNING = "Check your AI tool's data settings before pasting. This report may be Confidential.";
var ASSISTANT_PROMPT = "You are helping our team act on a SafeBlueprint report (JSON below, schema v1.1). Treat it as our own internal data, not legal advice. For each finding with status gap or unknown: 1) explain the gap in plain English, 2) draft the artefact listed in `evidence`, 3) keep the control IDs in your answer. Do not invent framework clauses; if unsure, say so. Then propose the APP 1.8 privacy-policy wording for each decision where verdict = likely-in-scope. If a portfolio block is present, summarise the cross-cutting gaps before the per-decision wording.";
var RE_REVIEW_TRIGGERS = [
  "Model or vendor change",
  "New data source",
  "Complaint or incident",
  "New jurisdiction",
  "12 months"
];
var YNU = ["yes", "no", "not-sure"];
var DECISION_TYPES = ["hiring", "tenancy", "eligibility", "pricing", "moderation", "health-triage", "fraud-flag", "other"];
var ROLES = ["decides", "substantially-contributes", "person-decides", "not-sure"];
var VERDICTS = ["likely-in-scope", "unlikely", "unclear"];
var FINDING_STATUS = ["met", "partial", "gap", "not-applicable", "unknown"];
var SEVERITY = ["high", "medium", "low"];
var FRAMEWORK_IDS = ["APP", "OAIC-guidance", "AU-GfAA-2025", "AU-VAISS-2024", "ISO42001", "NIST-AI-RMF", "NIST-AI-600-1", "OWASP-LLM-2025", "MITRE-ATLAS", "ASD-E8", "ASD-AI", "EU-AI-Act"];
var PRIORITY = ["now", "next", "later"];
var SYSTEM_KIND = ["rules", "ml", "llm", "agent", "unknown"];
var TYPE_FROM_ID = {
  hiring: "hiring",
  tenancy: "tenancy",
  eligibility: "eligibility",
  pricing: "pricing",
  moderation: "moderation",
  health: "health-triage",
  fraud: "fraud-flag"
};
var ID_FROM_TYPE = {
  hiring: "hiring",
  tenancy: "tenancy",
  eligibility: "eligibility",
  pricing: "pricing",
  moderation: "moderation",
  "health-triage": "health",
  "fraud-flag": "fraud",
  other: "unsure"
};
var ROLE_FROM_VALUE = { "0": "decides", "1": "substantially-contributes", "2": "person-decides", "3": "not-sure" };
var VALUE_FROM_ROLE = { decides: "0", "substantially-contributes": "1", "person-decides": "2", "not-sure": "3" };
var VALUE_FROM_YNU = { yes: "0", no: "1", "not-sure": "2" };
var VERDICT_FROM_LABEL = { "Likely in scope": "likely-in-scope", Unlikely: "unlikely", Unclear: "unclear" };
var LABEL_FROM_VERDICT = { "likely-in-scope": "Likely in scope", unlikely: "Unlikely", unclear: "Unclear" };
var TYPE_LABEL = {
  hiring: "Hiring or recruitment screening",
  tenancy: "Tenancy applications",
  eligibility: "Eligibility for a service, benefit or place",
  pricing: "Pricing offered to a person",
  moderation: "Content or account moderation",
  "health-triage": "Health triage",
  "fraud-flag": "Fraud flags on a person",
  other: "Not sure"
};
var GROUP_UNKNOWN = "Initiative Unknown";
var AI_TYPES = [
  ["rules", "Rules/scoring model"],
  ["ml", "Machine learning model"],
  ["llm", "Generative AI / LLM assistant"],
  ["agent", "LLM agent with tools"],
  ["vendor", "Vendor AI feature in a SaaS product"],
  ["not-sure", "Not sure"]
];
var AI_TYPE_IDS = AI_TYPES.map(function (row) { return row[0]; });
var PAT_IDS = ["PAT-01", "PAT-02", "PAT-03", "PAT-04", "PAT-05"];
var PATTERN_SHORT = {
  "PAT-01": "Human approval gate",
  "PAT-02": "Vendor-hosted model",
  "PAT-03": "RAG over internal data",
  "PAT-04": "Agent with tools",
  "PAT-05": "Decision on personal information"
};
var READINESS_LABEL = { "not-ready": "Not ready", ready: "Ready", "not-sure": "Not sure" };
var SCHEMA_VERSIONS = ["1.0", "1.1"];

function pad2(n) { return String(n).padStart(2, "0"); }
function ynuOf(value) {
  var text = String(value == null ? "" : value);
  if (text === "0" || text === "yes") return "yes";
  if (text === "1" || text === "no") return "no";
  return "not-sure";
}
function decisionSlug(id) { return TYPE_FROM_ID[id] || "other"; }
function roleSlug(value) { return ROLE_FROM_VALUE[String(value)] || "not-sure"; }
function verdictSlug(label) { return VERDICT_FROM_LABEL[label] || "unclear"; }
function verdictWords(slug) { return LABEL_FROM_VERDICT[slug] || "Unclear"; }
function isoDate(d) {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}
function isoDateTime(d) {
  var off = -d.getTimezoneOffset();
  var sign = off >= 0 ? "+" : "-";
  var abs = Math.abs(off);
  return isoDate(d) + "T" + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds()) + sign + pad2(Math.floor(abs / 60)) + ":" + pad2(abs % 60);
}
function nextReviewIso(from) {
  var d = new Date(from.getTime());
  var day = d.getDate();
  d.setMonth(d.getMonth() + 12);
  if (d.getDate() !== day) d.setDate(0);
  return isoDate(d);
}
function timeZoneName() {
  try {
    var zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone || "UTC";
  } catch (e) {
    return "UTC";
  }
}
function decId(index) { return "DEC-" + String(index + 1).padStart(3, "0"); }
function actId(index) { return "ACT-" + String(index + 1).padStart(2, "0"); }
function severityFor(status) {
  if (status === "gap") return "high";
  if (status === "partial" || status === "unknown") return "medium";
  return "low";
}
function heldFor(status) {
  if (status === "met") return "yes";
  if (status === "gap" || status === "partial") return "no";
  return "not-sure";
}
function statusFromYnu(value) {
  if (value === "yes") return "met";
  if (value === "no") return "gap";
  return "unknown";
}
function admStatus(verdict) {
  if (verdict === "likely-in-scope") return "gap";
  if (verdict === "unlikely") return "not-applicable";
  return "unknown";
}
function words(status) {
  if (status === "met") return "Met";
  if (status === "partial") return "Partial";
  if (status === "gap") return "Gap";
  if (status === "not-applicable") return "Not applicable";
  return "Unknown";
}
function heldWords(value) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return "Not sure";
}
function ynuWords(value) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return "Not sure";
}
function roleWords(value) {
  if (value === "decides") return "Program decides";
  if (value === "substantially-contributes") return "Program helps decide";
  if (value === "person-decides") return "A person decides";
  return "Not sure";
}
function patternMark(status) {
  if (status === "met") return "✓ Yes";
  if (status === "gap") return "✕ No";
  return "? Not sure";
}
function aiTypeLabel(id) {
  var found = "Not sure";
  AI_TYPES.forEach(function (row) { if (row[0] === id) found = row[1]; });
  return found;
}
function aiTypeShort(id) {
  var labels = { rules: "Rules", ml: "Machine learning", llm: "Generative AI", agent: "LLM agent", vendor: "Vendor feature", "not-sure": "Not sure" };
  return labels[id] || "Not sure";
}
function typeShort(id) {
  var labels = { hiring: "Hiring", tenancy: "Tenancy", eligibility: "Eligibility", pricing: "Pricing", moderation: "Moderation", "health-triage": "Health triage", "fraud-flag": "Fraud flags", other: "Not sure" };
  return labels[id] || id;
}
function deriveAiType(explicit, answers) {
  if (AI_TYPE_IDS.indexOf(explicit) !== -1) return explicit;
  answers = answers || {};
  var agent = answers.agentUse || "";
  if (agent === "with-approval" || agent === "on-its-own") return "agent";
  if (answers.ragUse === "yes") return "llm";
  if (String(answers.supplier || "").trim()) return "vendor";
  return "not-sure";
}
function aiTypeFromDecision(decision) {
  if (decision && AI_TYPE_IDS.indexOf(decision.aiType) !== -1) return decision.aiType;
  var kind = decision && decision.system ? decision.system.kind : "";
  if (kind === "agent" || kind === "llm" || kind === "ml" || kind === "rules") return kind;
  if (decision && decision.system && decision.system.vendor) return "vendor";
  return "not-sure";
}
function readinessId(verdict) {
  var slug = verdictSlug(verdict);
  if (slug === "likely-in-scope") return "not-ready";
  if (slug === "unclear") return "not-sure";
  return "ready";
}
function dueWords(iso) {
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) return iso || "";
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Number(match[3]) + " " + months[Number(match[2]) - 1] + " " + match[1];
}
function matrixMark(status) {
  if (status === "met") return "✓";
  if (status === "gap") return "✕";
  if (status === "unknown") return "?";
  return "";
}
function patternHead(id) {
  return (PATTERN_SHORT[id] || id) + " (" + id + ")";
}
function pluralDecisions(text) {
  return String(text || "").replace(/\bthis decision\b/gi, function (word) {
    return word.charAt(0) === "T" ? "These decisions" : "these decisions";
  });
}
function patternMatrixTable(matrix) {
  var headers = ["Pattern"].concat((matrix || []).map(function (row) { return row.initiative; }));
  var rows = PAT_IDS.map(function (id) {
    return [patternHead(id)].concat((matrix || []).map(function (row) {
      return matrixMark((row.patterns && row.patterns[id]) || "");
    }));
  });
  return { headers: headers, rows: rows };
}
function worseStatus(current, next) {
  var rank = { "": 0, met: 1, unknown: 2, gap: 3 };
  return (rank[next] || 0) >= (rank[current] || 0) ? next : current;
}
function countBuckets(entries, order, idOf, labelOf) {
  return order.map(function (id) {
    var count = 0;
    entries.forEach(function (entry) { if (idOf(entry) === id) count += 1; });
    return { id: id, label: labelOf(id), count: count };
  }).filter(function (row) { return row.count > 0; });
}
function crossGaps(entries) {
  var total = entries.length;
  var rules = [
    { test: function (entry) { return ynuOf(entry.answers && entry.answers.review) === "no"; }, line: function (n) { return n + " of " + total + " decisions have no human review."; } },
    { test: function (entry) { return ynuOf(entry.answers && entry.answers.review) === "not-sure"; }, line: function (n) { return n + " of " + total + " decisions are Not sure on human review."; } },
    { test: function (entry) { return ynuOf(entry.answers && entry.answers.contest) === "no"; }, line: function (n) { return n + " of " + total + " decisions have no way to ask for a review."; } },
    { test: function (entry) { return ynuOf(entry.answers && entry.answers.explained) === "no"; }, line: function (n) { return n + " of " + total + " decisions have no supplier explanation."; } },
    { test: function (entry) { return verdictSlug(entry.verdict) === "likely-in-scope"; }, line: function (n) { return n + " of " + total + " decisions are likely in scope."; } },
    { test: function (entry) { return !String(entry.answers && entry.answers.supplier || "").trim(); }, line: function (n) { return n + " of " + total + " decisions name no supplier."; } },
    { test: function (entry) { return (entry.answers && entry.answers.agentUse) === "on-its-own"; }, line: function (n) { return n + " of " + total + " decisions let an LLM agent act on its own."; } }
  ];
  var ranked = [];
  rules.forEach(function (rule, index) {
    var n = 0;
    entries.forEach(function (entry) { if (rule.test(entry)) n += 1; });
    if (n >= 2) ranked.push({ n: n, index: index, line: rule.line(n) });
  });
  ranked.sort(function (a, b) { return b.n - a.n || a.index - b.index; });
  return ranked.slice(0, 3).map(function (row) { return row.line; });
}
function patternMatrix(entries) {
  var rows = [];
  var byName = {};
  entries.forEach(function (entry, index) {
    var name = entry.initiative || GROUP_UNKNOWN;
    if (!byName[name]) {
      var blank = {};
      PAT_IDS.forEach(function (id) { blank[id] = ""; });
      byName[name] = { initiative: name, patterns: blank };
      rows.push(byName[name]);
    }
    matchPatterns(patternInputFrom(entry, decId(index))).forEach(function (row) {
      if (!byName[name].patterns.hasOwnProperty(row.id)) return;
      byName[name].patterns[row.id] = worseStatus(byName[name].patterns[row.id], row.status);
    });
  });
  return rows;
}
function sharedActions(entries) {
  var groups = [];
  var index = {};
  entries.forEach(function (entry) {
    var initiative = entry.initiative || GROUP_UNKNOWN;
    (entry.tasks || []).forEach(function (task) {
      var due = task.dueIso || "";
      var key = task.summary + "\n" + (task.owner || "") + "\n" + due;
      if (!index[key]) {
        index[key] = { text: task.summary, owner: task.owner || "", due: due, initiatives: [], seen: {} };
        groups.push(index[key]);
      }
      if (!index[key].seen[initiative]) {
        index[key].seen[initiative] = true;
        index[key].initiatives.push(initiative);
      }
    });
  });
  return groups.filter(function (row) { return row.initiatives.length >= 2; }).map(function (row) {
    return { text: pluralDecisions(row.text), owner: row.owner, due: row.due, initiatives: row.initiatives };
  });
}
function portfolioFromEntries(entries) {
  if (!entries || entries.length < 2) return null;
  var initiatives = [];
  entries.forEach(function (entry) {
    var name = entry.initiative || GROUP_UNKNOWN;
    if (initiatives.indexOf(name) === -1) initiatives.push(name);
  });
  var supplierOrder = [];
  var supplierCount = {};
  entries.forEach(function (entry) {
    var name = String(entry.answers && entry.answers.supplier || "").trim() || "Not named";
    if (!supplierCount[name]) {
      supplierCount[name] = 0;
      supplierOrder.push(name);
    }
    supplierCount[name] += 1;
  });
  return {
    decisionCount: entries.length,
    initiativeCount: initiatives.length,
    byAiType: countBuckets(entries, AI_TYPE_IDS, function (entry) { return entry.aiType || deriveAiType("", entry.answers || {}); }, aiTypeLabel),
    byDecisionType: countBuckets(entries, DECISION_TYPES, function (entry) { return decisionSlug(entry.answers && entry.answers.type); }, function (id) { return TYPE_LABEL[id] || id; }),
    bySupplier: supplierOrder.map(function (name) { return { name: name, count: supplierCount[name] }; }),
    byVerdict: countBuckets(entries, VERDICTS, function (entry) { return verdictSlug(entry.verdict); }, verdictWords),
    byReadiness: countBuckets(entries, ["not-ready", "ready", "not-sure"], function (entry) { return readinessId(entry.verdict); }, function (id) { return READINESS_LABEL[id]; }),
    matrix: patternMatrix(entries),
    gaps: crossGaps(entries),
    sharedActions: sharedActions(entries)
  };
}
function portfolioNode(portfolio, mode, names) {
  if (!portfolio) return null;
  var full = mode === "full";
  var box = node("section", "portfolio");
  box.appendChild(node("h3", "", "Portfolio view"));
  var across = portfolio.initiativeCount === 1 ? " initiative." : " initiatives.";
  box.appendChild(node("p", "means", portfolio.decisionCount + " decisions across " + portfolio.initiativeCount + across));
  if (full) {
    var countRows = [];
    function addGroup(title, rows, key) {
      rows.forEach(function (row) { countRows.push([title, row[key || "label"], String(row.count)]); });
    }
    addGroup("AI type", portfolio.byAiType);
    addGroup("Decision type", portfolio.byDecisionType);
    addGroup("Supplier", portfolio.bySupplier, "name");
    addGroup("Verdict", portfolio.byVerdict);
    addGroup("Readiness", portfolio.byReadiness);
    box.appendChild(gridTable(["Group", "Bucket", "Count"], countRows));
  } else {
    function joinCounts(rows, key) {
      return rows.map(function (row) { return row[key || "label"] + " " + row.count; }).join(". ") + ".";
    }
    box.appendChild(gridTable(["Group", "Counts"], [
      ["AI type", portfolio.byAiType.map(function (row) { return aiTypeShort(row.id) + " " + row.count; }).join(". ") + "."],
      ["Decision type", portfolio.byDecisionType.map(function (row) { return typeShort(row.id) + " " + row.count; }).join(". ") + "."],
      ["Supplier", joinCounts(portfolio.bySupplier, "name")],
      ["Verdict", joinCounts(portfolio.byVerdict)],
      ["Readiness", joinCounts(portfolio.byReadiness)]
    ]));
    if (names && names.length) box.appendChild(node("p", "means", "Decisions: " + names.join(". ") + "."));
  }
  box.appendChild(node("h3", "", "Cross-cutting gaps"));
  if (!portfolio.gaps.length) box.appendChild(node("p", "means", "No cross-cutting gap shows across these decisions."));
  else portfolio.gaps.forEach(function (line) { box.appendChild(node("p", "means", line)); });
  if (!full) return box;
  box.appendChild(node("h3", "", "Initiative and pattern"));
  box.appendChild(node("p", "means", "✓ met. ✕ gap. ? not sure. A blank cell did not match."));
  box.appendChild(node("p", "means", "If any decision in the initiative has a gap, the cell is a gap."));
  box.appendChild(node("p", "means", "Reference guidance, not a certification."));
  var matrix = patternMatrixTable(portfolio.matrix);
  box.appendChild(gridTable(matrix.headers, matrix.rows));
  box.appendChild(node("h3", "", "Shared actions"));
  if (!portfolio.sharedActions.length) box.appendChild(node("p", "means", "No action is shared across initiatives."));
  else box.appendChild(gridTable(["Action", "Owner", "Due", "Initiatives"], portfolio.sharedActions.map(function (row) {
    return [row.text, row.owner, dueWords(row.due), row.initiatives.join("; ")];
  })));
  return box;
}
function matchPatterns(input) {
  input = input || {};
  var role = input.programRole || "";
  var auto = role === "decides" || role === "substantially-contributes";
  var agent = input.agentUse || "";
  var supplier = String(input.supplier || "").trim();
  var hosted = input.hosted === true || input.hosted === "yes";
  var rows = [];
  function add(row) {
    row.decisionRef = input.decisionRef || "";
    rows.push(row);
  }
  if (auto || agent === "with-approval" || agent === "on-its-own") {
    var why = [];
    if (role === "decides") why.push("Who decides: the program.");
    else if (role === "substantially-contributes") why.push("Who decides: the program helps.");
    if (agent === "on-its-own") why.push("The LLM agent acts on its own.");
    else if (agent === "with-approval") why.push("The LLM agent acts with approval.");
    var gate = "unknown";
    if (agent === "on-its-own" || input.humanReview === "no" || input.approve === "no") gate = "gap";
    else if (input.humanReview === "yes" || agent === "with-approval" || input.approve === "yes") gate = "met";
    add({
      id: "PAT-01",
      name: "AI decision with a human approval gate",
      attribute: "Accountable",
      why: why.join(" ") || "An automated decision needs a person who can stop it.",
      trustBoundary: "A person can stop the outcome. The program only proposes it.",
      controls: ["OWASP LLM06 Excessive Agency", "NIST AI RMF GOVERN 1", "ISO/IEC 42001 theme: human oversight", "ASD: approve before an agent acts", "AU Practice 6 Maintain human control"],
      status: gate
    });
  }
  if (supplier || hosted) {
    var supply = "unknown";
    if (input.explained === "yes") supply = "met";
    else if (input.explained === "no") supply = "gap";
    add({
      id: "PAT-02",
      name: "Vendor-hosted model or third-party AI",
      attribute: "Confidential",
      why: supplier ? "Supplier: " + supplier + "." : "The model is hosted by a provider.",
      trustBoundary: "Your data crosses into the vendor's model.",
      controls: ["OWASP LLM03 Supply Chain", "ATLAS AML.T0010", "NIST AI RMF GOVERN 6", "ISO/IEC 42001 theme: data governance", "ASD: secure-by-design supply chain", "E8: patch applications"],
      status: supply
    });
  }
  if (input.ragUse === "yes") {
    var rag = "unknown";
    if (input.ragScope === "shared" || input.vectors === "shared") rag = "gap";
    else if (input.vectors === "named") rag = "met";
    add({
      id: "PAT-03",
      name: "RAG over internal data",
      attribute: "Confidential",
      why: "It reads internal documents before it answers.",
      trustBoundary: "Retrieved files meet the model prompt.",
      controls: ["OWASP LLM08 Vector and embedding weaknesses", "OWASP LLM02 Sensitive information disclosure", "ATLAS AML.T0070", "NIST AI RMF MAP 4", "ISO/IEC 42001 theme: data governance"],
      status: rag
    });
  }
  if (agent === "with-approval" || agent === "on-its-own" || agent === "not-sure") {
    var agentWhy = agent === "on-its-own" ? "LLM agent: it can act on its own."
      : agent === "with-approval" ? "LLM agent: a person approves the action."
      : "LLM agent: the answer was Not sure.";
    var agentStatus = "unknown";
    if (agent === "on-its-own" || input.least === "no" || input.approve === "no") agentStatus = "gap";
    else if (agent === "with-approval" || input.approve === "yes") agentStatus = "met";
    add({
      id: "PAT-04",
      name: "LLM agent with tool access",
      attribute: "Accountable",
      why: agentWhy,
      trustBoundary: "Tools the agent can call are the trust boundary.",
      controls: ["OWASP LLM06 Excessive Agency", "ATLAS AML.T0053", "NIST AI RMF MEASURE 2.7", "ISO/IEC 42001 theme: human oversight", "ASD: least privilege and its own identity", "E8: restrict administrative privileges"],
      status: agentStatus
    });
  }
  if (input.usesPersonalInformation === "yes" && auto) {
    var privacy = "unknown";
    if (input.verdict === "likely-in-scope" || input.contest === "no") privacy = "gap";
    else if (input.verdict === "unlikely" && input.contest === "yes") privacy = "met";
    add({
      id: "PAT-05",
      name: "Automated decision on personal information",
      attribute: "Fair",
      why: "Personal information: Yes. A program makes or shapes the call.",
      trustBoundary: "The person affected, and the record of the decision.",
      controls: ["APP 1.7", "APP 1.8", "NIST AI RMF GOVERN 1", "NIST AI RMF MAP 1", "NIST AI RMF MEASURE 2.9", "ISO/IEC 42001 theme: transparency", "AU Practice 4 Share essential information"],
      status: privacy
    });
  }
  return rows;
}
function patternInputFrom(entry, id) {
  var answers = entry.answers || {};
  return {
    decisionRef: id,
    programRole: roleSlug(answers.role),
    usesPersonalInformation: ynuOf(answers.pi),
    humanReview: ynuOf(answers.review),
    contest: ynuOf(answers.contest),
    supplier: answers.supplier || "",
    explained: answers.explained ? ynuOf(answers.explained) : "",
    verdict: verdictSlug(entry.verdict),
    agentUse: answers.agentUse || "",
    ragUse: answers.ragUse || "",
    hosted: answers.hosted || "",
    least: answers.least || "",
    approve: answers.approve || "",
    vectors: answers.vectors || "",
    ragScope: answers.ragScope || ""
  };
}
function patternSection(list) {
  var box = node("section", "patterns");
  box.appendChild(node("h2", "", "For security architects: pattern match"));
  box.appendChild(node("p", "means", "Reference guidance, not a certification."));
  box.appendChild(node("p", "means", "Each row names the business attribute it protects."));
  box.appendChild(node("p", "means", "These matches are not legal advice."));
  if (!list || !list.length) {
    box.appendChild(node("p", "means", "No architecture pattern matched these answers."));
    return box;
  }
  box.appendChild(gridTable(
    ["Pattern", "Why it matched", "Trust boundary", "Controls", "Status"],
    list.map(function (row) {
      return [
        row.id + " " + row.name + ". Protects: " + row.attribute + ".",
        row.why,
        row.trustBoundary,
        (row.controls || []).join("; "),
        patternMark(row.status)
      ];
    })
  ));
  return box;
}
function mapLine(finding, framework) {
  var bits = [];
  (finding.mappings || []).forEach(function (entry) {
    if (entry.framework !== framework) return;
    bits.push(entry.label ? entry.id + " " + entry.label : entry.id);
  });
  return bits.join("; ");
}
function allowKeys(obj, allowed, label, errors) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    errors.push(label + " is missing");
    return false;
  }
  Object.keys(obj).forEach(function (key) {
    if (allowed.indexOf(key) === -1) errors.push("Unknown field " + label + "." + key);
  });
  return true;
}
function oneOf(value, allowed) { return allowed.indexOf(value) !== -1; }
function validateReport(data) {
  var errors = [];
  if (!allowKeys(data, ["schemaVersion", "document", "scope", "decisions", "findings", "actions", "patterns", "portfolio", "reReviewTriggers", "disclaimer"], "report", errors)) return { ok: false, errors: errors };
  if (SCHEMA_VERSIONS.indexOf(data.schemaVersion) === -1) errors.push("schemaVersion");
  if (data.disclaimer !== REPORT_DISCLAIMER) errors.push("disclaimer");
  var doc = data.document;
  if (allowKeys(doc, ["reference", "generatedAt", "timeZone", "classification", "version", "answerFingerprint", "nextReview", "generator", "signOff", "preparedFor", "preparedByRole"], "document", errors)) {
    if (!/^(ADM|AIS|RPT)-\d{8}-[A-Z0-9]{4}$/.test(doc.reference || "")) errors.push("document.reference");
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(doc.generatedAt || "")) errors.push("document.generatedAt");
    if (doc.timeZone != null && typeof doc.timeZone !== "string") errors.push("document.timeZone");
    if (!oneOf(doc.classification, ["Internal", "Confidential"])) errors.push("document.classification");
    if (typeof doc.version !== "string" || !doc.version) errors.push("document.version");
    if (!/^[0-9a-f]{16}$/.test(doc.answerFingerprint || "")) errors.push("document.answerFingerprint");
    if (doc.nextReview != null && !/^\d{4}-\d{2}-\d{2}$/.test(doc.nextReview)) errors.push("document.nextReview");
    if (doc.generator !== POWERED_BY) errors.push("document.generator");
    if (doc.signOff) {
      allowKeys(doc.signOff, ["preparedBy", "reviewedBy", "approvedBy"], "document.signOff", errors);
    }
    if (doc.preparedFor != null && typeof doc.preparedFor !== "string") errors.push("document.preparedFor");
    if (doc.preparedByRole != null && !oneOf(doc.preparedByRole, ["Developer", "Product owner", "Solution architect", "Security architect", "Other"])) errors.push("document.preparedByRole");
  }
  var scope = data.scope;
  if (allowKeys(scope, ["organisation", "jurisdictions", "applicability"], "scope", errors)) {
    if (!Array.isArray(scope.jurisdictions) || !scope.jurisdictions.length) errors.push("scope.jurisdictions");
    else scope.jurisdictions.forEach(function (item) {
      if (!oneOf(item, ["AU", "EU", "Other"])) errors.push("scope.jurisdictions");
    });
    if (scope.organisation != null && typeof scope.organisation !== "string") errors.push("scope.organisation");
    if (scope.applicability) {
      if (allowKeys(scope.applicability, ["turnoverOver3m", "healthServiceProvider", "tradesInPersonalInformation", "commonwealthContractor"], "scope.applicability", errors)) {
        ["turnoverOver3m", "healthServiceProvider", "tradesInPersonalInformation", "commonwealthContractor"].forEach(function (key) {
          if (scope.applicability[key] != null && !oneOf(scope.applicability[key], YNU)) errors.push("scope.applicability." + key);
        });
      }
    }
  }
  if (!Array.isArray(data.decisions)) errors.push("decisions");
  else data.decisions.forEach(function (decision, index) {
    var label = "decisions[" + index + "]";
    if (!allowKeys(decision, ["id", "name", "initiative", "aiType", "decisionType", "system", "usesPersonalInformation", "programRole", "significantEffect", "humanReview", "verdict", "reasons", "app18Draft", "owner"], label, errors)) return;
    if (decision.initiative != null && typeof decision.initiative !== "string") errors.push(label + ".initiative");
    if (decision.aiType != null && !oneOf(decision.aiType, AI_TYPE_IDS)) errors.push(label + ".aiType");
    if (!/^DEC-\d{3}$/.test(decision.id || "")) errors.push(label + ".id");
    if (typeof decision.name !== "string") errors.push(label + ".name");
    if (!oneOf(decision.decisionType, DECISION_TYPES)) errors.push(label + ".decisionType");
    if (!oneOf(decision.usesPersonalInformation, YNU)) errors.push(label + ".usesPersonalInformation");
    if (!oneOf(decision.programRole, ROLES)) errors.push(label + ".programRole");
    if (!oneOf(decision.significantEffect, YNU)) errors.push(label + ".significantEffect");
    if (decision.humanReview != null && !oneOf(decision.humanReview, YNU)) errors.push(label + ".humanReview");
    if (!oneOf(decision.verdict, VERDICTS)) errors.push(label + ".verdict");
    if (decision.reasons != null) {
      if (!Array.isArray(decision.reasons) || decision.reasons.length > 3) errors.push(label + ".reasons");
      else decision.reasons.forEach(function (reason) { if (typeof reason !== "string") errors.push(label + ".reasons"); });
    }
    if (decision.app18Draft != null && typeof decision.app18Draft !== "string") errors.push(label + ".app18Draft");
    if (decision.system) {
      if (allowKeys(decision.system, ["vendor", "model", "kind"], label + ".system", errors)) {
        if (decision.system.kind != null && !oneOf(decision.system.kind, SYSTEM_KIND)) errors.push(label + ".system.kind");
      }
    }
    if (decision.owner) allowKeys(decision.owner, ["responsible", "accountable", "consulted", "informed"], label + ".owner", errors);
  });
  if (!Array.isArray(data.findings)) errors.push("findings");
  else data.findings.forEach(function (finding, index) {
    var label = "findings[" + index + "]";
    if (!allowKeys(finding, ["id", "title", "decisionRef", "status", "severity", "mappings", "threats", "evidence"], label, errors)) return;
    if (!/^SB-[A-Z]{3}-\d{2}$/.test(finding.id || "")) errors.push(label + ".id");
    if (typeof finding.title !== "string") errors.push(label + ".title");
    if (!oneOf(finding.status, FINDING_STATUS)) errors.push(label + ".status");
    if (!oneOf(finding.severity, SEVERITY)) errors.push(label + ".severity");
    if (!Array.isArray(finding.mappings) || !finding.mappings.length) errors.push(label + ".mappings");
    else finding.mappings.forEach(function (entry, mapIndex) {
      if (!allowKeys(entry, ["framework", "id", "label"], label + ".mappings[" + mapIndex + "]", errors)) return;
      if (!oneOf(entry.framework, FRAMEWORK_IDS)) errors.push(label + ".mappings.framework");
      if (typeof entry.id !== "string" || !entry.id) errors.push(label + ".mappings.id");
    });
    if (finding.threats != null && !Array.isArray(finding.threats)) errors.push(label + ".threats");
    if (finding.evidence != null) {
      if (!Array.isArray(finding.evidence)) errors.push(label + ".evidence");
      else finding.evidence.forEach(function (entry, evidenceIndex) {
        if (!allowKeys(entry, ["item", "held"], label + ".evidence[" + evidenceIndex + "]", errors)) return;
        if (entry.held != null && !oneOf(entry.held, YNU)) errors.push(label + ".evidence.held");
      });
    }
  });
  if (!Array.isArray(data.actions)) errors.push("actions");
  else data.actions.forEach(function (action, index) {
    var label = "actions[" + index + "]";
    if (!allowKeys(action, ["id", "text", "findingRefs", "owner", "due", "priority"], label, errors)) return;
    if (!/^ACT-\d{2}$/.test(action.id || "")) errors.push(label + ".id");
    if (typeof action.text !== "string") errors.push(label + ".text");
    if (!Array.isArray(action.findingRefs)) errors.push(label + ".findingRefs");
    if (action.due != null && !/^\d{4}-\d{2}-\d{2}$/.test(action.due)) errors.push(label + ".due");
    if (action.priority != null && !oneOf(action.priority, PRIORITY)) errors.push(label + ".priority");
    if (action.owner) allowKeys(action.owner, ["responsible", "accountable", "consulted", "informed"], label + ".owner", errors);
  });
  if (data.reReviewTriggers != null && !Array.isArray(data.reReviewTriggers)) errors.push("reReviewTriggers");
  if (data.portfolio != null) validatePortfolio(data.portfolio, errors);
  if (data.patterns != null) {
    if (!Array.isArray(data.patterns)) errors.push("patterns");
    else data.patterns.forEach(function (row, index) {
      var label = "patterns[" + index + "]";
      if (!allowKeys(row, ["id", "name", "decisionRef", "attribute", "why", "trustBoundary", "controls", "status"], label, errors)) return;
      if (!/^PAT-\d{2}$/.test(row.id || "")) errors.push(label + ".id");
      if (typeof row.name !== "string" || !row.name) errors.push(label + ".name");
      if (row.decisionRef != null && typeof row.decisionRef !== "string") errors.push(label + ".decisionRef");
      if (row.attribute != null && typeof row.attribute !== "string") errors.push(label + ".attribute");
      if (row.why != null && typeof row.why !== "string") errors.push(label + ".why");
      if (row.trustBoundary != null && typeof row.trustBoundary !== "string") errors.push(label + ".trustBoundary");
      if (row.controls != null && !Array.isArray(row.controls)) errors.push(label + ".controls");
      if (row.status != null && !oneOf(row.status, ["met", "gap", "unknown"])) errors.push(label + ".status");
    });
  }
  return { ok: errors.length === 0, errors: errors };
}
function isCount(value) { return typeof value === "number" && value >= 0 && Math.floor(value) === value; }
function validateBucket(row, label, errors, nameKey) {
  var keys = nameKey === "name" ? ["name", "count"] : ["id", "label", "count"];
  if (!allowKeys(row, keys, label, errors)) return;
  if (typeof row[nameKey] !== "string" || !row[nameKey]) errors.push(label);
  if (nameKey === "label" && typeof row.id !== "string") errors.push(label + ".id");
  if (!isCount(row.count)) errors.push(label + ".count");
}
function validatePortfolio(portfolio, errors) {
  if (!allowKeys(portfolio, ["decisionCount", "initiativeCount", "byAiType", "byDecisionType", "bySupplier", "byVerdict", "byReadiness", "matrix", "gaps", "sharedActions"], "portfolio", errors)) return;
  if (!isCount(portfolio.decisionCount) || portfolio.decisionCount < 2) errors.push("portfolio.decisionCount");
  if (!isCount(portfolio.initiativeCount) || portfolio.initiativeCount < 1) errors.push("portfolio.initiativeCount");
  [["byAiType", "label"], ["byDecisionType", "label"], ["byVerdict", "label"], ["byReadiness", "label"]].forEach(function (pair) {
    var list = portfolio[pair[0]];
    if (!Array.isArray(list)) errors.push("portfolio." + pair[0]);
    else list.forEach(function (row, index) { validateBucket(row, "portfolio." + pair[0] + "[" + index + "]", errors, pair[1]); });
  });
  if (!Array.isArray(portfolio.bySupplier)) errors.push("portfolio.bySupplier");
  else portfolio.bySupplier.forEach(function (row, index) { validateBucket(row, "portfolio.bySupplier[" + index + "]", errors, "name"); });
  if (!Array.isArray(portfolio.matrix)) errors.push("portfolio.matrix");
  else portfolio.matrix.forEach(function (row, index) {
    var label = "portfolio.matrix[" + index + "]";
    if (!allowKeys(row, ["initiative", "patterns"], label, errors)) return;
    if (typeof row.initiative !== "string") errors.push(label + ".initiative");
    if (!allowKeys(row.patterns, PAT_IDS, label + ".patterns", errors)) return;
    PAT_IDS.forEach(function (id) {
      if (row.patterns[id] != null && row.patterns[id] !== "" && !oneOf(row.patterns[id], ["met", "gap", "unknown"])) errors.push(label + ".patterns." + id);
    });
  });
  if (!Array.isArray(portfolio.gaps)) errors.push("portfolio.gaps");
  else portfolio.gaps.forEach(function (gap) { if (typeof gap !== "string") errors.push("portfolio.gaps"); });
  if (!Array.isArray(portfolio.sharedActions)) errors.push("portfolio.sharedActions");
  else portfolio.sharedActions.forEach(function (row, index) {
    var label = "portfolio.sharedActions[" + index + "]";
    if (!allowKeys(row, ["text", "owner", "due", "initiatives"], label, errors)) return;
    if (typeof row.text !== "string" || typeof row.owner !== "string") errors.push(label);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.due || "")) errors.push(label + ".due");
    if (!Array.isArray(row.initiatives) || row.initiatives.length < 2) errors.push(label + ".initiatives");
  });
}
function finding(id, title, decisionRef, status, mappings, evidenceItem, threats) {
  var row = {
    id: id,
    title: title,
    decisionRef: decisionRef,
    status: status,
    severity: severityFor(status),
    mappings: mappings,
    evidence: [{ item: evidenceItem, held: heldFor(status) }]
  };
  if (threats && threats.length) row.threats = threats;
  return row;
}
function findingsFor(decision) {
  var ref = decision.id;
  var policy = admStatus(decision.verdict);
  var review = statusFromYnu(decision.humanReview || "not-sure");
  var contest = statusFromYnu(decision.contest || "not-sure");
  var supplier = statusFromYnu(decision.explained || "not-sure");
  var rows = [
    finding("SB-ADM-01", "Decision described in privacy policy", ref, policy, [
      { framework: "APP", id: "APP 1.7" },
      { framework: "APP", id: "APP 1.8" },
      { framework: "AU-GfAA-2025", id: "Practice 4", label: "Share essential information" },
      { framework: "ISO42001", id: "theme:transparency" },
      { framework: "NIST-AI-RMF", id: "GOVERN 4" }
    ], "Updated privacy policy section", policy === "gap" ? ["Disclosure not yet in the privacy policy"] : []),
    finding("SB-HUM-01", "Human review and override defined", ref, review, [
      { framework: "AU-GfAA-2025", id: "Practice 6", label: "Maintain human control" },
      { framework: "NIST-AI-RMF", id: "MANAGE 2" }
    ], "Override procedure", review === "met" ? [] : ["No person can override the outcome"]),
    finding("SB-HUM-02", "Affected person can ask for a review", ref, contest, [
      { framework: "AU-GfAA-2025", id: "Practice 6", label: "Maintain human control" },
      { framework: "APP", id: "APP 1.8" }
    ], "How a person asks for a review", contest === "met" ? [] : ["Affected person cannot ask for a review"]),
    finding("SB-SUP-01", "Vendor explains how the program works", ref, supplier, [
      { framework: "ASD-AI", id: "Engaging with AI (2024)", label: "Secure-by-design supply chain" },
      { framework: "OWASP-LLM-2025", id: "LLM03" }
    ], "Vendor explanation of how the program works", supplier === "met" ? [] : ["Vendor changes the program without notice"])
  ];
  return rows;
}
function buildSchemaReport(entries, opts) {
  opts = opts || {};
  var when = opts.generatedAt || new Date();
  var list = entries || [];
  var last = list.length ? list[list.length - 1] : null;
  var lastAnswers = last && last.answers ? last.answers : {};
  var scope = { jurisdictions: ["AU"] };
  if (opts.organisation) scope.organisation = opts.organisation;
  scope.applicability = {
    turnoverOver3m: ynuOf(lastAnswers.turnover),
    healthServiceProvider: ynuOf(lastAnswers.health),
    tradesInPersonalInformation: ynuOf(lastAnswers.trade),
    commonwealthContractor: ynuOf(lastAnswers.cth)
  };
  var decisions = [];
  var findings = [];
  var actions = [];
  var patterns = [];
  var actionNumber = 0;
  list.forEach(function (entry, index) {
    var answers = entry.answers || {};
    var slug = verdictSlug(entry.verdict);
    var id = decId(index);
    var aiType = entry.aiType || deriveAiType("", answers);
    var kind = "unknown";
    if (answers.agentUse === "with-approval" || answers.agentUse === "on-its-own" || aiType === "agent") kind = "agent";
    else if (answers.ragUse === "yes" || aiType === "llm") kind = "llm";
    else if (aiType === "ml") kind = "ml";
    else if (aiType === "rules") kind = "rules";
    var decision = {
      id: id,
      name: entry.name || "",
      initiative: entry.initiative || GROUP_UNKNOWN,
      aiType: aiType,
      decisionType: decisionSlug(answers.type),
      system: { model: "unknown", kind: kind },
      usesPersonalInformation: ynuOf(answers.pi),
      programRole: roleSlug(answers.role),
      significantEffect: ynuOf(answers.effect),
      humanReview: ynuOf(answers.review),
      verdict: slug,
      owner: { responsible: (entry.tasks && entry.tasks[0] && entry.tasks[0].owner) || "Privacy lead" }
    };
    if (answers.supplier) decision.system.vendor = String(answers.supplier);
    if (entry.reasons && entry.reasons.length) decision.reasons = entry.reasons.slice(0, 3);
    if (entry.app18) decision.app18Draft = entry.app18;
    decision.contest = ynuOf(answers.contest);
    decision.explained = ynuOf(answers.explained);
    decisions.push(decision);
    findings = findings.concat(findingsFor(decision));
    patterns = patterns.concat(matchPatterns(patternInputFrom(entry, id)));
    delete decision.contest;
    delete decision.explained;
    var priorities = ["now", "now", "next"];
    var controls = ["SB-ADM-01", "SB-HUM-01", "SB-SUP-01"];
    (entry.tasks || []).forEach(function (task, taskIndex) {
      var action = {
        id: actId(actionNumber),
        text: task.summary,
        findingRefs: [controls[taskIndex] || "SB-ADM-01"],
        owner: { responsible: task.owner || "Privacy lead" },
        due: task.dueIso || "2026-12-10",
        priority: priorities[taskIndex] || "later"
      };
      actions.push(action);
      actionNumber += 1;
    });
  });
  var fingerprint = opts.fingerprint || "";
  if (!/^[0-9a-f]{16}$/.test(fingerprint)) fingerprint = "0000000000000000";
  var documentMeta = {
    reference: (list[0] && list[0].ref) || "ADM-20000101-AAAA",
    generatedAt: isoDateTime(when),
    timeZone: timeZoneName(),
    classification: opts.classification === "Confidential" ? "Confidential" : "Internal",
    version: opts.version || "1.0",
    answerFingerprint: fingerprint,
    nextReview: nextReviewIso(when),
    generator: POWERED_BY,
    signOff: { preparedBy: "", reviewedBy: "", approvedBy: "" }
  };
  if (opts.preparedFor) documentMeta.preparedFor = opts.preparedFor;
  if (opts.preparedByRole) documentMeta.preparedByRole = opts.preparedByRole;
  var report = {
    schemaVersion: "1.1",
    document: documentMeta,
    scope: scope,
    decisions: decisions,
    findings: findings,
    actions: actions,
    patterns: patterns,
    reReviewTriggers: RE_REVIEW_TRIGGERS.slice(),
    disclaimer: REPORT_DISCLAIMER
  };
  var portfolio = portfolioFromEntries(list);
  if (portfolio) report.portfolio = portfolio;
  return report;
}
function readinessParagraph(doc) {
  var likely = 0;
  var unlikely = 0;
  var unclear = 0;
  (doc.decisions || []).forEach(function (decision) {
    if (decision.verdict === "likely-in-scope") likely += 1;
    else if (decision.verdict === "unlikely") unlikely += 1;
    else unclear += 1;
  });
  var ready = likely
    ? "Readiness for 10 December 2026: not ready to treat the privacy policy as complete."
    : unclear
      ? "Readiness for 10 December 2026 stays open while an answer is Not sure."
      : "Readiness for 10 December 2026: these answers do not show a disclosure to add.";
  var risks = (doc.findings || []).filter(function (finding) {
    return finding.status === "gap" || finding.status === "unknown";
  }).slice(0, 3).map(function (finding) { return finding.title; });
  var acts = (doc.actions || []).slice(0, 3).map(function (action) { return action.text; });
  return ready
    + " Verdicts: " + likely + " likely in scope, " + unlikely + " unlikely, " + unclear + " unclear."
    + " Top risks: " + (risks.join("; ") || "none raised") + "."
    + " Top actions: " + (acts.join("; ") || "none") + ".";
}
function cell(value) { return String(value == null ? "" : value).replace(/[\r\n|]+/g, " "); }
function mdTable(headers, rows) {
  var line = "| " + headers.map(cell).join(" | ") + " |";
  var rule = "| " + headers.map(function () { return "---"; }).join(" | ") + " |";
  var body = rows.map(function (row) { return "| " + row.map(cell).join(" | ") + " |"; });
  return [line, rule].concat(body).join("\n");
}
function likelihoodImpact(finding, threat) {
  if (/override/i.test(threat) && finding.status === "gap") return ["High", "High"];
  if (/privacy policy/i.test(threat)) return ["Medium", "High"];
  if (/ask for a review/i.test(threat)) return ["Medium", "High"];
  if (/Vendor changes/i.test(threat)) return ["Medium", "Medium"];
  if (finding.severity === "high") return ["Medium", "High"];
  return ["Medium", "Low"];
}
function threatRows(doc) {
  var rows = [];
  (doc.findings || []).forEach(function (finding) {
    (finding.threats || []).forEach(function (threat) {
      var pair = likelihoodImpact(finding, threat);
      rows.push([threat, pair[0], pair[1], finding.decisionRef || ""]);
    });
  });
  return rows;
}
function threatGrid(rows) {
  var bands = ["Low", "Medium", "High"];
  var grid = { Low: { Low: [], Medium: [], High: [] }, Medium: { Low: [], Medium: [], High: [] }, High: { Low: [], Medium: [], High: [] } };
  rows.forEach(function (row) {
    if (grid[row[1]] && grid[row[1]][row[2]]) grid[row[1]][row[2]].push(row[0]);
  });
  return bands.map(function (likelihood) {
    return [likelihood].concat(bands.map(function (impact) {
      return grid[likelihood][impact].join("; ");
    }));
  });
}
function inventoryCore(decision) {
  var vendor = decision.system && decision.system.vendor ? decision.system.vendor : "Not sure";
  return [
    TYPE_LABEL[decision.decisionType] || decision.decisionType,
    vendor,
    statusMark(ynuWords(decision.usesPersonalInformation)),
    roleWords(decision.programRole),
    statusMark(ynuWords(decision.significantEffect)),
    statusMark(ynuWords(decision.humanReview)),
    verdictWords(decision.verdict)
  ];
}
function inventoryRows(doc) {
  return (doc.decisions || []).map(function (decision) {
    return [decision.id].concat(inventoryCore(decision));
  });
}
function inventoryExportRows(doc) {
  return (doc.decisions || []).map(function (decision) {
    return [
      decision.id,
      decision.initiative || GROUP_UNKNOWN,
      aiTypeLabel(decision.aiType || "not-sure")
    ].concat(inventoryCore(decision));
  });
}
function obligationRows(doc) {
  return (doc.findings || []).map(function (finding) {
    var maps = ["APP", "AU-GfAA-2025", "ISO42001", "NIST-AI-RMF", "OWASP-LLM-2025", "MITRE-ATLAS", "ASD-E8", "ASD-AI"].map(function (id) {
      return mapLine(finding, id);
    }).filter(Boolean);
    return [
      finding.id + " " + finding.title,
      finding.decisionRef || "",
      statusMark(words(finding.status)),
      maps.join("; ")
    ];
  });
}
function reportMarkdown(doc) {
  var lines = [
    "---",
    "reference: " + doc.document.reference,
    "schemaVersion: \"" + doc.schemaVersion + "\"",
    "fingerprint: " + doc.document.answerFingerprint,
    "---",
    "",
    "# Automated Decision Record",
    "",
    "## For leaders",
    "",
    readinessParagraph(doc),
    ""
  ];
  if (doc.portfolio) lines = lines.concat(portfolioMarkdown(doc.portfolio));
  lines = lines.concat([
    "",
    "## Inventory",
    "",
    mdTable(["ID", "Initiative", "AI type", "Type", "Supplier", "Personal info", "Who decides", "Effect", "Human review", "Result"], inventoryExportRows(doc)),
    "",
    "## Obligations",
    "",
    mdTable(["Control", "Decision", "Status", "Mappings"], obligationRows(doc)),
    "",
    "## Risk and threat view",
    "",
    "Planning view, not a score.",
    "",
    mdTable(["Threat", "Likelihood", "Impact", "Decision"], threatRows(doc)),
    "",
    mdTable(["Likelihood \\ Impact", "Low", "Medium", "High"], threatGrid(threatRows(doc))),
    "",
    "## Ownership",
    "",
    "Responsible is a suggested role. Accountable, consulted, and informed are left blank for the team.",
    "",
    mdTable(["Item", "Responsible", "Accountable", "Consulted", "Informed"], raciRows(doc)),
    "",
    "## Next actions",
    "",
    mdTable(["ID", "Action", "Owner", "Due", "Priority", "Controls"], (doc.actions || []).map(function (action) {
      return [action.id, action.text, action.owner && action.owner.responsible || "", action.due || "", action.priority || "", (action.findingRefs || []).join(", ")];
    })),
    "",
    "## Evidence checklist",
    "",
    mdTable(["Control", "Decision", "Proof to keep", "Held"], evidenceRows(doc)),
    "",
    "## Re-review triggers",
    ""
  ]);
  (doc.reReviewTriggers || []).forEach(function (trigger) { lines.push("- " + trigger); });
  lines.push("", "## For security architects: pattern match", "", "Reference guidance, not a certification.", "");
  var patternRows = (doc.patterns || []).map(function (row) {
    return [row.id, row.name, row.attribute || "", row.why || "", row.trustBoundary || "", (row.controls || []).join("; "), patternMark(row.status)];
  });
  lines.push(mdTable(["ID", "Pattern", "Attribute", "Why it matched", "Trust boundary", "Controls", "Status"], patternRows));
  lines.push("", "## Disclaimer", "", doc.disclaimer, "");
  return lines.join("\n");
}
function portfolioMarkdown(portfolio) {
  var lines = ["## Portfolio view", ""];
  lines.push(portfolio.decisionCount + " decisions across " + portfolio.initiativeCount + (portfolio.initiativeCount === 1 ? " initiative." : " initiatives."));
  lines.push("");
  function rowsOf(list, key) {
    return list.map(function (row) { return [row[key || "label"], String(row.count)]; });
  }
  lines.push("### By AI type", "", mdTable(["AI type", "Count"], rowsOf(portfolio.byAiType)));
  lines.push("", "### By decision type", "", mdTable(["Decision type", "Count"], rowsOf(portfolio.byDecisionType)));
  lines.push("", "### By supplier", "", mdTable(["Supplier", "Count"], rowsOf(portfolio.bySupplier, "name")));
  lines.push("", "### By verdict", "", mdTable(["Verdict", "Count"], rowsOf(portfolio.byVerdict)));
  lines.push("", "### By readiness", "", mdTable(["Readiness", "Count"], rowsOf(portfolio.byReadiness)));
  lines.push("", "### Cross-cutting gaps", "");
  if (!portfolio.gaps.length) lines.push("No cross-cutting gap shows across these decisions.");
  else portfolio.gaps.forEach(function (gap) { lines.push(gap); });
  lines.push("", "### Initiative and pattern", "", "✓ met. ✕ gap. ? not sure. A blank cell did not match.", "", "If any decision in the initiative has a gap, the cell is a gap.", "", "Reference guidance, not a certification.", "");
  var matrix = patternMatrixTable(portfolio.matrix);
  lines.push(mdTable(matrix.headers, matrix.rows));
  lines.push("", "### Shared actions", "");
  if (!portfolio.sharedActions.length) lines.push("No action is shared across initiatives.");
  else lines.push(mdTable(["Action", "Owner", "Due", "Initiatives"], portfolio.sharedActions.map(function (row) {
    return [row.text, row.owner, row.due, row.initiatives.join("; ")];
  })));
  return lines;
}
function raciRows(doc) {
  var rows = [];
  (doc.decisions || []).forEach(function (decision) {
    rows.push([decision.id + " " + decision.name, decision.owner && decision.owner.responsible || "", "", "", ""]);
  });
  (doc.actions || []).forEach(function (action) {
    rows.push([action.id, action.owner && action.owner.responsible || "", "", "", ""]);
  });
  return rows;
}
function evidenceRows(doc) {
  var rows = [];
  (doc.findings || []).forEach(function (finding) {
    (finding.evidence || []).forEach(function (item) {
      rows.push([finding.id, finding.decisionRef || "", item.item || "", statusMark(heldWords(item.held))]);
    });
  });
  return rows;
}
function pushSection(list, title, nodeOrTable) {
  list.push(node("h3", "", title));
  list.push(nodeOrTable);
}
function holisticSplit(doc) {
  var nodes = [];
  function add(title, el) {
    nodes.push(node("h3", "", title));
    if (el) nodes.push(el);
  }
  add("Inventory", gridTable(
    ["ID", "Type", "Supplier", "Personal info", "Who decides", "Effect", "Human review", "Result"],
    inventoryRows(doc)
  ));
  add("Obligations", gridTable(["Control", "Decision", "Status", "Mappings"], obligationRows(doc)));
  nodes.push(node("h3", "", "Risks"));
  nodes.push(node("p", "means", "Planning view, not a score."));
  var threats = threatRows(doc);
  nodes.push(gridTable(["Threat", "Likelihood", "Impact", "Decision"], threats.length ? threats : [["No threat was raised by these answers.", "Low", "Low", ""]]));
  nodes.push(gridTable(["Likelihood", "Low", "Medium", "High"], threatGrid(threats)));
  nodes.push(node("h3", "", "Who does what"));
  nodes.push(node("p", "means", "Responsible is a suggested role."));
  nodes.push(node("p", "means", "Accountable, consulted, and informed stay blank."));
  nodes.push(gridTable(["Item", "Responsible", "Accountable", "Consulted", "Informed"], raciRows(doc)));
  add("Evidence to keep", gridTable(["Control", "Decision", "Proof to keep", "Held"], evidenceRows(doc)));
  nodes.push(node("h3", "", "When to look again"));
  var triggers = node("ul", "");
  (doc.reReviewTriggers || []).forEach(function (trigger) { triggers.appendChild(node("li", "", trigger)); });
  nodes.push(triggers);
  return nodes;
}
function assistantText(doc) {
  return ASSISTANT_WARNING + "\n\n" + ASSISTANT_PROMPT + "\n\n" + JSON.stringify(doc, null, 2);
}
function downloadText(filename, mime, text) {
  var blob = new Blob([text], { type: mime });
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
}
function answersFromDecision(decision, scope, findings) {
  var contest = "not-sure";
  var explained = "not-sure";
  (findings || []).forEach(function (finding) {
    if (finding.decisionRef !== decision.id) return;
    if (finding.id === "SB-HUM-02") {
      if (finding.status === "met") contest = "yes";
      else if (finding.status === "gap") contest = "no";
    }
    if (finding.id === "SB-SUP-01") {
      if (finding.status === "met") explained = "yes";
      else if (finding.status === "gap" || finding.status === "partial") explained = "no";
    }
  });
  var apply = scope && scope.applicability ? scope.applicability : {};
  return {
    type: ID_FROM_TYPE[decision.decisionType] || "unsure",
    pi: VALUE_FROM_YNU[decision.usesPersonalInformation] || "2",
    role: VALUE_FROM_ROLE[decision.programRole] || "3",
    effect: VALUE_FROM_YNU[decision.significantEffect] || "2",
    review: VALUE_FROM_YNU[decision.humanReview] || "2",
    contest: VALUE_FROM_YNU[contest] || "2",
    supplier: decision.system && decision.system.vendor ? decision.system.vendor : "",
    explained: VALUE_FROM_YNU[explained] || "2",
    turnover: VALUE_FROM_YNU[apply.turnoverOver3m] || "2",
    health: VALUE_FROM_YNU[apply.healthServiceProvider] || "2",
    trade: VALUE_FROM_YNU[apply.tradesInPersonalInformation] || "2",
    cth: VALUE_FROM_YNU[apply.commonwealthContractor] || "2"
  };
}
function pairsFromAnswers(answers) {
  return ["type", "pi", "role", "effect", "review", "contest", "supplier", "explained", "turnover", "health", "trade", "cth"].map(function (id) {
    return { id: id, value: answers[id] == null ? "" : answers[id] };
  });
}

var USES = [
  ["hiring", "Hiring or recruitment screening", "Hiring"],
  ["tenancy", "Tenancy applications", "Tenancy"],
  ["eligibility", "Eligibility for a service, benefit or place", "Eligibility"],
  ["pricing", "Pricing offered to a person", "Pricing"],
  ["moderation", "Content or account moderation", "Moderation"],
  ["health", "Health triage", "Health triage"],
  ["fraud", "Fraud flags on a person", "Fraud flags"]
];
var YN = [["0", "Yes"], ["1", "No"], ["2", "Not sure"]];
var STEPS = [
  { id: "name", title: "Name this decision", help: "Name the decision. Group it under an initiative. Names stay in this browser." },
  { id: "type", title: "What kind of decision is this?", help: "Pick the closest. Refunds, cancellations and other contract rights, or access to education: pick Eligibility. Credit-like scoring is not in this check.", options: USES.concat([["unsure", "Not sure"]]) },
  { id: "pi", title: "Does it use personal information?", help: "A name, contact details, an application, or account history. Health or biometric data counts too.", options: YN, short: true },
  { id: "role", title: "Who makes the call?", help: "A score or shortlist a person relies on can still count, even when a person reviews it. A word processor used only to write up the decision does not.", options: [
    ["0", "Program decides", "No person makes the call."],
    ["1", "Program helps decide", "A person decides, using the program's output."],
    ["2", "A person decides", "The program does not do that substantial thing."],
    ["3", "Not sure", "You cannot say how far the program contributes."]
  ] },
  { id: "effect", title: "Could it significantly affect someone?", help: "A job, a home, a service, a contract, a price, or an account. Good or bad outcomes count, and so does refusing or not deciding. A child or a person experiencing vulnerability may be affected more.", options: YN, short: true },
  { id: "review", title: "Can a person review or override the outcome?", help: "A person who can change the result before it stands.", options: YN, short: true },
  { id: "contest", title: "Can the affected person ask for a review?", help: "A way for that person to request a second look.", options: YN, short: true },
  { id: "supplier", title: "Who supplies the program?", help: "The vendor or team. Leave blank if you are not sure.", kind: "text", maxlength: 120 },
  { id: "explained", title: "Has the supplier explained how it works?", help: "A plain account of inputs, the decision, and the output.", options: YN, short: true },
  { id: "turnover", title: "Is turnover over A$3 million?", help: "A screen only, not a legal finding. If the business has opted in to the Privacy Act, pick Yes.", options: YN, short: true },
  { id: "health", title: "Are you a health service provider?", help: "", options: YN, short: true },
  { id: "trade", title: "Do you trade in personal information?", help: "Collecting or disclosing it for a benefit.", options: YN, short: true },
  { id: "cth", title: "Are you a Commonwealth contractor?", help: "", options: YN, short: true }
];
var INITIATIVE_UNKNOWN = "Initiative Unknown";
var picked = {};
var meta = { name: INITIATIVE_UNKNOWN, ref: "", time: "" };
var session = [];
var summaries = { adm: "" };

function newRef(d) {
  d = d || new Date();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var x = "";
  for (var i = 0; i < 4; i++) x += alphabet[Math.floor(Math.random() * alphabet.length)];
  return "ADM-" + d.getFullYear() + m + day + "-" + x;
}
function stampNow() {
  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short"
  }).format(new Date());
}
function triggerOf(pi, role, effect) {
  if (pi === 1 || role === 2 || effect === 1) return "unlikely";
  if (pi === 2 || role === 3 || effect === 2) return "unclear";
  if (pi === 0 && (role === 0 || role === 1) && effect === 0) return "likely";
  return "unclear";
}
function setPage() {}
function initiativeName(value) {
  var name = cleanText(value == null ? "" : value, 120).trim();
  return name || INITIATIVE_UNKNOWN;
}
function readGroup() {
  var input = document.getElementById("initiative-name");
  var name = cleanText(input ? input.value : "", 120).trim();
  return name || INITIATIVE_UNKNOWN;
}
function readAiType() {
  var chosen = document.querySelector('#ai-type input[name="ai-type"]:checked');
  return chosen ? chosen.value : "";
}
function readMeta() {
  var name = document.getElementById("init-name");
  if (!name) return;
  meta.name = name.value;
}
function bindNameSelect() {
  var input = document.getElementById("init-name");
  if (!input) return;
  input.maxLength = 120;
  input.addEventListener("focus", function () { input.select(); });
  input.addEventListener("mouseup", function (event) { event.preventDefault(); });
  input.addEventListener("input", function () {
    var next = cleanText(input.value, 120);
    if (next !== input.value) input.value = next;
  });
}
function renderQuestions() {
  var html = "";
  var number = 0;
  STEPS.forEach(function (spec) {
    if (spec.id === "name") return;
    number += 1;
    var help = spec.help ? '<p class="help" id="help-' + spec.id + '">' + esc(spec.help) + "</p>" : "";
    var described = spec.help ? ' aria-describedby="help-' + spec.id + '"' : "";
    html += '<fieldset class="qcard"' + described + '><legend><span class="qnum">' + number + '</span> ' + esc(spec.title) + '</legend>'
      + help;
    if (spec.kind === "text") {
      html += '<label class="field" for="q-' + spec.id + '">Supplier</label><input id="q-' + spec.id + '" name="' + spec.id + '" type="text" maxlength="' + (spec.maxlength || 120) + '" autocomplete="off"></fieldset>';
      return;
    }
    html += '<div class="chips">'
      + spec.options.map(function (opt) {
        var chip = opt.length > 2 && spec.id === "type" ? opt[2] : opt[1];
        var hint = spec.id !== "type" && opt[2] ? ' title="' + esc(opt[2]) + '"' : "";
        return '<label class="opt"' + hint + '><input type="radio" name="' + spec.id + '" value="' + esc(opt[0]) + '"><span>' + esc(chip) + "</span></label>";
      }).join("")
      + "</div></fieldset>";
  });
  document.getElementById("qcards").innerHTML = html;
}
function questionTotal() {
  return STEPS.filter(function (spec) { return spec.id !== "name"; }).length;
}
function syncPicked() {
  STEPS.forEach(function (spec) {
    if (spec.id === "name") return;
    if (spec.kind === "text") {
      var field = document.querySelector('#qcards input[name="' + spec.id + '"]');
      var text = cleanText(field ? field.value : "", spec.maxlength || 120).trim();
      if (text) picked[spec.id] = text;
      else delete picked[spec.id];
      return;
    }
    var chosen = document.querySelector('#qcards input[name="' + spec.id + '"]:checked');
    if (chosen) picked[spec.id] = chosen.value;
    else delete picked[spec.id];
  });
}
function paintCount() {
  var n = 0;
  STEPS.forEach(function (spec) {
    if (spec.id !== "name" && picked[spec.id] != null && picked[spec.id] !== "") n += 1;
  });
  var el = document.getElementById("answered-count");
  if (el) el.textContent = n + " of " + questionTotal() + " answered";
}
function paintLive() {
  var nameInput = document.getElementById("init-name");
  var name = nameInput ? nameInput.value : meta.name;
  var liveInitiative = document.getElementById("live-initiative");
  if (liveInitiative) liveInitiative.textContent = readGroup();
  document.getElementById("live-name").textContent = initiativeName(name);
  var shortName = {
    type: "Decision",
    pi: "Personal information",
    role: "Who decides",
    effect: "Significant effect",
    review: "Human review",
    contest: "Ask for a review",
    supplier: "Supplier",
    explained: "Supplier explanation",
    turnover: "Turnover over A$3m",
    health: "Health provider",
    trade: "Trades in personal information",
    cth: "Commonwealth contractor"
  };
  var items = [];
  STEPS.forEach(function (spec) {
    if (spec.id === "name" || picked[spec.id] == null) return;
    var label = spec.kind === "text" ? String(picked[spec.id]) : "—";
    (spec.options || []).forEach(function (opt) {
      if (String(opt[0]) === String(picked[spec.id])) label = (spec.id === "type" && opt[2]) ? opt[2] : opt[1];
    });
    items.push("<li><b>" + esc(shortName[spec.id] || spec.title) + ".</b> " + esc(label) + "</li>");
  });
  var chosenType = readAiType();
  if (chosenType) items.push("<li><b>AI type.</b> " + esc(aiTypeLabel(chosenType)) + "</li>");
  document.getElementById("live-answers").innerHTML = items.length ? items.join("") : '<li class="empty">None yet. Picks show up here.</li>';
  document.getElementById("live-verdict").textContent = draftVerdict();
  paintCount();
}
function draftVerdict() {
  if (picked.pi == null || picked.role == null || picked.effect == null) return "Not enough answers yet";
  var trigger = triggerOf(Number(picked.pi), Number(picked.role), Number(picked.effect));
  var scopeKeys = ["turnover", "health", "trade", "cth"];
  var known = scopeKeys.filter(function (key) { return picked[key] != null; });
  if (trigger === "unlikely") return "Unlikely";
  if (trigger === "unclear") return "Unclear";
  if (known.length < 4) return "Decision lines up. Scope still open.";
  var scopeYes = scopeKeys.filter(function (key) { return Number(picked[key]) === 0; });
  var scopeNo = scopeKeys.filter(function (key) { return Number(picked[key]) === 1; });
  if (scopeYes.length) return "Likely in scope";
  if (scopeNo.length === 4) return "Unlikely";
  return "Unclear";
}
function useLabel(id) {
  if (id === "unsure") return "Not sure";
  var found = "Decision";
  USES.forEach(function (u) { if (u[0] === id) found = u[1]; });
  return found;
}
var ADM_DUE = "10 Dec 2026";
var ADM_DUE_ISO = "2026-12-10";
function admTasks(verdict, trigger, ref, initiative, time) {
  var rows;
  if (verdict === "Likely in scope") {
    rows = [
      ["Book a lawyer to edit the disclosure wording", "Put the template wording in front of a lawyer before it goes in the privacy policy.", "Privacy lead"],
      ["Add this decision to the privacy-policy inventory", "Record the decision type and that it may need an APP 1.8 disclosure. Date the policy and review it at least yearly, or when the program changes.", "Product owner"],
      ["Write what the program reads and outputs", "One paragraph: inputs, the decision, and who relies on the output.", "Engineering lead"]
    ];
  } else if (trigger === "likely" && verdict === "Unlikely") {
    rows = [
      ["File this note and do not treat the exemption as advice", "Keep the one-page report with the decision record.", "Privacy lead"],
      ["Ask if the business will opt in to the Privacy Act", "A yes changes whether the disclosure duty applies.", "Product owner"],
      ["Draft what the software decides, in plain words", "Enterprise customers may ask even if you look exempt.", "Engineering lead"]
    ];
  } else if (verdict === "Unclear") {
    rows = [
      ["Close the Not sure answer with the person who runs it", "Do not skip the disclosure while an answer is Not sure.", "Privacy lead"],
      ["Hold the privacy-policy edit until that answer is clear", "Book the lawyer after the gap is closed.", "Product owner"],
      ["Trace whether people rely on the program's output", "A score or shortlist they use can be a substantial contribution.", "Engineering lead"]
    ];
  } else {
    rows = [
      ["File this note with the decision record", "This screen says the decision is unlikely to need APP 1.8 wording.", "Privacy lead"],
      ["Inventory the next decision if it works differently", "Run the check again rather than copying this verdict.", "Product owner"],
      ["Confirm a person still makes the call", "If the program starts deciding, run the check again.", "Engineering lead"]
    ];
  }
  return rows.map(function (row) {
    return { summary: row[0], description: row[1], owner: row[2], due: ADM_DUE, dueIso: ADM_DUE_ISO, ref: ref, initiative: initiative, time: time || "" };
  });
}
function mondayHtml(tasks) {
  return '<section class="monday"><h3>Your next 3 actions</h3><table><thead><tr><th>Action</th><th>Owner</th><th>Due</th></tr></thead><tbody>'
    + tasks.map(function (task) {
      return "<tr><td>" + esc(task.summary) + "</td><td>" + esc(task.owner) + "</td><td>" + esc(task.due) + "</td></tr>";
    }).join("")
    + "</tbody></table></section>";
}
function readArch() {
  function val(name) {
    var el = document.querySelector('#arch-notes input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }
  return { agentUse: val("agent-use"), ragUse: val("rag-use") };
}
function readyMark(verdict) {
  if (verdict === "Likely in scope") return "✕ No";
  if (verdict === "Unclear") return "? Not sure";
  return "✓ Yes";
}
function topRisk(verdict, trigger) {
  if (verdict === "Likely in scope") return "The privacy policy does not describe this decision yet.";
  if (trigger === "likely" && verdict === "Unlikely") return "An exemption here is only a screen.";
  if (verdict === "Unclear") return "An answer is still Not sure.";
  return "No disclosure gap shows on these answers.";
}
function portfolioVerdictLabel(likely, unclear, unlikely, total) {
  if (likely && (unlikely || unclear)) return likely + " of " + total + " likely in scope";
  if (!likely && unclear && unlikely) return unclear + " of " + total + " unclear";
  if (likely) return "Likely in scope";
  if (unclear) return "Unclear";
  return "Unlikely";
}
function portfolioTopRisk(likely, unclear, total) {
  function verb(n) { return n === 1 ? "is" : "are"; }
  if (likely) return likely + " of " + total + " decisions " + verb(likely) + " not described in the privacy policy yet.";
  if (unclear) return unclear + " of " + total + " decisions " + verb(unclear) + " still unclear.";
  return "No disclosure gap shows on these answers.";
}
function askRows(verdict, trigger) {
  if (verdict === "Likely in scope") {
    return [
      ["Approve a named owner", "Someone must own this decision."],
      ["Sign off the privacy-policy wording", "The policy must describe this decision."],
      ["Fund a short legal review", "A lawyer should check the words first."]
    ];
  }
  if (trigger === "likely" && verdict === "Unlikely") {
    return [
      ["File this note", "Do not treat the exemption as advice."],
      ["Decide whether to opt in", "A yes would change the duty."],
      ["No extra budget", "These answers do not fund a disclosure project."]
    ];
  }
  if (verdict === "Unclear") {
    return [
      ["Close the open answer", "Do not decide while an answer is Not sure."],
      ["Hold the policy edit", "Wait until that gap is closed."],
      ["Keep a person on the review", "A shortlist can still shape the outcome."]
    ];
  }
  return [
    ["File this note", "These answers do not show a disclosure to add."],
    ["Check the next decision on its own", "Do not copy this verdict."],
    ["No extra budget", "Nothing new to fund on these answers."]
  ];
}
function riskLines(verdict, trigger) {
  if (trigger === "likely" && verdict === "Unlikely") {
    return [
      "The decision lines up with the privacy rule.",
      "These answers point to a likely exemption.",
      "That is not a legal conclusion."
    ];
  }
  if (verdict === "Likely in scope") {
    return [
      "The privacy policy can leave this decision out.",
      "People may not be told how the program decides.",
      "That is a disclosure gap, not a fine estimate."
    ];
  }
  if (verdict === "Unclear") {
    return [
      "An answer is still Not sure.",
      "The team might skip a disclosure that is still required.",
      "Do not treat this screen as a finding."
    ];
  }
  return [
    "These answers do not show a disclosure to add.",
    "Run the check again if the program starts deciding.",
    "APP means the Australian Privacy Principles."
  ];
}
function assessmentRows(ids) {
  return ids.map(function (id) {
    var spec = STEPS.filter(function (row) { return row.id === id; })[0];
    var value = picked[id];
    var label = spec.kind === "text" ? (value ? String(value) : "Not answered") : answerLabel(spec, value);
    return [spec.title, statusMark(label)];
  });
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
function portfolioCsv(portfolio) {
  var lines = ["", "Portfolio summary", "Group,Bucket,Count"];
  function push(group, rows, key) {
    rows.forEach(function (row) {
      lines.push([group, row[key || "label"], String(row.count)].map(csvCell).join(","));
    });
  }
  push("AI type", portfolio.byAiType);
  push("Decision type", portfolio.byDecisionType);
  push("Supplier", portfolio.bySupplier, "name");
  push("Verdict", portfolio.byVerdict);
  push("Readiness", portfolio.byReadiness);
  (portfolio.gaps || []).forEach(function (gap) {
    lines.push(["Gap", gap, ""].map(csvCell).join(","));
  });
  if (portfolio.matrix && portfolio.matrix.length) {
    var laid = patternMatrixTable(portfolio.matrix);
    lines.push(laid.headers.map(csvCell).join(","));
    laid.rows.forEach(function (row) {
      lines.push(row.map(csvCell).join(","));
    });
  }
  (portfolio.sharedActions || []).forEach(function (row) {
    lines.push(["Shared action", row.text, row.owner, row.due, row.initiatives.join("; ")].map(csvCell).join(","));
  });
  return lines.join("\r\n");
}
function toCsv(tasks, portfolio) {
  var lines = ["Summary,Description,Assignee,Due Date,Labels"];
  tasks.forEach(function (task) {
    var description = task.description;
    if (task.initiative) description += " Initiative: " + task.initiative + ".";
    if (task.group) description += " Portfolio initiative: " + task.group + ".";
    if (task.aiTypeLabel) description += " AI type: " + task.aiTypeLabel + ".";
    if (task.time) description += " Timestamp: " + task.time + ".";
    lines.push([task.summary, description, task.owner, task.dueIso, task.ref].map(csvCell).join(","));
  });
  if (portfolio && portfolio.decisionCount >= 2) lines.push(portfolioCsv(portfolio));
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
function downloadCsv(filename, tasks, portfolio) {
  var blob = new Blob([toCsv(tasks, portfolio)], { type: "text/csv" });
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
}
function say(id, message) {
  var el = document.getElementById(id);
  if (el) el.textContent = message;
}
var latestTasks = [];
async function showReport(quiet) {
  meta.name = initiativeName(meta.name);
  var pi = Number(picked.pi);
  var role = Number(picked.role);
  var effect = Number(picked.effect);
  var trigger = triggerOf(pi, role, effect);
  var scopeKeys = ["turnover", "health", "trade", "cth"];
  var scopeYes = scopeKeys.filter(function (k) { return Number(picked[k]) === 0; });
  var scopeNo = scopeKeys.filter(function (k) { return Number(picked[k]) === 1; });
  var verdict = "Unclear";
  if (trigger === "unlikely") verdict = "Unlikely";
  else if (trigger === "unclear") verdict = "Unclear";
  else if (scopeYes.length) verdict = "Likely in scope";
  else if (scopeNo.length === 4) verdict = "Unlikely";
  var typeLabel = useLabel(picked.type);
  var arch = readArch();
  var group = readGroup();
  var answers = answerSnapshot(arch);
  var aiType = deriveAiType(readAiType(), answers);
  latestTasks = admTasks(verdict, trigger, meta.ref, meta.name, meta.time);
  latestTasks.forEach(function (task) {
    task.group = group;
    task.aiTypeLabel = aiTypeLabel(aiType);
  });
  var sentence = verdict === "Likely in scope"
    ? "This decision is likely in scope for a privacy-policy note from 10 December 2026."
    : verdict === "Unclear"
      ? "This decision is unclear, so do not skip the disclosure."
      : "This decision is unlikely to need an APP 1.7 disclosure from these answers.";
  var risk = riskLines(verdict, trigger);
  var pairs = STEPS.filter(function (spec) { return spec.id !== "name"; }).map(function (spec) {
    return { id: spec.id, value: picked[spec.id] || "" };
  });
  var fingerprint = await answerFingerprint(pairs);
  var entry = {
    ref: meta.ref,
    time: meta.time,
    name: meta.name,
    verdict: verdict,
    tasks: latestTasks,
    pairs: pairs,
    typeLabel: typeLabel,
    when: meta.generatedAt || new Date(),
    initiative: group,
    aiType: aiType,
    answers: answers,
    reasons: risk,
    app18: app18Text(typeLabel, meta.name, role, verdict)
  };
  var at = -1;
  session.forEach(function (row, i) { if (row.ref === entry.ref) at = i; });
  if (at >= 0) session[at] = entry; else session.push(entry);
  var doc = await refreshDocument();
  var delivery = [];
  var patternsNode = null;
  var sourcesHeading = "Sources";
  if (reportMode() === "full") {
    delivery.push(node("h3", "", "About the decision"));
    delivery.push(gridTable(["Question", "Answer"], assessmentRows(["type", "pi", "role", "effect"])));
    delivery.push(node("h3", "", "Safeguards"));
    delivery.push(gridTable(["Question", "Answer"], assessmentRows(["review", "contest", "supplier", "explained"])));
    delivery.push(node("h3", "", "About your organisation"));
    delivery.push(gridTable(["Question", "Answer"], assessmentRows(["turnover", "health", "trade", "cth"])));
    delivery.push(node("h3", "", "What the law asks"));
    delivery.push(admLegal(typeLabel, meta.name, role, trigger, verdict));
    var nextNum = numberHeads(delivery, 1);
    var extra = recordExtras(doc);
    nextNum = numberHeads(extra, nextNum);
    delivery = delivery.concat(extra);
    sourcesHeading = nextNum + ". Sources";
    var atPattern = session.indexOf(entry);
    patternsNode = patternSection(matchPatterns(patternInputFrom(entry, decId(atPattern < 0 ? 0 : atPattern))));
  }
  var sheet = document.getElementById("adm-sheet");
  buildRecord(sheet, {
    title: "Automated Decision Record",
    ref: meta.ref,
    version: reportVersion(),
    generated: meta.time,
    classification: reportClass(),
    fingerprint: fingerprint,
    nextReview: nextReviewLabel(meta.generatedAt || new Date()),
    preparedFor: preparedForValue(),
    preparedByRole: preparedRoleValue(),
    verdict: sentence,
    verdictId: "verdict",
    glance: [
      { label: "Verdict", value: verdict },
      { label: "Ready for 10 Dec?", value: readyMark(verdict) },
      { label: "Decisions checked", value: "1" },
      { label: "Top risk", value: topRisk(verdict, trigger) },
      { label: "Next review", value: nextReviewLabel(meta.generatedAt || new Date()) }
    ],
    asks: askRows(verdict, trigger),
    risk: risk,
    initiative: meta.name,
    group: group,
    decisionType: typeLabel,
    org: orgValue(),
    mode: reportMode(),
    actionsHtml: mondayHtml(latestTasks),
    delivery: delivery,
    patternsNode: patternsNode,
    sourcesHeading: sourcesHeading
  });
  await paintSession();
  summaries.adm = "Verdict: " + verdict + ". Decision type: " + typeLabel + ".";
  document.getElementById("result").hidden = false;
  document.getElementById("adm-playbook").hidden = true;
  if (window.refreshPlaybook) window.refreshPlaybook("adm");
  paintLive();
  if (!quiet) document.getElementById("result").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
function answerLabel(spec, value) {
  if (spec.kind === "text") return value ? String(value) : "Not sure";
  var found = "";
  (spec.options || []).forEach(function (opt) {
    if (String(opt[0]) === String(value)) found = opt[1];
  });
  return found || "Not sure";
}
function app18Text(typeLabel, name, role, verdict) {
  if (verdict !== "Likely in scope") return "";
  if (role === 0) return "We use [describe, for example name and application answers; name sensitive kinds such as health information separately] when a computer program makes this decision: " + typeLabel + " (" + name + ").";
  if (role === 1) return "We use [describe; name sensitive kinds such as health information separately] when a computer program does a thing that is substantially and directly related to making this decision: " + typeLabel + " (" + name + ").";
  if (role === 2) return "";
  return "If a lawyer confirms APP 1.7 applies: we use [kinds of personal information] when a computer program makes, or does a thing substantially and directly related to making, this decision: " + typeLabel + " (" + name + ").";
}
function answerSnapshot(arch) {
  arch = arch || readArch();
  return {
    type: picked.type,
    pi: picked.pi,
    role: picked.role,
    effect: picked.effect,
    review: picked.review,
    contest: picked.contest,
    supplier: picked.supplier || "",
    explained: picked.explained,
    turnover: picked.turnover,
    health: picked.health,
    trade: picked.trade,
    cth: picked.cth,
    agentUse: arch.agentUse || "",
    ragUse: arch.ragUse || ""
  };
}
var latestDoc = null;
async function refreshDocument() {
  var pairs = [];
  session.forEach(function (row) { pairs = pairs.concat(row.pairs || []); });
  var fingerprint = pairs.length ? await answerFingerprint(pairs) : "";
  if (!/^[0-9a-f]{16}$/.test(fingerprint)) return null;
  latestDoc = buildSchemaReport(session, {
    fingerprint: fingerprint,
    classification: reportClass(),
    version: reportVersion(),
    organisation: orgValue(),
    preparedFor: preparedForValue(),
    preparedByRole: preparedRoleValue(),
    generatedAt: meta.generatedAt || new Date()
  });
  paintExport(latestDoc);
  return latestDoc;
}
function paintExport(doc) {
  var panel = document.getElementById("export-panel");
  if (!panel) return;
  panel.hidden = !doc;
  var warn = document.getElementById("assistant-warn");
  if (warn) warn.textContent = ASSISTANT_WARNING;
  var box = document.getElementById("assistant-prompt");
  if (box && doc) box.value = assistantText(doc);
}
function recordExtras(doc) {
  if (reportMode() !== "full" || !doc) return [];
  return holisticSplit(doc);
}
function standFor(verdict, trigger) {
  if (verdict === "Likely in scope") return "Likely in scope. The policy does not describe it yet.";
  if (trigger === "likely" && verdict === "Unlikely") return "The decision lines up. A likely exemption may apply.";
  if (verdict === "Unclear") return "An answer is Not sure. Do not skip the disclosure.";
  return "These answers do not show a disclosure to add.";
}
function admLegal(typeLabel, name, role, trigger, verdict) {
  var wrap = node("div", "legal");
  var box = node("div", "plain-box");
  [
    "Australian Privacy Principles (APP) 1.7 to 1.9 start on 10 December 2026.",
    "A privacy policy has to describe some computer-program decisions.",
    "That applies where personal information is used.",
    "The effect on a person can be significant.",
    "APP 1.8 sets out what that description covers.",
    "It covers decisions a program makes alone, and decisions where a program does a thing substantially and directly related to making them.",
    "A score or shortlist still counts even when a person reviews it.",
    "APP 1.9: refusing or failing to decide counts, and good or bad effects both count.",
    "Examples: a benefit, rights under a contract, or access to a significant service such as healthcare, housing or a job.",
    "A child or a person experiencing vulnerability may be affected more.",
    "The description goes in your APP privacy policy. Keep the policy dated and review it at least yearly, or when the program changes.",
    "Exemptions such as small business or employee records are only a screen here. Check them with a lawyer.",
    "You can leave out commercial-in-confidence details and trade secrets.",
    "This note is not a finding of compliance."
  ].forEach(function (line) { box.appendChild(node("p", "", line)); });
  if (role === 2 && trigger === "unlikely") {
    box.appendChild(node("p", "", "No APP 1.8 wording is suggested."));
    box.appendChild(node("p", "", "A person decides. The program does not do that thing."));
  } else if (role === 0) {
    box.appendChild(node("p", "", "Suggested wording for a lawyer to edit."));
    var kinds = node("p", "");
    kinds.appendChild(node("b", "", "Kinds of personal information. "));
    kinds.appendChild(document.createTextNode("We use [describe, for example name and application answers; name sensitive kinds such as health information separately] when a computer program makes this decision: " + typeLabel + " ("));
    kinds.appendChild(node("span", "", name));
    kinds.appendChild(document.createTextNode(")."));
    var sole = node("p", "");
    sole.appendChild(node("b", "", "Decision made solely by a computer program. "));
    sole.appendChild(document.createTextNode("A computer program makes this kind of decision: " + typeLabel + "."));
    box.append(kinds, sole);
  } else if (role === 1) {
    box.appendChild(node("p", "", "Suggested wording for a lawyer to edit."));
    var related = node("p", "");
    related.appendChild(node("b", "", "Kinds of personal information. "));
    related.appendChild(document.createTextNode("We use [describe; name sensitive kinds such as health information separately] when a computer program does a thing that is substantially and directly related to making this decision: " + typeLabel + " ("));
    related.appendChild(node("span", "", name));
    related.appendChild(document.createTextNode(")."));
    var sub = node("p", "");
    sub.appendChild(node("b", "", "Substantially and directly related. "));
    sub.appendChild(document.createTextNode("A computer program does that thing for this kind of decision: " + typeLabel + "."));
    box.append(related, sub);
  } else {
    var unsure = node("p", "");
    unsure.appendChild(document.createTextNode("If a lawyer confirms APP 1.7 applies: we use [kinds of personal information] when a computer program makes, or does a thing substantially and directly related to making, this decision: " + typeLabel + " ("));
    unsure.appendChild(node("span", "", name));
    unsure.appendChild(document.createTextNode("). Delete the limb that does not apply. Leave out trade secrets."));
    box.appendChild(unsure);
  }
  wrap.appendChild(box);
  wrap.appendChild(gridTable(["Framework", "What it asks", "Where you stand"], [
    ["APP 1.7", "Describe this kind of decision in the privacy policy.", standFor(verdict, trigger)],
    ["APP 1.8", "Say what personal information is used, and what the program decides.", "The wording above is for a lawyer to edit."],
    ["Guidance for AI Adoption", "Practice 4 says share essential information. It is voluntary.", "Australia has no mandatory AI guardrails for business."],
    ["NIST AI RMF 1.0", "References: GOVERN 1, MAP 1, and MEASURE 2.9.", "These are references, not a score."],
    ["ISO/IEC 42001:2023", "Themes: transparency and data governance.", "Annex A numbers are not cited."],
    ["EU AI Act", "Articles 13 and 50 apply only if you sell into the EU.", "This is not a high-risk finding."]
  ]));
  return wrap;
}
async function paintSession() {
  var box = document.getElementById("session");
  box.hidden = session.length === 0;
  var list = document.getElementById("session-list");
  list.replaceChildren();
  session.forEach(function (row) {
    var li = document.createElement("li");
    var name = document.createElement("span");
    name.textContent = row.initiative && row.initiative !== row.name ? row.initiative + " — " + row.name : row.name;
    var verdict = document.createElement("span");
    verdict.textContent = row.verdict;
    li.append(name, verdict);
    list.append(li);
  });
  var pairs = [];
  session.forEach(function (row) { pairs = pairs.concat(row.pairs || []); });
  var fingerprint = await answerFingerprint(pairs);
  var likely = session.filter(function (row) { return row.verdict === "Likely in scope"; }).length;
  var unlikely = session.filter(function (row) { return row.verdict === "Unlikely"; }).length;
  var unclear = session.length - likely - unlikely;
  var latest = session.length ? session[session.length - 1] : null;
  var when = meta.generatedAt || new Date();
  var visitVerdict = likely ? "Likely in scope" : unclear ? "Unclear" : "Unlikely";
  var visitTrigger = likely && unlikely && !unclear ? "likely" : "";
  var risk = [
    likely + (likely === 1 ? " decision is likely in scope." : " decisions are likely in scope."),
    unlikely + (unlikely === 1 ? " decision is unlikely to need a disclosure." : " decisions are unlikely to need a disclosure."),
    unclear + (unclear === 1 ? " decision is still unclear." : " decisions are still unclear.")
  ];
  var delivery = [];
  var patternsNode = null;
  var sourcesHeading = "Sources";
  if (reportMode() === "full" && latestDoc) {
    delivery = recordExtras(latestDoc);
    sourcesHeading = numberHeads(delivery, 1) + ". Sources";
    var all = [];
    session.forEach(function (row, index) { all = all.concat(matchPatterns(patternInputFrom(row, decId(index)))); });
    patternsNode = patternSection(all);
  }
  var table = document.createElement("div");
  table.appendChild(node("h3", "", "Decisions"));
  table.appendChild(gridTable(
    ["Reference", "Initiative", "Decision", "AI type", "Verdict"],
    session.map(function (row) {
      return [row.ref, row.initiative || INITIATIVE_UNKNOWN, row.name, aiTypeShort(row.aiType || "not-sure"), row.verdict];
    })
  ));
  var portfolio = portfolioFromEntries(session);
  var summaryPortfolio = portfolio && reportMode() !== "full";
  var compactList = summaryPortfolio && session.length > 3;
  var asks = summaryPortfolio ? null : askRows(likely ? "Likely in scope" : unclear ? "Unclear" : "Unlikely", visitTrigger);
  if (portfolio && asks) asks = asks.map(function (row) { return row.map(pluralDecisions); });
  document.getElementById("register-sheet").classList.toggle("is-open", session.length >= 2);
  buildRecord(document.getElementById("register-sheet"), {
    title: "Automated Decision Register",
    ref: "This visit",
    version: reportVersion(),
    generated: latest ? latest.time : "",
    classification: reportClass(),
    fingerprint: fingerprint,
    nextReview: nextReviewLabel(when),
    preparedFor: preparedForValue(),
    preparedByRole: preparedRoleValue(),
    verdict: "This visit records " + session.length + (session.length === 1 ? " decision." : " decisions."),
    nameLead: "Register: ",
    glance: [
      { label: "Verdict", value: portfolio ? portfolioVerdictLabel(likely, unclear, unlikely, session.length) : visitVerdict },
      { label: "Ready for 10 Dec?", value: readyMark(likely ? "Likely in scope" : unclear ? "Unclear" : "Unlikely") },
      { label: "Decisions checked", value: String(session.length) },
      { label: "Top risk", value: portfolio ? portfolioTopRisk(likely, unclear, session.length) : topRisk(likely ? "Likely in scope" : unclear ? "Unclear" : "Unlikely", visitTrigger) },
      { label: "Next review", value: nextReviewLabel(when) }
    ],
    asks: asks,
    risk: summaryPortfolio ? null : risk,
    portfolio: portfolioNode(portfolio, reportMode(), compactList ? session.map(function (row) { return row.name; }) : null),
    initiative: "Decisions entered during this visit",
    decisionType: "Automated decision register",
    org: orgValue(),
    mode: reportMode(),
    middle: compactList ? null : table,
    delivery: delivery,
    patternsNode: patternsNode,
    sourcesHeading: sourcesHeading
  });
}
function entriesFromReport(doc) {
  var when = new Date(doc.document.generatedAt);
  if (isNaN(when.getTime())) when = new Date();
  var count = doc.decisions.length;
  var per = count ? Math.floor((doc.actions || []).length / count) : 0;
  return doc.decisions.map(function (decision, index) {
    var answers = answersFromDecision(decision, doc.scope, doc.findings);
    if (decision.system && decision.system.kind === "agent") answers.agentUse = "on-its-own";
    if (decision.system && decision.system.kind === "llm") answers.ragUse = "yes";
    var aiType = aiTypeFromDecision(decision);
    var group = decision.initiative || INITIATIVE_UNKNOWN;
    var ref = index === 0 ? doc.document.reference : newRef(when);
    var slice = per ? doc.actions.slice(index * per, index * per + per) : [];
    return {
      ref: ref,
      time: "",
      name: decision.name,
      initiative: group,
      aiType: aiType,
      verdict: verdictWords(decision.verdict),
      tasks: slice.map(function (action) {
        return {
          summary: action.text,
          description: action.text,
          owner: (action.owner && action.owner.responsible) || "Privacy lead",
          due: action.due || ADM_DUE,
          dueIso: action.due || ADM_DUE_ISO,
          ref: ref,
          initiative: decision.name,
          group: group,
          aiTypeLabel: aiTypeLabel(aiType),
          time: ""
        };
      }),
      pairs: pairsFromAnswers(answers),
      typeLabel: TYPE_LABEL[decision.decisionType] || decision.decisionType,
      when: when,
      answers: answers,
      reasons: (decision.reasons || []).slice(0, 3),
      app18: decision.app18Draft || ""
    };
  });
}
function loadReportFile(file) {
  var status = document.getElementById("import-status");
  if (!file) return;
  if (file.size > 200000) {
    if (status) status.textContent = "That file is too large to load.";
    return;
  }
  var reader = new FileReader();
  reader.onload = function () {
    var data;
    try { data = JSON.parse(String(reader.result || "")); }
    catch (e) {
      if (status) status.textContent = "That file is not a SafeBlueprint report.";
      return;
    }
    var check = validateReport(data);
    if (!check.ok) {
      if (status) status.textContent = "That file does not match the report format.";
      return;
    }
    var entries = entriesFromReport(data);
    if (!entries.length) {
      if (status) status.textContent = "That file has no decisions.";
      return;
    }
    session = entries;
    var last = entries[entries.length - 1];
    meta.ref = last.ref;
    meta.name = last.name;
    meta.generatedAt = last.when;
    meta.time = stampNow();
    document.getElementById("init-name").value = last.name;
    var initiativeInput = document.getElementById("initiative-name");
    if (initiativeInput) initiativeInput.value = last.initiative && last.initiative !== INITIATIVE_UNKNOWN ? last.initiative : "";
    var preparedFor = document.getElementById("prepared-for");
    if (preparedFor) preparedFor.value = data.document.preparedFor || "";
    var preparedRole = document.getElementById("prepared-role");
    if (preparedRole) preparedRole.value = data.document.preparedByRole || "";
    document.querySelectorAll("#qcards input[type=radio]").forEach(function (input) { input.checked = false; });
    document.querySelectorAll("#arch-notes input").forEach(function (input) { input.checked = false; });
    document.querySelectorAll("#ai-type input").forEach(function (input) { input.checked = false; });
    var supplier = document.querySelector('#qcards input[name="supplier"]');
    if (supplier) supplier.value = last.answers.supplier || "";
    Object.keys(last.answers).forEach(function (key) {
      if (key === "supplier" || key === "agentUse" || key === "ragUse" || key === "aiType") return;
      var input = document.querySelector('#qcards input[name="' + key + '"][value="' + last.answers[key] + '"]');
      if (input) input.checked = true;
    });
    if (last.aiType) {
      var typeInput = document.querySelector('#ai-type input[name="ai-type"][value="' + last.aiType + '"]');
      if (typeInput) typeInput.checked = true;
    }
    ["agent-use", "rag-use"].forEach(function (name) {
      var key = name === "agent-use" ? "agentUse" : "ragUse";
      if (!last.answers[key]) return;
      var pickedArch = document.querySelector('#arch-notes input[name="' + name + '"][value="' + last.answers[key] + '"]');
      if (pickedArch) pickedArch.checked = true;
    });
    syncPicked();
    showReport(true).then(function () {
      if (status) status.textContent = "Loaded " + entries.length + (entries.length === 1 ? " decision" : " decisions") + " into this visit. Refreshing clears them. Load the file again to resume. Nothing was stored on this site.";
    });
  };
  reader.readAsText(file);
}
document.getElementById("see-report").onclick = function () {
  var name = document.getElementById("init-name");
  document.getElementById("step-err").hidden = true;
  name.value = cleanText(name.value, 120);
  if (!name.value.trim()) name.value = INITIATIVE_UNKNOWN;
  meta.name = initiativeName(name.value);
  meta.generatedAt = new Date();
  meta.time = stampNow();
  var assumed = false;
  STEPS.forEach(function (spec) {
    if (spec.id === "name" || spec.kind === "text") return;
    var chosen = document.querySelector('#qcards input[name="' + spec.id + '"]:checked');
    if (!chosen) {
      var fallback = spec.id === "type" ? "unsure" : spec.id === "role" ? "3" : "2";
      var input = document.querySelector('#qcards input[name="' + spec.id + '"][value="' + fallback + '"]');
      if (input) input.checked = true;
      picked[spec.id] = fallback;
      assumed = true;
    } else picked[spec.id] = chosen.value;
  });
  STEPS.forEach(function (spec) {
    if (spec.kind !== "text") return;
    var field = document.querySelector('#qcards input[name="' + spec.id + '"]');
    var text = cleanText(field ? field.value : "", spec.maxlength || 120).trim();
    if (field && field.value !== text) field.value = text;
    if (text) picked[spec.id] = text;
    else delete picked[spec.id];
  });
  document.getElementById("assume-note").textContent = assumed
    ? "Unanswered questions were counted as Not sure."
    : "Unanswered questions count as Not sure.";
  showReport();
};
document.getElementById("add-another").onclick = function () {
  picked = {};
  document.querySelectorAll("#qcards input[type=radio]").forEach(function (input) { input.checked = false; });
  document.querySelectorAll("#qcards input[type=text]").forEach(function (input) { input.value = ""; });
  document.querySelectorAll("#arch-notes input").forEach(function (input) { input.checked = false; });
  document.querySelectorAll("#ai-type input").forEach(function (input) { input.checked = false; });
  document.getElementById("init-name").value = INITIATIVE_UNKNOWN;
  meta.name = INITIATIVE_UNKNOWN;
  meta.ref = newRef();
  meta.time = "";
  document.getElementById("result").hidden = true;
  document.getElementById("adm-playbook").hidden = true;
  document.getElementById("step-err").hidden = true;
  document.getElementById("assume-note").textContent = "Unanswered questions count as Not sure.";
  paintLive();
  document.getElementById("wizard").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
};
var printRestore = null;
function printPrepared(mode, datasetValue) {
  printRestore = reportMode();
  var input = document.querySelector('input[name="report-mode"][value="' + mode + '"]');
  if (input) input.checked = true;
  var run = function () {
    document.body.dataset.print = datasetValue;
    syncPrintFooter().then(function () { window.print(); });
  };
  if (!document.getElementById("result").hidden) showReport(true).then(run);
  else run();
}
document.getElementById("save-pdf").onclick = function () { printPrepared("full", "adm"); };
var leaderButton = document.getElementById("save-leader");
if (leaderButton) leaderButton.onclick = function () {
  if (session.length < 2) {
    printPrepared("summary", "leader");
    return;
  }
  printRestore = reportMode();
  var input = document.querySelector('input[name="report-mode"][value="summary"]');
  if (input) input.checked = true;
  var run = function () {
    document.body.dataset.print = "register";
    syncPrintFooter().then(function () { window.print(); });
  };
  if (!document.getElementById("result").hidden) showReport(true).then(run);
  else paintSession().then(run);
};
document.getElementById("save-register").onclick = function () {
  document.body.dataset.print = "register";
  syncPrintFooter().then(function () { window.print(); });
};
window.addEventListener("afterprint", function () {
  delete document.body.dataset.print;
  setPage("8mm");
  if (!printRestore) return;
  var back = printRestore;
  printRestore = null;
  var input = document.querySelector('input[name="report-mode"][value="' + back + '"]');
  if (input && !input.checked) {
    input.checked = true;
    if (!document.getElementById("result").hidden) showReport(true);
  }
});
document.getElementById("save-html").onclick = function () {
  downloadReportHtml("safeblueprint-adm-report.html", "Automated Decision Record", document.getElementById("adm-sheet"));
};
function allTasks() {
  var rows = [];
  session.forEach(function (entry) { rows = rows.concat(entry.tasks || []); });
  return rows;
}
document.getElementById("copy-tasks").onclick = function () {
  copyText(toTsv(latestTasks)).then(function () { say("task-status", "Copied."); }).catch(function () { say("task-status", "Copy failed. Try Download CSV."); });
};
document.getElementById("csv-tasks").onclick = function () {
  downloadCsv("safeblueprint-adm-tasks.csv", latestTasks);
  say("task-status", "Downloaded.");
};
document.getElementById("copy-register").onclick = function () {
  copyText(toTsv(allTasks())).then(function () { say("register-status", "Copied."); }).catch(function () { say("register-status", "Copy failed. Try Download CSV."); });
};
document.getElementById("csv-register").onclick = function () {
  downloadCsv("safeblueprint-adm-register.csv", allTasks(), latestDoc && latestDoc.portfolio);
  say("register-status", "Downloaded.");
};
document.getElementById("save-json").onclick = function () {
  if (!latestDoc) return;
  var check = validateReport(latestDoc);
  if (!check.ok) {
    say("import-status", "This report could not be saved.");
    return;
  }
  downloadText("safeblueprint-report.json", "application/json", JSON.stringify(latestDoc, null, 2));
  say("import-status", "Downloaded JSON.");
};
document.getElementById("save-md").onclick = function () {
  if (!latestDoc) return;
  downloadText("safeblueprint-report.md", "text/markdown", reportMarkdown(latestDoc));
  say("import-status", "Downloaded Markdown.");
};
document.getElementById("copy-prompt").onclick = function () {
  if (!latestDoc) return;
  copyText(assistantText(latestDoc)).then(function () { say("import-status", "Copied."); }).catch(function () { say("import-status", "Copy failed."); });
};
document.getElementById("import-json").addEventListener("change", function (event) {
  var file = event.target.files && event.target.files[0];
  loadReportFile(file);
  event.target.value = "";
});

meta.ref = newRef();
renderQuestions();
bindNameSelect();
bindOrg();
bindReportChrome(function () {
  if (!document.getElementById("result").hidden) showReport(true);
  else if (session.length) paintSession();
});
paintLive();
document.getElementById("wizard").addEventListener("input", function () {
  readMeta();
  syncPicked();
  paintLive();
});
document.getElementById("wizard").addEventListener("change", function () {
  readMeta();
  syncPicked();
  paintLive();
});
bindPlaybook(document.getElementById("adm-play-form"));

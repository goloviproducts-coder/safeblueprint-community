/* Load a question pack from this device and run it. Files are read with FileReader and never uploaded. */
(function () {
  "use strict";
  var E = window.SBQ;
  var box = document.getElementById("packs");
  if (!E || !box) return;
  var input = document.getElementById("pack-file");
  var errorsEl = document.getElementById("pack-errors");
  var previewEl = document.getElementById("pack-preview");
  var runCard = document.getElementById("pack-run");
  var qcards = document.getElementById("pack-qcards");
  var outEl = document.getElementById("pack-out");
  var exportsEl = document.getElementById("pack-exports");
  var current = null;
  var answers = {};
  var lastModel = null;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function hex(buf) { var b = new Uint8Array(buf), s = ""; for (var i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0"); return s; }
  function sha256(bytes) {
    if (!window.crypto || !crypto.subtle) return Promise.resolve("unavailable");
    return crypto.subtle.digest("SHA-256", bytes).then(hex, function () { return "unavailable"; });
  }
  function showErrors(list) {
    errorsEl.replaceChildren();
    if (!list || !list.length) { errorsEl.hidden = true; return; }
    errorsEl.hidden = false;
    errorsEl.appendChild(el("p", "pack-err-head", list.length === 1 ? "1 problem to fix in this file:" : list.length + " problems to fix in this file:"));
    var ul = el("ul");
    list.slice(0, 25).forEach(function (e) {
      var where = [];
      if (e.line) where.push((e.label || "Row ") + e.line);
      if (e.column) where.push("column \u201C" + e.column + "\u201D");
      ul.appendChild(el("li", "", (where.length ? where.join(", ") + ": " : "") + e.message));
    });
    if (list.length > 25) ul.appendChild(el("li", "", "\u2026and " + (list.length - 25) + " more."));
    errorsEl.appendChild(ul);
    errorsEl.appendChild(el("p", "gentle", "Nothing was loaded. Fix the file and load it again. See the customising guide for help."));
  }
  function accept(pack, hash, label) {
    current = { pack: pack, sha256: hash, label: label };
    answers = {};
    showErrors(null);
    var qs = pack.questions;
    var sections = {}, controls = {}, packs = {};
    qs.forEach(function (q) { sections[q.section] = 1; packs[q.pack] = 1; q.controls.forEach(function (c) { controls[c] = 1; }); });
    var scored = qs.filter(function (q) { return q.weight > 0 && q.risk_if.length; }).length;
    previewEl.replaceChildren();
    previewEl.hidden = false;
    previewEl.appendChild(el("h3", "", label + ": " + pack.name + " v" + pack.version));
    var dl = el("ul", "pack-counts");
    [["Questions", qs.length], ["Sections", Object.keys(sections).length], ["Scored questions", scored], ["Control IDs", Object.keys(controls).length], ["Packs", Object.keys(packs).join(", ")], ["SHA-256", hash.slice(0, 16) + "\u2026"]].forEach(function (r) {
      var li = el("li"); li.appendChild(el("b", "", r[0] + ": ")); li.appendChild(document.createTextNode(String(r[1]))); dl.appendChild(li);
    });
    previewEl.appendChild(dl);
    var go = el("button", "btn", "Run this pack");
    go.type = "button";
    go.addEventListener("click", run);
    previewEl.appendChild(go);
  }
  function loadBytes(bytes, fileName, label) {
    var text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch (e) { showErrors([{ message: "The file is not UTF-8 text. In Excel use Save As \u2192 CSV UTF-8 (Comma delimited)." }]); return Promise.resolve(); }
    var pack;
    try { pack = E.loadPack(text, fileName); }
    catch (e) { showErrors(e.errors || [{ message: String(e.message || e) }]); previewEl.hidden = true; return Promise.resolve(); }
    return sha256(bytes).then(function (h) { accept(pack, h, label); });
  }
  input.addEventListener("change", function () {
    var file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { showErrors([{ message: "The file is larger than 1 MB. A question pack should be much smaller." }]); return; }
    var reader = new FileReader();
    reader.onload = function () { loadBytes(new Uint8Array(reader.result), file.name, "Your pack"); input.value = ""; };
    reader.onerror = function () { showErrors([{ message: "This file could not be read." }]); };
    reader.readAsArrayBuffer(file);
  });

  function optionInputs(q) {
    var wrap = el("div", "chips");
    var kind = q.type === "multi" ? "checkbox" : "radio";
    q.options.forEach(function (o) {
      var lab = el("label", "opt");
      var i = document.createElement("input");
      i.type = kind; i.name = "pk-" + q.id; i.value = o.value;
      i.addEventListener("change", function () { read(q); });
      lab.append(i, el("span", "", o.label));
      wrap.appendChild(lab);
    });
    return wrap;
  }
  function read(q) {
    if (q.type === "multi") answers[q.id] = Array.prototype.map.call(qcards.querySelectorAll('input[name="pk-' + q.id + '"]:checked'), function (i) { return i.value; });
    else if (q.type === "text" || q.type === "number") {
      var f = qcards.querySelector('[name="pk-' + q.id + '"]');
      var v = f ? String(f.value).trim().slice(0, 500) : "";
      if (v === "") delete answers[q.id]; else answers[q.id] = v;
    } else {
      var c = qcards.querySelector('input[name="pk-' + q.id + '"]:checked');
      if (c) answers[q.id] = c.value; else delete answers[q.id];
    }
    paintVisibility();
  }
  function paintVisibility() {
    var shown = 0;
    current.pack.questions.forEach(function (q) {
      var card = document.getElementById("pkq-" + q.id);
      var vis = E.visible(q, answers);
      if (card) card.hidden = !vis;
      if (vis) shown += 1;
    });
    var answered = current.pack.questions.filter(function (q) { return E.visible(q, answers) && answers[q.id] != null && answers[q.id] !== "" && !(Array.isArray(answers[q.id]) && !answers[q.id].length); }).length;
    document.getElementById("pack-count").textContent = answered + " of " + shown + " answered";
  }
  function run() {
    qcards.replaceChildren();
    var lastSection = null, n = 0;
    current.pack.questions.forEach(function (q) {
      if (q.section !== lastSection) { qcards.appendChild(el("h2", "qsection", q.section)); lastSection = q.section; }
      n += 1;
      var fs = el("fieldset", "qcard");
      fs.id = "pkq-" + q.id;
      var lg = el("legend");
      lg.append(el("span", "qnum", String(n)), document.createTextNode(" " + q.question + (q.required ? " *" : "")));
      fs.appendChild(lg);
      if (q.help) fs.appendChild(el("p", "help", q.help));
      if (q.type === "text" || q.type === "number") {
        var f = document.createElement("input");
        f.type = q.type === "number" ? "number" : "text"; f.name = "pk-" + q.id; f.maxLength = 500; f.autocomplete = "off";
        f.setAttribute("aria-label", q.question);
        f.addEventListener("input", function () { read(q); });
        fs.appendChild(f);
      } else fs.appendChild(optionInputs(q));
      qcards.appendChild(fs);
    });
    document.getElementById("pack-run-title").textContent = current.pack.name + " v" + current.pack.version;
    runCard.hidden = false;
    outEl.hidden = true; exportsEl.hidden = true;
    paintVisibility();
    runCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function gridRows(headers, rows) { return gridTable(headers, rows); }
  function results() {
    var model = E.reportModel(current.pack, answers, { sha256: current.sha256 });
    lastModel = model;
    var now = new Date();
    var generated = new Intl.DateTimeFormat("en-AU", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(now);
    var ref = "RPT-" + now.getFullYear() + String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0") + "-" + current.sha256.slice(0, 4).toUpperCase();
    var delivery = [];
    delivery.push(el("h3", "", "Findings and actions"));
    delivery.push(model.findings.length
      ? gridRows(["ID", "Severity", "Finding", "Action", "Owner", "Controls"], model.findings.map(function (f) { return [f.id, f.severity, f.finding, f.action, f.owner, f.controls.join(", ")]; }))
      : el("p", "means", "No gaps found in the answered questions."));
    delivery.push(el("h3", "", "Answers"));
    delivery.push(gridRows(["Question", "Section", "Answer", "Controls"], model.answers.map(function (a) { return [a.id, a.section, (a.gap ? "\u2715 " : "") + a.answer, a.controls.join(", ")]; })));
    delivery.push(el("h2", "", "For security architects: pattern match"));
    delivery.push(el("h3", "", "Controls with gaps"));
    delivery.push(model.controls.length ? gridRows(["Control", "Framework", "Questions"], model.controls.map(function (c) { return [c.control, c.framework, c.questions.join(", ")]; })) : el("p", "means", "No mapped controls have gaps."));
    if (model.patterns.length) {
      delivery.push(el("h3", "", "Patterns"));
      delivery.push(gridRows(["Pattern", "Questions"], model.patterns.map(function (p) { return [p.pattern, p.questions.join(", ")]; })));
    }
    var g = model.gapsBySeverity;
    buildRecord(outEl, {
      mode: "full",
      title: current.pack.name + " readiness report",
      ref: ref, version: reportVersion(), generated: generated, classification: reportClass(),
      fingerprint: "n/a", nextReview: nextReviewLabel(now), org: orgValue(),
      preparedFor: preparedForValue(), preparedByRole: preparedRoleValue(),
      verdict: model.verdict + (model.readiness == null ? "" : " \u00B7 readiness " + model.readiness + "%"),
      note: "Gaps: " + g.high + " high, " + g.medium + " medium, " + g.low + " low. Severity sets the verdict; weights set the readiness score.",
      glance: [
        { label: "Question pack", value: current.pack.name + " v" + current.pack.version },
        { label: "Top gap", value: model.findings[0] ? model.findings[0].finding : "None" },
        { label: "Owner of top gap", value: model.findings[0] ? (model.findings[0].owner || "Not set") : "\u2014" }
      ],
      asks: model.findings.slice(0, 3).map(function (f) { return [f.action, f.finding]; }),
      delivery: delivery, sources: false,
      extraControl: [
        { label: "Question pack", className: "doc-pack", value: current.pack.name },
        { label: "Pack version", className: "doc-pack-version", value: current.pack.version },
        { label: "Pack SHA-256", className: "doc-pack-sha", value: current.sha256 }
      ]
    });
    outEl.hidden = false; exportsEl.hidden = false;
    outEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function save(name, type, text) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }
  function slug() { return String(current.pack.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "pack"; }
  document.getElementById("pack-results").addEventListener("click", results);
  document.getElementById("pack-json").addEventListener("click", function () { if (lastModel) save(slug() + "-report.json", "application/json", JSON.stringify(lastModel, null, 2)); });
  document.getElementById("pack-md").addEventListener("click", function () { if (lastModel) save(slug() + "-report.md", "text/markdown", E.toMarkdown(lastModel)); });
  document.getElementById("pack-html").addEventListener("click", function () { if (lastModel) downloadReportHtml(slug() + "-report.html", current.pack.name + " readiness report", outEl); });

  // Self-hosters: set "questionPack" in /config.json to a same-site path to preload your pack.
  function fetchBytes(path) {
    return fetch(path, { credentials: "same-origin", cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); });
  }
  fetchBytes("/config.json").then(function (buf) {
    var cfg = JSON.parse(new TextDecoder().decode(buf));
    var p = cfg && typeof cfg.questionPack === "string" ? cfg.questionPack.trim() : "";
    if (!p || !/^\/[A-Za-z0-9._\/-]+\.(csv|json)$/.test(p) || p.indexOf("..") !== -1) return;
    var label = p === "/questions/default.csv" ? "Built-in pack" : "Your organisation's pack";
    return fetchBytes(p).then(function (b) { return loadBytes(new Uint8Array(b), p, label); });
  }).catch(function () { /* offline or no config: the upload button still works */ });
})();

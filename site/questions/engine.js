/* SafeBlueprint question-pack engine. Runs on the device only: no network, no eval. */
(function (root) {
  "use strict";
  var COLUMNS = ["id", "pack", "section", "order", "question", "help_text", "type", "options", "required", "weight", "risk_if", "severity", "maps_to_control", "pattern", "finding_text", "action_text", "owner_role", "show_if", "audience"];
  var REQUIRED_COLUMNS = ["id", "pack", "section", "question", "type"];
  var TYPES = ["yesno", "choice", "multi", "text", "number"];
  var SEVERITIES = ["low", "medium", "high"];
  var AUDIENCES = ["leaders", "delivery", "architects"];
  var YESNO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unsure", label: "Not sure" }];
  var ID_RE = /^[A-Za-z][A-Za-z0-9_.-]{0,39}$/;
  var CONTROL_RE = /^[A-Za-z][A-Za-z0-9.]*(?:-[A-Za-z0-9._]+)*$/;
  var PATTERN_RE = /^PAT-[0-9]{2,3}$/;
  var MAX_ROWS = 500;
  var MAX_CELL = 2000;

  function parseCsv(text) {
    var s = String(text == null ? "" : text);
    if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
    var rows = [], row = [], cell = "", i = 0, q = false, line = 1, rowLine = 1;
    while (i < s.length) {
      var c = s[i];
      if (q) {
        if (c === '"') {
          if (s[i + 1] === '"') { cell += '"'; i += 2; continue; }
          q = false; i += 1; continue;
        }
        if (c === "\n") line += 1;
        cell += c; i += 1; continue;
      }
      if (c === '"' && cell === "") { q = true; i += 1; continue; }
      if (c === ",") { row.push(cell); cell = ""; i += 1; continue; }
      if (c === "\r" || c === "\n") {
        row.push(cell); cell = "";
        rows.push({ line: rowLine, cells: row }); row = [];
        if (c === "\r" && s[i + 1] === "\n") i += 1;
        i += 1; line += 1; rowLine = line; continue;
      }
      cell += c; i += 1;
    }
    if (q) throw new PackError([{ line: rowLine, column: "", message: "A quoted cell is never closed. Check for a missing \" character." }]);
    if (cell !== "" || row.length) { row.push(cell); rows.push({ line: rowLine, cells: row }); }
    return rows.filter(function (r) { return r.cells.some(function (x) { return String(x).trim() !== ""; }); });
  }

  function PackError(errors) { this.name = "PackError"; this.errors = errors; this.message = errors.map(fmtError).join("\n"); }
  PackError.prototype = Object.create(Error.prototype);
  function fmtError(e) {
    var where = [];
    if (e.line) where.push("Row " + e.line);
    if (e.column) where.push("column \"" + e.column + "\"");
    return (where.length ? where.join(", ") + ": " : "") + e.message;
  }

  function splitPipe(v) {
    return String(v || "").split("|").map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function parseOptions(v) {
    return splitPipe(v).map(function (part) {
      var at = part.indexOf("=");
      if (at === -1) return { value: part, label: part };
      return { value: part.slice(0, at).trim(), label: part.slice(at + 1).trim() };
    });
  }
  function parseShowIf(v) {
    var text = String(v || "").trim();
    if (!text) return [];
    return text.split("&").map(function (clause) {
      var m = /^\s*([A-Za-z][A-Za-z0-9_.-]*)\s*(!=|=)\s*([^&]+?)\s*$/.exec(clause);
      if (!m) return { bad: clause.trim() };
      return { id: m[1], op: m[2], values: m[3].split("|").map(function (x) { return x.trim(); }) };
    });
  }

  function csvToPack(text, fileName) {
    var rows = parseCsv(text);
    var meta = { name: "", version: "" };
    while (rows.length && /^\s*#/.test(rows[0].cells[0] || "")) {
      var m = /^\s*#\s*(name|version)\s*:\s*(.*)$/i.exec(rows[0].cells.join(",").replace(/,+$/, ""));
      if (m) meta[m[1].toLowerCase()] = m[2].trim();
      rows.shift();
    }
    if (!rows.length) throw new PackError([{ line: 1, column: "", message: "The file has no header row. The first row must list the column names, starting with id." }]);
    var header = rows.shift();
    var names = header.cells.map(function (h) { return String(h).trim().toLowerCase(); });
    var errors = [];
    REQUIRED_COLUMNS.forEach(function (col) {
      if (names.indexOf(col) === -1) errors.push({ line: header.line, column: col, message: "This column is missing from the header row." });
    });
    names.forEach(function (n) {
      if (n && COLUMNS.indexOf(n) === -1) errors.push({ line: header.line, column: n, message: "Unknown column. Check the spelling (see docs/CUSTOMISING.md)." });
    });
    if (errors.length) throw new PackError(errors);
    var questions = rows.map(function (r) {
      var obj = { _line: r.line };
      names.forEach(function (n, idx) { if (n) obj[n] = r.cells[idx] == null ? "" : String(r.cells[idx]); });
      if (r.cells.length > names.length && r.cells.slice(names.length).some(function (x) { return String(x).trim(); })) obj._extra = true;
      return obj;
    });
    return normalise({ name: meta.name || baseName(fileName) || "Custom pack", version: meta.version || "1.0", questions: questions });
  }

  function jsonToPack(text, fileName) {
    var data;
    try { data = JSON.parse(String(text).replace(/^\uFEFF/, "")); }
    catch (e) { throw new PackError([{ line: 0, column: "", message: "This is not valid JSON: " + e.message }]); }
    if (Array.isArray(data)) data = { questions: data };
    if (!data || typeof data !== "object" || !Array.isArray(data.questions)) throw new PackError([{ line: 0, column: "questions", message: "A JSON pack needs a \"questions\" list." }]);
    var qs = data.questions.map(function (q, i) {
      var o = { _line: i + 1 };
      Object.keys(q || {}).forEach(function (k) {
        var v = q[k];
        if (k === "options" && Array.isArray(v)) v = v.map(function (x) { return typeof x === "string" ? x : x.value + "=" + x.label; }).join("|");
        else if (Array.isArray(v)) v = v.join("|");
        o[k] = v == null ? "" : String(v);
      });
      return o;
    });
    return normalise({ name: data.name || baseName(fileName) || "Custom pack", version: data.version || "1.0", questions: qs, _json: true });
  }

  function baseName(f) { return f ? String(f).replace(/^.*[\\/]/, "").replace(/\.(csv|json)$/i, "") : ""; }

  function normalise(raw) {
    var errors = [];
    var label = raw._json ? "Question " : "Row ";
    function err(q, col, msg) { errors.push({ line: q._line, column: col, message: msg, label: label }); }
    if (raw.questions.length > MAX_ROWS) errors.push({ line: 0, column: "", message: "Too many questions (" + raw.questions.length + "). The limit is " + MAX_ROWS + "." });
    var seen = {};
    var out = raw.questions.map(function (q, idx) {
      Object.keys(q).forEach(function (k) {
        if (k[0] !== "_" && String(q[k]).length > MAX_CELL) err(q, k, "This cell is longer than " + MAX_CELL + " characters.");
        if (k[0] !== "_" && COLUMNS.indexOf(k) === -1) err(q, k, "Unknown field.");
      });
      if (q._extra) err(q, "", "This row has more cells than the header. A comma in text needs the cell wrapped in double quotes.");
      var id = String(q.id || "").trim();
      if (!id) err(q, "id", "Every question needs an id, for example Q01.");
      else if (!ID_RE.test(id)) err(q, "id", "\"" + id + "\" is not a valid id. Use letters, numbers, - _ or . and start with a letter.");
      else if (seen[id]) err(q, "id", "\"" + id + "\" is used twice. Each id must be unique.");
      seen[id] = true;
      var type = String(q.type || "").trim().toLowerCase();
      if (TYPES.indexOf(type) === -1) err(q, "type", "\"" + (q.type || "") + "\" is not a type. Use one of: " + TYPES.join(", ") + ".");
      if (!String(q.pack || "").trim()) err(q, "pack", "Name the pack this question belongs to.");
      if (!String(q.section || "").trim()) err(q, "section", "Name the section, for example Data.");
      if (!String(q.question || "").trim()) err(q, "question", "The question text is empty.");
      var options = type === "yesno" ? (String(q.options || "").trim() ? parseOptions(q.options) : YESNO.slice()) : parseOptions(q.options);
      if ((type === "choice" || type === "multi") && options.length < 2) err(q, "options", "A " + type + " question needs at least two options, like yes=Yes|no=No.");
      var vals = {};
      options.forEach(function (o) {
        if (!o.value) err(q, "options", "An option has no value before the = sign.");
        if (vals[o.value]) err(q, "options", "Option value \"" + o.value + "\" appears twice.");
        vals[o.value] = true;
      });
      var order = String(q.order || "").trim();
      if (order && !/^-?[0-9]+(\.[0-9]+)?$/.test(order)) err(q, "order", "\"" + order + "\" is not a number.");
      var reqText = String(q.required || "").trim().toLowerCase();
      if (reqText && ["true", "false", "yes", "no"].indexOf(reqText) === -1) err(q, "required", "Use true or false.");
      var wText = String(q.weight == null ? "" : q.weight).trim();
      var weight = wText === "" ? 1 : Number(wText);
      if (wText !== "" && (!/^[0-9]+(\.[0-9]+)?$/.test(wText) || weight < 0 || weight > 10)) err(q, "weight", "Weight must be a number from 0 to 10.");
      var risk = splitPipe(q.risk_if);
      risk.forEach(function (v) {
        if (type === "number") { if (!/^[<>]=?-?[0-9.]+$/.test(v)) err(q, "risk_if", "For a number question use a comparison like <3 or >=10."); }
        else if (type === "text") err(q, "risk_if", "Text questions cannot have risk_if. Leave it blank.");
        else if (!vals[v]) err(q, "risk_if", "\"" + v + "\" is not one of this question's option values (" + options.map(function (o) { return o.value; }).join(", ") + ").");
      });
      var sev = String(q.severity || "").trim().toLowerCase();
      if (sev && SEVERITIES.indexOf(sev) === -1) err(q, "severity", "Use low, medium or high.");
      if (risk.length && !sev) sev = "medium";
      var controls = splitPipe(q.maps_to_control);
      controls.forEach(function (c) { if (!CONTROL_RE.test(c)) err(q, "maps_to_control", "\"" + c + "\" is not a control ID. Use PREFIX-ID, for example OWASP-LLM01 or ACME-POL-07."); });
      var pattern = String(q.pattern || "").trim();
      if (pattern && !PATTERN_RE.test(pattern)) err(q, "pattern", "Use PAT- and two digits, for example PAT-03.");
      var aud = String(q.audience || "").trim().toLowerCase();
      if (aud && AUDIENCES.indexOf(aud) === -1) err(q, "audience", "Use leaders, delivery or architects.");
      var cond = parseShowIf(q.show_if);
      cond.forEach(function (c) { if (c.bad != null) err(q, "show_if", "\"" + c.bad + "\" is not a condition. Use ID=value, ID!=value or ID=a|b, joined with &."); });
      return {
        id: id, pack: String(q.pack || "").trim(), section: String(q.section || "").trim(),
        order: order === "" ? idx + 1 : Number(order), question: String(q.question || "").trim(),
        help: String(q.help_text || "").trim(), type: type, options: (type === "text" || type === "number") ? [] : options,
        required: reqText === "true" || reqText === "yes", weight: weight, risk_if: risk, severity: sev,
        controls: controls, pattern: pattern, finding: String(q.finding_text || "").trim(),
        action: String(q.action_text || "").trim(), owner: String(q.owner_role || "").trim(),
        show_if: cond, audience: aud || "delivery", _line: q._line
      };
    });
    out.forEach(function (q) {
      q.show_if.forEach(function (c) {
        if (c.id && !seen[c.id]) errors.push({ line: q._line, column: "show_if", message: "show_if refers to \"" + c.id + "\", which is not an id in this pack.", label: label });
      });
    });
    if (!out.length) errors.push({ line: 0, column: "", message: "The pack has no questions." });
    if (errors.length) throw new PackError(errors);
    out.sort(function (a, b) { return a.order - b.order; });
    return { name: String(raw.name).slice(0, 120), version: String(raw.version).slice(0, 40), questions: out };
  }

  function loadPack(text, fileName) {
    var t = String(text || "").replace(/^\uFEFF/, "").trim();
    var isJson = /\.json$/i.test(fileName || "") || t[0] === "{" || t[0] === "[";
    return isJson ? jsonToPack(text, fileName) : csvToPack(text, fileName);
  }

  function visible(q, answers) {
    return q.show_if.every(function (c) {
      var a = answers[c.id];
      var list = Array.isArray(a) ? a.map(String) : (a == null ? [] : [String(a)]);
      var hit = c.values.some(function (v) { return list.indexOf(v) !== -1; });
      return c.op === "=" ? hit : !hit;
    });
  }
  function isAnswered(a) { return !(a == null || a === "" || (Array.isArray(a) && !a.length)); }
  function isGap(q, a) {
    if (!q.risk_if.length || !isAnswered(a)) return false;
    if (q.type === "number") {
      var n = Number(a);
      return q.risk_if.some(function (r) {
        var m = /^([<>]=?)(-?[0-9.]+)$/.exec(r);
        var x = Number(m[2]);
        return m[1] === "<" ? n < x : m[1] === "<=" ? n <= x : m[1] === ">" ? n > x : n >= x;
      });
    }
    var list = Array.isArray(a) ? a.map(String) : [String(a)];
    return list.some(function (v) { return q.risk_if.indexOf(v) !== -1; });
  }
  function optionLabel(q, a) {
    if (!isAnswered(a)) return "Not answered";
    var list = Array.isArray(a) ? a : [a];
    return list.map(function (v) {
      var hit = q.options.filter(function (o) { return o.value === String(v); })[0];
      return hit ? hit.label : String(v);
    }).join(", ");
  }

  function score(pack, answers, packId) {
    answers = answers || {};
    var qs = pack.questions.filter(function (q) { return (!packId || q.pack === packId) && visible(q, answers); });
    var scored = qs.filter(function (q) { return q.weight > 0 && q.risk_if.length; });
    var answeredW = 0, okW = 0, totalW = 0;
    var gaps = [], missingRequired = [];
    scored.forEach(function (q) {
      totalW += q.weight;
      var a = answers[q.id];
      if (!isAnswered(a)) return;
      answeredW += q.weight;
      if (isGap(q, a)) gaps.push(q); else okW += q.weight;
    });
    qs.forEach(function (q) { if (q.required && !isAnswered(answers[q.id])) missingRequired.push(q); });
    var readiness = answeredW ? Math.round(100 * okW / answeredW) : null;
    var bySev = { high: 0, medium: 0, low: 0 };
    gaps.forEach(function (q) { bySev[q.severity] += 1; });
    var verdict;
    if (missingRequired.length || (totalW && answeredW / totalW < 0.5)) verdict = "Not enough answers";
    else if (bySev.high) verdict = "Not ready";
    else if (bySev.medium) verdict = "Partly ready";
    else verdict = "Ready";
    var rank = { high: 0, medium: 1, low: 2 };
    gaps.sort(function (a, b) { return rank[a.severity] - rank[b.severity] || b.weight - a.weight; });
    return { readiness: readiness, verdict: verdict, gaps: gaps, bySeverity: bySev, visible: qs, missingRequired: missingRequired, answeredWeight: answeredW, totalWeight: totalW };
  }

  function reportModel(pack, answers, meta) {
    var s = score(pack, answers);
    var controls = {};
    s.gaps.forEach(function (q) { q.controls.forEach(function (c) { (controls[c] = controls[c] || []).push(q.id); }); });
    var patterns = {};
    s.visible.forEach(function (q) { if (q.pattern) (patterns[q.pattern] = patterns[q.pattern] || []).push(q.id); });
    return {
      pack: { name: pack.name, version: pack.version, sha256: (meta && meta.sha256) || "" },
      verdict: s.verdict, readiness: s.readiness, gapsBySeverity: s.bySeverity,
      findings: s.gaps.map(function (q, i) {
        return { id: "ACT-" + String(i + 1).padStart(2, "0"), question: q.id, severity: q.severity, finding: q.finding || ("Gap: " + q.question), action: q.action || "Review and close this gap.", owner: q.owner || "", controls: q.controls, pattern: q.pattern, audience: q.audience };
      }),
      answers: s.visible.map(function (q) { return { id: q.id, section: q.section, question: q.question, answer: optionLabel(q, answers[q.id]), gap: isGap(q, answers[q.id]), controls: q.controls }; }),
      controls: Object.keys(controls).sort().map(function (c) { return { control: c, framework: c.split("-")[0], questions: controls[c] }; }),
      patterns: Object.keys(patterns).sort().map(function (p) { return { pattern: p, questions: patterns[p] }; }),
      missingRequired: s.missingRequired.map(function (q) { return q.id; })
    };
  }

  function mdCell(v) { return String(v == null ? "" : v).replace(/\|/g, "\\|").replace(/[\r\n]+/g, " "); }
  function toMarkdown(model) {
    var L = [];
    L.push("# " + mdCell(model.pack.name) + " readiness report", "");
    L.push("Pack: " + mdCell(model.pack.name) + " v" + mdCell(model.pack.version) + (model.pack.sha256 ? " (SHA-256 " + model.pack.sha256 + ")" : ""), "");
    L.push("## A. For leaders", "", "**Verdict:** " + model.verdict + (model.readiness == null ? "" : " (readiness " + model.readiness + "%)"), "");
    L.push("Gaps: " + model.gapsBySeverity.high + " high, " + model.gapsBySeverity.medium + " medium, " + model.gapsBySeverity.low + " low.", "");
    L.push("## B. For the delivery team", "", "| ID | Severity | Finding | Action | Owner | Controls |", "|---|---|---|---|---|---|");
    model.findings.forEach(function (f) { L.push("| " + [f.id, f.severity, f.finding, f.action, f.owner, f.controls.join(", ")].map(mdCell).join(" | ") + " |"); });
    if (!model.findings.length) L.push("| - | - | No gaps found | - | - | - |");
    L.push("", "## C. For security architects: pattern match", "", "| Control | Framework | Questions |", "|---|---|---|");
    model.controls.forEach(function (c) { L.push("| " + [c.control, c.framework, c.questions.join(", ")].map(mdCell).join(" | ") + " |"); });
    if (model.patterns.length) { L.push("", "Patterns: " + model.patterns.map(function (p) { return p.pattern + " (" + p.questions.join(", ") + ")"; }).join("; ")); }
    L.push("", "_General guidance only, not legal advice._", "");
    return L.join("\n");
  }

  var api = { COLUMNS: COLUMNS, TYPES: TYPES, SEVERITIES: SEVERITIES, AUDIENCES: AUDIENCES, parseCsv: parseCsv, loadPack: loadPack, csvToPack: csvToPack, jsonToPack: jsonToPack, PackError: PackError, formatError: fmtError, visible: visible, isGap: isGap, score: score, reportModel: reportModel, toMarkdown: toMarkdown, optionLabel: optionLabel };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SBQ = api;
})(this);

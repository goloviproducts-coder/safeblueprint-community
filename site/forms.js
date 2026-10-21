var FORM_OPENED_AT = Date.now();
var ACTIVATION_MESSAGE = "Contact form is being activated, please try again shortly";
var WAIT_MESSAGE = "Please wait a moment and try again.";
var SHORTEN_MESSAGE = "Please shorten that and try again.";

function endpointReady() {
  return String(FORM_ENDPOINT || "").trim() === "/api/contact";
}
function tooFast() {
  return Date.now() - FORM_OPENED_AT < 3000;
}
function rawClean(value) {
  return String(value == null ? "" : value).replace(/[\u0000-\u001F\u007F]/g, "");
}
function cleanText(value, max) {
  var s = rawClean(value);
  if (max != null && s.length > max) s = s.slice(0, max);
  return s;
}
function withinLimit(value, max) {
  return rawClean(value).length <= max;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function formulaSafe(value) {
  var s = String(value == null ? "" : value);
  if (/^[=+\-@\t\r]/.test(s)) return "'" + s;
  return s;
}
function tsvCell(value) {
  return formulaSafe(value).replace(/[\t\r\n]+/g, " ");
}
function csvCell(value) {
  var s = formulaSafe(value);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function orgValue() {
  var input = document.getElementById("org-name");
  return cleanText(input ? input.value : "", 120).trim();
}
function preparedForValue() {
  var input = document.getElementById("prepared-for");
  return cleanText(input ? input.value : "", 120).trim();
}
function preparedRoleValue() {
  var input = document.getElementById("prepared-role");
  var value = cleanText(input ? input.value : "", 40).trim();
  var allowed = ["Developer", "Product owner", "Solution architect", "Security architect", "Other"];
  return allowed.indexOf(value) === -1 ? "" : value;
}
function statusMark(label) {
  if (label === "Yes" || label === "Met") return "✓ " + label;
  if (label === "No" || label === "Gap") return "✕ " + label;
  if (label === "Not sure" || label === "Unknown") return "? " + label;
  return label;
}
function reportVersion() {
  var input = document.getElementById("doc-version");
  var value = cleanText(input ? input.value : "", 20).trim();
  return value || "1.0";
}
function reportClass() {
  var input = document.querySelector('input[name="doc-class"]:checked');
  return input && input.value === "Confidential" ? "Confidential" : "Internal";
}
function reportMode() {
  var input = document.querySelector('input[name="report-mode"]:checked');
  return input && input.value === "full" ? "full" : "summary";
}
function nextReviewLabel(from) {
  var d = new Date(from.getTime());
  var day = d.getDate();
  d.setMonth(d.getMonth() + 12);
  if (d.getDate() !== day) d.setDate(0);
  return new Intl.DateTimeFormat("en-AU", { year: "numeric", month: "short", day: "numeric" }).format(d);
}
function answerFingerprint(pairs) {
  var json = JSON.stringify((pairs || []).map(function (pair) {
    return { id: String(pair.id), value: String(pair.value) };
  }));
  if (!window.crypto || !crypto.subtle || !window.TextEncoder) return Promise.resolve("unavailable");
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(json)).then(function (buf) {
    var bytes = new Uint8Array(buf);
    var hex = "";
    for (var i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
    return hex.slice(0, 16);
  }, function () { return "unavailable"; });
}
var POWERED_BY = "Powered by SafeBlueprint 2026";
var REPORT_DISCLAIMER = "General guidance only, not legal or compliance advice. No guarantee of any audit outcome. The content of this report belongs to the user.";
var OFFICIAL_SOURCES = [
  ["OAIC fact sheet, APP 1.7–1.9", "https://www.oaic.gov.au/__data/assets/pdf_file/0021/269013/APP-1.7-1.9-Transparency-Obligation-Fact-Sheet.PDF"],
  ["OAIC APP Guidelines, Chapter 1", "https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-1-app-1-open-and-transparent-management-of-personal-information"],
  ["Guidance for AI Adoption (October 2025)", "https://www.ai.gov.au/staying-safe-and-responsible/essential-ai-practices/guidance-ai-adoption-implementation-guidance"],
  ["NIST AI Risk Management Framework 1.0", "https://www.nist.gov/itl/ai-risk-management-framework"],
  ["ISO/IEC 42001:2023", "https://www.iso.org/standard/81230.html"],
  ["Regulation (EU) 2024/1689", "http://data.europa.eu/eli/reg/2024/1689/oj"],
  ["Regulation (EU) 2026/1744", "https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng"]
];
function node(tag, className, text) {
  var el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}
function labelledTable(fields) {
  var table = node("table", "doc-control");
  var body = document.createElement("tbody");
  fields.forEach(function (field) {
    var tr = document.createElement("tr");
    var th = document.createElement("th");
    th.scope = "row";
    th.textContent = field.label;
    var td = node("td", field.className || "", field.line ? "" : (field.value || ""));
    if (field.line) td.className = ((field.className || "") + " write-line").trim();
    if (field.savedOnly) tr.classList.add("saved-only");
    tr.append(th, td);
    body.append(tr);
  });
  table.append(body);
  return table;
}
function gridTable(headers, rows) {
  var table = document.createElement("table");
  var thead = document.createElement("thead");
  var hr = document.createElement("tr");
  headers.forEach(function (header) {
    var th = document.createElement("th");
    th.scope = "col";
    th.textContent = header;
    hr.append(th);
  });
  thead.append(hr);
  var tbody = document.createElement("tbody");
  rows.forEach(function (row) {
    var tr = document.createElement("tr");
    row.forEach(function (cell) {
      var text = cell == null ? "" : String(cell);
      var stay = /^(?:DEC|ACT|SB|PAT|ADM|AIS|RPT)-[A-Z0-9-]+$/.test(text) || text === "✓" || text === "✕" || text === "?" || (/^[✓✕?] /.test(text) && text.length < 24) || (text.length > 0 && text.length <= 22);
      tr.append(node("td", stay ? "stay" : "", text));
    });
    tbody.append(tr);
  });
  table.append(thead, tbody);
  return table;
}
function signoffTable() {
  var table = node("table", "signoff");
  var thead = document.createElement("thead");
  thead.innerHTML = "<tr><th scope=\"col\">Name</th><th scope=\"col\">Role</th><th scope=\"col\">Signature</th><th scope=\"col\">Date</th></tr>";
  var tbody = document.createElement("tbody");
  ["Owner", "Approver"].forEach(function (role) {
    var tr = document.createElement("tr");
    tr.append(node("td", "write-line", ""));
    tr.append(node("td", "", role));
    tr.append(node("td", "write-line", ""));
    tr.append(node("td", "write-line", ""));
    tbody.append(tr);
  });
  table.append(thead, tbody);
  return table;
}
function numberHeads(nodes, start) {
  var n = start;
  nodes.forEach(function (el) {
    if (el.tagName === "H3") {
      el.textContent = n + ". " + el.textContent;
      n += 1;
    }
  });
  return n;
}
function closeBlock() {
  var close = node("div", "report-close-block");
  close.appendChild(node("p", "report-foot", POWERED_BY));
  close.appendChild(node("p", "report-close", REPORT_DISCLAIMER));
  return close;
}
function controlFields(spec) {
  var fields = [
    { label: "Reference", className: "doc-ref", value: spec.ref, savedOnly: true },
    { label: "Version", className: "doc-version", value: spec.version },
    { label: "Generated", className: "doc-time", value: spec.generated, savedOnly: true },
    { label: "Classification", className: "doc-class", value: spec.classification },
    { label: "Answer fingerprint", className: "doc-fp", value: spec.fingerprint }
  ];
  if (spec.preparedFor) fields.push({ label: "Prepared for", className: "doc-prepared-for", value: spec.preparedFor, savedOnly: true });
  if (spec.preparedByRole) fields.push({ label: "Prepared by role", className: "doc-prepared-role", value: spec.preparedByRole, savedOnly: true });
  fields.push(
    { label: "Prepared by", line: true },
    { label: "Reviewed by", line: true },
    { label: "Approved by", line: true },
    { label: "Next review", className: "doc-next", value: spec.nextReview }
  );
  if (spec.extraControl && spec.extraControl.length) fields.splice.apply(fields, [5, 0].concat(spec.extraControl));
  return fields;
}
function buildRecord(root, spec) {
  var full = spec.mode === "full";
  root.classList.add("record");
  root.classList.toggle("mode-full", full);
  root.classList.toggle("mode-summary", !full);
  root.replaceChildren();
  var page = node("section", full ? "page-one breaks" : "page-one");
  page.appendChild(node("h2", "doc-title", spec.title));
  page.appendChild(node("p", "part-label", "For leaders"));
  var hold = node("p", "sheet-meta doc-ref ref-hold", spec.ref || "");
  page.appendChild(hold);
  if (spec.initiative) {
    var about = node("p", "brief-name", "");
    about.appendChild(document.createTextNode(spec.nameLead || "Decision: "));
    about.appendChild(node("span", "user-text", spec.initiative));
    page.appendChild(about);
  }
  if (spec.group) {
    var groupLine = node("p", "brief-group", "");
    groupLine.appendChild(document.createTextNode("Initiative: "));
    groupLine.appendChild(node("span", "user-text", spec.group));
    page.appendChild(groupLine);
  }
  if (spec.org) {
    var org = node("p", "brief-org", "");
    org.appendChild(document.createTextNode("Organisation: "));
    org.appendChild(node("span", "doc-org", spec.org));
    page.appendChild(org);
  }
  if (spec.preparedFor || spec.preparedByRole) {
    var who = [];
    if (spec.preparedFor) who.push("Prepared for: " + spec.preparedFor + ".");
    if (spec.preparedByRole) who.push("Prepared by: " + spec.preparedByRole + ".");
    page.appendChild(node("p", "audience saved-only", who.join(" ")));
  }
  var verdict = node("p", "verdict", spec.verdict);
  if (spec.verdictId) verdict.id = spec.verdictId;
  page.appendChild(verdict);
  if (spec.note) page.appendChild(node("p", "means", spec.note));
  if (spec.glance && spec.glance.length) {
    page.appendChild(node("h3", "", "At a glance"));
    page.appendChild(labelledTable(spec.glance));
  }
  if (spec.portfolio) page.appendChild(spec.portfolio);
  if (spec.asks && spec.asks.length) {
    page.appendChild(node("h3", "", "What we need from you"));
    page.appendChild(gridTable(["Ask", "Why"], spec.asks));
  }
  if (spec.actionsHtml) {
    var actions = node("div", "actions");
    actions.innerHTML = spec.actionsHtml;
    page.appendChild(actions);
  }
  if (spec.middle) page.appendChild(spec.middle);
  if (spec.risk && spec.risk.length) {
    page.appendChild(node("h3", "", "Risk if we do nothing"));
    spec.risk.forEach(function (line) { page.appendChild(node("p", "means", line)); });
  }
  if (!full) page.appendChild(closeBlock());
  root.appendChild(page);
  if (full) {
    var rest = node("section", "page-rest");
    rest.appendChild(node("h2", "", "For the delivery team"));
    (spec.delivery || []).forEach(function (el) { rest.appendChild(el); });
    if (spec.patternsNode) rest.appendChild(spec.patternsNode);
    if (spec.sources !== false) {
      rest.appendChild(node("h3", "", spec.sourcesHeading || "Sources"));
      rest.appendChild(node("p", "means", "Official sources for the references above."));
      rest.appendChild(gridTable(["Source", "Reference"], OFFICIAL_SOURCES.concat(spec.extraSources || [])));
    }
    root.appendChild(rest);
    var last = node("section", "page-last");
    last.appendChild(node("h2", "", "Document control"));
    last.appendChild(labelledTable(controlFields(spec)));
    last.appendChild(node("h3", "", "Sign-off"));
    last.appendChild(signoffTable());
    last.appendChild(closeBlock());
    root.appendChild(last);
  }
  syncPrintFooter(root);
}
function footerCss(ref, classification) {
  var safeRef = String(ref || "").replace(/["\\\r\n]/g, "").slice(0, 80);
  var safeClass = classification === "Confidential" ? "Confidential" : "Internal";
  var block = "size:A4 portrait;margin:16mm 16mm 18mm 16mm;@bottom-center{content:\"" + safeRef + " · " + safeClass + " · Page \" counter(page) \" of \" counter(pages);font-family:Georgia,'DejaVu Sans',sans-serif;font-size:9pt;color:#333;}";
  return "@page{" + block + "}@page adm{" + block + "}@page ai{" + block + "}";
}
var printSheetUrl = "";
var printSheetWaiters = [];
function applyPrintFooter(ref, classification) {
  var css = footerCss(ref, classification);
  var blob = new Blob([css], { type: "text/css" });
  var url = URL.createObjectURL(blob);
  var link = document.getElementById("print-footer-style");
  if (!link) {
    link = document.createElement("link");
    link.id = "print-footer-style";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  var previous = printSheetUrl;
  printSheetUrl = url;
  return new Promise(function (resolve) {
    printSheetWaiters.push(resolve);
    link.onload = link.onerror = function () {
      var waiting = printSheetWaiters.splice(0);
      waiting.forEach(function (fn) { fn(); });
    };
    link.href = url;
    if (previous) URL.revokeObjectURL(previous);
  });
}
function syncPrintFooter(explicit) {
  var mode = document.body.dataset.print;
  var root = explicit || (mode === "register" ? document.getElementById("register-sheet")
    : mode === "ai" ? document.getElementById("ai-report")
    : document.getElementById("adm-sheet") || document.getElementById("ai-report"));
  if (!root) return Promise.resolve();
  var ref = root.querySelector(".doc-ref");
  var klass = root.querySelector(".doc-class");
  return applyPrintFooter(ref ? ref.textContent : "", klass ? klass.textContent : reportClass());
}
function bindReportChrome(onChange) {
  var version = document.getElementById("doc-version");
  if (version) {
    version.maxLength = 20;
    version.addEventListener("input", function () {
      var next = cleanText(version.value, 20);
      if (next !== version.value) version.value = next;
      if (onChange) onChange();
    });
  }
  document.querySelectorAll('input[name="report-mode"], input[name="doc-class"]').forEach(function (input) {
    input.addEventListener("change", function () { if (onChange) onChange(); });
  });
  ["prepared-for", "prepared-role"].forEach(function (id) {
    var field = document.getElementById(id);
    if (!field) return;
    field.addEventListener("input", function () { if (onChange) onChange(); });
    field.addEventListener("change", function () { if (onChange) onChange(); });
  });
  if (window.MutationObserver) {
    new MutationObserver(function () { syncPrintFooter(); }).observe(document.body, { attributes: true, attributeFilter: ["data-print"] });
  }
}
function bindOrg() {
  var input = document.getElementById("org-name");
  if (!input) return;
  input.maxLength = 120;
  input.addEventListener("input", function () {
    var next = cleanText(input.value, 120);
    if (next !== input.value) input.value = next;
    document.querySelectorAll(".doc-org").forEach(function (el) { el.textContent = orgValue(); });
  });
}
var REPORT_DOWNLOAD_CSS = "body{font-family:Georgia,'Iowan Old Style',Palatino,'Times New Roman',serif;color:#1a1a1a;margin:0;font-size:11pt;line-height:1.5}h2{font-size:16pt;font-weight:600;margin:0 0 10px}h3{font-size:13pt;font-weight:600;margin:16px 0 6px}p{margin:0 0 .45em}.verdict{font-size:16pt;font-weight:700;line-height:1.35}table{width:100%;border-collapse:collapse;margin:0 0 8px}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top;background:#fff}th{font-weight:600;white-space:nowrap;background:#fff}td.stay{white-space:nowrap}tbody tr:nth-child(even) td{background:#f3f3f3}.plain-box{border:1px solid #ccc;background:#f3f3f3;padding:8px 10px;margin:0 0 10px}.part-label{font-size:13pt;font-weight:700}.report-foot,.report-close{color:#333;font-size:9pt;margin:12px 0 0}.write-line{border-bottom:1px solid #1a1a1a}.saved-only{display:block}tr.saved-only{display:table-row}.ref-hold{display:block}.page-one.breaks{break-after:page;page-break-after:always}.page-last{break-before:page;page-break-before:always}";
function downloadReportHtml(filename, title, root) {
  var ref = root.querySelector(".doc-ref");
  var klass = root.querySelector(".doc-class");
  var style = REPORT_DOWNLOAD_CSS + footerCss(ref ? ref.textContent : "", klass ? klass.textContent : "Internal");
  var doc = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>" + esc(title) + "</title><style>" + style + "</style></head><body>" + root.innerHTML + "</body></html>";
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
function formatSend(body) {
  var lines = ["Email: " + body.email, "Consent: " + body.consent, "Tool: " + body.tool, "Subject: " + body._subject];
  if (Object.prototype.hasOwnProperty.call(body, "results")) lines.push("Results: " + body.results);
  return lines.join("\n");
}
function showStaticThanks(form, lead, rest) {
  form.replaceChildren();
  var p = document.createElement("p");
  var b = document.createElement("b");
  b.textContent = lead;
  p.appendChild(b);
  if (rest) p.appendChild(document.createTextNode(rest));
  form.appendChild(p);
}
var refreshers = {};
function refreshPlaybook(which) { if (refreshers[which]) refreshers[which](); }
window.refreshPlaybook = refreshPlaybook;
function bindPlaybook(form) {
  var key = form.getAttribute("data-summary");
  var consent = form.querySelector('[name="consent"]');
  var include = form.querySelector('[name="include"]');
  var email = form.querySelector('[name="email"]');
  var honey = form.querySelector('[name="_honey"]');
  var button = form.querySelector('button[type="submit"]');
  var preview = form.querySelector(".send-preview");
  var status = form.querySelector(".status");
  email.maxLength = 160;
  function currentBody() {
    var body = {
      email: cleanText(email.value, 160).trim(),
      consent: "yes",
      tool: form.getAttribute("data-tool"),
      _subject: "SafeBlueprint playbook request",
      _template: "table",
      _captcha: "false",
      _honey: ""
    };
    if (include.checked) body.results = summaries[key];
    return body;
  }
  function offlineNow() { return navigator.onLine === false; }
  function refresh() {
    if (offlineNow()) {
      button.disabled = true;
      status.textContent = "You're offline. Sending needs a connection.";
      return;
    }
    if (status.textContent === "You're offline. Sending needs a connection.") status.textContent = "";
    if (!endpointReady()) {
      button.disabled = true;
      status.textContent = ACTIVATION_MESSAGE;
      preview.textContent = consent.checked ? formatSend(currentBody()) : "Nothing is sent until you tick consent.";
      return;
    }
    if (status.textContent === ACTIVATION_MESSAGE) status.textContent = "";
    button.disabled = !consent.checked;
    preview.textContent = consent.checked ? formatSend(currentBody()) : "Nothing is sent until you tick consent.";
  }
  consent.addEventListener("change", refresh);
  include.addEventListener("change", refresh);
  email.addEventListener("input", function () {
    var next = cleanText(email.value, 160);
    if (next !== email.value) email.value = next;
    refresh();
  });
  window.addEventListener("offline", refresh);
  window.addEventListener("online", refresh);
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (offlineNow()) {
      refresh();
      return;
    }
    if (!consent.checked) return;
    if (String(honey.value || "").trim()) {
      showStaticThanks(form, "Thanks!", "");
      return;
    }
    if (!withinLimit(email.value, 160)) {
      status.textContent = SHORTEN_MESSAGE;
      return;
    }
    var body = currentBody();
    if (!include.checked) delete body.results;
    preview.textContent = formatSend(body);
    if (!body.email) return;
    if (!endpointReady()) {
      status.textContent = ACTIVATION_MESSAGE;
      button.disabled = true;
      return;
    }
    if (tooFast()) {
      status.textContent = WAIT_MESSAGE;
      return;
    }
    button.disabled = true;
    status.textContent = "";
    try {
      var response = await fetch(String(FORM_ENDPOINT).trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body)
      });
      var payload = await response.json().catch(function () { return {}; });
      if (response.status === 503) {
        status.textContent = ACTIVATION_MESSAGE;
        button.disabled = !consent.checked;
        return;
      }
      if (payload && payload.success === "true") {
        showStaticThanks(form, "Thanks!", " We'll email the playbook to that address.");
        return;
      }
      status.textContent = "Thanks for trying. That request did not go through. Please try again in a minute.";
    } catch (err) {
      status.textContent = offlineNow()
        ? "You're offline. Sending needs a connection."
        : "Thanks for trying. The request could not be reached. Please try again in a minute.";
    }
    refresh();
  });
  refreshers[key] = refresh;
  refresh();
}

var form = document.getElementById("contact-form");
var consent = document.getElementById("c-consent");
var button = document.getElementById("c-submit");
var FIELDS = [
  ["c-name", 120],
  ["c-email", 160],
  ["c-company", 160],
  ["c-role", 120],
  ["c-message", 2000]
];

function fieldValue(id, max) {
  return cleanText(document.getElementById(id).value, max).trim();
}
function bindLimits() {
  FIELDS.forEach(function (pair) {
    var el = document.getElementById(pair[0]);
    if (!el) return;
    el.maxLength = pair[1];
    el.addEventListener("input", function () {
      var next = cleanText(el.value, pair[1]);
      if (next !== el.value) el.value = next;
    });
  });
}
function offlineNow() { return navigator.onLine === false; }
function overLimit() {
  for (var i = 0; i < FIELDS.length; i++) {
    var el = document.getElementById(FIELDS[i][0]);
    if (!withinLimit(el.value, FIELDS[i][1])) return true;
  }
  return false;
}
function showThanks(lead, rest) {
  form.replaceChildren();
  var p = document.createElement("p");
  var b = document.createElement("b");
  b.textContent = lead;
  p.appendChild(b);
  if (rest) p.appendChild(document.createTextNode(rest));
  form.appendChild(p);
}
function refreshContact() {
  var status = document.getElementById("c-status");
  if (!status || !button) return;
  if (offlineNow()) {
    button.disabled = true;
    status.textContent = "You're offline. Sending needs a connection.";
    return;
  }
  if (status.textContent === "You're offline. Sending needs a connection.") status.textContent = "";
  if (!endpointReady()) {
    button.disabled = true;
    status.textContent = ACTIVATION_MESSAGE;
    return;
  }
  if (status.textContent === ACTIVATION_MESSAGE) status.textContent = "";
  button.disabled = !consent.checked;
}
bindLimits();
consent.addEventListener("change", refreshContact);
window.addEventListener("offline", refreshContact);
window.addEventListener("online", refreshContact);
refreshContact();
form.addEventListener("submit", async function (event) {
  event.preventDefault();
  if (offlineNow()) {
    refreshContact();
    return;
  }
  if (!consent.checked) return;
  var honey = form.querySelector('[name="_honey"]');
  if (String(honey.value || "").trim()) {
    showThanks("Thanks.", " We have your note.");
    return;
  }
  var status = document.getElementById("c-status");
  if (overLimit()) {
    status.textContent = SHORTEN_MESSAGE;
    return;
  }
  var body = {
    name: fieldValue("c-name", 120),
    email: fieldValue("c-email", 160),
    company: fieldValue("c-company", 160),
    role: fieldValue("c-role", 120),
    size: document.getElementById("c-size").value,
    need: document.getElementById("c-need").value,
    message: fieldValue("c-message", 2000),
    consent: "yes",
    _subject: "SafeBlueprint contact",
    _template: "table",
    _captcha: "false",
    _honey: ""
  };
  if (!body.name || !body.email || !body.company || !body.role || !body.size || !body.need || !body.message) return;
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
      showThanks("Thanks.", " We'll reply to that work email. This form did not include any checklist or inventory answers.");
      return;
    }
    status.textContent = "Thanks for trying. That request did not go through. Please try again in a minute.";
  } catch (err) {
    status.textContent = offlineNow()
      ? "You're offline. Sending needs a connection."
      : "Thanks for trying. The request could not be reached. Please try again in a minute.";
  }
  refreshContact();
});

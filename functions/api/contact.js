var LIMITS = {
  name: 120,
  email: 160,
  company: 160,
  role: 120,
  size: 40,
  need: 80,
  message: 2000,
  consent: 8,
  tool: 80,
  results: 4000,
  _subject: 120,
  _template: 20,
  _captcha: 10,
  _honey: 200
};
var SIZES = ["1–10", "11–50", "51–200", "201–1000", "1000+"];
var NEEDS = ["ADM disclosure help", "AI security review", "Playbook", "Other"];
var TOOLS = ["ADM inventory", "AI security checklist"];
var SUBJECTS = ["SafeBlueprint contact", "SafeBlueprint playbook request"];

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

function allowedOrigin(origin) {
  if (origin === "https://safeblueprint.pages.dev") return true;
  if (/^https:\/\/[a-z0-9-]+\.safeblueprint\.pages\.dev$/i.test(origin)) return true;
  return false;
}

function clean(value) {
  return String(value == null ? "" : value).replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

function redact(text) {
  return String(text || "")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted]")
    .replace(/\s+/g, " ")
    .slice(0, 400);
}

function logRelay(kind, status, text) {
  console.log("relay " + kind + " " + status + " " + redact(text));
}

async function readUpstream(response) {
  var text = "";
  try { text = await response.text(); } catch (err) { text = ""; }
  var payload = null;
  try { payload = JSON.parse(text); } catch (err) { payload = null; }
  return { text: text, payload: payload };
}



function messageText(fields) {
  var lines = [];
  ["name", "email", "company", "role", "size", "need", "message", "tool", "results", "consent"].forEach(function (key) {
    if (fields[key]) lines.push(key + ": " + fields[key]);
  });
  return lines.join("\n");
}

function fromAddress(env) {
  var value = clean(env && env.EMAIL_FROM);
  if (/^[^<>\r\n]{0,80}<[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+>$/.test(value)) return value;
  if (/^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(value)) return "SafeBlueprint <" + value + ">";
  return "SafeBlueprint <onboarding@resend.dev>";
}


async function relayResend(env, mailbox, fields) {
  var upstream;
  try {
    upstream = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + clean(env.RESEND_API_KEY),
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        from: fromAddress(env),
        to: [mailbox],
        reply_to: fields.email,
        subject: fields._subject,
        text: messageText(fields)
      })
    });
  } catch (err) {
    logRelay("resend", 0, err && err.message ? err.message : "fetch failed");
    return false;
  }
  var read = await readUpstream(upstream);
  logRelay("resend", upstream.status, read.text);
  return !!(upstream.ok && read.payload && typeof read.payload.id === "string" && read.payload.id);
}


export async function onRequestPost(context) {
  var request = context.request;
  var origin = request.headers.get("Origin") || "";
  if (!allowedOrigin(origin)) return json({ success: "false" }, 403);
  var type = request.headers.get("Content-Type") || "";
  if (!/^application\/json\b/i.test(type)) return json({ success: "false" }, 415);

  var raw;
  try { raw = await request.text(); } catch (err) { return json({ success: "false" }, 400); }
  if (raw.length > 12000) return json({ success: "false" }, 413);

  var body;
  try { body = JSON.parse(raw); } catch (err) { return json({ success: "false" }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ success: "false" }, 400);

  var keys = Object.keys(body);
  for (var i = 0; i < keys.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(LIMITS, keys[i])) return json({ success: "false" }, 400);
    if (typeof body[keys[i]] !== "string") return json({ success: "false" }, 400);
  }

  var fields = {};
  keys.forEach(function (key) {
    fields[key] = clean(body[key]).slice(0, LIMITS[key]);
  });
  keys.forEach(function (key) {
    if (clean(body[key]).length > LIMITS[key]) fields.__over = true;
  });
  if (fields.__over) return json({ success: "false" }, 400);

  if (fields._honey) return json({ success: "true" }, 200);

  // Resend only. The recipient and key come from Cloudflare Pages environment variables, never the repo.
  var env = context.env || {};
  var email = clean(env.CONTACT_TO);
  if (!clean(env.RESEND_API_KEY) || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ success: "false", message: "contact temporarily unavailable" }, 503);
  }

  if (fields.consent !== "yes") return json({ success: "false" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email || "")) return json({ success: "false" }, 400);
  if (fields._subject && SUBJECTS.indexOf(fields._subject) === -1) return json({ success: "false" }, 400);
  if (fields._template && fields._template !== "table") return json({ success: "false" }, 400);
  if (fields._captcha && fields._captcha !== "false") return json({ success: "false" }, 400);

  var contact = fields.name || fields.company || fields.role || fields.message || fields.size || fields.need;
  var playbook = fields.tool || fields.results;
  if (contact && playbook) return json({ success: "false" }, 400);
  if (contact) {
    if (!fields.name || !fields.company || !fields.role || !fields.size || !fields.need || !fields.message) {
      return json({ success: "false" }, 400);
    }
    if (SIZES.indexOf(fields.size) === -1 || NEEDS.indexOf(fields.need) === -1) return json({ success: "false" }, 400);
    if (fields._subject !== "SafeBlueprint contact") return json({ success: "false" }, 400);
  } else if (playbook || fields.tool === "") {
    if (TOOLS.indexOf(fields.tool) === -1) return json({ success: "false" }, 400);
    if (fields._subject !== "SafeBlueprint playbook request") return json({ success: "false" }, 400);
  } else {
    return json({ success: "false" }, 400);
  }


  var mailbox = String(email).trim();
  var sent = await relayResend(env, mailbox, fields);
  if (sent) return json({ success: "true" }, 200);
  return json({ success: "false" }, 502);
}

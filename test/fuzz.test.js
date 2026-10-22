"use strict";
// Property-based fuzzing (fast-check) of the question-pack loader and scoring.
// Any input must either load or fail with a clean PackError; it must never crash or hang.
const test = require("node:test");
const assert = require("node:assert/strict");
const fc = require("fast-check");
const E = require("../site/questions/engine.js");

const RUNS = Number(process.env.FUZZ_RUNS || 300);

function safeLoad(text, name) {
  try { return E.loadPack(text, name); } catch (e) {
    assert.ok(e instanceof E.PackError || Array.isArray(e.errors), "unexpected error type: " + (e && e.message));
    return null;
  }
}

test("fuzz: parseCsv parses or cleanly rejects arbitrary text", () => {
  fc.assert(fc.property(fc.string({ maxLength: 2000 }), (s) => {
    try { E.parseCsv(s); } catch (e) { assert.ok(e instanceof E.PackError || Array.isArray(e.errors), "unexpected error: " + e.message); }
  }), { numRuns: RUNS });
});

test("fuzz: loadPack accepts or cleanly rejects arbitrary CSV and JSON", () => {
  fc.assert(fc.property(fc.string({ maxLength: 2000 }), (s) => { safeLoad(s, "f.csv"); safeLoad(s, "f.json"); }), { numRuns: RUNS });
});

const cell = fc.string({ maxLength: 40 }).map((s) => '"' + s.replace(/"/g, '""') + '"');
test("fuzz: structured packs with hostile cells load, score and export without crashing", () => {
  const H = "id,pack,section,question,type,options,weight,risk_if,severity,maps_to_control,finding_text,action_text\n";
  fc.assert(fc.property(fc.array(fc.tuple(cell, cell, cell, cell), { minLength: 1, maxLength: 20 }), (rows) => {
    const body = rows.map((r, i) => ["Q" + i, "fz", r[0], r[1], "choice", "a=A|b=B", "2", "a", "high", "FZ-" + i, r[2], r[3]].join(",")).join("\n");
    const pack = safeLoad(H + body + "\n", "f.csv");
    if (!pack) return;
    const answers = {};
    pack.questions.forEach((q) => { answers[q.id] = "a"; });
    const s = E.score(pack, answers);
    assert.ok(s);
    const md = E.toMarkdown(E.reportModel(pack, answers, {}));
    assert.equal(typeof md, "string");
  }), { numRuns: RUNS });
});

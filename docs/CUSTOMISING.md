# Customising the questions

SafeBlueprint can run **your own questions**: your policies, your control IDs, your owners. You write them in a spreadsheet, save it as CSV, and load it in the browser. No coding needed.

> **Privacy:** a pack is read by your browser with the file picker. It is never uploaded, and nothing is sent anywhere. Your answers stay on your device too.

## Quick start (5 minutes)
1. Open the [AI security checklist page](https://safeblueprint.pages.dev/ai-security-checklist/) (or your own copy) and scroll to **Use your own questions**.
2. Click **Download the template** (or download the **default pack** to start from the built-in questions).
3. Open the file in Excel, Google Sheets or Numbers. Edit or add rows. One row = one question.
4. Save it: in Excel choose **File → Save As → CSV UTF-8 (Comma delimited) (*.csv)**. In Google Sheets choose **File → Download → Comma-separated values**.
5. Back on the page click **Load your questions** and pick your file.
6. Check the preview (number of questions, sections, controls). Fix any errors shown, then click **Run this pack**.
7. Answer, click **See pack results**, and save the report as JSON, Markdown or HTML (print the HTML to PDF).

## The file
- UTF-8 text, comma-separated, first row is the header (column names).
- Optional first lines set the pack's name and version (shown on the report):
  ```
  # name: ACME Retail AI controls
  # version: 2026.1
  ```
- Columns can be in any order. Only `id`, `pack`, `section`, `question` and `type` are required; leave others blank if unused.
- If a cell contains a comma, wrap it in double quotes: `"Hiring, tenancy or pricing"`. Excel does this for you.
- JSON works too: `{"name": "...", "version": "...", "questions": [ {...}, ... ]}` using the same field names. See [`site/schema/questions/v1.json`](../site/schema/questions/v1.json).

## Every column
| Column | Required | What it means | Example |
|---|---|---|---|
| `id` | Yes | Unique ID. Letters, numbers, `-` `_` `.`; start with a letter. Used by `show_if` and in reports. | `Q01`, `ACME-AGENT-1` |
| `pack` | Yes | Short name of the pack this question belongs to. | `acme` |
| `section` | Yes | Heading the question appears under. Questions with the same section are grouped. | `Agents` |
| `order` | No | Number that sets display order (lowest first). Blank = row order. | `10` |
| `question` | Yes | The question, as people will read it. | `Does a person approve high-impact actions?` |
| `help_text` | No | One-line hint under the question. | `For example sending email or changing records.` |
| `type` | Yes | `yesno`, `choice` (pick one), `multi` (tick any), `text`, `number`. | `choice` |
| `options` | For `choice`/`multi` | Answers, separated by `|`, each `value=Label`. | `ci=In CI|manual=Manually|no=No` |
| `required` | No | `true` if it must be answered before a verdict is given. | `true` |
| `weight` | No | 0–10. How much it counts toward readiness. Blank = 1. `0` = asked but not scored. | `3` |
| `risk_if` | No | Answer value(s) that mean a gap, separated by `|`. For numbers, a comparison. | `no|unsure`, `>5` |
| `severity` | No | `low`, `medium` or `high` if it is a gap. Blank with `risk_if` = medium. | `high` |
| `maps_to_control` | No | Control IDs this question evidences, separated by `|`. | `OWASP-LLM06|ACME-POL-07` |
| `pattern` | No | SafeBlueprint pattern, `PAT-` + two digits. | `PAT-04` |
| `finding_text` | No | What the report says when it is a gap. | `No person approves agent actions.` |
| `action_text` | No | What to do about it. | `Add a human approval step.` |
| `owner_role` | No | Who should fix it. | `Product owner` |
| `show_if` | No | Only ask when an earlier answer matches (see below). | `Q01=auto` |
| `audience` | No | `leaders`, `delivery` or `architects`. Blank = delivery. | `architects` |

## Options
- Format: `value=Label|value=Label`. The **value** is short and stable (used in `risk_if` and `show_if`); the **label** is what people see.
- If you leave out `=Label`, the value is shown as is: `Yes|No`.
- `yesno` questions don't need options: they get `yes=Yes|no=No|unsure=Not sure` automatically.
- Values must be unique within a question.

## Weights, severity and the verdict
- **Readiness %** = the total weight of answered scored questions that are *not* gaps, divided by the total weight of answered scored questions. A question is scored when it has a `weight` above 0 and a `risk_if`.
- **Verdict** comes from severity, not the percentage:
  - any **high** gap → **Not ready**
  - otherwise any **medium** gap → **Partly ready**
  - only **low** gaps or none → **Ready**
  - a `required` question unanswered, or under half the scored weight answered → **Not enough answers**

**Worked example.** Three scored questions: MFA (weight 3, high), Logging (weight 2, medium), Labelling (weight 1, low). Someone answers MFA = Yes, Logging = No (gap), Labelling = No (gap).
Readiness = 3 ÷ (3 + 2 + 1) = **50%**. The worst gap is medium, so the verdict is **Partly ready**. If MFA were also No, the verdict would be **Not ready** whatever the percentage.

## `maps_to_control` conventions
Write each control as `PREFIX-ID` (letters/numbers, joined by `-`; dots allowed). Separate several with `|`. The report groups gaps by the prefix (the part before the first `-`).

| Prefix | Framework | Example |
|---|---|---|
| `APP1.7`, `APP1.8` | Australian Privacy Principles | `APP1.7` |
| `OWASP-LLMnn` | OWASP Top 10 for LLM Applications 2025 | `OWASP-LLM01` |
| `NIST-<FUNC>-x.y` | NIST AI RMF 1.0 (GOVERN, MAP, MEASURE, MANAGE) | `NIST-GOVERN-1.1` |
| `ISO42001-<clause>` | ISO/IEC 42001:2023 | `ISO42001-6.1`, `ISO42001-A.7` |
| `ASD-E8-<area>` | ASD Essential Eight | `ASD-E8-MFA`, `ASD-E8-PATCH` |
| `ASD-AGENTIC-<topic>` | ASD agentic AI guidance | `ASD-AGENTIC-IDENTITY` |
| `ATLAS-AML.Tnnnn` | MITRE ATLAS techniques | `ATLAS-AML.T0051` |
| `AU-AIn` | Guidance for AI Adoption (6 practices) | `AU-AI6` |
| `EUAIA-Artnn` | EU AI Act article | `EUAIA-Art14` |
| **Any of your own** | Internal policies | `ACME-POL-07`, `ACME-SEC-02` |

Cite the current official version when you add framework mappings.

## `show_if` conditions
Ask a question only when an earlier answer matches:
- `Q01=auto` → only if Q01's answer is `auto`
- `Q01!=text` → only if Q01's answer is not `text`
- `Q01=pricing|fraud` → if Q01 is `pricing` or `fraud` (for `multi`, if either is ticked)
- `Q01=auto&Q02=yes` → both must be true

Hidden questions are not scored and don't appear in the report.

## Adding a new section
Type a new name in the `section` column, for example `Third parties`. Use `order` numbers to place it (questions show lowest `order` first, and a heading appears each time the section changes).

## Translating
Copy the pack and translate `question`, `help_text`, option **labels**, `section`, `finding_text`, `action_text` and `owner_role`. Keep `id`, option **values**, `risk_if`, `show_if` and `maps_to_control` unchanged so reports stay comparable. Change `# name:` (e.g. `ACME controls (Bahasa Indonesia)`). Save as CSV **UTF-8** so accents and scripts survive.

## Sharing packs
- A pack is just a file: email it, keep it in your GRC tool or a git repo.
- The report shows the pack's **SHA-256**. Anyone can check they used the same file: `sha256sum my-pack.csv` (macOS: `shasum -a 256 my-pack.csv`; Windows: `certutil -hashfile my-pack.csv SHA256`).
- **Self-hosting:** put your file in `site/questions/` and set `"questionPack": "/questions/my-pack.csv"` in `site/config.json`. It then preloads for everyone using your copy. Run `node scripts/update-hashes.js` to refresh `SHA256SUMS.txt`.
- To share a pack with the community, see "Contribute a question pack" in [CONTRIBUTING.md](../CONTRIBUTING.md).

## Troubleshooting
| Message | Fix |
|---|---|
| *This column is missing from the header row* | Row 1 must name the columns; add the missing one (spelling matters). |
| *Unknown column* | Typo in the header, e.g. `severty`. |
| *This row has more cells than the header* | Text contains a comma but isn't in quotes. Wrap the cell in `"…"` or re-save from Excel. |
| *is not one of this question's option values* | `risk_if` uses a value that isn't in `options`. Use the value before `=`, not the label. |
| *is not a control ID* | No spaces: `OWASP-LLM02`, not `OWASP LLM02`. |
| *is used twice* | Each `id` must be unique. |
| *show_if refers to … which is not an id* | Check the id in `show_if` exists in the pack. |
| *The file is not UTF-8 text* | Save as **CSV UTF-8**, not plain "CSV" or "CSV (Macintosh)". |
| *A quoted cell is never closed* | A `"` is missing at the end of a cell. |
| Accents look wrong | Same as above: save as CSV UTF-8. |

General guidance only, not legal advice.

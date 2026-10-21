# Community question pack library

Ready-made question packs you can load into SafeBlueprint. Each pack is a CSV file read by your browser; nothing is uploaded and nothing is sent anywhere.

> These packs are general guidance to help you plan. They are **not legal advice**. Check your obligations with your own advisers.

## Packs
| Pack | For | File | Credit |
|---|---|---|---|
| Health services | Hospitals, clinics, health services | [health/pack.csv](health/pack.csv) | SafeBlueprint contributors |
| Education | Schools, universities, training providers | [education/pack.csv](education/pack.csv) | SafeBlueprint contributors |
| Public sector | Government agencies and councils | [public-sector/pack.csv](public-sector/pack.csv) | SafeBlueprint contributors |
| Internal control IDs (template) | Any organisation mapping questions to its own control IDs | [internal-controls-template/pack.csv](internal-controls-template/pack.csv) | SafeBlueprint contributors |

## Use a pack
1. Download the `pack.csv` file.
2. Open the AI security checklist page and choose **Load your questions**.
3. Pick the file, check the preview, and run it.

For the internal-controls template, replace each `ORG-...` control ID with your own before loading. Column meanings are in [docs/CUSTOMISING.md](../docs/CUSTOMISING.md).

## Contribute a pack
1. Copy a pack folder and rename it (lowercase, hyphens only).
2. Edit `pack.csv`. Keep the `# name:` and `# version:` lines. Every question should have a plain finding and action.
3. Edit `meta.json`: `id` (same as the folder), `sector`, `contributors` (how you want to be credited; a name or GitHub handle, never an email address), `reviewed_by`, `status` (`draft` until reviewed) and `licence` (`Apache-2.0`).
4. Run `npm test`. The pack validation test loads every pack with the same rules the browser uses.
5. Open a pull request with signed, DCO signed-off commits.

### Rules for every pack
- General wording that applies across organisations. No legal conclusions and no penalty amounts.
- No personal information, email addresses or phone numbers.
- No links that load content from other sites.
- Map to recognised frameworks or `ORG-` placeholders (see the prefixes in docs/CUSTOMISING.md).

## Review process
1. The automated checks validate the pack and run the full test suite.
2. The automated reviewer checks the wording against the rules above.
3. A subject-matter reviewer is invited where possible (for example a clinician for health packs).
4. The maintainer gives final approval and sets `status` to `reviewed`.

Contributors are credited in `meta.json`, in the table above and in the release notes.

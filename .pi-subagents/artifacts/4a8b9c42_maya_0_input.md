# Task for maya

MR. G wants to improve the padding of the side panel in the Computer Engineer Toolkit app. 

The side panel is in src/App.vue. Currently it has:
- `p-6` class (which applies padding: 1.5rem / 24px on all sides)
- Width: 30% with min-width 240px and max-width 400px
- Contains logo/title, search input, and tool navigation

Please improve the padding to make it look better. Consider:
- Better spacing between sections
- More comfortable breathing room
- Professional, polished look
- Keep the dark theme aesthetic (black background, slate colors, cyan accents)

Make the changes directly to src/App.vue. Do not commit - this is just code changes.

## Acceptance Contract
Acceptance level: checked
Completion is not accepted from prose alone. End with a structured acceptance report.

Criteria:
- criterion-1: Implement the requested change without widening scope

Required evidence: changed-files, tests-added, commands-run, residual-risks, no-staged-files

Finish with a fenced JSON block tagged `acceptance-report` in this shape:
Use empty arrays when no items apply; array fields contain strings unless object entries are shown.
```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "specific proof"
    }
  ],
  "changedFiles": [
    "src/file.ts"
  ],
  "testsAddedOrUpdated": [
    "test/file.test.ts"
  ],
  "commandsRun": [
    {
      "command": "command",
      "result": "passed",
      "summary": "short result"
    }
  ],
  "validationOutput": [
    "validation output or concise summary"
  ],
  "residualRisks": [
    "none"
  ],
  "noStagedFiles": true,
  "diffSummary": "short description of the diff",
  "reviewFindings": [
    "blocker: file.ts:12 - issue found, or no blockers"
  ],
  "manualNotes": "anything else the parent should know"
}
```
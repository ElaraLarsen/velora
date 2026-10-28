# Synthetic fixtures

Everything in this folder is fabricated for Handwave's safeguard tests.

- `app/` is a tiny made-up "clinic photo upload" app. It is not taken from MedBridge SOS or any real project, contains no real people or patient data, and is never executed.
- `check-responses.json` holds hand-written model responses in the exact format the evidence-check AI returns. They are deliberately adversarial (invented quotes, wrong files, too-short quotes, missing verdicts) so the deterministic safeguards can be tested without any AI or network call.

Findings on these files are planted by design and must never be presented as real discoveries.

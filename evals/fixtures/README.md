# AI Business Passport - LLM & Document OCR Evaluation Fixtures

This directory holds test fixtures and ground-truth manifests for evaluating document OCR extraction accuracy, category classification, and confidence calibration across **Claude 3.5** and **Gemini 1.5/2.0** models.

---

## Folder Structure

```
/evals/fixtures/
├── manifest.csv               # Ground-truth labels for evaluation harness
├── cac_certificate_synth.json # Synthetic CAC Certificate fixture
├── status_report_synth.json   # Synthetic CAC Status Report fixture
├── tax_clearance_synth.json   # Synthetic Tax Clearance Certificate (TCC) fixture
├── tin_letter_synth.json      # Synthetic FIRS TIN Acknowledgement Letter fixture
└── tender_notice_synth.json   # Synthetic Procurement Tender Notice fixture
```

---

## How to Add Real Scanned Nigerian Documents

To benchmark the system against real-world scanned Nigerian business documents (including low-quality mobile photos and skewed scans):

1. **Place Scanned Document**:
   Add the PDF or image file (`.pdf`, `.jpg`, `.png`) to `/evals/fixtures/scans/`. Example: `/evals/fixtures/scans/cac_cert_lagos_001.jpg`.

2. **Add Entry to `manifest.csv`**:
   Add a line to `manifest.csv` specifying ground-truth expectations:
   ```csv
   file,expectedCategory,expectedDocType,expectedFields
   scans/cac_cert_lagos_001.jpg,registration,cac_certificate,"{""businessName"":""Lagos Green Energies Ltd"",""rcNumber"":""RC-1982736""}"
   ```

3. **Run Evaluation Harness**:
   Execute the evaluation command from the root directory:
   ```bash
   npm run eval
   ```

The harness will process all fixtures through both **Claude** and **Gemini** adapters, outputting accuracy per field, category accuracy, confidence calibration metrics, average latency, and estimated cost per document in NGN.

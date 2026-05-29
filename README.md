<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/27c28770-4bc6-40e7-8fd4-7816accc187e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Redbook lookup chatbot

The app has a second tab, **ค้นหาราคากลางรถ (Redbook)**, with a chatbot that
finds the closest matching vehicle (brand / model / year → redbook value) from a
dataset sourced from an Excel file.

- **Data source:** set `REDBOOK_API_URL` in `.env.local` to a backend endpoint
  that returns the redbook rows as JSON — either an array of row objects or
  `{ "data": [ ... ] }`, where each row is one spreadsheet row keyed by its
  column header (Thai or English). If unset/unreachable, a bundled sample
  dataset is used so the chatbot still works.
- **Auto-detected columns:** headers are matched automatically, so the
  spreadsheet does not need a fixed schema. Recognized fields: ยี่ห้อ/brand,
  รุ่น/model, รุ่นย่อย/variant, ปี/year, ราคา/value, ตัวถัง/body type.
- **Matching:** brand and model use a blend of normalized equality, token
  overlap and edit distance (tolerant of typos); year contributes a proximity
  score so the nearest model year wins. Results are ranked with a confidence %.

Key files: `components/RedbookChatbot.tsx`, `services/redbookApi.ts`
(load + column auto-detect), `services/redbookMatch.ts` (fuzzy matching).

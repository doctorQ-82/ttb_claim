# Health Claims PDF Extractor (Gemini Flash)

เครื่องมือ Python สำหรับเจ้าหน้าที่ฝ่ายสินไหมทดแทนประกันสุขภาพ — อ่านไฟล์ PDF เคลมประกัน
ด้วย Google Gemini Flash แล้วดึงข้อมูลสำคัญ (วันที่รับเอกสาร, ผู้เอาประกัน, เลขกรมธรรม์,
ประเภทเคลม, ยอดเรียกร้อง ฯลฯ) ส่งออกเป็นไฟล์ Excel

## โครงสร้างโปรเจกต์

```
claims_extractor/
├── .env.example          # ตัวอย่างไฟล์ .env (คัดลอกเป็น .env แล้วใส่ API key)
├── config.yaml           # การตั้งค่าและ Prompt
├── requirements.txt
├── main.py               # CLI entry point
├── src/
│   ├── config_loader.py
│   ├── gemini_client.py  # เรียก Gemini API + Retry
│   ├── pdf_processor.py
│   ├── excel_exporter.py
│   ├── file_manager.py   # ย้ายไฟล์ระหว่างโฟลเดอร์
│   └── logger.py
├── input/                # วางไฟล์ PDF ที่จะอ่านที่นี่
├── processed/            # ไฟล์ที่อ่านสำเร็จจะถูกย้ายมาที่นี่
├── failed/               # ไฟล์ที่อ่านไม่สำเร็จ (retry ได้ภายหลัง)
├── output/               # ไฟล์ Excel ที่ Export
└── logs/                 # log ไฟล์ของแต่ละการรัน
```

## ติดตั้ง

```bash
cd claims_extractor
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# แก้ไข .env ใส่ GEMINI_API_KEY ของคุณ
```

## ใช้งาน

```bash
# 1) วางไฟล์ PDF ลงในโฟลเดอร์ input/
# 2) รัน:
python main.py

# ตัวเลือกอื่น:
python main.py --single                # ทีละไฟล์ (serial)
python main.py --file path/to/file.pdf # ระบุไฟล์เดียว
python main.py --input-dir /some/path  # ระบุโฟลเดอร์ input อื่น
```

หลังประมวลผลเสร็จ:
- ไฟล์ Excel จะอยู่ใน `output/claims_extract_<timestamp>.xlsx`
- ไฟล์ PDF ที่อ่านสำเร็จจะถูกย้ายไป `processed/`
- ไฟล์ที่ fail จะถูกย้ายไป `failed/` (ดู log เพื่อ retry)

## การแก้ไข Prompt

แก้ในไฟล์ `config.yaml` ที่ key `prompt:` — ไม่ต้องแก้โค้ด

## หมายเหตุ

- ระบบใช้ Retry แบบ Exponential Backoff (3 ครั้ง) เมื่อ Gemini API ล้มเหลว
- รองรับการรันแบบ Parallel (ค่า default 4 workers) — ปรับใน `config.yaml`
- ใช้ API Key เก็บใน `.env` (ไม่ถูก commit เข้า git)

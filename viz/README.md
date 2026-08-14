# Validatier DB Viz

Salt-okunur bir Streamlit dashboard'u. `backend/.env` içindeki `MONGO_URI`'ye
bağlanır, hiçbir yazma işlemi yapmaz. `backend/` TS pipeline'ından tamamen
bağımsızdır.

## Kurulum

```bash
cd viz
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Çalıştırma

```bash
streamlit run app.py
```

Tarayıcıda açılan sayfada sol menüden "Tümü" ya da tek bir validator
seçebilirsin — seçim tüm sekmeleri (Validator Stats, Fund Flow Edges, Sink
Sales, Sağlama) o validator'a filtreler.

## Notlar

- `backend/.env` dosyası mevcut olmalı (MONGO_URI orada okunuyor).
- Mongo standalone bir instance de olsa okuma işlemleri çalışır (transaction
  gerektiren yazmalar backend'in kendi işi, burada yok).
- uatom tutarları Mongo'da BigInt-string olarak saklanıyor; `data.py` bunları
  `int`'e çevirip ATOM'a (`/10^6`) böler, hiçbir noktada float'a erken cast
  yapmaz.

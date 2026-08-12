# Validatier Fund-Flow — SQLite Working Store (detaylı tasarım)

Rol: hot mutasyon katmanı. Contraction/taint burada saniyede yüzlerce kez döner;
periyodik olarak Mongo'ya (fund_flow_edges) versiyonlu snapshot dökülür.
Binding: better-sqlite3 (senkron, hızlı, tek-process indexer için ideal).

═══════════════════════════════════════════════════════════════════════
0. KURULUM / PRAGMA
═══════════════════════════════════════════════════════════════════════
```js
const db = require('better-sqlite3')('fundflow.db');
db.pragma('journal_mode = WAL');     // yazarken okuma, daha hızlı
db.pragma('synchronous = NORMAL');   // WAL ile iyi durability/hız dengesi
db.pragma('temp_store = MEMORY');
db.pragma('foreign_keys = OFF');     // FK kullanmıyoruz (perf)
db.defaultSafeIntegers(true);        // INTEGER -> JS BigInt (precision loss YOK)
```

SAYI TİPİ KARARI: uatom değerleri SQLite'ta `INTEGER` (int64, max ~9.2e18).
uatom toplam arzı ~3.9e14 « 9.2e18 → int64 rahat sığar, SUM bile taşmaz.
`safeIntegers` ile JS tarafında BigInt döner → float precision derdi yok.
(Mongo'da TEXT tutuyoruz çünkü orada aritmetik yapmıyoruz; SQLite'ta SUM/karşılaştırma
yaptığımız için INTEGER+BigInt daha ergonomik. Snapshot'ta BigInt.toString() ile Mongo'ya.)

═══════════════════════════════════════════════════════════════════════
1. edges — graf (forward). ff:e: + ff:h: key ailelerinin YERİNE.
═══════════════════════════════════════════════════════════════════════
```sql
CREATE TABLE edges (
  origin            TEXT    NOT NULL,          -- operator_address (köken validator)
  holder            TEXT    NOT NULL,          -- parayı şu an tutan adres
  weight            INTEGER NOT NULL,          -- uatom, o anki bakiye
  depth             INTEGER NOT NULL,          -- origin->holder hop sayısı
  status            TEXT    NOT NULL DEFAULT 'in_flight',  -- in_flight|realized|suspected
  sink_kind         TEXT,                      -- NULL|cex|dex|ibc_out|structural
  weight_prefix_sum INTEGER NOT NULL DEFAULT 0,-- bu edge'ten geçen kümülatif akış
  first_height      INTEGER NOT NULL,
  first_ts          INTEGER NOT NULL,
  last_height       INTEGER NOT NULL,
  last_ts           INTEGER NOT NULL,
  PRIMARY KEY (origin, holder)
) WITHOUT ROWID;   -- PK'ye göre erişiyoruz; clustered, daha az yer + tek lookup

-- TERS INDEX: taint-check, haircut, in-degree hepsi bununla.
-- WHERE status != 'realized' -> realized (terminal sink) index'e girmez,
-- yani realized bir adres bir daha "tainted sender" olarak bulunmaz.
-- LevelDB'de ff:h:'ten elle SİLME işini bu partial index OTOMATİK yapıyor.
CREATE INDEX idx_edges_holder ON edges(holder) WHERE status != 'realized';

-- snapshot/raporlama için status filtresi
CREATE INDEX idx_edges_status ON edges(status);
```

═══════════════════════════════════════════════════════════════════════
2. seed — origin başına çekilmiş toplam (reward/commission tag'li)
═══════════════════════════════════════════════════════════════════════
```sql
CREATE TABLE seed (
  origin               TEXT PRIMARY KEY,
  reward_withdrawn     INTEGER NOT NULL DEFAULT 0,   -- kümülatif withdraw_rewards
  commission_withdrawn INTEGER NOT NULL DEFAULT 0,   -- kümülatif withdraw_commission
  last_height          INTEGER NOT NULL,
  last_ts              INTEGER NOT NULL
) WITHOUT ROWID;
-- sold% paydası = reward_withdrawn + commission_withdrawn
-- günlük stats job'ı bu kümülatifleri validator_stats'a yazar
--   (total_withdrawn_reward/commission) — dashboard paydayı oradan okur
```

═══════════════════════════════════════════════════════════════════════
3. withdraw_map — origin-set (adres -> validatör(ler)). Ortak cüzdan -> çok satır.
═══════════════════════════════════════════════════════════════════════
```sql
CREATE TABLE withdraw_map (
  withdraw_address TEXT NOT NULL,
  operator_address TEXT NOT NULL,
  PRIMARY KEY (withdraw_address, operator_address)
) WITHOUT ROWID;
CREATE INDEX idx_wmap_operator ON withdraw_map(operator_address);

-- "X bir withdraw adresi mi, kimin?" (commingled -> N satır):
--   SELECT operator_address FROM withdraw_map WHERE withdraw_address = ?;
-- "operatörün güncel withdraw'ı":
--   SELECT withdraw_address FROM withdraw_map WHERE operator_address = ?;
-- set_withdraw_address override: eski (op,addr) sil, yeni (op,addr) ekle.
```

═══════════════════════════════════════════════════════════════════════
4. validator_state — GÜNLÜK stake snapshot + epoch rollback (lead'in önerisi)
═══════════════════════════════════════════════════════════════════════
```sql
CREATE TABLE validator_state (
  epoch        INTEGER NOT NULL,   -- gün indexi: floor(ts/86400) (veya YYYYMMDD)
  operator     TEXT    NOT NULL,
  total_stake  INTEGER NOT NULL,   -- snapshot (validator.tokens)
  block_height INTEGER NOT NULL,
  ts           INTEGER NOT NULL,
  PRIMARY KEY (epoch, operator)
) WITHOUT ROWID;

-- bir günü geri al:  DELETE FROM validator_state WHERE epoch = ?;
-- o günün seti:      SELECT * FROM validator_state WHERE epoch = ?;
-- retention: Mongo'ya (validator_stats) flush sonrası
--   DELETE FROM validator_state WHERE epoch < ?;   (son N gün rollback penceresi kalsın)
```

═══════════════════════════════════════════════════════════════════════
5. sink_registry — sink adresleri (startup'ta Mongo/statik'ten yüklenir)
═══════════════════════════════════════════════════════════════════════
```sql
CREATE TABLE sink_registry (
  address TEXT PRIMARY KEY,
  tier    INTEGER NOT NULL,   -- 1 | 2
  kind    TEXT    NOT NULL    -- cex|dex|ibc_out|structural
) WITHOUT ROWID;
-- classify: SELECT tier, kind FROM sink_registry WHERE address = ?;
```

═══════════════════════════════════════════════════════════════════════
6. meta — tek satır: cursor + versiyon pointer
═══════════════════════════════════════════════════════════════════════
```sql
CREATE TABLE meta (
  id                   INTEGER PRIMARY KEY CHECK (id = 1),  -- tek satır
  scanned_up_to_height INTEGER NOT NULL DEFAULT 0,
  scanned_up_to_ts     INTEGER NOT NULL DEFAULT 0,
  fund_flow_version    INTEGER NOT NULL DEFAULT 0,
  updated_at           INTEGER NOT NULL
);
-- totals (in_flight/realized/suspected) meta'da TUTULMAZ; edges'ten SUM ile türetilir
-- (running total bug yüzeyi yaratmasın). Snapshot anında hesaplanıp Mongo meta'ya yazılır.
```

═══════════════════════════════════════════════════════════════════════
HOT-PATH OPERASYONLARI (prepared statement olarak cache'lenir)
═══════════════════════════════════════════════════════════════════════

## SEED (distribution -> withdrawAddr, amount A, tag=reward|commission)
```sql
-- 1) origin V = withdraw event'inin `validator` attribute'u (kesin isabet).
--    Guard: V bu withdraw adresine kayitli mi? (degilse: cuzdanin baska
--    validatorden delegator olarak aldigi odul -> seed DEGIL, atla)
SELECT operator_address FROM withdraw_map WHERE withdraw_address = @waddr;
-- 2) V icin (bolusum YOK — her claim kendi validatorunu soyler):
INSERT INTO seed(origin, reward_withdrawn, commission_withdrawn, last_height, last_ts)
VALUES (@op, @rew, @com, @h, @ts)
ON CONFLICT(origin) DO UPDATE SET
  reward_withdrawn     = reward_withdrawn + excluded.reward_withdrawn,
  commission_withdrawn = commission_withdrawn + excluded.commission_withdrawn,
  last_height = excluded.last_height, last_ts = excluded.last_ts;

INSERT INTO edges(origin,holder,weight,depth,status,weight_prefix_sum,first_height,first_ts,last_height,last_ts)
VALUES (@op, @waddr, @pay, 1, 'in_flight', @pay, @h, @ts, @h, @ts)
ON CONFLICT(origin,holder) DO UPDATE SET
  weight            = weight + excluded.weight,
  weight_prefix_sum = weight_prefix_sum + excluded.weight,
  last_height = excluded.last_height, last_ts = excluded.last_ts;
```

## TAINT CHECK (sender X)
```sql
SELECT 1 FROM edges WHERE holder = @x AND status != 'realized' LIMIT 1;
```

## HAIRCUT READ (holder X'teki origin'ler + weight'ler)
```sql
SELECT origin, weight FROM edges WHERE holder = @x AND status != 'realized';
-- uygulama: A miktarını weight oranında böl (Σ pay = A, kalan deterministik ilk origin'e)
```

## CONTRACTION (X -> Y, amount A) — TEK TRANSACTION (atomik)
```sql
BEGIN;
  -- her origin için (haircut pay_i):
  UPDATE edges SET weight = weight - @pay, last_height=@h, last_ts=@ts
    WHERE origin=@op AND holder=@x;
  DELETE FROM edges WHERE origin=@op AND holder=@x AND weight <= 0;   -- sıfırı temizle

  INSERT INTO edges(origin,holder,weight,depth,status,weight_prefix_sum,first_height,first_ts,last_height,last_ts)
  VALUES (@op,@y,@pay,@newDepth,'in_flight',@pay,@h,@ts,@h,@ts)
  ON CONFLICT(origin,holder) DO UPDATE SET
    weight            = weight + excluded.weight,
    weight_prefix_sum = weight_prefix_sum + excluded.weight,
    depth             = MIN(depth, excluded.depth),   -- en kısa yol
    last_height=excluded.last_height, last_ts=excluded.last_ts;
COMMIT;
-- @newDepth = X'teki edge.depth + 1 (haircut read'de okunur)
-- ters index (idx_edges_holder) OTOMATİK güncellenir — elle senkron YOK
```

## CLASSIFY (receiver Y)
```sql
-- Tier 1 (sink_registry'de) -> realized, terminal:
UPDATE edges SET status='realized', sink_kind=@kind WHERE origin=@op AND holder=@y;
--   -> realized satır partial index'ten OTOMATİK düşer, artık "tainted" değil

-- Tier 2 (yapısal) -> suspected (index'te kalır, takip devam):
UPDATE edges SET status='suspected', sink_kind='structural' WHERE origin=@op AND holder=@y;
```

## IN-DEGREE (Tier 2 tespiti, holder Y'ye kaç distinct origin)
```sql
SELECT COUNT(DISTINCT origin) AS indeg FROM edges WHERE holder = @y;
```

## MAX-DEPTH TERMINATION
```sql
-- contraction'da @newDepth >= MAX_DEPTH ise edge açılır ama frontier'a eklenmez
-- (pratikte: o holder için propagate etme; edge kalır, dal durur)
```

═══════════════════════════════════════════════════════════════════════
SNAPSHOT -> Mongo (version N)
═══════════════════════════════════════════════════════════════════════
```sql
-- tüm edge'ler (Mongo fund_flow_edges'e version=N, published=false yazılır)
SELECT origin,holder,weight,depth,status,sink_kind,weight_prefix_sum,
       first_height,first_ts,last_height,last_ts FROM edges;

-- meta totals:
SELECT status, SUM(weight) AS total FROM edges GROUP BY status;

-- origin başına sold (realized) — dashboard sold%:
SELECT origin, SUM(CASE WHEN status='realized' THEN weight ELSE 0 END) AS sold_realized,
               SUM(CASE WHEN status='suspected' THEN weight ELSE 0 END) AS sold_suspected
FROM edges GROUP BY origin;

-- withdrawn (payda) origin başına:
SELECT origin, reward_withdrawn, commission_withdrawn FROM seed;
```
Yazım bitince Mongo'da published=true (commit switch). Sonra meta.fund_flow_version++.

Yukarıdaki `edges` okumasından `status='realized'` olan satırlar aynı zamanda
`validator_sink_sales` için de kullanılır — SQLite'a ayrı bir `WHERE status='realized'`
sorgusu ATILMAZ, tek okuma iki koleksiyonu da besler. fund_flow_edges yazımı (insert +
published=true) ve validator_sink_sales yazımı (değişen (origin,holder) çiftleri için,
docs/03'teki sparse mantıkla) TEK bir Mongo transaction'ı içinde yapılır
(backend/jobs/snapshot.ts) — biri commit olmadan diğeri de olmaz.

═══════════════════════════════════════════════════════════════════════
ROLLBACK — iki ayrı yol
═══════════════════════════════════════════════════════════════════════
İki katmanın rollback anahtarı FARKLI ama mantık aynı: "son sağlam checkpoint'i
tut, bozulanı sil, ileri doğru yeniden tara (deterministik replay)."

- validator_state (günlük stake) -> checkpoint = EPOCH (SQLite'ta):
    DELETE FROM validator_state WHERE epoch = @badEpoch;  sonra o günü yeniden çek.

- edges (graf) -> checkpoint = VERSION (Mongo'da). Mongo'da epoch YOK; onun yerine
  fund_flow_edges'teki `version` her checkpoint'i temsil ediyor. Her version = grafın
  o andaki TAM kopyası, BİLİNEN bir height'te. Yani version = epoch'un edges karşılığı.
  Rollback akışı:
    1. son SAĞLAM version'ı seç (bozulan version'dan bir önceki),
    2. o version'ın edge'lerini SQLite'a geri yükle (edges tablosunu ondan doldur),
    3. cursor'ı o version'ın snapshot_height'ine çek,
    4. oradan blokları yeniden tara -> deterministik olarak aynı grafı üretir.

  Bunun çalışması için İKİ şart (yoksa geri alacak checkpoint kalmaz):
    a) eski version'ları hemen silme -> son N version'ı rollback penceresi olarak tut
       (validator_state'in epoch retention'ı ile aynı fikir),
    b) her version kendi snapshot_height'ini kaydetsin (hangi bloğa kadar taranmışken
       alındığı) -> restore sonrası cursor'ı oraya çekebilelim.

  Neden edges'i epoch'lamıyoruz (SQLite'ta günlük kopya): graf büyük, her gün tüm grafı
  kopyalamak pahalı. Zaten Mongo'ya periyodik tam snapshot (version) yazıyoruz -> o kopya
  rollback checkpoint'i olarak da iş görüyor, ayrıca SQLite'ta ikinci bir kopya tutmaya gerek yok.

NOT (Mongo şemasına yansıması): fund_flow snapshot'ına version başına {version, snapshot_height,
published} kaydı gerekiyor (rollback penceresi + restore height için). Bu, "published flag"
sadeleştirmesinin üstüne version başına snapshot_height eklemek demek.

═══════════════════════════════════════════════════════════════════════
LevelDB key ailesi -> SQLite karşılığı
═══════════════════════════════════════════════════════════════════════
ff:e:<origin>:<holder>       -> edges (PK origin,holder)
ff:h:<holder>:<origin>       -> idx_edges_holder (partial index — elle YOK)
ff:seed:<origin>             -> seed
ff:wmap:<addr>               -> withdraw_map
ff:status:<epoch>:<operator> -> validator_state (epoch kolonu)
ff:cursor                    -> meta.scanned_up_to_height

KAZANÇ: ters index elle senkron edilmiyor (partial index otomatik),
contraction ACID transaction, invaryant SUM ile anında doğrulanıyor,
sqlite3 CLI ile debug edilebiliyor.

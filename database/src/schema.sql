CREATE TABLE IF NOT EXISTS trade_id_seq (
  seq_id INT AUTO_INCREMENT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS trades (
  tradeId VARCHAR(12) NOT NULL PRIMARY KEY,
  symbol VARCHAR(16) NOT NULL,
  side ENUM('BUY', 'SELL') NOT NULL,
  quantity DECIMAL(18, 4) NOT NULL,
  price DECIMAL(18, 4) NOT NULL,
  trader NVARCHAR(100) NOT NULL,
  book VARCHAR(50) NOT NULL,
  counterparty VARCHAR(100) NOT NULL,
  trade_timestamp DATETIME NOT NULL,
  status ENUM('ACTIVE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE'
);

-- Audit trail of trade amendments (PATCH /api/trades/:tradeId only — cancellations aren't
-- recorded here). Full before/after snapshots as JSON rather than duplicated before_*/after_*
-- columns, so this table doesn't need a migration every time Trade's shape changes.
CREATE TABLE IF NOT EXISTS trade_amendments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tradeId VARCHAR(12) NOT NULL,
  amended_at DATETIME NOT NULL,
  before_state JSON NOT NULL,
  after_state JSON NOT NULL,
  FOREIGN KEY (tradeId) REFERENCES trades(tradeId)
);

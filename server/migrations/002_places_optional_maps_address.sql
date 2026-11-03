-- Makes places.maps_url optional and adds places.address. SQLite cannot drop NOT NULL
-- in place, so the table is rebuilt; migrate() runs this with foreign keys off and
-- checks them before commit, so child rows in place_categories and expenses are kept.
CREATE TABLE places_new (
  id INTEGER PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  address TEXT CHECK (address IS NULL OR length(address) BETWEEN 1 AND 300),
  maps_url TEXT,
  source_url TEXT,
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 2000),
  status TEXT NOT NULL DEFAULT 'want' CHECK (status IN ('want', 'visited', 'skipped')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 10),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (rating IS NULL OR status = 'visited')
) STRICT;

INSERT INTO places_new (id, trip_id, name, address, maps_url, source_url, notes, status, rating, created_at, updated_at)
SELECT id, trip_id, name, NULL, maps_url, source_url, notes, status, rating, created_at, updated_at FROM places;

DROP TABLE places;
ALTER TABLE places_new RENAME TO places;
CREATE INDEX places_trip ON places (trip_id);

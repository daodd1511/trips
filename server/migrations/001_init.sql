CREATE TABLE trips (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  currency TEXT NOT NULL CHECK (length(currency) = 3 AND currency = upper(currency)),
  theme TEXT NOT NULL DEFAULT 'pine-berry',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE places (
  id INTEGER PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  maps_url TEXT NOT NULL,
  source_url TEXT,
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 2000),
  status TEXT NOT NULL DEFAULT 'want' CHECK (status IN ('want', 'visited', 'skipped')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 10),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (rating IS NULL OR status = 'visited')
);
CREATE INDEX places_trip ON places (trip_id);

-- name_key holds the name lowercased by the app with full Unicode rules; SQLite's
-- lower() folds ASCII only, so it cannot enforce case-insensitive uniqueness for
-- Vietnamese names.
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  name_key TEXT NOT NULL UNIQUE,
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1))
);

CREATE TABLE place_categories (
  place_id INTEGER NOT NULL REFERENCES places (id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  PRIMARY KEY (place_id, category_id)
);
CREATE INDEX place_categories_category ON place_categories (category_id);

CREATE TABLE stays (
  id INTEGER PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  maps_url TEXT,
  check_in TEXT,
  check_out TEXT,
  notes TEXT CHECK (notes IS NULL OR length(notes) <= 2000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (check_in IS NULL OR check_out IS NULL OR check_out >= check_in)
);
CREATE INDEX stays_trip ON stays (trip_id);

CREATE TABLE expenses (
  id INTEGER PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  place_id INTEGER REFERENCES places (id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  amount INTEGER NOT NULL CHECK (amount > 0),
  spent_on TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX expenses_trip ON expenses (trip_id);
CREATE INDEX expenses_place ON expenses (place_id);

-- Single-row table.
CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active_trip_id INTEGER REFERENCES trips (id) ON DELETE SET NULL
);
INSERT INTO settings (id, active_trip_id) VALUES (1, NULL);

INSERT INTO categories (name, name_key, is_system) VALUES
  ('Breakfast', 'breakfast', 0),
  ('Lunch', 'lunch', 0),
  ('Dinner', 'dinner', 0),
  ('Snack / street food', 'snack / street food', 0),
  ('Café / drinks', 'café / drinks', 0),
  ('Dessert', 'dessert', 0),
  ('Gift / souvenir', 'gift / souvenir', 0),
  ('Sightseeing', 'sightseeing', 0),
  ('Night market', 'night market', 0),
  ('Stay', 'stay', 0),
  ('Other', 'other', 1);

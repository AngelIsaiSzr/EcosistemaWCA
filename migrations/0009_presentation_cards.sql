CREATE TABLE IF NOT EXISTS presentation_cards (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL UNIQUE,
  direction TEXT NOT NULL DEFAULT 'direccion-sede',
  theme JSONB NOT NULL DEFAULT '{}',
  linked_in TEXT,
  instagram TEXT,
  twitter TEXT,
  github TEXT,
  youtube TEXT,
  tiktok TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,
  links JSONB NOT NULL DEFAULT '[]',
  assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  pinned_at TIMESTAMP,
  view_count INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS presentation_cards_assigned_user_unique
  ON presentation_cards (assigned_user_id)
  WHERE assigned_user_id IS NOT NULL;

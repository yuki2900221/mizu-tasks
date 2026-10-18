CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tasks (id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL CHECK(status IN ('todo','doing','done')), category TEXT NOT NULL, due TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id,id));
CREATE INDEX IF NOT EXISTS tasks_user_updated ON tasks(user_id,updated_at);
CREATE TABLE IF NOT EXISTS ai_usage (user_id TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id,day));

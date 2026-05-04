import * as SQLite from 'expo-sqlite';
import { Deck, Flashcard, ApiKey } from '../types';

/**
 * SQLite database manager for LinguistAI.
 * Centralizes all raw SQL operations.
 */

const DB_NAME = 'linguistai.db';

export async function getDb() {
  return await SQLite.openDatabaseAsync(DB_NAME);
}

export async function initDb() {
  const db = await getDb();

  // expo-sqlite v16 does not support multiple statements in a single execAsync call.
  // Each DDL statement must be run individually.
  await db.runAsync('PRAGMA foreign_keys = ON');

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS decks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deck_id INTEGER NOT NULL,
      english TEXT NOT NULL,
      vietnamese TEXT NOT NULL,
      phonetic TEXT,
      word_type TEXT,
      grammar_note TEXT,
      example_en TEXT,
      example_vi TEXT,
      daily_reps INTEGER DEFAULT 0,
      last_studied_at TEXT,
      total_reps INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      api_key TEXT NOT NULL UNIQUE,
      priority INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      fail_count INTEGER DEFAULT 0,
      last_failed_at TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await db.runAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Seed the special Inbox deck exactly once.
  // Its ID is stored in app_settings so we can always find it without hardcoding.
  const existingInboxId = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'inbox_deck_id'"
  );

  if (!existingInboxId) {
    const createdAt = new Date().toISOString();
    const result = await db.runAsync(
      "INSERT INTO decks (name, icon, created_at) VALUES ('Inbox', '📥', ?)",
      [createdAt]
    );
    await db.runAsync(
      "INSERT INTO app_settings (key, value) VALUES ('inbox_deck_id', ?)",
      [String(result.lastInsertRowId)]
    );
  }
}


// --- Deck Operations ---

export async function getAllDecks(): Promise<Deck[]> {
  const db = await getDb();
  return await db.getAllAsync<Deck>('SELECT * FROM decks ORDER BY created_at DESC');
}

export async function createDeck(name: string, icon: string): Promise<number> {
  const db = await getDb();
  const createdAt = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO decks (name, icon, created_at) VALUES (?, ?, ?)',
    [name, icon, createdAt]
  );
  return result.lastInsertRowId;
}

export async function deleteDeck(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM decks WHERE id = ?', [id]);
}

// --- Flashcard Operations ---

export async function getFlashcardsByDeck(deckId: number): Promise<Flashcard[]> {
  const db = await getDb();
  return await db.getAllAsync<Flashcard>(
    'SELECT * FROM flashcards WHERE deck_id = ? ORDER BY created_at DESC',
    [deckId]
  );
}

export async function getAllFlashcards(): Promise<Flashcard[]> {
  const db = await getDb();
  return await db.getAllAsync<Flashcard>('SELECT * FROM flashcards');
}

export async function createFlashcard(card: Omit<Flashcard, 'id' | 'daily_reps' | 'last_studied_at' | 'total_reps' | 'created_at'>): Promise<number> {
  const db = await getDb();
  const createdAt = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO flashcards (
      deck_id, english, vietnamese, phonetic, word_type, 
      grammar_note, example_en, example_vi, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      card.deck_id, card.english, card.vietnamese, card.phonetic, card.word_type,
      card.grammar_note, card.example_en, card.example_vi, createdAt
    ]
  );
  return result.lastInsertRowId;
}

export async function updateFlashcardRep(id: number, dailyReps: number, totalReps: number): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE flashcards SET daily_reps = ?, total_reps = ?, last_studied_at = ? WHERE id = ?',
    [dailyReps, totalReps, now, id]
  );
}

export async function resetDailyReps(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE flashcards SET daily_reps = 0 WHERE id = ?', [id]);
}

export async function deleteFlashcard(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM flashcards WHERE id = ?', [id]);
}

export async function updateFlashcard(card: Partial<Flashcard> & { id: number }): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(card).filter(k => k !== 'id');
  const query = `UPDATE flashcards SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
  const values = [...fields.map(f => (card as any)[f]), card.id];
  await db.runAsync(query, values);
}

// --- API Key Operations ---

export async function getApiKeys(): Promise<ApiKey[]> {
  const db = await getDb();
  return await db.getAllAsync<ApiKey>('SELECT * FROM api_keys ORDER BY priority ASC, fail_count ASC');
}

export async function addApiKey(label: string, key: string): Promise<void> {
  const db = await getDb();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO api_keys (label, api_key, created_at) VALUES (?, ?, ?)',
    [label, key, createdAt]
  );
}

export async function updateApiKeyStatus(id: number, isActive: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE api_keys SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
}

export async function recordApiKeyFailure(id: number): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE api_keys SET fail_count = fail_count + 1, last_failed_at = ? WHERE id = ?',
    [now, id]
  );
}

export async function deleteApiKey(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM api_keys WHERE id = ?', [id]);
}

// --- Settings ---

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const result = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key]
  );
  return result?.value || null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

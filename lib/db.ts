import * as SQLite from 'expo-sqlite';
import { Deck, Flashcard, ApiKey } from '../types';

/**
 * SQLite database manager for LinguistAI.
 * Centralizes all raw SQL operations.
 */

const DB_NAME = 'linguistai.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb() {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  return dbInstance;
}

export async function initDb() {
  const db = await getDb();

  try {
    // Basic setup and table creation in one transaction-like execution
    await db.execAsync(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT,
        created_at TEXT NOT NULL
      );
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
      );
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key TEXT NOT NULL UNIQUE,
        is_active INTEGER DEFAULT 1,
        fail_count INTEGER DEFAULT 0,
        last_failed_at TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // Seed the special Inbox deck exactly once.
    // Use getFirstAsync carefully - wrap in a safe check
    const existingInboxId = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = 'inbox_deck_id'"
    ).catch(() => null);

    if (!existingInboxId) {
      const createdAt = new Date().toISOString();
      const result = await db.runAsync(
        "INSERT INTO decks (name, icon, created_at) VALUES ('Inbox', 'Inbox', ?)",
        [createdAt]
      );
      await db.runAsync(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('inbox_deck_id', ?)",
        [String(result.lastInsertRowId)]
      );
    }
  } catch (error) {
    console.error("[DB] Fatal Initialization Error:", error);
    // Reset instance so it can retry on next call
    dbInstance = null;
    throw error;
  }
}


// --- Deck Operations ---

export async function getAllDecks(): Promise<Deck[]> {
  const db = await getDb();
  return await db.getAllAsync<Deck>('SELECT * FROM decks ORDER BY created_at DESC');
}

export async function createDeck(name: string, icon: string): Promise<number> {
  const db = await getDb();
  // Check for duplicate name (case-insensitive)
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM decks WHERE LOWER(name) = LOWER(?)',
    [name.trim()]
  );
  if (existing) {
    throw new Error(`Collection "${name}" already exists.`);
  }
  const createdAt = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO decks (name, icon, created_at) VALUES (?, ?, ?)',
    [name.trim(), icon, createdAt]
  );
  return result.lastInsertRowId;
}

export async function updateDeck(id: number, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE decks SET name = ? WHERE id = ?', [name, id]);
}

export async function deleteDeck(id: number): Promise<void> {
  const db = await getDb();
  // Get inbox id first
  const setting = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'inbox_deck_id'"
  );
  const inboxId = setting ? Number(setting.value) : null;
  if (inboxId) {
    await db.runAsync(
      'UPDATE flashcards SET deck_id = ? WHERE deck_id = ?',
      [inboxId, id]
    );
  }
  await db.runAsync('DELETE FROM decks WHERE id = ?', [id]);
}

export async function deleteMultipleDecks(ids: number[]): Promise<void> {
  if (!ids.length) return;
  const db = await getDb();
  const setting = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'inbox_deck_id'"
  );
  const inboxId = setting ? Number(setting.value) : null;
  const placeholders = ids.map(() => '?').join(',');
  if (inboxId) {
    await db.runAsync(
      `UPDATE flashcards SET deck_id = ? WHERE deck_id IN (${placeholders})`,
      [inboxId, ...ids]
    );
  }
  await db.runAsync(`DELETE FROM decks WHERE id IN (${placeholders})`, ids);
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
  return await db.getAllAsync<Flashcard>('SELECT * FROM flashcards ORDER BY created_at DESC');
}

export async function searchFlashcards(query: string): Promise<(Flashcard & { deck_name: string })[]> {
  const db = await getDb();
  return await db.getAllAsync<Flashcard & { deck_name: string }>(
    `SELECT f.*, d.name as deck_name FROM flashcards f
     LEFT JOIN decks d ON f.deck_id = d.id
     WHERE f.english LIKE ? OR f.vietnamese LIKE ?
     LIMIT 50`,
    [`%${query}%`, `%${query}%`]
  );
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

export async function createFlashcardBulk(
  cards: Array<Omit<Flashcard, 'id' | 'daily_reps' | 'last_studied_at' | 'total_reps'>>
): Promise<void> {
  const db = await getDb();
  
  // Get inbox id as fallback
  const setting = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_settings WHERE key = 'inbox_deck_id'");
  const inboxId = setting ? Number(setting.value) : 1;
  
  // Get valid deck ids
  const validDecks = await db.getAllAsync<{ id: number }>("SELECT id FROM decks");
  const validDeckIds = new Set(validDecks.map(d => d.id));

  await db.runAsync('BEGIN TRANSACTION');
  try {
    const baseTime = Date.now();
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const targetDeckId = (card.deck_id && validDeckIds.has(Number(card.deck_id))) ? Number(card.deck_id) : inboxId;

      // Check for duplicate in this transaction
      const existing = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM flashcards WHERE LOWER(TRIM(english)) = LOWER(TRIM(?)) LIMIT 1",
        [card.english]
      );

      if (existing) {
        // Update existing card but preserve SRS data
        await db.runAsync(
          `UPDATE flashcards SET 
            deck_id = ?, vietnamese = ?, phonetic = ?, word_type = ?, 
            grammar_note = ?, example_en = ?, example_vi = ?
           WHERE id = ?`,
          [
            targetDeckId, card.vietnamese ?? '', card.phonetic ?? null, card.word_type ?? null,
            card.grammar_note ?? null, card.example_en ?? null, card.example_vi ?? null,
            existing.id
          ]
        );
      } else {
        // Insert new card
        const createdAt = card.created_at || new Date(baseTime + i).toISOString();
        await db.runAsync(
          `INSERT INTO flashcards (
            deck_id, english, vietnamese, phonetic, word_type,
            grammar_note, example_en, example_vi, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            targetDeckId, card.english ?? '', card.vietnamese ?? '', card.phonetic ?? null,
            card.word_type ?? null, card.grammar_note ?? null, card.example_en ?? null, 
            card.example_vi ?? null, createdAt
          ]
        );
      }
    }
    await db.runAsync('COMMIT');
  } catch (e) {
    await db.runAsync('ROLLBACK');
    throw e;
  }
}

export async function updateFlashcardRep(id: number, dailyReps: number, totalReps: number): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE flashcards SET daily_reps = ?, total_reps = ?, last_studied_at = ? WHERE id = ?',
    [dailyReps, totalReps, now, id]
  );
}

export async function deleteFlashcard(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM flashcards WHERE id = ?', [id]);
}

export async function deleteMultipleFlashcards(ids: number[]): Promise<void> {
  if (!ids.length) return;
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM flashcards WHERE id IN (${placeholders})`, ids);
}

export async function updateFlashcard(card: Partial<Flashcard> & { id: number }): Promise<void> {
  const db = await getDb();
  const { id, ...rest } = card;
  const fields = Object.keys(rest) as (keyof typeof rest)[];
  if (fields.length === 0) return;
  const query = `UPDATE flashcards SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
  const values = [...fields.map(f => (rest as any)[f] ?? null), id];
  await db.runAsync(query, values);
}

export async function moveFlashcard(id: number, newDeckId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE flashcards SET deck_id = ? WHERE id = ?', [newDeckId, id]);
}

export async function moveMultipleFlashcards(ids: number[], targetDeckId: number): Promise<void> {
  if (!ids.length) return;
  const db = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE flashcards SET deck_id = ? WHERE id IN (${placeholders})`,
    [targetDeckId, ...ids]
  );
}

export async function findDuplicateFlashcard(english: string): Promise<Flashcard | null> {
  const db = await getDb();
  return await db.getFirstAsync<Flashcard>(
    `SELECT * FROM flashcards WHERE LOWER(TRIM(english)) = LOWER(TRIM(?)) LIMIT 1`,
    [english]
  ) ?? null;
}

// --- API Key Operations ---

export async function getApiKeys(): Promise<ApiKey[]> {
  const db = await getDb();
  return await db.getAllAsync<ApiKey>('SELECT * FROM api_keys ORDER BY fail_count ASC, created_at DESC');
}

export async function addApiKey(key: string): Promise<void> {
  const db = await getDb();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO api_keys (api_key, created_at) VALUES (?, ?)',
    [key, createdAt]
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

// --- Export / Import ---

export async function exportAllData(): Promise<{ version: string; exportedAt: string; decks: Deck[]; cards: Flashcard[] }> {
  const db = await getDb();
  const inboxIdStr = await getSetting('inbox_deck_id');
  const decks = await db.getAllAsync<Deck>('SELECT * FROM decks');
  const cards = await db.getAllAsync<Flashcard>('SELECT * FROM flashcards');
  return {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    decks,
    cards,
  };
}

export async function importBackupData(decks: any[], cards: any[]): Promise<void> {
  const db = await getDb();

  // 1. Map old decks to new IDs by name
  for (const deck of decks) {
    if (!deck.name) continue;
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM decks WHERE LOWER(name) = LOWER(?)',
      [deck.name]
    );
    if (!existing) {
      const createdAt = deck.created_at || new Date().toISOString();
      await db.runAsync(
        'INSERT OR IGNORE INTO decks (name, icon, created_at) VALUES (?, ?, ?)',
        [deck.name, deck.icon || '📚', createdAt]
      );
    }
  }

  // 2. Fetch fresh mapping of name -> id
  const currentDecks = await db.getAllAsync<{ id: number, name: string }>('SELECT id, name FROM decks');
  const nameToIdMap: Record<string, number> = {};
  const validDeckIds = new Set<number>();
  currentDecks.forEach(d => {
    nameToIdMap[d.name.toLowerCase()] = d.id;
    validDeckIds.add(d.id);
  });

  // Get inbox id as fallback
  const inboxSetting = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'inbox_deck_id'"
  );
  const inboxId = inboxSetting ? Number(inboxSetting.value) : 1;

  // 3. Import cards
  const baseTime = Date.now();
  await db.runAsync('BEGIN TRANSACTION');
  try {
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card.english || !card.vietnamese) continue;
      
      const createdAt = card.created_at || new Date(baseTime + i).toISOString();
      
      let targetId = inboxId;
      
      // Attempt mapping
      const oldDeck = decks.find(d => d.id === card.deck_id);
      if (oldDeck && oldDeck.name && nameToIdMap[oldDeck.name.toLowerCase()] !== undefined) {
        targetId = nameToIdMap[oldDeck.name.toLowerCase()];
      } else if (card.deck_name && nameToIdMap[card.deck_name.toLowerCase()] !== undefined) {
        targetId = nameToIdMap[card.deck_name.toLowerCase()];
      } else if (card.deck_id && validDeckIds.has(Number(card.deck_id))) {
        targetId = Number(card.deck_id);
      }

      await db.runAsync(
        `INSERT OR IGNORE INTO flashcards (
          deck_id, english, vietnamese, phonetic, word_type,
          grammar_note, example_en, example_vi, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          targetId,
          card.english ?? '', 
          card.vietnamese ?? '',
          card.phonetic ?? null,
          card.word_type ?? null,
          card.grammar_note ?? null,
          card.example_en ?? null,
          card.example_vi ?? null,
          createdAt ?? new Date().toISOString(),
        ]
      );
    }
    await db.runAsync('COMMIT');
  } catch (e) {
    await db.runAsync('ROLLBACK');
    throw e;
  }
}

import { create } from 'zustand';
import { Deck, Flashcard, ApiKey } from '../types';
import * as db from '../lib/db';
import { buildStudyQueue, getAge, getTargetReps, isOverdue } from '../lib/algorithm';

interface FlashcardState {
  // Data
  decks: Deck[];
  flashcards: Flashcard[];
  apiKeys: ApiKey[];
  inboxDeckId: number | null;

  // Intensive counters (for quick-action cards on home)
  newCramCount: number;      // Age 0 cards with daily_reps < 3
  focusReviewCount: number;  // Age 1-6 + milestone cards due

  // Session State
  sessionQueue: Flashcard[];
  currentSessionIndex: number;

  // Loading & Global State
  isLoading: boolean;
  isInitialized: boolean;

  // Actions - Initialization
  init: () => Promise<void>;
  
  // Active context
  activeDeckId: number | null;
  setActiveDeckId: (id: number | null) => void;

  // Actions - Sync
  refresh: () => Promise<void>;

  // Actions - Decks
  loadDecks: () => Promise<void>;
  addDeck: (name: string, icon: string) => Promise<void>;
  editDeck: (id: number, name: string) => Promise<void>;
  removeDeck: (id: number) => Promise<void>;
  removeMultipleDecks: (ids: number[]) => Promise<void>;

  // Actions - Flashcards
  loadFlashcards: (deckId?: number) => Promise<void>;
  searchFlashcards: (query: string) => Promise<(Flashcard & { deck_name: string })[]>;
  addFlashcard: (card: Omit<Flashcard, 'id' | 'daily_reps' | 'last_studied_at' | 'total_reps' | 'created_at'>) => Promise<void>;
  addFlashcardsBulk: (cards: Array<Omit<Flashcard, 'id' | 'daily_reps' | 'last_studied_at' | 'total_reps'>>) => Promise<void>;
  updateFlashcard: (card: Partial<Flashcard> & { id: number }) => Promise<void>;
  removeFlashcard: (id: number) => Promise<void>;
  removeMultipleFlashcards: (ids: number[]) => Promise<void>;
  moveFlashcard: (id: number, targetDeckId: number) => Promise<void>;
  moveMultipleFlashcards: (ids: number[], targetDeckId: number) => Promise<void>;
  findDuplicate: (english: string) => Promise<Flashcard | null>;

  // Actions - Session
  startSession: (deckId?: number, mode?: 'new' | 'review' | 'all') => void;
  recordRep: (cardId: number, isSuccess: boolean) => Promise<void>;
  nextCard: () => void;

  // Actions - API Keys
  loadApiKeys: () => Promise<void>;
  addApiKey: (key: string) => Promise<void>;
  removeApiKey: (id: number) => Promise<void>;
  toggleApiKey: (id: number, isActive: boolean) => Promise<void>;

  // Actions - Data
  exportData: () => Promise<{ version: string; exportedAt: string; decks: Deck[]; cards: Flashcard[] }>;
  importData: (decks: any[], cards: any[]) => Promise<void>;
}

function computeIntensiveCounts(flashcards: Flashcard[]) {
  const today = new Date();
  const dayOfWeek = today.getDay();

  let newCramCount = 0;
  let focusReviewCount = 0;

  for (const card of flashcards) {
    const age = getAge(card.created_at);
    const target = getTargetReps(age, dayOfWeek);

    if (age === 0) {
      // New card: target 3 reps
      if (card.daily_reps < 3) newCramCount++;
    } else if (target > 0 && card.daily_reps < target) {
      focusReviewCount++;
    } else if (isOverdue(card, today)) {
      focusReviewCount++;
    }
  }

  return { newCramCount, focusReviewCount };
}

export const useFlashcardStore = create<FlashcardState>((set, get) => ({
  decks: [],
  flashcards: [],
  apiKeys: [],
  inboxDeckId: null,
  newCramCount: 0,
  focusReviewCount: 0,
  sessionQueue: [],
  currentSessionIndex: 0,
  isLoading: false,
  isInitialized: false,

  init: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true });
    await db.initDb();
    const decks = await db.getAllDecks();
    const flashcards = await db.getAllFlashcards();
    const apiKeys = await db.getApiKeys();
    const inboxIdStr = await db.getSetting('inbox_deck_id');
    const inboxDeckId = inboxIdStr ? Number(inboxIdStr) : null;
    const counts = computeIntensiveCounts(flashcards);
    set({ decks, flashcards, apiKeys, inboxDeckId, ...counts, isLoading: false, isInitialized: true });
  },

  activeDeckId: null,
  setActiveDeckId: (id) => set({ activeDeckId: id }),

  refresh: async () => {
    const decks = await db.getAllDecks();
    const flashcards = await db.getAllFlashcards();
    const counts = computeIntensiveCounts(flashcards);
    set({ decks, flashcards, ...counts });
  },

  loadDecks: async () => {
    const decks = await db.getAllDecks();
    set({ decks });
  },

  addDeck: async (name, icon) => {
    await db.createDeck(name, icon);
    await get().refresh();
  },

  editDeck: async (id, name) => {
    await db.updateDeck(id, name);
    await get().loadDecks();
  },

  removeDeck: async (id) => {
    await db.deleteDeck(id);
    await get().refresh();
  },

  removeMultipleDecks: async (ids) => {
    await db.deleteMultipleDecks(ids);
    await get().refresh();
  },

  loadFlashcards: async (deckId) => {
    const flashcards = deckId
      ? await db.getFlashcardsByDeck(deckId)
      : await db.getAllFlashcards();
    const counts = computeIntensiveCounts(flashcards);
    set({ flashcards, ...counts });
  },

  searchFlashcards: async (query) => {
    return await db.searchFlashcards(query);
  },

  addFlashcard: async (cardData) => {
    await db.createFlashcard(cardData);
    await get().refresh();
  },

  addFlashcardsBulk: async (cards) => {
    await db.createFlashcardBulk(cards);
    await get().refresh();
  },

  updateFlashcard: async (card) => {
    await db.updateFlashcard(card);
    const flashcards = await db.getAllFlashcards();
    const counts = computeIntensiveCounts(flashcards);
    set({ flashcards, ...counts });
  },

  removeFlashcard: async (id) => {
    await db.deleteFlashcard(id);
    await get().refresh();
  },

  removeMultipleFlashcards: async (ids) => {
    await db.deleteMultipleFlashcards(ids);
    await get().refresh();
  },

  moveFlashcard: async (id, targetDeckId) => {
    await db.moveFlashcard(id, targetDeckId);
    await get().refresh();
  },

  moveMultipleFlashcards: async (ids, targetDeckId) => {
    await db.moveMultipleFlashcards(ids, targetDeckId);
    await get().refresh();
  },

  findDuplicate: async (english) => {
    return await db.findDuplicateFlashcard(english);
  },

  startSession: (deckId, mode = 'review') => {
    const { flashcards } = get();
    const filtered = deckId
      ? flashcards.filter(c => c.deck_id === deckId)
      : flashcards;

    let queue: Flashcard[];
    if (mode === 'all') {
      // Full review - all cards shuffled
      queue = [...filtered].sort(() => Math.random() - 0.5);
    } else if (mode === 'new') {
      // Only age 0 cards
      queue = filtered.filter(c => getAge(c.created_at) === 0);
    } else {
      queue = buildStudyQueue(filtered);
    }

    set({ sessionQueue: queue, currentSessionIndex: 0 });
  },

  recordRep: async (cardId, isSuccess) => {
    const { flashcards } = get();
    const card = flashcards.find(c => c.id === cardId);
    if (!card) return;

    const newDailyReps = isSuccess ? card.daily_reps + 1 : card.daily_reps;
    const newTotalReps = card.total_reps + 1;
    await db.updateFlashcardRep(cardId, newDailyReps, newTotalReps);

    const updatedFlashcards = await db.getAllFlashcards();
    const counts = computeIntensiveCounts(updatedFlashcards);
    set({ flashcards: updatedFlashcards, ...counts });
  },

  nextCard: () => {
    set(state => ({ currentSessionIndex: state.currentSessionIndex + 1 }));
  },

  loadApiKeys: async () => {
    const apiKeys = await db.getApiKeys();
    set({ apiKeys });
  },

  addApiKey: async (key) => {
    await db.addApiKey(key);
    await get().loadApiKeys();
  },

  removeApiKey: async (id) => {
    await db.deleteApiKey(id);
    await get().loadApiKeys();
  },

  toggleApiKey: async (id, isActive) => {
    await db.updateApiKeyStatus(id, isActive);
    await get().loadApiKeys();
  },

  exportData: async () => {
    return await db.exportAllData();
  },

  importData: async (decks, cards) => {
    await db.importBackupData(decks, cards);
    await get().refresh();
  },
}));

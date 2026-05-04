import { create } from 'zustand';
import { Deck, Flashcard, ApiKey, WordType } from '../types';
import * as db from '../lib/db';
import { buildStudyQueue, isDoneToday } from '../lib/algorithm';

interface FlashcardState {
  // Data
  decks: Deck[];
  flashcards: Flashcard[];
  apiKeys: ApiKey[];
  inboxDeckId: number | null; // ID of the reserved Inbox deck
  
  // Session State
  sessionQueue: Flashcard[];
  currentSessionIndex: number;
  
  // Loading & Global State
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions - Initialization
  init: () => Promise<void>;
  
  // Actions - Decks
  loadDecks: () => Promise<void>;
  addDeck: (name: string, icon: string) => Promise<void>;
  removeDeck: (id: number) => Promise<void>;
  
  // Actions - Flashcards
  loadFlashcards: (deckId?: number) => Promise<void>;
  addFlashcard: (card: Omit<Flashcard, 'id' | 'daily_reps' | 'last_studied_at' | 'total_reps' | 'created_at'>) => Promise<void>;
  updateFlashcard: (card: Partial<Flashcard> & { id: number }) => Promise<void>;
  removeFlashcard: (id: number) => Promise<void>;
  
  // Actions - Session
  startSession: (deckId?: number) => void;
  recordRep: (cardId: number, isSuccess: boolean) => Promise<void>;
  nextCard: () => void;
  
  // Actions - API Keys
  loadApiKeys: () => Promise<void>;
  addApiKey: (label: string, key: string) => Promise<void>;
  removeApiKey: (id: number) => Promise<void>;
  toggleApiKey: (id: number, isActive: boolean) => Promise<void>;
}

export const useFlashcardStore = create<FlashcardState>((set, get) => ({
  decks: [],
  flashcards: [],
  apiKeys: [],
  inboxDeckId: null,
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
    // Read the Inbox deck ID that was seeded during initDb
    const inboxIdStr = await db.getSetting('inbox_deck_id');
    const inboxDeckId = inboxIdStr ? Number(inboxIdStr) : null;
    set({ decks, flashcards, apiKeys, inboxDeckId, isLoading: false, isInitialized: true });
  },

  loadDecks: async () => {
    const decks = await db.getAllDecks();
    set({ decks });
  },

  addDeck: async (name, icon) => {
    await db.createDeck(name, icon);
    await get().loadDecks();
  },

  removeDeck: async (id) => {
    await db.deleteDeck(id);
    await get().loadDecks();
    await get().loadFlashcards();
  },

  loadFlashcards: async (deckId) => {
    const flashcards = deckId 
      ? await db.getFlashcardsByDeck(deckId)
      : await db.getAllFlashcards();
    set({ flashcards });
  },

  addFlashcard: async (cardData) => {
    await db.createFlashcard(cardData);
    await get().loadFlashcards(cardData.deck_id);
  },

  updateFlashcard: async (card) => {
    await db.updateFlashcard(card);
    // Refresh the specific list or all
    const flashcards = await db.getAllFlashcards();
    set({ flashcards });
  },

  removeFlashcard: async (id) => {
    await db.deleteFlashcard(id);
    const flashcards = await db.getAllFlashcards();
    set({ flashcards });
  },

  startSession: (deckId) => {
    const { flashcards } = get();
    const filtered = deckId 
      ? flashcards.filter(c => c.deck_id === deckId)
      : flashcards;
    
    const queue = buildStudyQueue(filtered);
    set({ sessionQueue: queue, currentSessionIndex: 0 });
  },

  recordRep: async (cardId, isSuccess) => {
    const { flashcards } = get();
    const card = flashcards.find(c => c.id === cardId);
    if (!card) return;

    if (isSuccess) {
      const newDailyReps = card.daily_reps + 1;
      const newTotalReps = card.total_reps + 1;
      await db.updateFlashcardRep(cardId, newDailyReps, newTotalReps);
    } else {
      // In intensive learning, failure might reset daily progress or just stay same
      // Let's keep it same for now but update timestamp
      await db.updateFlashcardRep(cardId, card.daily_reps, card.total_reps);
    }

    // Refresh state
    const updatedFlashcards = await db.getAllFlashcards();
    set({ flashcards: updatedFlashcards });
  },

  nextCard: () => {
    set(state => ({ currentSessionIndex: state.currentSessionIndex + 1 }));
  },

  loadApiKeys: async () => {
    const apiKeys = await db.getApiKeys();
    set({ apiKeys });
  },

  addApiKey: async (label, key) => {
    await db.addApiKey(label, key);
    await get().loadApiKeys();
  },

  removeApiKey: async (id) => {
    await db.deleteApiKey(id);
    await get().loadApiKeys();
  },

  toggleApiKey: async (id, isActive) => {
    await db.updateApiKeyStatus(id, isActive);
    await get().loadApiKeys();
  }
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getAge, getTargetReps, isOverdue } from '../lib/algorithm';
import * as db from '../lib/db';
import { ApiKey, Collection, Flashcard } from '../types';

interface FlashcardState {
  // Data
  collections: Collection[];
  flashcards: Flashcard[];
  apiKeys: ApiKey[];
  inboxCollectionId: number | null;

  // Intensive counters
  newCramCount: number;
  newCramTotalCount: number;
  focusReviewCount: number;
  focusTotalCount: number;

  // Session State
  sessionQueue: Flashcard[];
  currentSessionIndex: number;
  sessionMode: 'new' | 'review' | 'all' | null;
  
  // Exam State
  examQueue: Flashcard[];
  examIndex: number;
  examResults: { remember: number; forget: number };
  isExamActive: boolean;

  // Loading & Global State
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  init: () => Promise<void>;
  activeCollectionId: number | null;
  setActiveCollectionId: (id: number | null) => void;
  refresh: () => Promise<void>;
  loadCollections: () => Promise<void>;
  addCollection: (name: string, icon: string) => Promise<number>;
  editCollection: (id: number, name: string) => Promise<void>;
  removeCollection: (id: number) => Promise<void>;
  removeMultipleCollections: (ids: number[]) => Promise<void>;
  loadFlashcards: (collectionId?: number) => Promise<void>;
  searchFlashcards: (query: string) => Promise<(Flashcard & { collection_name: string })[]>;
  addFlashcard: (card: Omit<Flashcard, 'id' | 'daily_reps' | 'last_studied_at' | 'total_reps' | 'created_at'>) => Promise<void>;
  addFlashcardsBulk: (cards: Array<Omit<Flashcard, 'id' | 'daily_reps' | 'last_studied_at' | 'total_reps'>>) => Promise<void>;
  updateFlashcard: (card: Partial<Flashcard> & { id: number }) => Promise<void>;
  removeFlashcard: (id: number) => Promise<void>;
  removeMultipleFlashcards: (ids: number[]) => Promise<void>;
  moveFlashcard: (id: number, targetCollectionId: number) => Promise<void>;
  moveMultipleFlashcards: (ids: number[], targetCollectionId: number) => Promise<void>;
  findDuplicate: (english: string) => Promise<Flashcard | null>;
  startSession: (collectionId?: number, mode?: 'new' | 'review' | 'all') => void;
  recordRep: (cardId: number, isSuccess: boolean) => Promise<void>;
  nextCard: () => void;
  startExam: () => void;
  recordExamRep: (isSuccess: boolean) => void;
  resetExam: () => void;
  loadApiKeys: () => Promise<void>;
  addApiKey: (key: string) => Promise<void>;
  removeApiKey: (id: number) => Promise<void>;
  toggleApiKey: (id: number, isActive: boolean) => Promise<void>;
  exportData: () => Promise<any>;
  importData: (collections: any[], cards: any[]) => Promise<void>;
}

function computeIntensiveCounts(flashcards: Flashcard[]) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  let newCramCount = 0;
  let newCramTotalCount = 0;
  let focusReviewCount = 0;
  let focusTotalCount = 0;

  for (const card of flashcards) {
    const age = getAge(card.created_at);
    const target = getTargetReps(age, dayOfWeek);
    if (age === 0 && target > 0) {
      newCramTotalCount++;
      if (card.daily_reps < target) newCramCount++;
    } 
    if (age > 0 && target > 0) {
      focusTotalCount++;
      if (card.daily_reps < target || isOverdue(card, today)) focusReviewCount++;
    } else if (age > 0 && isOverdue(card, today)) {
      focusTotalCount++;
      focusReviewCount++;
    }
  }
  return { newCramCount, newCramTotalCount, focusReviewCount, focusTotalCount };
}

export const useFlashcardStore = create<FlashcardState>()(
  persist(
    (set, get) => ({
      collections: [],
      flashcards: [],
      apiKeys: [],
      inboxCollectionId: null,
      newCramCount: 0,
      newCramTotalCount: 0,
      focusReviewCount: 0,
      focusTotalCount: 0,
      sessionQueue: [],
      currentSessionIndex: 0,
      sessionMode: null,
      examQueue: [],
      examIndex: 0,
      examResults: { remember: 0, forget: 0 },
      isExamActive: false,
      isLoading: false,
      isInitialized: false,
      activeCollectionId: null,

      init: async () => {
        if (get().isInitialized) return;
        set({ isLoading: true });
        await db.initDb();
        const collections = await db.getAllCollections();
        const flashcards = await db.getAllFlashcards();
        const apiKeys = await db.getApiKeys();
        const inboxIdStr = await db.getSetting('inbox_collection_id');
        const inboxCollectionId = inboxIdStr ? Number(inboxIdStr) : null;
        const counts = computeIntensiveCounts(flashcards);
        set({ collections, flashcards, apiKeys, inboxCollectionId, ...counts, isLoading: false, isInitialized: true });
      },

      setActiveCollectionId: (id) => set({ activeCollectionId: id }),

      refresh: async () => {
        await db.resetDailyRepsIfNeeded();
        const collections = await db.getAllCollections();
        const flashcards = await db.getAllFlashcards();
        const counts = computeIntensiveCounts(flashcards);
        set({ collections, flashcards, ...counts });
      },

      loadCollections: async () => {
        const collections = await db.getAllCollections();
        set({ collections });
      },

      addCollection: async (name, icon) => {
        const id = await db.createCollection(name, icon);
        await get().refresh();
        return id;
      },

      editCollection: async (id, name) => {
        await db.updateCollection(id, name);
        await get().loadCollections();
      },

      removeCollection: async (id) => {
        await db.deleteCollection(id);
        await get().refresh();
      },

      removeMultipleCollections: async (ids) => {
        await db.deleteMultipleCollections(ids);
        await get().refresh();
      },

      loadFlashcards: async (collectionId) => {
        await db.resetDailyRepsIfNeeded();
        const flashcards = collectionId
          ? await db.getFlashcardsByCollection(collectionId)
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
        set({ flashcards: flashcards, ...counts });
      },

      removeFlashcard: async (id) => {
        await db.deleteFlashcard(id);
        await get().refresh();
      },

      removeMultipleFlashcards: async (ids) => {
        await db.deleteMultipleFlashcards(ids);
        await get().refresh();
      },

      moveFlashcard: async (id, targetCollectionId) => {
        await db.moveFlashcard(id, targetCollectionId);
        await get().refresh();
      },

      moveMultipleFlashcards: async (ids, targetCollectionId) => {
        await db.moveMultipleFlashcards(ids, targetCollectionId);
        await get().refresh();
      },

      findDuplicate: async (english) => {
        return await db.findDuplicateFlashcard(english);
      },

      startSession: (collectionId, mode = 'review') => {
        const { flashcards } = get();
        const now = new Date();
        const dayOfWeek = now.getDay();
        const filtered = collectionId ? flashcards.filter(c => c.collection_id === collectionId) : flashcards;
        let queue: Flashcard[] = [];
        if (mode === 'all') {
          queue = [...filtered].sort(() => Math.random() - 0.5);
        } else if (mode === 'new') {
          const todayCards = filtered.filter(c => {
            const age = getAge(c.created_at);
            const target = getTargetReps(age, dayOfWeek);
            return age === 0 && target > 0;
          });
          const due = todayCards.filter(c => c.daily_reps < 3).sort(() => Math.random() - 0.5);
          const done = todayCards.filter(c => c.daily_reps >= 3).sort(() => Math.random() - 0.5);
          queue = [...due, ...done];
        } else {
          const eligible = filtered.filter(c => {
            const age = getAge(c.created_at);
            const target = getTargetReps(age, dayOfWeek);
            return (age > 0 && target > 0) || (age > 0 && isOverdue(c, now));
          });
          const due = eligible.filter(c => {
            const age = getAge(c.created_at);
            const target = getTargetReps(age, dayOfWeek);
            return c.daily_reps < target || isOverdue(c, now);
          }).sort(() => Math.random() - 0.5);
          const done = eligible.filter(c => {
            const age = getAge(c.created_at);
            const target = getTargetReps(age, dayOfWeek);
            return c.daily_reps >= target && !isOverdue(c, now);
          }).sort(() => Math.random() - 0.5);
          queue = [...due, ...done];
        }
        set({ sessionQueue: queue, currentSessionIndex: 0, sessionMode: mode });
      },

      recordRep: async (cardId, isSuccess) => {
        const { flashcards, sessionQueue, currentSessionIndex } = get();
        const card = flashcards.find(c => c.id === cardId);
        if (!card) return;
        const newDailyReps = isSuccess ? card.daily_reps + 1 : card.daily_reps;
        const newTotalReps = card.total_reps + 1;
        await db.updateFlashcardRep(cardId, newDailyReps, newTotalReps);
        if (!isSuccess) {
          const sessionCard = sessionQueue[currentSessionIndex];
          if (sessionCard) {
            set(state => ({ sessionQueue: [...state.sessionQueue, sessionCard] }));
          }
        }
        const updatedFlashcards = await db.getAllFlashcards();
        const counts = computeIntensiveCounts(updatedFlashcards);
        set({ flashcards: updatedFlashcards, ...counts });
      },

      nextCard: () => set(state => ({ currentSessionIndex: state.currentSessionIndex + 1 })),

      startExam: () => {
        const { flashcards } = get();
        const studiedCards = flashcards.filter(c => c.total_reps > 0);
        if (studiedCards.length === 0) return;
        const shuffled = [...studiedCards].sort(() => Math.random() - 0.5);
        set({ examQueue: shuffled, examIndex: 0, examResults: { remember: 0, forget: 0 }, isExamActive: true });
      },

      recordExamRep: (isSuccess) => {
        set(state => ({
          examIndex: state.examIndex + 1,
          examResults: {
            remember: isSuccess ? state.examResults.remember + 1 : state.examResults.remember,
            forget: !isSuccess ? state.examResults.forget + 1 : state.examResults.forget,
          }
        }));
      },

      resetExam: () => {
        set({ examQueue: [], examIndex: 0, examResults: { remember: 0, forget: 0 }, isExamActive: false });
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

      exportData: async () => await db.exportAllData(),

      importData: async (collections, cards) => {
        await db.importBackupData(collections, cards);
        await get().refresh();
      },
    }),
    {
      name: 'linguistai-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        examQueue: state.examQueue,
        examIndex: state.examIndex,
        examResults: state.examResults,
        isExamActive: state.isExamActive,
        sessionQueue: state.sessionQueue,
        currentSessionIndex: state.currentSessionIndex,
        sessionMode: state.sessionMode,
        inboxCollectionId: state.inboxCollectionId,
      }),
    }
  )
);

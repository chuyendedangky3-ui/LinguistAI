import { Flashcard } from '../types';

/**
 * Intensive Learning Algorithm implementation.
 * Pure functions for scheduling and filtering.
 */

/**
 * Calculates the Age of a card in days.
 */
export function getAge(createdAt: string): number {
  const created = new Date(createdAt);
  const today = new Date();
  
  // Set to midnight UTC for consistent day calculation
  const createdDay = Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate());
  const todayDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((todayDay - createdDay) / msPerDay);
}

/**
 * Determines the target reps for a card based on its age and today's day of week.
 */
export function getTargetReps(age: number, dayOfWeek: number): number {
  // Sunday logic (Grand Review)
  if (dayOfWeek === 0) {
    if (age <= 6) return 1;
    if (age >= 14 && age <= 20) return 1; // Milestone 1
    if (age >= 28 && age <= 34) return 1; // Milestone 2
    return 0;
  }

  // Weekday logic
  switch (age) {
    case 0: return 3; // New card
    case 1: return 1; // Review C1
    case 2: return 1; // Review C2
    case 5: return 1; // Review C3a
    case 6: return 1; // Review C3b
    default: return 0;
  }
}

/**
 * Checks if a card is overdue (missed a previous milestone).
 */
export function isOverdue(card: Flashcard, today: Date = new Date()): boolean {
  if (!card.last_studied_at) return false;
  
  const lastStudied = new Date(card.last_studied_at);
  const isTodayStudied = 
    lastStudied.getUTCDate() === today.getUTCDate() &&
    lastStudied.getUTCMonth() === today.getUTCMonth() &&
    lastStudied.getUTCFullYear() === today.getUTCFullYear();
    
  if (isTodayStudied) return false;

  const age = getAge(card.created_at);
  const target = getTargetReps(age, today.getDay());
  
  return target > 0 && card.daily_reps < target;
}

/**
 * Checks if a card is "done" for today.
 */
export function isDoneToday(card: Flashcard, today: Date = new Date()): boolean {
  const age = getAge(card.created_at);
  const target = getTargetReps(age, today.getDay());
  return card.daily_reps >= target;
}

/**
 * Filters and sorts flashcards for a study session.
 */
export function buildStudyQueue(cards: Flashcard[]): Flashcard[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  const dueCards = cards.filter(card => {
    const age = getAge(card.created_at);
    const target = getTargetReps(age, dayOfWeek);
    
    // Include if it's due today and not finished, or if it's overdue
    const isDueToday = target > 0 && card.daily_reps < target;
    return isDueToday || isOverdue(card, now);
  });

  // Sort: Overdue first (oldest first), then Today's cards (newest first)
  return dueCards.sort((a, b) => {
    const overdueA = isOverdue(a, now);
    const overdueB = isOverdue(b, now);

    if (overdueA && !overdueB) return -1;
    if (!overdueA && overdueB) return 1;

    const ageA = getAge(a.created_at);
    const ageB = getAge(b.created_at);

    if (overdueA) {
      return ageB - ageA; // Oldest overdue first
    } else {
      return ageA - ageB; // Newest today first
    }
  });
}

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Brain,
  Check,
  ChevronRight,
  Eye, EyeOff,
  FolderInput,
  Info,
  Play,
  RotateCcw,
  Search,
  Trash2,
  X
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WordDetailModal } from '../../components/flashcard/WordDetailModal';
import { Card } from '../../components/ui/Card';
import { COLORS, LAYOUT } from '../../constants/theme';
import { getAge, getTargetReps } from '../../lib/algorithm';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { Flashcard } from '../../types';

export default function ReviewScreen() {
  const router = useRouter();
  const { 
    flashcards, decks, activeDeckId, inboxDeckId, setActiveDeckId, refresh,
    updateFlashcard, removeFlashcard, removeMultipleFlashcards, moveFlashcard, moveMultipleFlashcards
  } = useFlashcardStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showMeanings, setShowMeanings] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Multi-select cards
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(new Set());
  
  // Move cards modal
  const [isMoveModalVisible, setIsMoveModalVisible] = useState(false);

  const { editId } = useLocalSearchParams();

  useFocusEffect(useCallback(() => { 
    refresh(); 
    // Handle auto-open if editId is provided
    if (editId) {
      const card = flashcards.find(c => c.id === Number(editId));
      if (card) {
        setSelectedCard(card);
        setDetailVisible(true);
      }
    }
  }, [editId, flashcards]));

  const activeDeck = useMemo(() => 
    activeDeckId ? decks.find(d => d.id === activeDeckId) : null
  , [activeDeckId, decks]);

  const activeCards = useMemo(() => {
    if (!activeDeckId) return [];
    return flashcards.filter(c => c.deck_id === activeDeckId)
      .filter(c => 
        c.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.vietnamese.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [flashcards, activeDeckId, searchQuery]);

  const globalSessionInfo = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    const dueToday = flashcards.filter(c => {
      const age = getAge(c.created_at);
      const target = getTargetReps(age, dayOfWeek);
      return target > 0 && c.daily_reps < target;
    });

    const overdue = flashcards.filter(c => {
      const age = getAge(c.created_at);
      const target = getTargetReps(age, dayOfWeek);
      if (c.daily_reps > 0) return false; 
      if (age > 0 && target > 0) return true;
      return false;
    }).filter(c => !dueToday.includes(c));

    return { dueToday, overdue };
  }, [flashcards]);

  const activeStats = useMemo(() => {
    if (!activeDeckId) return null;
    const cards = flashcards.filter(c => c.deck_id === activeDeckId);
    const today = new Date();
    const dayOfWeek = today.getDay();
    let mastered = 0, due = 0;
    for (const c of cards) {
      const age = getAge(c.created_at);
      const target = getTargetReps(age, dayOfWeek);
      if (c.total_reps >= 10) mastered++;
      else if (target > 0 && c.daily_reps < target) due++;
    }
    return { mastered, due, total: cards.length };
  }, [flashcards, activeDeckId]);

  const handleEditCard = (card: Flashcard) => {
    setDetailVisible(false);
    router.push({
      pathname: '/deck/[id]',
      params: { id: card.deck_id, editId: card.id }
    });
  };

  const toggleSelectCard = (id: number) => {
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAllCards = () => {
    if (selectedCardIds.size === activeCards.length) {
      setSelectedCardIds(new Set());
    } else {
      setSelectedCardIds(new Set(activeCards.map(c => c.id)));
    }
  };

  const handleCancelMulti = () => {
    setIsMultiSelectMode(false);
    setSelectedCardIds(new Set());
  };

  const handleDeleteMultiple = () => {
    if (selectedCardIds.size === 0) return;
    Alert.alert(
      'Bulk Delete',
      `What would you like to do with ${selectedCardIds.size} selected words?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Inbox',
          onPress: async () => {
            if (inboxDeckId) {
              await moveMultipleFlashcards(Array.from(selectedCardIds), inboxDeckId);
              handleCancelMulti();
            }
          }
        },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            await removeMultipleFlashcards(Array.from(selectedCardIds));
            handleCancelMulti();
          }
        },
      ]
    );
  };

  const handleMoveMultiple = (targetDeckId: number) => {
    moveMultipleFlashcards(Array.from(selectedCardIds), targetDeckId);
    setIsMoveModalVisible(false);
    handleCancelMulti();
    Alert.alert('Success', `Moved ${selectedCardIds.size} words.`);
  };

  const handleSingleDelete = (card: Flashcard) => {
    Alert.alert(
      'Delete Card',
      `What would you like to do with "${card.english}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Inbox',
          onPress: async () => {
            if (inboxDeckId) {
              await moveFlashcard(card.id, inboxDeckId);
              setDetailVisible(false);
            }
          }
        },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            await removeFlashcard(card.id);
            setDetailVisible(false);
          }
        },
      ]
    );
  };

  if (activeDeck && activeStats) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.focusedHeader}>
          {isMultiSelectMode ? (
            <TouchableOpacity onPress={handleCancelMulti} style={styles.backBtn}>
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setActiveDeckId(null)} style={styles.backBtn}>
              <ArrowLeft size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
          
          <Text style={styles.focusedTitle} numberOfLines={1}>
            {isMultiSelectMode ? `${selectedCardIds.size} Selected` : activeDeck.name}
          </Text>

          {isMultiSelectMode ? (
            <TouchableOpacity onPress={handleSelectAllCards} style={styles.selectAllBtn}>
              <Text style={styles.selectAllText}>
                {selectedCardIds.size === activeCards.length ? 'Deselect' : 'All'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.focusedStudyBtn} onPress={() => router.push({ pathname: '/session/[id]', params: { id: String(activeDeckId) } })}>
              <Play size={14} color="white" fill="white" />
              <Text style={styles.focusedStudyBtnText}>Study</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isMultiSelectMode && (
          <View style={styles.activeStatsRow}>
            <View style={styles.statChip}><Text style={styles.statChipText}>Total: {activeStats.total}</Text></View>
            <View style={[styles.statChip, { backgroundColor: '#E8F5E9' }]}><Text style={[styles.statChipText, { color: COLORS.success }]}>Mastered: {activeStats.mastered}</Text></View>
            <View style={[styles.statChip, { backgroundColor: '#FFF3E0' }]}><Text style={[styles.statChipText, { color: COLORS.warning }]}>Due: {activeStats.due}</Text></View>
          </View>
        )}

        <View style={styles.searchBar}>
          <Search size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search words..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={() => { setShowMeanings(!showMeanings); setRevealedIds(new Set()); }}>
            {showMeanings ? <EyeOff size={18} color={COLORS.primary} /> : <Eye size={18} color={COLORS.primary} />}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cardList}>
          {activeCards.map(card => (
            <TouchableOpacity 
              key={card.id} 
              style={[styles.cardRow, isMultiSelectMode && selectedCardIds.has(card.id) && styles.cardRowSelected]}
              onPress={() => {
                if (isMultiSelectMode) {
                  toggleSelectCard(card.id);
                } else {
                  setSelectedCard(card);
                  setDetailVisible(true);
                }
              }}
              onLongPress={() => {
                if (!isMultiSelectMode) {
                  setIsMultiSelectMode(true);
                  setSelectedCardIds(new Set([card.id]));
                }
              }}
              delayLongPress={300}
            >
              {isMultiSelectMode && (
                <View style={[styles.checkbox, selectedCardIds.has(card.id) && styles.checkboxChecked]}>
                  {selectedCardIds.has(card.id) && <Check size={10} color="white" />}
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardEn}>{card.english}</Text>
                {(showMeanings || revealedIds.has(card.id)) ? (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setRevealedIds(prev => {
                        const next = new Set(prev);
                        next.delete(card.id);
                        return next;
                      });
                    }}
                  >
                    <Text style={styles.cardVi}>{card.vietnamese}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      setRevealedIds(prev => {
                        const next = new Set(prev);
                        next.add(card.id);
                        return next;
                      });
                    }}
                  >
                    <Text style={styles.tapReveal}>Tap to reveal...</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
          {activeCards.length === 0 && (
            <Text style={styles.emptyText}>No words found in this collection.</Text>
          )}
          <View style={{ height: 120 }} />
        </ScrollView>

        {isMultiSelectMode && (
          <View style={styles.multiBar}>
            <TouchableOpacity style={styles.multiBarBtn} onPress={() => setIsMoveModalVisible(true)}>
              <FolderInput size={20} color="white" />
              <Text style={styles.multiBarBtnText}>Move</Text>
            </TouchableOpacity>
            <View style={styles.multiDivider} />
            <TouchableOpacity style={styles.multiBarBtn} onPress={handleDeleteMultiple}>
              <Trash2 size={20} color="#FF5252" />
              <Text style={[styles.multiBarBtnText, { color: '#FF5252' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        <WordDetailModal
          visible={detailVisible}
          word={selectedCard}
          onClose={() => setDetailVisible(false)}
          onEdit={handleEditCard}
          onDelete={handleSingleDelete}
        />

        <Modal visible={isMoveModalVisible} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsMoveModalVisible(false)}>
            <View style={styles.modalSheet}>
              <View style={styles.handleBar} />
              <Text style={styles.modalTitle}>Move to Collection</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {decks.map(d => (
                  <TouchableOpacity 
                    key={d.id} 
                    style={[styles.deckSelectRow, d.id === activeDeckId && styles.deckSelectRowDisabled]} 
                    disabled={d.id === activeDeckId}
                    onPress={() => handleMoveMultiple(d.id)}
                  >
                    <Text style={styles.deckEmoji}>{d.icon || '📚'}</Text>
                    <Text style={styles.deckSelectName}>{d.name}</Text>
                    {d.id === activeDeckId ? (
                      <Text style={styles.currentLabel}>Current</Text>
                    ) : (
                      <ChevronRight size={16} color={COLORS.border} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setIsMoveModalVisible(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Review</Text>
          <Text style={styles.subtitle}>Stay consistent with Intensive Learning.</Text>
        </View>

        <TouchableOpacity 
          style={styles.heroCard} 
          activeOpacity={0.9}
          onPress={() => router.push({ pathname: '/session/[id]', params: { id: 'review' } })}
        >
          <View style={styles.heroIcon}>
            <RotateCcw size={32} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Smart Review Session</Text>
            <Text style={styles.heroSubtitle}>
              {globalSessionInfo.dueToday.length + globalSessionInfo.overdue.length} cards scheduled for focus today.
            </Text>
          </View>
          <View style={styles.heroBtn}>
            <Brain size={20} color={COLORS.primary} />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>TODAY'S SCHEDULE</Text>
        
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={[styles.infoDot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.infoText}>Active Review</Text>
            <Text style={styles.infoCount}>{globalSessionInfo.dueToday.length}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={[styles.infoDot, { backgroundColor: COLORS.warning }]} />
            <Text style={styles.infoText}>Overdue Cards</Text>
            <Text style={styles.infoCount}>{globalSessionInfo.overdue.length}</Text>
          </View>
        </Card>

        <Text style={styles.sectionHeader}>ALGORITHM GUIDE</Text>
        <Card style={styles.guideCard}>
          <View style={styles.guideItem}>
            <View style={styles.guideNum}><Text style={styles.guideNumText}>1</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.guideTitle}>Phase 1: The Intensive Week</Text>
              <Text style={styles.guideDesc}>Learn new cards 3x on Day 1. Review on Days 2, 3, 6, and 7.</Text>
            </View>
          </View>
          <View style={styles.guideItem}>
            <View style={styles.guideNum}><Text style={styles.guideNumText}>2</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.guideTitle}>Phase 2: Milestone Review</Text>
              <Text style={styles.guideDesc}>Sunday reviews on Week 3 and Week 5 to cement long-term memory.</Text>
            </View>
          </View>
          <View style={styles.guideItem}>
            <View style={styles.guideNum}><Text style={styles.guideNumText}>3</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.guideTitle}>Phase 3: Graduation</Text>
              <Text style={styles.guideDesc}>After Week 5, the word is considered mastered and leaves focus.</Text>
            </View>
          </View>
        </Card>

        <View style={styles.tipBox}>
          <Info size={16} color={COLORS.textMuted} />
          <Text style={styles.tipText}>
            Intensive Learning prioritize high-frequency contact in the first month over traditional SRS intervals.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16 },
  header: { marginBottom: 20 },
  title: { fontFamily: 'Outfit_700Bold', fontSize: 28, color: COLORS.textPrimary },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  
  // Focused Mode
  focusedHeader: { 
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, 
    paddingVertical: 10, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: COLORS.border 
  },
  backBtn: { padding: 6, marginRight: 6 },
  focusedTitle: { flex: 1, fontFamily: 'Outfit_700Bold', fontSize: 18, color: COLORS.textPrimary },
  selectAllBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.border, borderRadius: 16 },
  selectAllText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: COLORS.textSecondary },
  focusedStudyBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, 
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 4 
  },
  focusedStudyBtnText: { fontFamily: 'Outfit_600SemiBold', fontSize: 12, color: 'white' },
  activeStatsRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 10 },
  statChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: COLORS.border },
  statChipText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: COLORS.textSecondary },
  searchBar: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', 
    margin: 16, paddingHorizontal: 14, height: 44, borderRadius: 12, ...LAYOUT.shadow 
  },
  searchInput: { flex: 1, marginHorizontal: 10, fontFamily: 'Inter_400Regular', fontSize: 14 },
  cardList: { paddingHorizontal: 16 },
  cardRow: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', 
    borderRadius: 12, padding: 12, marginBottom: 10, ...LAYOUT.shadow, borderWidth: 1.5, borderColor: 'transparent'
  },
  cardRowSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  checkbox: { 
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: COLORS.border, 
    marginRight: 10, alignItems: 'center', justifyContent: 'center' 
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cardEn: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: COLORS.textPrimary },
  cardVi: { fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  tapReveal: { fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.border, fontStyle: 'italic', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  progressDots: { flexDirection: 'row', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  dotFilled: { backgroundColor: COLORS.success },
  dotEmpty: { backgroundColor: COLORS.border },
  
  // Multi-bar
  multiBar: { 
    position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: '#1A1A1A', 
    borderRadius: 16, flexDirection: 'row', padding: 2, ...LAYOUT.shadow 
  },
  multiBarBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  multiBarBtnText: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: 'white' },
  multiDivider: { width: 1, height: '50%', backgroundColor: '#333', alignSelf: 'center' },

  // Global Mode
  heroCard: {
    backgroundColor: COLORS.primary, borderRadius: 20, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24,
    ...LAYOUT.shadow, shadowColor: COLORS.primary, shadowOpacity: 0.15,
  },
  heroIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: 'white' },
  heroSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  heroBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },

  sectionHeader: { fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 1.2, color: COLORS.textMuted, marginBottom: 8 },
  infoCard: { padding: 8, marginBottom: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  infoDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  infoText: { flex: 1, fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: COLORS.textPrimary },
  infoCount: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: COLORS.textPrimary },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 10 },

  guideCard: { padding: 20, marginBottom: 16 },
  guideItem: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  guideNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  guideNumText: { fontFamily: 'Outfit_700Bold', fontSize: 12, color: COLORS.primary },
  guideTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: COLORS.textPrimary },
  guideDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },

  tipBox: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: 'white', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border },
  tipText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
  emptyText: { textAlign: 'center', paddingVertical: 40, fontFamily: 'Inter_400Regular', color: COLORS.textMuted },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  handleBar: { width: 36, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'Outfit_700Bold', fontSize: 20, color: COLORS.textPrimary, marginBottom: 16 },
  modalSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  inputLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 1.1, color: COLORS.textMuted, marginBottom: 6 },
  deckSelectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  deckSelectRowDisabled: { opacity: 0.3 },
  deckSelectName: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: COLORS.textPrimary, marginLeft: 10 },
  currentLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textMuted },
  closeBtn: { marginTop: 16, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: COLORS.background },
  closeBtnText: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: COLORS.textSecondary },
  deckEmoji: { fontSize: 18 },
});

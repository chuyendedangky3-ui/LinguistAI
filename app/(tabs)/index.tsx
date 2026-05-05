import { useFocusEffect, useRouter } from 'expo-router';
import {
  ArrowUpDown,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  Edit2,
  FolderInput,
  Inbox,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WordDetailModal } from '../../components/flashcard/WordDetailModal';
import { COLORS, LAYOUT } from '../../constants/theme';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { Deck, Flashcard } from '../../types';

type SortOption = 'name_asc' | 'name_desc' | 'newest' | 'oldest';

const SORT_LABELS: Record<SortOption, string> = {
  name_asc: 'Name A→Z',
  name_desc: 'Name Z→A',
  newest: 'Newest',
  oldest: 'Oldest',
};
const SORT_OPTIONS: SortOption[] = ['name_asc', 'name_desc', 'newest', 'oldest'];
const ICON_OPTIONS = ['📚', '💼', '🌿', '🎯', '✈️', '🏠', '🎓', '💬', '🔬', '🎵', '📝', '🌍'];

export default function LibraryScreen() {
  const router = useRouter();
  const {
    decks, flashcards, inboxDeckId,
    newCramCount, focusReviewCount,
    addDeck, editDeck, removeDeck, removeMultipleDecks,
    refresh, searchFlashcards, setActiveDeckId, moveMultipleFlashcards
  } = useFlashcardStore();

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(Flashcard & { deck_name: string })[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Sort
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Multi-select decks
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Add/Edit deck modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: number; name: string } | null>(null);
  const [deckName, setDeckName] = useState('');
  const [deckIcon, setDeckIcon] = useState('📚');
  const [saving, setSaving] = useState(false);

  // Move decks (merge) modal
  const [isMoveModalVisible, setIsMoveModalVisible] = useState(false);

  // Word detail
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useFocusEffect(useCallback(() => { refresh(); }, []));

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        const results = await searchFlashcards(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const inboxDeck = useMemo(() => decks.find(d => d.id === inboxDeckId) ?? null, [decks, inboxDeckId]);
  const inboxCount = useMemo(() => flashcards.filter(c => c.deck_id === inboxDeckId).length, [flashcards, inboxDeckId]);

  const filteredAndSortedDecks = useMemo(() => {
    const filtered = decks.filter(d => d.id !== inboxDeckId && d.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: return 0;
      }
    });
  }, [decks, searchQuery, sortBy, inboxDeckId]);

  const handleOpenAdd = () => {
    setEditTarget(null);
    setDeckName('');
    setDeckIcon('📚');
    setAddModalVisible(true);
  };

  const handleOpenEdit = (deck: Deck) => {
    setEditTarget({ id: deck.id, name: deck.name });
    setDeckName(deck.name);
    setDeckIcon(deck.icon || '📚');
    setAddModalVisible(true);
  };

  const handleSaveDeck = async () => {
    if (!deckName.trim() || saving) return;
    setSaving(true);
    try {
      if (editTarget) {
        await editDeck(editTarget.id, deckName.trim());
      } else {
        await addDeck(deckName.trim(), deckIcon);
      }
      setAddModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDeck = (deck: Deck) => {
    Alert.alert('Delete Collection', `Delete "${deck.name}"? All cards will be moved to Inbox.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeDeck(deck.id) },
    ]);
  };

  const handleDeckPress = (id: number) => {
    if (isMultiSelectMode) {
      toggleSelect(id);
    } else {
      setActiveDeckId(id);
      router.push('/review');
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const selectableIds = filteredAndSortedDecks.map(d => d.id);
    if (selectedIds.size === selectableIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  const handleCancelMulti = () => {
    setIsMultiSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteMultiple = () => {
    if (selectedIds.size === 0) return;
    Alert.alert('Bulk Delete', `Delete ${selectedIds.size} collections? Cards will be moved to Inbox.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await removeMultipleDecks(Array.from(selectedIds));
          handleCancelMulti();
        },
      },
    ]);
  };

  const handleMoveMultipleDecks = (targetDeckId: number) => {
    const sourceDeckIds = Array.from(selectedIds);
    // Find all cards in selected decks
    const cardsToMove = flashcards.filter(c => sourceDeckIds.includes(c.deck_id));
    if (cardsToMove.length > 0) {
      moveMultipleFlashcards(cardsToMove.map(c => c.id), targetDeckId);
      Alert.alert('Success', `Moved ${cardsToMove.length} words to target collection.`);
    }
    setIsMoveModalVisible(false);
    handleCancelMulti();
  };

  const getDeckWordCount = (deckId: number) =>
    flashcards.filter(c => c.deck_id === deckId).length;

  const handleEditCard = (card: Flashcard) => {
    setDetailVisible(false);
    router.push({
      pathname: '/deck/[id]',
      params: { id: card.deck_id, editId: card.id }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Library</Text>
        {isMultiSelectMode && (
          <TouchableOpacity onPress={handleSelectAll} style={styles.selectAllBtn}>
            <Text style={styles.selectAllText}>
              {selectedIds.size === filteredAndSortedDecks.length ? 'Deselect' : 'Select All'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.searchContainer}>
          <Search size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search all cards..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {searchQuery.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Results</Text>
              {isSearching && <ActivityIndicator size="small" color={COLORS.primary} />}
            </View>

            {filteredAndSortedDecks.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.subLabel}>MATCHING COLLECTIONS</Text>
                {filteredAndSortedDecks.map(deck => (
                  <TouchableOpacity
                    key={deck.id}
                    onPress={() => {
                      setActiveDeckId(deck.id);
                      router.push('/review');
                    }}
                    style={styles.searchDeckRow}
                  >
                    <BookOpen size={18} color={COLORS.primary} />
                    <Text style={styles.searchDeckName}>{deck.name}</Text>
                    <ChevronRight size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {searchResults.length > 0 && (
              <View>
                <Text style={styles.subLabel}>MATCHING WORDS</Text>
                {searchResults.map(card => (
                  <TouchableOpacity 
                    key={card.id} 
                    style={styles.searchCardRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedCard(card);
                      setDetailVisible(true);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchCardEn}>{card.english}</Text>
                      <Text style={styles.searchCardVi}>{card.vietnamese}</Text>
                      <Text style={styles.searchCardDeck}>{card.deck_name}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => {
                        setActiveDeckId(card.deck_id);
                        router.push({ pathname: '/review', params: { editId: card.id } });
                      }}
                      style={styles.redirectBtn}
                    >
                      <ChevronRight size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: COLORS.primary }]}
                onPress={() => router.push({ pathname: '/session/[id]', params: { id: 'new' } })}
                activeOpacity={0.85}
              >
                <Brain size={22} color="white" />
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionLabel}>Cram New</Text>
                  <Text style={styles.actionValue}>{newCramCount} today</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#5851DB' }]}
                onPress={() => router.push({ pathname: '/session/[id]', params: { id: 'review' } })}
                activeOpacity={0.85}
              >
                <TrendingUp size={22} color="white" />
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionLabel}>Focus Review</Text>
                  <Text style={styles.actionValue}>{focusReviewCount} active</Text>
                </View>
              </TouchableOpacity>
            </View>

            {inboxDeck && (
              <TouchableOpacity
                style={styles.inboxRow}
                onPress={() => {
                  setActiveDeckId(inboxDeck.id);
                  router.push('/review');
                }}
                activeOpacity={0.85}
              >
                <View style={styles.inboxIconBox}>
                  <Inbox size={20} color="#E87722" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inboxTitle}>Inbox</Text>
                  <Text style={styles.inboxSubtitle}>{inboxCount} {inboxCount === 1 ? 'card' : 'cards'} waiting</Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.collectionHeader}>
              <Text style={styles.collectionLabel}>COLLECTIONS ({filteredAndSortedDecks.length})</Text>
              <TouchableOpacity onPress={() => setShowSortMenu(v => !v)}>
                <ArrowUpDown size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {showSortMenu && (
              <View style={styles.sortMenu}>
                {SORT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => { setSortBy(opt); setShowSortMenu(false); }}
                    style={[styles.sortChip, sortBy === opt && styles.sortChipActive]}
                  >
                    <Text style={[styles.sortChipText, sortBy === opt && styles.sortChipTextActive]}>
                      {SORT_LABELS[opt]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {filteredAndSortedDecks.map(deck => (
              <TouchableOpacity
                key={deck.id}
                delayLongPress={300}
                onLongPress={() => {
                  if (!isMultiSelectMode) {
                    setIsMultiSelectMode(true);
                    setSelectedIds(new Set([deck.id]));
                  }
                }}
                onPress={() => handleDeckPress(deck.id)}
                activeOpacity={0.9}
                style={[
                  styles.deckCard,
                  isMultiSelectMode && selectedIds.has(deck.id) && styles.deckCardSelected
                ]}
              >
                {isMultiSelectMode && (
                  <View style={[styles.checkbox, selectedIds.has(deck.id) && styles.checkboxChecked]}>
                    {selectedIds.has(deck.id) && <Check size={10} color="white" />}
                  </View>
                )}
                <View style={styles.deckIconBox}>
                  <Text style={styles.deckEmoji}>{deck.icon || '📚'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>
                  <Text style={styles.deckCount}>{getDeckWordCount(deck.id)} words</Text>
                </View>
                {!isMultiSelectMode && (
                  <View style={styles.deckActions}>
                    <TouchableOpacity onPress={() => handleOpenEdit(deck)} style={styles.iconBtn}>
                      <Edit2 size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteDeck(deck)} style={styles.iconBtn}>
                      <Trash2 size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {isMultiSelectMode && (
        <View style={styles.multiBar}>
          <TouchableOpacity style={styles.multiBarBtn} onPress={() => setIsMoveModalVisible(true)}>
            <FolderInput size={20} color="white" />
            <Text style={styles.multiBarBtnText}>Merge Cards</Text>
          </TouchableOpacity>
          <View style={styles.multiDivider} />
          <TouchableOpacity style={styles.multiBarBtn} onPress={handleDeleteMultiple}>
            <Trash2 size={20} color="#FF5252" />
            <Text style={[styles.multiBarBtnText, { color: '#FF5252' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isMultiSelectMode && !searchQuery && (
        <TouchableOpacity style={styles.fab} onPress={handleOpenAdd} activeOpacity={0.85}>
          <Plus size={28} color="white" />
        </TouchableOpacity>
      )}

      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAddModalVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.handleBar} />
            <Text style={styles.modalTitle}>{editTarget ? 'Edit Collection' : 'New Collection'}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. TOEIC Vocabulary"
              placeholderTextColor={COLORS.textMuted}
              value={deckName}
              onChangeText={setDeckName}
              autoFocus
              maxLength={40}
            />
            {!editTarget && (
              <>
                <Text style={styles.inputLabel}>ICON</Text>
                <View style={styles.iconGrid}>
                  {ICON_OPTIONS.map(emoji => (
                    <TouchableOpacity
                      key={emoji}
                      style={[styles.iconOption, deckIcon === emoji && styles.iconOptionSelected]}
                      onPress={() => setDeckIcon(emoji)}
                    >
                      <Text style={{ fontSize: 24 }}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, (!deckName.trim() || saving) && styles.saveBtnDisabled]}
              onPress={handleSaveDeck}
              disabled={!deckName.trim() || saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving...' : editTarget ? 'Save Changes' : 'Create Collection'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isMoveModalVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsMoveModalVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.handleBar} />
            <Text style={styles.modalTitle}>Merge into Collection</Text>
            <Text style={styles.modalSubtitle}>All words from selected collections will be moved here.</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {decks.map(d => (
                <TouchableOpacity 
                  key={d.id} 
                  style={[styles.deckSelectRow, selectedIds.has(d.id) && styles.deckSelectRowDisabled]} 
                  disabled={selectedIds.has(d.id)}
                  onPress={() => handleMoveMultipleDecks(d.id)}
                >
                  <Text style={styles.deckEmoji}>{d.icon || '📚'}</Text>
                  <Text style={styles.deckSelectName}>{d.name}</Text>
                  <ChevronRight size={16} color={COLORS.border} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setIsMoveModalVisible(false)}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <WordDetailModal
        visible={detailVisible}
        word={selectedCard}
        onClose={() => setDetailVisible(false)}
        onEdit={handleEditCard}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2,
  },
  title: { fontFamily: 'Outfit_700Bold', fontSize: 28, color: COLORS.textPrimary },
  selectAllBtn: { backgroundColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  selectAllText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: COLORS.textSecondary },
  scroll: { flex: 1, paddingHorizontal: 16 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: LAYOUT.radiusSmall, paddingHorizontal: 12, height: 44,
    marginBottom: 12, marginTop: 4, ...LAYOUT.shadow,
  },
  searchInput: { flex: 1, marginLeft: 8, fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textPrimary },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionCard: {
    flex: 1, borderRadius: LAYOUT.radiusMedium,
    paddingVertical: 12, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center',
  },
  actionTextWrap: { marginLeft: 8 },
  actionLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  actionValue: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: 'white' },
  inboxRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9F5',
    borderRadius: LAYOUT.radiusMedium, paddingVertical: 10, paddingHorizontal: 12,
    marginBottom: 16, borderWidth: 1, borderColor: '#FFE8D6',
  },
  inboxIconBox: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#FFEBDC',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  inboxTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: '#CC5A00' },
  inboxSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#E87722', marginTop: 1 },
  collectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  collectionLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 1.1, color: COLORS.textMuted },
  sortMenu: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: COLORS.border },
  sortChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sortChipText: { fontFamily: 'Inter_500Medium', fontSize: 10, color: COLORS.textSecondary },
  sortChipTextActive: { color: 'white' },
  deckCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: LAYOUT.radiusMedium, paddingVertical: 10, paddingHorizontal: 12,
    marginBottom: 8, ...LAYOUT.shadow, borderWidth: 1.5, borderColor: 'transparent'
  },
  deckCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: COLORS.border, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  deckIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  deckEmoji: { fontSize: 20 },
  deckName: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: COLORS.textPrimary },
  deckCount: { fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  deckActions: { flexDirection: 'row' },
  iconBtn: { padding: 4, marginLeft: 2 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: COLORS.textPrimary },
  subLabel: { fontFamily: 'Inter_500Medium', fontSize: 9, letterSpacing: 1.2, color: COLORS.textMuted, marginBottom: 6 },
  searchDeckRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, borderRadius: LAYOUT.radiusSmall, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 },
  searchDeckName: { flex: 1, fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: COLORS.textPrimary, marginLeft: 10 },
  searchCardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: LAYOUT.radiusSmall, padding: 12, marginBottom: 6, ...LAYOUT.shadow },
  searchCardEn: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: COLORS.textPrimary },
  searchCardVi: { fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  searchCardDeck: { fontFamily: 'Inter_500Medium', fontSize: 9, color: COLORS.primary, marginTop: 3, letterSpacing: 0.4 },
  redirectBtn: { padding: 6, marginLeft: 4, borderRadius: 16, backgroundColor: COLORS.primaryLight },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 32 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 18, color: COLORS.textPrimary, marginTop: 12 },
  emptySubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: COLORS.textSecondary, marginTop: 6 },
  
  multiBar: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: '#1A1A1A', borderRadius: 16, flexDirection: 'row', padding: 2, ...LAYOUT.shadow },
  multiBarBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  multiBarBtnText: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: 'white' },
  multiDivider: { width: 1, height: '50%', backgroundColor: '#333', alignSelf: 'center' },
  
  fab: { position: 'absolute', right: 16, bottom: 16, width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...LAYOUT.shadow, elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  handleBar: { width: 36, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'Outfit_700Bold', fontSize: 24, color: COLORS.textPrimary, marginBottom: 12 },
  inputLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 1.2, color: COLORS.textMuted, marginBottom: 8 },
  modalSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
  modalInput: { backgroundColor: COLORS.background, borderRadius: LAYOUT.radiusSmall, paddingHorizontal: 16, paddingVertical: 14, fontFamily: 'Inter_400Regular', fontSize: 16, color: COLORS.textPrimary, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  iconOption: { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  iconOptionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: LAYOUT.radiusSmall, paddingVertical: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { fontFamily: 'Outfit_600SemiBold', fontSize: 17, color: 'white' },
  
  deckSelectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  deckSelectRowDisabled: { opacity: 0.3 },
  deckSelectName: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 16, color: COLORS.textPrimary, marginLeft: 12 },
  closeBtn: { marginTop: 20, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: COLORS.background },
  closeBtnText: { fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: COLORS.textSecondary },
});

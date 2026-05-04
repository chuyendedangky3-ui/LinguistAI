import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, Modal, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search, Brain, TrendingUp, Plus,
  Inbox, BookOpen, Trash2, Edit2, ArrowUpDown, X
} from 'lucide-react-native';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { COLORS, LAYOUT } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { useRouter } from 'expo-router';
import { getAge, getTargetReps, isOverdue } from '../../lib/algorithm';

// Quick emoji options for collection icon
const ICON_OPTIONS = ['📚', '💼', '🌿', '🎯', '✈️', '🏠', '🎓', '💬', '🔬', '🎵', '📝', '🌍'];

export default function LibraryScreen() {
  const router = useRouter();
  const { decks, flashcards, removeDeck, addDeck, inboxDeckId } = useFlashcardStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckIcon, setNewDeckIcon] = useState('📚');
  const [saving, setSaving] = useState(false);

  // Stats for the quick action cards
  const stats = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    const dueTodayCount = flashcards.filter(c => {
      const target = getTargetReps(getAge(c.created_at), dayOfWeek);
      return target > 0 && c.daily_reps < target;
    }).length;

    const overdueCount = flashcards.filter(c => isOverdue(c, today)).length;
    const totalDue = dueTodayCount + overdueCount;
    const newTodayCount = flashcards.filter(c => getAge(c.created_at) === 0).length;

    return { totalDue, newTodayCount };
  }, [flashcards]);

  // Inbox deck is pinned and excluded from the collections list
  const inboxDeck = useMemo(
    () => decks.find(d => d.id === inboxDeckId) ?? null,
    [decks, inboxDeckId]
  );

  const inboxCount = useMemo(
    () => flashcards.filter(c => c.deck_id === inboxDeckId).length,
    [flashcards, inboxDeckId]
  );

  // Regular collections: exclude the Inbox deck, then apply search
  const handleAddDeck = async () => {
    const trimmed = newDeckName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await addDeck(trimmed, newDeckIcon);
      setNewDeckName('');
      setNewDeckIcon('📚');
      setAddModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to create collection.');
    } finally {
      setSaving(false);
    }
  };

  const filteredDecks = useMemo(() => {
    return decks
      .filter(d => d.id !== inboxDeckId)
      .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [decks, searchQuery, inboxDeckId]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Your Library</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search all cards..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Quick Actions Row */}
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: COLORS.primary }]}
            onPress={() => router.push('/session/new')}
            activeOpacity={0.85}
          >
            <Brain size={22} color="white" />
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionLabel}>Cram New</Text>
              <Text style={styles.actionValue}>{stats.newTodayCount} today</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#5851DB' }]}
            onPress={() => router.push('/session/review')}
            activeOpacity={0.85}
          >
            <TrendingUp size={22} color="white" />
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionLabel}>Focus Review</Text>
              <Text style={styles.actionValue}>{stats.totalDue} active</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Inbox — pinned special collection */}
        {inboxDeck && (
          <TouchableOpacity
            style={styles.inboxRow}
            onPress={() => router.push(`/deck/${inboxDeck.id}`)}
            activeOpacity={0.85}
          >
            <View style={styles.inboxIconBox}>
              <Inbox size={20} color="#E87722" />
            </View>
            <View style={styles.inboxText}>
              <Text style={styles.inboxTitle}>Inbox</Text>
              <Text style={styles.inboxSubtitle}>
                {inboxCount} {inboxCount === 1 ? 'card' : 'cards'} waiting
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Collections Header */}
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>
            COLLECTIONS ({filteredDecks.length})
          </Text>
          <TouchableOpacity>
            <ArrowUpDown size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Collections List */}
        {filteredDecks.map(deck => (
          <Card
            key={deck.id}
            style={styles.deckCard}
            onPress={() => router.push(`/deck/${deck.id}`)}
          >
            <View style={styles.deckContent}>
              <View style={styles.deckIcon}>
                <BookOpen size={22} color={COLORS.primary} />
              </View>
              <View style={styles.deckInfo}>
                <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>
                <Text style={styles.deckCount}>
                  {flashcards.filter(c => c.deck_id === deck.id).length} words
                </Text>
              </View>
              <View style={styles.deckActions}>
                <TouchableOpacity style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Edit2 size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => removeDeck(deck.id)}
                >
                  <Trash2 size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setAddModalVisible(true)}
      >
        <Plus size={28} color="white" />
      </TouchableOpacity>

      {/* Add Collection Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalSheet}
            activeOpacity={1}
            onPress={() => {}}
          >
            {/* Handle bar */}
            <View style={styles.handleBar} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Collection</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <X size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Name input */}
            <Text style={styles.inputLabel}>NAME</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. TOEIC Vocabulary"
              placeholderTextColor={COLORS.textMuted}
              value={newDeckName}
              onChangeText={setNewDeckName}
              autoFocus
              maxLength={40}
            />

            {/* Icon picker */}
            <Text style={styles.inputLabel}>ICON</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.iconOption,
                    newDeckIcon === emoji && styles.iconOptionSelected,
                  ]}
                  onPress={() => setNewDeckIcon(emoji)}
                >
                  <Text style={styles.iconEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Save button */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (!newDeckName.trim() || saving) && styles.saveBtnDisabled,
              ]}
              onPress={handleAddDeck}
              disabled={!newDeckName.trim() || saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'Creating...' : 'Create Collection'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 32,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: LAYOUT.radiusSmall,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 20,
    ...LAYOUT.shadow,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.textPrimary,
  },

  // Quick Actions
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    borderRadius: LAYOUT.radiusMedium,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionTextContainer: {
    marginLeft: 10,
  },
  actionLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  actionValue: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
    color: 'white',
  },

  // Inbox pinned row
  inboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5EE',
    borderRadius: LAYOUT.radiusMedium,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD4B8',
  },
  inboxIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFE0CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inboxText: {
    flex: 1,
  },
  inboxTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: '#CC5A00',
  },
  inboxSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#E87722',
    marginTop: 2,
  },

  // Collections
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 1.2,
    color: COLORS.textMuted,
  },
  deckCard: {
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  deckContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deckIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  deckInfo: {
    flex: 1,
  },
  deckName: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  deckCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  deckActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 6,
    marginLeft: 2,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...LAYOUT.shadow,
    elevation: 6,
  },

  // Add Collection Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: LAYOUT.radiusLarge,
    borderTopRightRadius: LAYOUT.radiusLarge,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
    color: COLORS.textPrimary,
  },
  inputLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 1.2,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radiusSmall,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  iconEmoji: {
    fontSize: 24,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.radiusSmall,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 17,
    color: 'white',
  },
});


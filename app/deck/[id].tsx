import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Edit3, Trash2, Search, Eye, Plus, Brain } from 'lucide-react-native';
import { COLORS, LAYOUT } from '../../constants/theme';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { WordDetailModal } from '../../components/flashcard/WordDetailModal';
import { Flashcard } from '../../types';

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { decks, flashcards, removeFlashcard } = useFlashcardStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWord, setSelectedWord] = useState<Flashcard | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const deck = decks.find(d => d.id === Number(id));
  const deckCards = flashcards.filter(c => c.deck_id === Number(id));
  
  const filteredCards = useMemo(() => {
    return deckCards.filter(c => 
      c.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.vietnamese.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [deckCards, searchQuery]);

  const stats = useMemo(() => {
    const mastered = deckCards.filter(c => c.total_reps > 10).length; // Just a placeholder logic
    const due = deckCards.length - mastered;
    return { mastered, due };
  }, [deckCards]);

  if (!deck) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{deck.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Edit3 size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Trash2 size={20} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.statText}>Mastered: {stats.mastered}</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.statText}>Due: {stats.due}</Text>
        </View>
        <TouchableOpacity 
          style={styles.fullReviewBtn}
          onPress={() => router.push(`/session/${id}`)}
        >
          <Brain size={18} color="white" />
          <Text style={styles.fullReviewText}>Full Review</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search words..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity>
          <Eye size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Word List */}
      <FlatList
        data={filteredCards}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Card 
            style={styles.wordCard} 
            onPress={() => {
              setSelectedWord(item);
              setModalVisible(true);
            }}
          >
            <View style={styles.wordMain}>
              <View style={styles.wordHeader}>
                <Text style={styles.wordText}>{item.english}</Text>
                <Badge label={item.word_type.toUpperCase()} variant="muted" />
              </View>
              <Text style={styles.revealText}>Tap to reveal...</Text>
              <View style={styles.learningStatus}>
                <View style={[styles.statusDot, { backgroundColor: COLORS.border }]} />
                <Text style={styles.statusText}>LEARNING</Text>
              </View>
            </View>
            <View style={styles.wordActions}>
              <TouchableOpacity style={styles.wordActionBtn}>
                <Edit3 size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.wordActionBtn} 
                onPress={() => removeFlashcard(item.id)}
              >
                <Trash2 size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No words found in this collection.</Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/tutor')}
      >
        <Plus size={32} color="white" />
      </TouchableOpacity>

      <WordDetailModal
        word={selectedWord}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconBtn: {
    padding: 8,
    marginLeft: 4,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: LAYOUT.radiusLarge,
    borderBottomRightRadius: LAYOUT.radiusLarge,
    ...LAYOUT.shadow,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  fullReviewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    height: 40,
    borderRadius: 20,
    marginLeft: 8,
  },
  fullReviewText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: 'white',
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 20,
    paddingHorizontal: 16,
    height: 54,
    borderRadius: LAYOUT.radiusMedium,
    ...LAYOUT.shadow,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  wordCard: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
  },
  wordMain: {
    flex: 1,
  },
  wordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  revealText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  learningStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    letterSpacing: 1,
    color: COLORS.textMuted,
  },
  wordActions: {
    justifyContent: 'center',
  },
  wordActionBtn: {
    padding: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...LAYOUT.shadow,
    elevation: 5,
  },
});

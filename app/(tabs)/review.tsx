import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, RotateCcw, Brain, ChevronRight } from 'lucide-react-native';
import { COLORS, LAYOUT } from '../../constants/theme';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { buildStudyQueue, isOverdue } from '../../lib/algorithm';
import { useRouter } from 'expo-router';

export default function ReviewScreen() {
  const router = useRouter();
  const { flashcards } = useFlashcardStore();
  const [searchQuery, setSearchQuery] = useState('');

  const dueQueue = useMemo(() => {
    return buildStudyQueue(flashcards);
  }, [flashcards]);

  const filteredQueue = useMemo(() => {
    return dueQueue.filter(c => 
      c.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.vietnamese.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [dueQueue, searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Review</Text>
        <TouchableOpacity 
          style={styles.startBtn}
          onPress={() => router.push('/session/review')}
        >
          <Brain size={20} color="white" />
          <Text style={styles.startText}>Start All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search due words..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredQueue}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardMain}>
              <View style={styles.cardHeader}>
                <Text style={styles.wordText}>{item.english}</Text>
                {isOverdue(item) ? (
                  <Badge label="OVERDUE" variant="danger" />
                ) : (
                  <Badge label="DUE" variant="warning" />
                )}
              </View>
              <Text style={styles.meaningText} numberOfLines={1}>{item.vietnamese}</Text>
              <View style={styles.footerRow}>
                <Text style={styles.repsText}>Reps: {item.daily_reps} / 3</Text>
                <ChevronRight size={20} color={COLORS.textMuted} />
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <RotateCcw size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>You're all done!</Text>
            <Text style={styles.emptySubtitle}>No more cards due for today.</Text>
          </View>
        }
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 32,
    color: COLORS.textPrimary,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  startText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: 'white',
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
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
    paddingBottom: 40,
  },
  card: {
    marginBottom: 12,
    padding: 16,
  },
  cardMain: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  meaningText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  repsText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 20,
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});

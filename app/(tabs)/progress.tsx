import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, LAYOUT } from '../../constants/theme';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { Card } from '../../components/ui/Card';
import { TrendingUp, Award, Clock, Book } from 'lucide-react-native';

export default function ProgressScreen() {
  const { flashcards, decks } = useFlashcardStore();

  const stats = useMemo(() => {
    const totalWords = flashcards.length;
    const totalReps = flashcards.reduce((sum, c) => sum + c.total_reps, 0);
    const masteredWords = flashcards.filter(c => c.total_reps > 20).length;
    const learningWords = totalWords - masteredWords;

    return { totalWords, totalReps, masteredWords, learningWords };
  }, [flashcards]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Learning Progress</Text>
        <Text style={styles.subtitle}>Track your English mastery journey.</Text>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Book size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{stats.totalWords}</Text>
            <Text style={styles.statLabel}>Total Words</Text>
          </Card>
          
          <Card style={styles.statCard}>
            <Award size={24} color={COLORS.success} />
            <Text style={styles.statValue}>{stats.masteredWords}</Text>
            <Text style={styles.statLabel}>Mastered</Text>
          </Card>

          <Card style={styles.statCard}>
            <TrendingUp size={24} color={COLORS.warning} />
            <Text style={styles.statValue}>{stats.totalReps}</Text>
            <Text style={styles.statLabel}>Total Reps</Text>
          </Card>

          <Card style={styles.statCard}>
            <Clock size={24} color="#5851DB" />
            <Text style={styles.statValue}>{stats.learningWords}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </Card>
        </View>

        <Text style={styles.sectionTitle}>ACTIVITY SUMMARY</Text>
        <Card style={styles.activityCard}>
          <View style={styles.placeholderChart}>
            <Text style={styles.placeholderText}>Activity Chart coming soon...</Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>COLLECTION BREAKDOWN</Text>
        {decks.map(deck => (
          <Card key={deck.id} style={styles.deckProgressCard}>
            <View style={styles.deckHeader}>
              <Text style={styles.deckName}>{deck.name}</Text>
              <Text style={styles.deckPercentage}>
                {Math.round((flashcards.filter(c => c.deck_id === deck.id && c.total_reps > 20).length / 
                (flashcards.filter(c => c.deck_id === deck.id).length || 1)) * 100)}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
               <View style={[styles.progressFill, { width: '45%' }]} />
            </View>
          </Card>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 32,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 16,
  },
  activityCard: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  placeholderChart: {
    alignItems: 'center',
  },
  placeholderText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.textMuted,
  },
  deckProgressCard: {
    padding: 16,
    marginBottom: 12,
  },
  deckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  deckName: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  deckPercentage: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: COLORS.primary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
});

import { useFocusEffect, useRouter } from 'expo-router';
import { Award, Book, ChevronRight, Clock, TrendingUp } from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/Card';
import { COLORS, LAYOUT } from '../../constants/theme';
import { useFlashcardStore } from '../../store/useFlashcardStore';

const { width } = Dimensions.get('window');

export default function ProgressScreen() {
  const router = useRouter();
  const { flashcards, decks, refresh } = useFlashcardStore();

  useFocusEffect(useCallback(() => { refresh(); }, []));

  const stats = useMemo(() => {
    const total = flashcards.length;
    const totalReps = flashcards.reduce((sum, c) => sum + c.total_reps, 0);
    // Mastery definition: Repetitions > 10
    const mastered = flashcards.filter(c => c.total_reps >= 10).length;
    const learning = flashcards.filter(c => c.total_reps > 0 && c.total_reps < 10).length;
    const newCards = flashcards.filter(c => c.total_reps === 0).length;

    const masteryPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;

    return { total, totalReps, mastered, learning, newCards, masteryPercent };
  }, [flashcards]);

  const StatBox = ({ title, count, icon: Icon, color, subtitle }: any) => (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{count}</Text>
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={styles.statSub}>{subtitle}</Text>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Learning Progress</Text>
        <Text style={styles.subtitle}>Visualize your journey to mastery.</Text>

        {/* Master Card */}
        <View style={styles.masterCard}>
          <View style={styles.masterHeader}>
            <View>
              <Text style={styles.masterLabel}>TOTAL VOCABULARY</Text>
              <Text style={styles.masterValue}>{stats.total}</Text>
            </View>
            <TrendingUp size={48} color="rgba(255,255,255,0.2)" />
          </View>
          <View style={styles.masterFooter}>
            <View style={styles.masterProgressWrap}>
              <View style={styles.masterProgressTrack}>
                <View style={[styles.masterProgressFill, { width: `${stats.masteryPercent}%` }]} />
              </View>
              <Text style={styles.masterProgressText}>{stats.masteryPercent}% Mastered</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>MASTERY LEVELS</Text>
        <View style={styles.statsGrid}>
          <StatBox title="New" count={stats.newCards} icon={Book} color="#94A3B8" subtitle="Never studied" />
          <StatBox title="Learning" count={stats.learning} icon={Clock} color="#F97316" subtitle="Short-term" />
          <StatBox title="Mastered" count={stats.mastered} icon={Award} color={COLORS.success} subtitle="Long-term" />
          <StatBox title="Total Reps" count={stats.totalReps} icon={TrendingUp} color={COLORS.primary} subtitle="Total effort" />
        </View>

        <Text style={styles.sectionTitle}>COLLECTION BREAKDOWN</Text>
        {decks.map(deck => {
          const deckCards = flashcards.filter(c => c.deck_id === deck.id);
          const deckMastered = deckCards.filter(c => c.total_reps >= 10).length;
          const percent = deckCards.length > 0 ? Math.round((deckMastered / deckCards.length) * 100) : 0;
          
          return (
            <TouchableOpacity 
              key={deck.id} 
              onPress={() => router.push(`/deck/${deck.id}`)}
              activeOpacity={0.7}
            >
              <Card style={styles.deckItem}>
                <View style={styles.deckHeader}>
                  <Text style={styles.deckName}>{deck.name}</Text>
                  <Text style={styles.deckPercent}>{percent}%</Text>
                </View>
                <View style={styles.deckTrack}>
                  <View style={[styles.deckFill, { width: `${percent}%` }]} />
                </View>
                <View style={styles.deckFooter}>
                  <Text style={styles.deckSub}>{deckMastered} / {deckCards.length} mastered</Text>
                  <ChevronRight size={16} color={COLORS.textMuted} />
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16 },
  title: { fontFamily: 'Outfit_700Bold', fontSize: 28, color: COLORS.textPrimary },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: COLORS.textSecondary, marginTop: 4, marginBottom: 20 },
  
  masterCard: {
    backgroundColor: COLORS.primary, borderRadius: 24, padding: 20, marginBottom: 24,
    ...LAYOUT.shadow, shadowColor: COLORS.primary, shadowOpacity: 0.2, elevation: 6,
  },
  masterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  masterLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 1.2, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  masterValue: { fontFamily: 'Outfit_700Bold', fontSize: 40, color: 'white' },
  masterFooter: { marginTop: 20 },
  masterProgressWrap: { gap: 8 },
  masterProgressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  masterProgressFill: { height: '100%', backgroundColor: 'white', borderRadius: 3 },
  masterProgressText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: 'white' },

  sectionTitle: { fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 1.2, color: COLORS.textMuted, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { width: (width - 42) / 2, padding: 14, alignItems: 'flex-start' },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontFamily: 'Outfit_700Bold', fontSize: 20, color: COLORS.textPrimary },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  statSub: { fontFamily: 'Inter_400Regular', fontSize: 9, color: COLORS.textMuted, marginTop: 1 },

  deckItem: { padding: 16, marginBottom: 10 },
  deckHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  deckName: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: COLORS.textPrimary },
  deckPercent: { fontFamily: 'Outfit_700Bold', fontSize: 14, color: COLORS.primary },
  deckTrack: { height: 5, backgroundColor: COLORS.border, borderRadius: 2.5, overflow: 'hidden' },
  deckFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2.5 },
  deckFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  deckSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.textSecondary },
});

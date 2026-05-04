import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, ChevronLeft, Volume2, Check, AlertTriangle, RotateCcw } from 'lucide-react-native';
import { COLORS, LAYOUT } from '../../constants/theme';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components/ui/Button';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function SessionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { sessionQueue, currentSessionIndex, startSession, recordRep, nextCard } = useFlashcardStore();
  
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Determine which session to start
    let deckId: number | undefined;
    if (id !== 'new' && id !== 'review') {
      deckId = Number(id);
    }
    startSession(deckId);
  }, [id]);

  const currentCard = sessionQueue[currentSessionIndex];

  const handleFlip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const handleRating = async (isSuccess: boolean) => {
    if (!currentCard) return;
    
    Haptics.notificationAsync(
      isSuccess ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
    
    await recordRep(currentCard.id, isSuccess);
    
    // Reset flip for next card
    Animated.timing(flipAnim, { toValue: 0, duration: 0, useNativeDriver: true }).start();
    setIsFlipped(false);
    
    nextCard();
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = { transform: [{ rotateY: frontInterpolate }] };
  const backAnimatedStyle = { transform: [{ rotateY: backInterpolate }] };

  if (sessionQueue.length === 0 && currentSessionIndex === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <RotateCcw size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Nothing to review!</Text>
          <Text style={styles.emptySubtitle}>You're all caught up for today.</Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (currentSessionIndex >= sessionQueue.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Check size={64} color={COLORS.success} />
          <Text style={styles.emptyTitle}>Session Complete!</Text>
          <Text style={styles.emptySubtitle}>Great job! You've finished your review.</Text>
          <Button title="Finish" onPress={() => router.back()} style={{ marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  const progress = (currentSessionIndex / sessionQueue.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <X size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {currentSessionIndex + 1} / {sessionQueue.length}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Volume2 size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Card Container */}
      <View style={styles.cardContainer}>
        <TouchableOpacity activeOpacity={1} onPress={handleFlip} style={styles.flipWrapper}>
          <Animated.View style={[styles.card, styles.cardFront, frontAnimatedStyle]}>
            <Text style={styles.wordText}>{currentCard.english}</Text>
            <Text style={styles.tapToFlip}>Tap to flip</Text>
          </Animated.View>
          
          <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
            <Text style={styles.meaningText}>{currentCard.vietnamese}</Text>
            <Text style={styles.phoneticText}>{currentCard.phonetic}</Text>
            <View style={styles.exampleBox}>
              <Text style={styles.exampleText}>"{currentCard.example_en}"</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Bottom Actions */}
      <View style={styles.footer}>
        {!isFlipped ? (
          <Button title="Show Answer" onPress={handleFlip} size="large" style={styles.fullWidthBtn} />
        ) : (
          <View style={styles.ratingRow}>
            <TouchableOpacity 
              style={[styles.ratingBtn, { backgroundColor: COLORS.dangerLight }]}
              onPress={() => handleRating(false)}
            >
              <AlertTriangle size={24} color={COLORS.danger} />
              <Text style={[styles.ratingText, { color: COLORS.danger }]}>Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.ratingBtn, { backgroundColor: COLORS.successLight }]}
              onPress={() => handleRating(true)}
            >
              <Check size={24} color={COLORS.success} />
              <Text style={[styles.ratingText, { color: COLORS.success }]}>Good</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  iconBtn: {
    padding: 8,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  cardContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipWrapper: {
    width: '100%',
    height: '80%',
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: LAYOUT.radiusLarge,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    backfaceVisibility: 'hidden',
    ...LAYOUT.shadow,
  },
  cardFront: {},
  cardBack: {},
  wordText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 42,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  tapToFlip: {
    position: 'absolute',
    bottom: 32,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.textMuted,
  },
  meaningText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 32,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  phoneticText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 20,
    color: COLORS.primary,
    marginTop: 12,
  },
  exampleBox: {
    marginTop: 40,
    padding: 20,
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radiusMedium,
  },
  exampleText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 0 : 24,
  },
  fullWidthBtn: {
    width: '100%',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingBtn: {
    flex: 0.48,
    height: 80,
    borderRadius: LAYOUT.radiusMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    marginTop: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 28,
    color: COLORS.textPrimary,
    marginTop: 24,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});

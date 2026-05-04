import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Camera, Image as ImageIcon, X, Zap } from 'lucide-react-native';
import { COLORS, LAYOUT } from '../../constants/theme';
import { analyzeWord } from '../../lib/gemini';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export default function TutorScreen() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { addFlashcard, decks } = useFlashcardStore();

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const data = await analyzeWord(input);
      setResult(data);
    } catch (error) {
      console.error(error);
      alert('Analysis failed. Please check your API keys.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result || decks.length === 0) {
      alert('Please create a collection first in the Library tab.');
      return;
    }
    
    try {
      await addFlashcard({
        deck_id: decks[0].id, // Default to first deck for now
        english: result.english,
        vietnamese: result.vietnamese,
        phonetic: result.phonetic,
        word_type: result.word_type,
        grammar_note: result.grammar_note,
        example_en: result.example_en,
        example_vi: result.example_vi,
      });
      alert('Card saved to ' + decks[0].name);
      setResult(null);
      setInput('');
    } catch (error) {
      alert('Failed to save card.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>AI Tutor</Text>
          <Text style={styles.subtitle}>Smart grammar check and automated card creation.</Text>

          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              placeholder="Enter words or sentences..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={input}
              onChangeText={setInput}
            />
            
            <View style={styles.inputActions}>
              <View style={styles.leftActions}>
                <TouchableOpacity style={styles.iconBtn}>
                  <Camera size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn}>
                  <ImageIcon size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.rightActions}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setInput('')}>
                  <X size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.analyzeBtn, !input.trim() && styles.disabledBtn]} 
                  onPress={handleAnalyze}
                  disabled={loading || !input.trim()}
                >
                  {loading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Sparkles size={20} color="white" />
                      <Text style={styles.analyzeText}>Analyze</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {result && (
            <View style={styles.resultContainer}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>{result.english}</Text>
                <Badge label={result.word_type?.toUpperCase()} variant="primary" />
              </View>
              
              <Text style={styles.phonetic}>{result.phonetic}</Text>
              
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>MEANING</Text>
                <Text style={styles.meaningText}>{result.vietnamese}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>GRAMMAR NOTE</Text>
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>{result.grammar_note}</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>EXAMPLE</Text>
                <Text style={styles.exampleEn}>{result.example_en}</Text>
                <Text style={styles.exampleVi}>{result.example_vi}</Text>
              </View>

              <Button 
                title="Add to Library" 
                onPress={handleSave} 
                icon={<Zap size={20} color="white" />}
                style={styles.saveBtn}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  inputCard: {
    backgroundColor: 'white',
    borderRadius: LAYOUT.radiusMedium,
    padding: 16,
    minHeight: 180,
    ...LAYOUT.shadow,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 18,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  leftActions: {
    flexDirection: 'row',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  closeBtn: {
    marginRight: 12,
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#99C1FF', // Light primary as in mockup
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: LAYOUT.radiusSmall,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  analyzeText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
  },
  resultContainer: {
    marginTop: 24,
    backgroundColor: 'white',
    borderRadius: LAYOUT.radiusMedium,
    padding: 20,
    ...LAYOUT.shadow,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  phonetic: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.primary,
    marginTop: 4,
  },
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  meaningText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  noteBox: {
    backgroundColor: '#FFF9F0',
    padding: 12,
    borderRadius: LAYOUT.radiusSmall,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  noteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  exampleEn: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  exampleVi: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  saveBtn: {
    marginTop: 24,
  }
});

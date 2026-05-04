import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { COLORS, LAYOUT } from '../../constants/theme';
import { Flashcard } from '../../types';
import { Badge } from '../ui/Badge';

interface WordDetailModalProps {
  word: Flashcard | null;
  visible: boolean;
  onClose: () => void;
}

export const WordDetailModal: React.FC<WordDetailModalProps> = ({ word, visible, onClose }) => {
  if (!word) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Word Detail</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.section}>
              <Text style={styles.label}>ENGLISH</Text>
              <View style={styles.englishBox}>
                <Text style={styles.englishText}>{word.english}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>PHONETIC</Text>
                <View style={styles.subBox}>
                  <Text style={styles.phoneticText}>{word.phonetic}</Text>
                </View>
              </View>
              <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>TYPE</Text>
                <View style={styles.subBox}>
                  <Text style={styles.typeText}>{word.word_type.toUpperCase()}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>MEANING</Text>
              <View style={styles.meaningBox}>
                <Text style={styles.meaningText}>{word.vietnamese}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>NOTES</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{word.grammar_note}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>EXAMPLE</Text>
              <View style={styles.exampleBox}>
                <Text style={styles.exampleEn}>{word.example_en}</Text>
                <View style={styles.divider} />
                <Text style={styles.exampleVi}>{word.example_vi}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: LAYOUT.radiusLarge,
    borderTopRightRadius: LAYOUT.radiusLarge,
    maxHeight: Dimensions.get('window').height * 0.9,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
    color: COLORS.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  englishBox: {
    backgroundColor: '#111827', // Dark navy as in image
    padding: 24,
    borderRadius: LAYOUT.radiusMedium,
  },
  englishText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 28,
    color: 'white',
  },
  row: {
    flexDirection: 'row',
  },
  subBox: {
    backgroundColor: COLORS.primaryLight,
    padding: 16,
    borderRadius: LAYOUT.radiusMedium,
    minHeight: 100,
    justifyContent: 'center',
  },
  phoneticText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 18,
    color: COLORS.primary,
  },
  typeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  meaningBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: LAYOUT.radiusMedium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  meaningText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  notesBox: {
    backgroundColor: '#FFF9F0',
    padding: 20,
    borderRadius: LAYOUT.radiusMedium,
    borderWidth: 1,
    borderColor: '#FFECC2',
  },
  notesText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  exampleBox: {
    backgroundColor: COLORS.background,
    padding: 20,
    borderRadius: LAYOUT.radiusMedium,
  },
  exampleEn: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  exampleVi: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Download, Upload, Key, Plus, Trash2, ChevronRight, X } from 'lucide-react-native';
import { COLORS, LAYOUT } from '../../constants/theme';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function SettingsScreen() {
  const { apiKeys, addApiKey, removeApiKey, toggleApiKey, loadApiKeys } = useFlashcardStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  useEffect(() => {
    loadApiKeys();
  }, []);

  const handleAddKey = async () => {
    if (!newKeyLabel || !newKeyValue) return;
    try {
      await addApiKey(newKeyLabel, newKeyValue);
      setNewKeyLabel('');
      setNewKeyValue('');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add API key.');
    }
  };

  const confirmDeleteKey = (id: number) => {
    Alert.alert(
      'Delete API Key',
      'Are you sure you want to remove this key?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeApiKey(id) }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your account and preferences.</Text>

        <Text style={styles.sectionHeader}>DATA & BACKUP</Text>
        <Card style={styles.card}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
              <Download size={20} color={COLORS.primary} />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Export Backup</Text>
              <Text style={styles.menuSubtitle}>Save your data to a JSON file</Text>
            </View>
            <ChevronRight size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
          
          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
              <Upload size={20} color={COLORS.success} />
            </View>
            <View style={styles.menuText}>
              <Text style={styles.menuTitle}>Import Backup</Text>
              <Text style={styles.menuSubtitle}>Restore data from a backup file</Text>
            </View>
            <ChevronRight size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </Card>

        <Text style={styles.sectionHeader}>AI CONFIGURATION</Text>
        <Card style={styles.card}>
          <View style={styles.keyHeader}>
            <View style={styles.keyHeaderLeft}>
              <Key size={20} color={COLORS.primary} />
              <Text style={styles.keyTitle}>Gemini API Keys</Text>
            </View>
            <TouchableOpacity 
              style={styles.addKeyBtn}
              onPress={() => setModalVisible(true)}
            >
              <Plus size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {apiKeys.length === 0 ? (
            <Text style={styles.emptyText}>
              No custom keys. Using default environment key.
            </Text>
          ) : (
            apiKeys.map((key) => (
              <View key={key.id} style={styles.keyItem}>
                <View style={styles.keyItemLeft}>
                  <Text style={styles.keyLabel}>{key.label}</Text>
                  <Text style={styles.keyMask}>••••••••{key.api_key.slice(-4)}</Text>
                  {key.fail_count > 0 && (
                    <Text style={styles.failCount}>Fail count: {key.fail_count}</Text>
                  )}
                </View>
                <View style={styles.keyItemRight}>
                  <Switch 
                    value={!!key.is_active} 
                    onValueChange={(val) => toggleApiKey(key.id, val)}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  />
                  <TouchableOpacity onPress={() => confirmDeleteKey(key.id)}>
                    <Trash2 size={18} color={COLORS.danger} style={{ marginLeft: 12 }} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <Text style={styles.keyNote}>
            * The app will automatically rotate to the next key if the current one reaches its limit.
          </Text>
        </Card>

        <Text style={styles.version}>LinguistAI v1.1.0</Text>
      </ScrollView>

      {/* Add Key Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add API Key</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Label</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Personal Key"
              value={newKeyLabel}
              onChangeText={setNewKeyLabel}
            />

            <Text style={styles.inputLabel}>API Key</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter your Gemini API key"
              value={newKeyValue}
              onChangeText={setNewKeyValue}
              secureTextEntry
            />

            <Button 
              title="Save Key" 
              onPress={handleAddKey} 
              style={{ marginTop: 12 }}
              disabled={!newKeyLabel || !newKeyValue}
            />
          </View>
        </View>
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
  sectionHeader: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 12,
  },
  card: {
    padding: 8,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  menuSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },
  keyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  keyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 18,
    color: COLORS.textPrimary,
    marginLeft: 12,
  },
  addKeyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    padding: 16,
    textAlign: 'center',
  },
  keyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  keyItemLeft: {
    flex: 1,
  },
  keyLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  keyMask: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  failCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: COLORS.danger,
    marginTop: 2,
  },
  keyItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keyNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
    padding: 16,
    lineHeight: 18,
  },
  version: {
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 40,
    marginBottom: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: LAYOUT.radiusLarge,
    padding: 24,
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
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: LAYOUT.radiusSmall,
    padding: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
});

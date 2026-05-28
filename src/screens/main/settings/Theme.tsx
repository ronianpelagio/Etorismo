import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, type ThemeName } from '../../../constants/themes'; 
export default function Theme({ navigation }: any) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>('light');
  const [isApplying, setIsApplying] = useState(false);

  const currentPreview = THEMES[selectedTheme];

  const applyTheme = async () => {
    setIsApplying(true);
    try {
      await AsyncStorage.setItem('appTheme', selectedTheme);
      // Trigger app reload or emit event to parent
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save theme:', error);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: currentPreview.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: currentPreview.surface }]}>
          <TouchableOpacity 
            onPress={() => navigation?.goBack()} 
            style={[styles.backBtn, { 
              backgroundColor: currentPreview.raised,
              borderColor: currentPreview.border,
            }]} 
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={currentPreview.ink} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: currentPreview.ink }]}>Theme</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={[styles.titleDivider, { backgroundColor: currentPreview.gold }]} />

        {/* Theme Preview Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: currentPreview.gold }]}>
            LIVE PREVIEW
          </Text>
          <View style={[styles.previewCard, { 
            backgroundColor: currentPreview.surface,
            borderColor: currentPreview.border,
          }]}>
            <View style={styles.previewHeader}>
              <View style={styles.previewColors}>
                {[
                  { label: 'Background', color: currentPreview.bg },
                  { label: 'Surface', color: currentPreview.surface },
                  { label: 'Accent', color: currentPreview.gold },
                ].map((item, idx) => (
                  <View key={idx} style={styles.colorSwatch}>
                    <View style={[styles.colorSample, { backgroundColor: item.color }]} />
                    <Text style={[styles.colorLabel, { color: currentPreview.inkDim }]}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Theme Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: currentPreview.gold }]}>
            SELECT THEME
          </Text>
          <View style={[styles.themesCard, { 
            backgroundColor: currentPreview.surface,
            borderColor: currentPreview.border,
            shadowColor: currentPreview.shadow,
          }]}>
            {Object.entries(THEMES).map(([id, theme]) => {
              const isSelected = selectedTheme === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.themeRow,
                    isSelected && styles.themeRowSelected,
                    Platform.OS === 'ios' && styles.themeRowIOS,
                  ]}
                  onPress={() => setSelectedTheme(id as ThemeName)}
                  activeOpacity={0.65}
                >
                  <View style={styles.themePreview}>
                    <View style={[
                      styles.themeIconBg,
                      { 
                        backgroundColor: isSelected 
                          ? currentPreview.goldGlow 
                          : currentPreview.overlay 
                      }
                    ]}>
                      <Ionicons 
                        name={theme.icon as any} 
                        size={20} 
                        color={currentPreview.gold} 
                      />
                    </View>
                    <View style={styles.themeInfo}>
                      <Text style={[styles.themeName, { color: currentPreview.ink }]}>
                        {theme.name}
                      </Text>
                      <Text style={[styles.themeDesc, { color: currentPreview.inkDim }]}>
                        {getThemeDescription(id as ThemeName)}
                      </Text>
                    </View>
                  </View>
                  
                  {isSelected && (
                    <View style={[styles.checkmark, { 
                      backgroundColor: currentPreview.gold,
                      borderColor: currentPreview.gold,
                    }]}>
                      <Ionicons name="checkmark" size={20} color={currentPreview.ink} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Apply Button */}
      <View style={[styles.bottomBar, { backgroundColor: currentPreview.surface }]}>
        <TouchableOpacity
          style={[
            styles.applyBtn,
            { 
              backgroundColor: currentPreview.gold,
              borderColor: currentPreview.gold,
              shadowColor: currentPreview.gold,
            },
            isApplying && styles.applyBtnDisabled
          ]}
          onPress={applyTheme}
          disabled={isApplying}
          activeOpacity={0.85}
        >
          <Text style={[styles.applyBtnText, { color: currentPreview.ink }]}>
            {isApplying ? 'Applying...' : `Apply ${currentPreview.name}`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Helper function for theme descriptions
function getThemeDescription(theme: ThemeName): string {
  const descriptions: Record<ThemeName, string> = {
    light: 'Clean and modern',
    warm: 'Cozy and inviting',
    sage: 'Nature-inspired',
    dusk: 'Elegant dark mode',
    sepia: 'Vintage artifact feel',
  };
  return descriptions[theme];
}
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  pageTitle: { 
    fontSize: 20, fontWeight: '900', 
    letterSpacing: -0.4, 
  },
  titleDivider: { 
    height: 4, marginHorizontal: 20, 
    borderRadius: 2, marginBottom: 8 
  },

  // Sections
  section: { paddingHorizontal: 20, paddingVertical: 8, paddingBottom: 24 },
  sectionLabel: { 
    fontSize: 11, fontWeight: '900', 
    letterSpacing: 2.5, marginBottom: 16, 
    marginLeft: 2 
  },

  // Preview Card
  previewCard: {
    borderRadius: 20, borderWidth: 1,
    padding: 20, overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  previewHeader: { alignItems: 'center' },
  previewColors: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  colorSwatch: { alignItems: 'center', gap: 6 },
  colorSample: { 
    width: 48, height: 48, borderRadius: 12, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  colorLabel: { fontSize: 12, fontWeight: '500' },

  // Themes Card
  themesCard: {
    borderRadius: 20, borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 8,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  themeRowSelected: {
    backgroundColor: 'rgba(212,181,103,0.06)',
  },
  themeRowIOS: {
    // iOS ripple effect
  },
  themePreview: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  themeIconBg: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  themeInfo: { flex: 1 },
  themeName: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  themeDesc: { fontSize: 13, fontWeight: '400' },
  checkmark: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },

  // Bottom Bar
  bottomBar: {
    padding: 20,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, paddingHorizontal: 24,
    borderRadius: 16, borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  applyBtnDisabled: {
    opacity: 0.7,
  },
  applyBtnText: { 
    fontSize: 16, fontWeight: '800', 
    letterSpacing: 0.5 
  },
});
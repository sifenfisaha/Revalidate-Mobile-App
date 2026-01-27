import { View, Text, ScrollView, Pressable, TextInput, RefreshControl, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import '../../global.css';

interface Reflection {
  id: string;
  title: string;
  date: string;
  description: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconFilled?: boolean;
}

interface ApiReflection {
  id: number;
  reflectionDate: string;
  reflectionText: string | null;
  documentIds: number[];
  createdAt: string;
  updatedAt: string;
}

export default function ReflectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'category' | 'evidence'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReflection, setNewReflection] = useState({
    date: new Date().toISOString().split('T')[0],
    text: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadReflections();
  }, []);

  const loadReflections = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const response = await apiService.get<{
        success: boolean;
        data: ApiReflection[];
        pagination: { total: number };
      }>(API_ENDPOINTS.REFLECTIONS.LIST, token);

      if (response?.data) {
        const mappedReflections: Reflection[] = response.data.map((r) => {
          // Extract title from first line of reflection text or use a placeholder
          const text = r.reflectionText || '';
          const lines = text.split('\n').filter(line => line.trim());
          const title = lines[0]?.substring(0, 50) || 'Reflective Account';
          const description = text || 'No description provided';

          // Format date
          const date = formatDate(r.reflectionDate || r.createdAt);

          // Determine icon based on whether there are attached documents
          const hasDocuments = r.documentIds && r.documentIds.length > 0;

          return {
            id: String(r.id),
            title,
            date,
            description,
            icon: hasDocuments ? 'attachment' : undefined,
          };
        });

        // Sort by date descending
        mappedReflections.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setReflections(mappedReflections);
      }
    } catch (error: any) {
      console.error('Error loading reflections:', error);
      if (!error?.message?.includes('OFFLINE_MODE')) {
        showToast.error(error?.message || 'Failed to load reflections', 'Error');
      }
      setReflections([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateString;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReflections();
  };

  const handleAddReflection = async () => {
    if (!newReflection.date) {
      showToast.error('Please select a date', 'Validation Error');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      await apiService.post(API_ENDPOINTS.REFLECTIONS.CREATE, {
        reflection_date: newReflection.date,
        reflection_text: newReflection.text,
      }, token);

      showToast.success('Reflection added', 'Success');
      setShowAddModal(false);
      loadReflections();
      setNewReflection({
        date: new Date().toISOString().split('T')[0],
        text: '',
      });
    } catch (error: any) {
      console.error('Error creating reflection:', error);
      showToast.error(error.message || 'Failed to create reflection', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReflections = reflections.filter((reflection) => {
    if (searchQuery) {
      return (
        reflection.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reflection.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      {/* Header */}
      <View className={`border-b ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-gray-100"
        }`}>
        <View className="flex-row items-center justify-between px-4 py-2">
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Pressable onPress={() => router.back()}>
              <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
            </Pressable>
            <Text className={`text-2xl font-bold ${isDark ? "text-white" : "text-[#121417]"}`}>
              Reflections
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/gallery')}
            className="px-3 py-1 bg-[#2B5E9C]/10 rounded-full"
          >
            <Text className="text-[#2B5E9C] text-xs font-bold">
              {reflections.length} total
            </Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="px-4 py-3 flex-row" style={{ gap: 8 }}>
          <View className={`flex-1 flex-row items-center rounded-lg h-10 ${isDark ? "bg-slate-700" : "bg-gray-100"
            }`}>
            <View className="pl-3 items-center justify-center">
              <MaterialIcons name="search" size={20} color={isDark ? "#9CA3AF" : "#687482"} />
            </View>
            <TextInput
              className={`flex-1 px-2 text-sm ${isDark ? "text-white" : "text-[#121417]"}`}
              placeholder="Search reflections..."
              placeholderTextColor={isDark ? "#6B7280" : "#687482"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <Pressable className={`w-10 h-10 shrink-0 items-center justify-center rounded-lg ${isDark ? "bg-slate-700" : "bg-gray-100"
            }`}>
            <MaterialIcons name="tune" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
          </Pressable>
        </View>

        {/* Filter Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
        >
          <Pressable
            onPress={() => setActiveFilter('all')}
            className={`flex-row items-center justify-center rounded-full px-4 h-8 ${activeFilter === 'all'
                ? 'bg-[#2B5E9C]'
                : (isDark ? 'bg-slate-700' : 'bg-gray-100')
              }`}
            style={{ gap: 4 }}
          >
            <Text className={`text-xs font-medium ${activeFilter === 'all'
                ? 'text-white'
                : (isDark ? 'text-gray-300' : 'text-[#121417]')
              }`}>
              All Time
            </Text>
            <MaterialIcons
              name="expand-more"
              size={16}
              color={activeFilter === 'all' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#121417')}
            />
          </Pressable>
          <Pressable
            onPress={() => setActiveFilter('category')}
            className={`flex-row items-center justify-center rounded-full px-4 h-8 ${activeFilter === 'category'
                ? 'bg-[#2B5E9C]'
                : (isDark ? 'bg-slate-700' : 'bg-gray-100')
              }`}
            style={{ gap: 4 }}
          >
            <Text className={`text-xs font-medium ${activeFilter === 'category'
                ? 'text-white'
                : (isDark ? 'text-gray-300' : 'text-[#121417]')
              }`}>
              Category
            </Text>
            <MaterialIcons
              name="expand-more"
              size={16}
              color={activeFilter === 'category' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#121417')}
            />
          </Pressable>
          <Pressable
            onPress={() => setActiveFilter('evidence')}
            className={`flex-row items-center justify-center rounded-full px-4 h-8 ${activeFilter === 'evidence'
                ? 'bg-[#2B5E9C]'
                : (isDark ? 'bg-slate-700' : 'bg-gray-100')
              }`}
            style={{ gap: 4 }}
          >
            <Text className={`text-xs font-medium ${activeFilter === 'evidence'
                ? 'text-white'
                : (isDark ? 'text-gray-300' : 'text-[#121417]')
              }`}>
              Evidence
            </Text>
            <MaterialIcons
              name="expand-more"
              size={16}
              color={activeFilter === 'evidence' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#121417')}
            />
          </Pressable>
        </ScrollView>
      </View>

      {/* Loading State */}
      {loading && !refreshing && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
          <Text className={`mt-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Loading reflections...
          </Text>
        </View>
      )}

      {/* Reflections List */}
      {!loading && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDark ? '#D4AF37' : '#2B5F9E'}
              colors={['#D4AF37', '#2B5F9E']}
            />
          }
        >
          {filteredReflections.length > 0 ? (
            <View style={{ gap: 16 }}>
              {filteredReflections.map((reflection) => (
                <View
                  key={reflection.id}
                  className={`rounded-xl shadow-sm border overflow-hidden ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"
                    }`}
                >
                  <View className="p-4">
                    <View className="flex-row justify-between items-start mb-1">
                      <Text className={`text-lg font-bold flex-1 ${isDark ? "text-white" : "text-[#121417]"
                        }`}>
                        {reflection.title}
                      </Text>
                      {reflection.icon && (
                        <MaterialIcons
                          name={reflection.icon}
                          size={24}
                          color="#2B5E9C"
                        />
                      )}
                    </View>
                    <Text className={`text-xs font-medium mb-2 uppercase tracking-wider ${isDark ? "text-gray-400" : "text-[#687482]"
                      }`}>
                      {reflection.date}
                    </Text>
                    <Text
                      className={`text-sm font-normal leading-relaxed mb-3 ${isDark ? "text-gray-300" : "text-[#121417]"
                        }`}
                      numberOfLines={3}
                    >
                      {reflection.description}
                    </Text>
                    <View className={`mt-3 pt-3 border-t flex-row justify-end ${isDark ? "border-slate-700" : "border-gray-50"
                      }`}>
                      <Pressable className="flex-row items-center" style={{ gap: 4 }}>
                        <Text className="text-[#2B5E9C] text-xs font-bold">
                          VIEW FULL ACCOUNT
                        </Text>
                        <MaterialIcons name="chevron-right" size={16} color="#2B5E9C" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className={`p-8 rounded-2xl border items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
              }`}>
              <MaterialIcons name="description" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
              <Text className={`mt-4 text-center font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
                No reflections yet
              </Text>
              <Text className={`mt-2 text-center text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                Tap the + button to add your first reflective account
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Floating Action Button */}
      <View
        className="absolute right-6 items-center"
        style={{ bottom: 80 + insets.bottom }}
      >
        <Pressable
          onPress={() => setShowAddModal(true)}
          className="w-14 h-14 bg-[#2B5E9C] rounded-full shadow-lg items-center justify-center"
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Add Reflection Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`rounded-t-3xl ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <View className="p-6 border-b border-gray-200 flex-row justify-between items-center">
              <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Add Reflection</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <MaterialIcons name="close" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
              </Pressable>
            </View>
            <View className="p-6 gap-4">
              <View>
                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  value={newReflection.date}
                  onChangeText={(t) => setNewReflection({ ...newReflection, date: t })}
                  className={`p-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-slate-800"}`}
                  placeholder="2024-03-20"
                />
              </View>
              <View>
                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Reflection Content</Text>
                <TextInput
                  value={newReflection.text}
                  onChangeText={(t) => setNewReflection({ ...newReflection, text: t })}
                  className={`p-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-slate-800"}`}
                  placeholder="Describe your reflective account..."
                  multiline
                  numberOfLines={6}
                  style={{ minHeight: 120 }}
                />
              </View>
              <Pressable
                onPress={handleAddReflection}
                disabled={isSubmitting}
                className={`mt-4 p-4 rounded-xl items-center justify-center ${isSubmitting ? "bg-gray-400" : "bg-[#2B5E9C]"
                  }`}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Save Reflection</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

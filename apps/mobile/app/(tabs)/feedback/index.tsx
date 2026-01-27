import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import '../../global.css';

interface FeedbackEntry {
  id: string;
  reviewerName: string;
  date: string;
  type: 'patient' | 'colleague' | 'manager';
  rating: number;
  feedback: string;
  hasAvatar?: boolean;
}

interface ApiFeedback {
  id: number;
  feedbackDate: string;
  feedbackType: 'patient' | 'colleague' | 'manager';
  feedbackText: string | null;
  documentIds: number[];
  createdAt: string;
  updatedAt: string;
}

export default function FeedbackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const [activeFilter, setActiveFilter] = useState<'all' | 'patient' | 'colleague' | 'manager'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allFeedback, setAllFeedback] = useState<FeedbackEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFeedback, setNewFeedback] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'patient' as 'patient' | 'colleague' | 'manager',
    text: '',
    rating: '5',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const response = await apiService.get<{
        success: boolean;
        data: ApiFeedback[];
        pagination: { total: number };
      }>(API_ENDPOINTS.FEEDBACK.LIST, token);

      if (response?.data) {
        const mappedFeedback: FeedbackEntry[] = response.data.map((f) => {
          // Format date
          const date = formatDate(f.feedbackDate || f.createdAt);

          // Generate a reviewer name based on type
          let reviewerName = 'Anonymous';
          if (f.feedbackType === 'patient') {
            reviewerName = 'Anonymous Patient';
          } else if (f.feedbackType === 'colleague') {
            reviewerName = 'Colleague Feedback';
          } else if (f.feedbackType === 'manager') {
            reviewerName = 'Manager Review';
          }

          // Extract rating if embedded in feedback text (format: "[Rating: X]" or similar)
          let rating = 0;
          const feedbackText = f.feedbackText || '';
          const ratingMatch = feedbackText.match(/\[Rating:\s*(\d)\]/i);
          if (ratingMatch && ratingMatch[1]) {
            rating = parseInt(ratingMatch[1], 10);
          }

          return {
            id: String(f.id),
            reviewerName,
            date,
            type: f.feedbackType || 'patient',
            rating,
            feedback: feedbackText.replace(/\[Rating:\s*\d\]/gi, '').trim() || 'No feedback provided',
            hasAvatar: true,
          };
        });

        // Sort by date descending
        mappedFeedback.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllFeedback(mappedFeedback);
      }
    } catch (error: any) {
      console.error('Error loading feedback:', error);
      if (!error?.message?.includes('OFFLINE_MODE')) {
        showToast.error(error?.message || 'Failed to load feedback', 'Error');
      }
      setAllFeedback([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateString;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeedback();
  };

  const handleAddFeedback = async () => {
    if (!newFeedback.date) {
      showToast.error('Please select a date', 'Validation Error');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      // Embed rating in text if provided
      let finalText = newFeedback.text;
      if (newFeedback.rating) {
        finalText = `[Rating: ${newFeedback.rating}] ${finalText}`;
      }

      await apiService.post(API_ENDPOINTS.FEEDBACK.CREATE, {
        feedback_date: newFeedback.date,
        feedback_type: newFeedback.type,
        feedback_text: finalText,
      }, token);

      showToast.success('Feedback added', 'Success');
      setShowAddModal(false);
      loadFeedback();
      setNewFeedback({
        date: new Date().toISOString().split('T')[0],
        type: 'patient',
        text: '',
        rating: '5',
      });
    } catch (error: any) {
      console.error('Error creating feedback:', error);
      showToast.error(error.message || 'Failed to create feedback', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter feedback based on active filter
  const getFilteredFeedback = () => {
    if (activeFilter === 'all') {
      return allFeedback;
    }
    return allFeedback.filter((entry) => entry.type === activeFilter);
  };

  const filteredFeedback = getFilteredFeedback();

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'patient':
        return { bg: 'bg-blue-100', text: 'text-blue-700' };
      case 'colleague':
        return { bg: 'bg-green-100', text: 'text-green-700' };
      case 'manager':
        return { bg: 'bg-purple-100', text: 'text-purple-700' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-700' };
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <MaterialIcons
        key={i}
        name={i < rating ? 'star' : 'star-border'}
        size={16}
        color={i < rating ? '#FBBF24' : '#D1D5DB'}
      />
    ));
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      {/* Header */}
      <View className={`border-b ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-[#F6F7F8]/80 border-[#DDE0E4]/50"
        }`}>
        <View className="flex-row items-center px-4 py-2 justify-between">
          <Pressable onPress={() => router.back()} className="w-12 h-12 shrink-0 items-center justify-center">
            <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
          </Pressable>
          <Text className={`text-lg font-bold flex-1 text-center ${isDark ? "text-white" : "text-[#121417]"}`}>
            Feedback Log ({allFeedback.length})
          </Text>
          <Pressable className="w-12 h-12 items-center justify-center">
            <MaterialIcons name="search" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
          </Pressable>
        </View>

        {/* Filter Tabs */}
        <View className="pb-1">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 24 }}
          >
            <Pressable
              onPress={() => setActiveFilter('all')}
              className="flex-col items-center justify-center pb-[13px] pt-4"
              style={{ borderBottomWidth: activeFilter === 'all' ? 3 : 0, borderBottomColor: activeFilter === 'all' ? '#2B5E9C' : 'transparent' }}
            >
              <Text className={`text-sm font-bold ${activeFilter === 'all' ? 'text-[#2B5E9C]' : (isDark ? 'text-gray-400' : 'text-[#687482]')
                }`}>
                All
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFilter('patient')}
              className="flex-col items-center justify-center pb-[13px] pt-4"
              style={{ borderBottomWidth: activeFilter === 'patient' ? 3 : 0, borderBottomColor: activeFilter === 'patient' ? '#2B5E9C' : 'transparent' }}
            >
              <Text className={`text-sm font-bold ${activeFilter === 'patient' ? 'text-[#2B5E9C]' : (isDark ? 'text-gray-400' : 'text-[#687482]')
                }`}>
                Patient
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFilter('colleague')}
              className="flex-col items-center justify-center pb-[13px] pt-4"
              style={{ borderBottomWidth: activeFilter === 'colleague' ? 3 : 0, borderBottomColor: activeFilter === 'colleague' ? '#2B5E9C' : 'transparent' }}
            >
              <Text className={`text-sm font-bold ${activeFilter === 'colleague' ? 'text-[#2B5E9C]' : (isDark ? 'text-gray-400' : 'text-[#687482]')
                }`}>
                Colleague
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFilter('manager')}
              className="flex-col items-center justify-center pb-[13px] pt-4"
              style={{ borderBottomWidth: activeFilter === 'manager' ? 3 : 0, borderBottomColor: activeFilter === 'manager' ? '#2B5E9C' : 'transparent' }}
            >
              <Text className={`text-sm font-bold ${activeFilter === 'manager' ? 'text-[#2B5E9C]' : (isDark ? 'text-gray-400' : 'text-[#687482]')
                }`}>
                Manager
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>

      {/* Loading State */}
      {loading && !refreshing && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
          <Text className={`mt-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Loading feedback...
          </Text>
        </View>
      )}

      {/* Feedback List */}
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
          <View style={{ gap: 16 }}>
            {filteredFeedback.length > 0 ? (
              filteredFeedback.map((entry) => {
                const typeColor = getTypeColor(entry.type);
                const typeLabel = entry.type.charAt(0).toUpperCase() + entry.type.slice(1);

                return (
                  <Pressable
                    key={entry.id}
                    onPress={() => {
                      // Navigate to details if needed
                    }}
                    className={`rounded-lg shadow-sm border p-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"
                      }`}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-row flex-1 min-w-0" style={{ gap: 12 }}>
                        <View className="w-12 h-12 rounded-full bg-[#2B5E9C]/10 items-center justify-center flex-shrink-0">
                          <MaterialIcons name="person" size={24} color="#2B5E9C" />
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text className={`text-base font-bold ${isDark ? "text-white" : "text-[#121417]"}`} numberOfLines={1}>
                            {entry.reviewerName}
                          </Text>
                          <View className="flex-row items-center mt-0.5 flex-wrap" style={{ gap: 8 }}>
                            <View className={`px-2 py-0.5 ${typeColor.bg} rounded`}>
                              <Text className={`text-[10px] font-bold uppercase tracking-wider ${typeColor.text}`}>
                                {typeLabel}
                              </Text>
                            </View>
                            {entry.rating > 0 && (
                              <View className="flex-row" style={{ gap: 2 }}>
                                {renderStars(entry.rating)}
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      <Text className={`text-xs font-medium ml-2 flex-shrink-0 ${isDark ? "text-gray-400" : "text-[#687482]"
                        }`}>
                        {entry.date}
                      </Text>
                    </View>
                    <Text className={`text-sm font-normal leading-relaxed ${isDark ? "text-gray-400" : "text-[#687482]"}`} numberOfLines={2}>
                      {entry.feedback}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <View className={`p-8 rounded-lg border items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                }`}>
                <MaterialIcons name="inbox" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
                <Text className={`mt-4 text-center font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
                  No {activeFilter === 'all' ? '' : activeFilter} feedback found
                </Text>
                <Text className={`mt-2 text-center text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  Feedback entries will appear here
                </Text>
              </View>
            )}
          </View>
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

      {/* Add Feedback Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`rounded-t-3xl ${isDark ? "bg-slate-800" : "bg-white"}`}>
            <View className="p-6 border-b border-gray-200 flex-row justify-between items-center">
              <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Log Feedback</Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <MaterialIcons name="close" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
              </Pressable>
            </View>
            <ScrollView className="max-h-[500px]" contentContainerStyle={{ padding: 24, gap: 16 }}>
              <View>
                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  value={newFeedback.date}
                  onChangeText={(t) => setNewFeedback({ ...newFeedback, date: t })}
                  className={`p-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-slate-800"}`}
                  placeholder="2024-03-20"
                />
              </View>
              <View>
                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Type</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {(['patient', 'colleague', 'manager'] as const).map(type => (
                    <Pressable
                      key={type}
                      onPress={() => setNewFeedback({ ...newFeedback, type })}
                      className={`px-4 py-2 rounded-lg border ${newFeedback.type === type
                          ? 'bg-[#2B5E9C] border-[#2B5E9C]'
                          : (isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200')
                        }`}
                    >
                      <Text className={`capitalize font-medium ${newFeedback.type === type
                          ? 'text-white'
                          : (isDark ? 'text-gray-300' : 'text-slate-700')
                        }`}>
                        {type}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View>
                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Rating (1-5)</Text>
                <View className="flex-row" style={{ gap: 12 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Pressable
                      key={star}
                      onPress={() => setNewFeedback({ ...newFeedback, rating: String(star) })}
                    >
                      <MaterialIcons
                        name={star <= parseInt(newFeedback.rating) ? "star" : "star-border"}
                        size={32}
                        color={star <= parseInt(newFeedback.rating) ? "#FBBF24" : (isDark ? "#4B5563" : "#D1D5DB")}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
              <View>
                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Feedback Comments</Text>
                <TextInput
                  value={newFeedback.text}
                  onChangeText={(t) => setNewFeedback({ ...newFeedback, text: t })}
                  className={`p-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-slate-800"}`}
                  placeholder="Details of the feedback received..."
                  multiline
                  numberOfLines={4}
                  style={{ minHeight: 100 }}
                />
              </View>
              <Pressable
                onPress={handleAddFeedback}
                disabled={isSubmitting}
                className={`mt-4 p-4 rounded-xl items-center justify-center ${isSubmitting ? "bg-gray-400" : "bg-[#2B5E9C]"
                  }`}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Save Feedback</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

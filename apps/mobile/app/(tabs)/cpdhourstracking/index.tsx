import { View, Text, ScrollView, Pressable, RefreshControl, Modal, TextInput, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '@/services/api';
import Svg, { Circle } from 'react-native-svg';
import { useThemeStore } from '@/features/theme/theme.store';
import '../../global.css';

interface CPDActivity {
  id: string;
  title: string;
  date: string;
  hours: number;
  type: 'participatory' | 'non-participatory';
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBgColor: string;
  iconColor: string;
  hasCertificate?: boolean;
}

export default function CPDHoursTrackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const [activeFilter, setActiveFilter] = useState<'all' | 'participatory' | 'non-participatory'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // CPD Data (fetched from API)
  const [totalHours, setTotalHours] = useState<number>(0);
  const targetHours = 35;
  const [participatoryHours, setParticipatoryHours] = useState<number>(0);
  const [nonParticipatoryHours, setNonParticipatoryHours] = useState<number>(0);
  const [allActivities, setAllActivities] = useState<CPDActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddCpdModal, setShowAddCpdModal] = useState(false);
  const [cpdForm, setCpdForm] = useState({
    trainingName: '',
    activityDate: '', // YYYY-MM-DD
    durationMinutes: 0,
    activityType: 'participatory',
  });
  const [cpdSubmitting, setCpdSubmitting] = useState(false);
  const [showCpdDatePicker, setShowCpdDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const monthNames = [
    'January','February','March','April','May','June','July','August','September','October','November','December'
  ];
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const formatCpdDateDisplay = (iso?: string) => {
    if (!iso) return 'Select date (YYYY-MM-DD)';
    return iso;
  };

  const formatYMD = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const handleCpdDateSelect = (day: number) => {
    const iso = formatYMD(selectedYear, selectedMonth, day);
    setCpdForm({ ...cpdForm, activityDate: iso });
    setShowCpdDatePicker(false);
  };

  const renderCpdCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const nodes: any[] = [];
    for (let i = 0; i < firstDay; i++) nodes.push(<View key={`empty-${i}`} className="w-10 h-10" />);
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = cpdForm.activityDate === formatYMD(selectedYear, selectedMonth, day);
      nodes.push(
        <Pressable
          key={day}
          onPress={() => handleCpdDateSelect(day)}
          className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-[#2563EB]' : isDark ? 'bg-slate-700/50' : 'bg-transparent'}`}
        >
          <Text className={`text-sm font-medium ${isSelected ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'}`}>{day}</Text>
        </Pressable>
      );
    }
    return nodes;
  };
  const progress = (totalHours / targetHours) * 100;

  // Calculate circle progress
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // initial activities are empty; will be loaded from API

  // Filter activities based on active filter
  const getFilteredActivities = () => {
    if (activeFilter === 'all') {
      return allActivities;
    }
    return allActivities.filter((activity) => activity.type === activeFilter);
  };

  const filteredActivities = getFilteredActivities();

  useEffect(() => {
    loadCpdActivities();
  }, []);

  const loadCpdActivities = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      // Fetch user's CPD entries
      const resp = await apiService.get<{ success?: boolean; data: Array<any> }>(`/api/v1/cpd-hours?limit=100`, token);
      const items = Array.isArray(resp?.data) ? resp.data : [];

      const mapped: CPDActivity[] = items.map((it: any) => ({
        id: String(it.id),
        title: it.trainingName || it.training_name || it.training || 'CPD Activity',
        date: it.activityDate || it.activity_date || it.createdAt || it.created_at || '',
        hours: (it.durationMinutes || it.duration_minutes || 0) / 60,
        type: (it.activityType || it.activity_type) as 'participatory' | 'non-participatory',
        icon: (it.activityType || it.activity_type) === 'participatory' ? 'school' : 'menu-book',
        iconBgColor: (it.activityType || it.activity_type) === 'participatory' ? 'bg-blue-100' : 'bg-amber-100',
        iconColor: (it.activityType || it.activity_type) === 'participatory' ? '#2563EB' : '#F59E0B',
        hasCertificate: (it.documentIds && it.documentIds.length > 0) || (it.document_ids && it.document_ids.length > 0),
      }));

      setAllActivities(mapped);

      // calculate totals
      const total = mapped.reduce((s, a) => s + a.hours, 0);
      const part = mapped.filter(a => a.type === 'participatory').reduce((s, a) => s + a.hours, 0);
      const nonPart = mapped.filter(a => a.type === 'non-participatory').reduce((s, a) => s + a.hours, 0);

      setTotalHours(Math.round(total * 10) / 10);
      setParticipatoryHours(Math.round(part * 10) / 10);
      setNonParticipatoryHours(Math.round(nonPart * 10) / 10);
    } catch (error) {
      console.warn('Error loading CPD activities:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 1000);
            }}
            tintColor={isDark ? '#D4AF37' : '#2B5F9E'}
            colors={['#D4AF37', '#2B5F9E']}
          />
        }
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
              CPD Portfolio
            </Text>
            <Pressable 
              onPress={() => router.push('/(tabs)/gallery')}
              className={`w-10 h-10 rounded-full shadow-sm items-center justify-center border ${
                isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
              }`}
            >
              <MaterialIcons name="photo-library" size={20} color={isDark ? "#9CA3AF" : "#64748B"} />
            </Pressable>
          </View>
          <Text className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Professional Revalidation 2024
          </Text>
        </View>

        {/* CPD Summary Card */}
        <View className="px-6 mb-6">
          <View className={`rounded-3xl p-6 shadow-sm border items-center ${
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
          }`}>
            {/* Circular Progress */}
            <View className="relative items-center justify-center mb-6">
              <Svg width={192} height={192} viewBox="0 0 192 192">
                {/* Background Circle */}
                <Circle
                  cx="96"
                  cy="96"
                  r={radius}
                  stroke="#E2E8F0"
                  strokeWidth="12"
                  fill="transparent"
                />
                {/* Progress Circle */}
                <Circle
                  cx="96"
                  cy="96"
                  r={radius}
                  stroke="#2563EB"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 96 96)`}
                />
              </Svg>
              <View className="absolute inset-0 items-center justify-center">
                <Text className={`text-4xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  {totalHours} / {targetHours}
                </Text>
                <Text className={`text-sm font-medium mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  Total Hours
                </Text>
                {progress >= 100 && (
                  <View className="mt-2 px-3 py-1 bg-green-100 rounded-full">
                    <Text className="text-green-600 text-[10px] font-bold uppercase tracking-wider">
                      Target Met
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Breakdown Cards */}
            <View className="w-full flex-row" style={{ gap: 16 }}>
              {/* Participatory Hours */}
              <View className={`flex-1 p-4 rounded-2xl border ${
                isDark ? "bg-slate-700 border-slate-600" : "bg-slate-50 border-slate-100"
              }`}>
                <View className="flex-row items-center mb-1" style={{ gap: 8 }}>
                  <View className="w-2 h-2 rounded-full bg-[#2563EB]" />
                  <Text className={`text-xs font-semibold uppercase ${
                    isDark ? "text-gray-400" : "text-slate-500"
                  }`}>
                    Participatory
                  </Text>
                </View>
                <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  {participatoryHours} hrs
                </Text>
                <Text className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                  Min 20 required
                </Text>
              </View>

              {/* Non-Participatory Hours */}
              <View className={`flex-1 p-4 rounded-2xl border ${
                isDark ? "bg-slate-700 border-slate-600" : "bg-slate-50 border-slate-100"
              }`}>
                <View className="flex-row items-center mb-1" style={{ gap: 8 }}>
                  <View className={`w-2 h-2 rounded-full ${isDark ? "bg-gray-500" : "bg-slate-300"}`} />
                  <Text className={`text-xs font-semibold uppercase ${
                    isDark ? "text-gray-400" : "text-slate-500"
                  }`}>
                    Non-Part.
                  </Text>
                </View>
                <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                  {nonParticipatoryHours} hrs
                </Text>
                <Text className={`text-[10px] mt-1 ${isDark ? "text-gray-500" : "text-slate-400"}`}>
                  Flexible allocation
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View className="px-6 mb-6">
          <View className={`flex-row p-1 rounded-xl ${
            isDark ? "bg-slate-700/50" : "bg-slate-200/50"
          }`} style={{ gap: 4 }}>
            <Pressable
              onPress={() => setActiveFilter('all')}
              className={`flex-1 py-2 rounded-lg ${
                activeFilter === 'all' 
                  ? (isDark ? 'bg-slate-800 shadow-sm' : 'bg-white shadow-sm') 
                  : ''
              }`}
            >
              <Text className={`text-sm text-center ${
                activeFilter === 'all' 
                  ? 'font-semibold text-[#2563EB]' 
                  : (isDark ? 'font-medium text-gray-400' : 'font-medium text-slate-500')
              }`}>
                All
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFilter('participatory')}
              className={`flex-1 py-2 rounded-lg ${
                activeFilter === 'participatory' 
                  ? (isDark ? 'bg-slate-800 shadow-sm' : 'bg-white shadow-sm') 
                  : ''
              }`}
            >
              <Text className={`text-sm text-center ${
                activeFilter === 'participatory' 
                  ? 'font-semibold text-[#2563EB]' 
                  : (isDark ? 'font-medium text-gray-400' : 'font-medium text-slate-500')
              }`}>
                Participatory
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveFilter('non-participatory')}
              className={`flex-1 py-2 rounded-lg ${
                activeFilter === 'non-participatory' 
                  ? (isDark ? 'bg-slate-800 shadow-sm' : 'bg-white shadow-sm') 
                  : ''
              }`}
            >
              <Text className={`text-sm text-center ${
                activeFilter === 'non-participatory' 
                  ? 'font-semibold text-[#2563EB]' 
                  : (isDark ? 'font-medium text-gray-400' : 'font-medium text-slate-500')
              }`}>
                Non-Part.
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Activities Section */}
        <View className="px-6" style={{ gap: 16 }}>
          <View className="flex-row items-center justify-between">
            <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
              Activities
            </Text>
            {filteredActivities.length > 0 && (
              <Pressable onPress={() => setActiveFilter('all')}>
                <Text className="text-[#2563EB] text-sm font-semibold">View All</Text>
              </Pressable>
            )}
          </View>

          <View style={{ gap: 12 }}>
            {filteredActivities.length > 0 ? (
              filteredActivities.map((activity) => (
                <Pressable
                  key={activity.id}
                  onPress={() => {
                    // Navigate to activity details or edit screen
                    // For now, we'll keep it as a placeholder
                    console.log('View activity:', activity.id);
                  }}
                  className={`p-4 rounded-2xl border shadow-sm flex-row items-center ${
                    isDark 
                      ? "bg-slate-800 border-slate-700 active:bg-slate-700" 
                      : "bg-white border-slate-100 active:bg-slate-50"
                  }`}
                  style={{ gap: 16 }}
                >
                  <View className={`w-12 h-12 rounded-xl ${activity.iconBgColor} items-center justify-center flex-shrink-0`}>
                    <MaterialIcons 
                      name={activity.icon} 
                      size={24} 
                      color={activity.iconColor} 
                    />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-800"}`} numberOfLines={1}>
                      {activity.title}
                    </Text>
                    <Text className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                      {activity.date} • {activity.hours} Hours
                    </Text>
                    <View className="flex-row mt-2" style={{ gap: 8 }}>
                      <View className={`px-2 py-0.5 rounded-md ${
                        isDark ? "bg-slate-700" : "bg-slate-100"
                      }`}>
                        <Text className={`text-[10px] font-semibold ${
                          isDark ? "text-gray-300" : "text-slate-600"
                        }`}>
                          {activity.type === 'participatory' ? 'Participatory' : 'Non-Participatory'}
                        </Text>
                      </View>
                      {activity.hasCertificate && (
                        <View className="flex-row items-center px-2 py-0.5 rounded-md bg-blue-50" style={{ gap: 4 }}>
                          <MaterialIcons name="description" size={14} color="#2563EB" />
                          <Text className="text-[10px] font-semibold text-[#2563EB]">
                            Certificate
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <View className={`p-8 rounded-2xl border items-center ${
                isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
              }`}>
                <MaterialIcons name="inbox" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
                <Text className={`mt-4 text-center ${isDark ? "text-gray-400" : "text-slate-400"}`}>
                  No {activeFilter === 'all' ? '' : activeFilter === 'participatory' ? 'participatory' : 'non-participatory'} activities found
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View 
        className="absolute right-6 items-center"
        style={{ bottom: 80 + insets.bottom }}
      >
        <Pressable
          onPress={() => setShowAddCpdModal(true)}
          className="w-14 h-14 bg-[#2563EB] rounded-full shadow-lg items-center justify-center active:opacity-80"
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Add CPD Modal */}
      <Modal
        visible={showAddCpdModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddCpdModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`rounded-t-3xl max-h-[90%] ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <SafeAreaView edges={['bottom']}>
              <View className={`flex-row items-center justify-between px-6 pt-4 pb-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Add CPD Activity</Text>
                <Pressable onPress={() => setShowAddCpdModal(false)}>
                  <MaterialIcons name="close" size={24} color={isDark ? '#9CA3AF' : '#64748B'} />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="px-6 pt-6" style={{ gap: 12 }}>
                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Title</Text>
                    <TextInput
                      value={cpdForm.trainingName}
                      onChangeText={(t) => setCpdForm({ ...cpdForm, trainingName: t })}
                      placeholder="e.g. Advanced Clinical Assessment"
                      placeholderTextColor={isDark ? '#6B7280' : '#94A3B8'}
                      className={`border rounded-2xl px-4 py-3 text-base ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-200'}`}
                    />
                  </View>

                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Date</Text>
                    <Pressable
                      onPress={() => {
                        // open calendar modal and set to current or selected month
                        if (cpdForm.activityDate) {
                          const parts = cpdForm.activityDate.split('-').map(Number);
                          if (parts.length === 3) {
                            setSelectedYear(parts[0]);
                            setSelectedMonth(parts[1] - 1);
                          }
                        } else {
                          const now = new Date();
                          setSelectedYear(now.getFullYear());
                          setSelectedMonth(now.getMonth());
                        }
                        setShowCpdDatePicker(true);
                      }}
                      className={`border rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}
                    >
                      <Text className={`${isDark ? 'text-white' : 'text-slate-800'}`}>{formatCpdDateDisplay(cpdForm.activityDate)}</Text>
                    </Pressable>
                  </View>

                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Duration (minutes)</Text>
                    <TextInput
                      value={cpdForm.durationMinutes ? String(cpdForm.durationMinutes) : ''}
                      onChangeText={(t) => setCpdForm({ ...cpdForm, durationMinutes: parseInt(t || '0', 10) || 0 })}
                      placeholder="e.g. 90"
                      keyboardType={Platform.OS === 'web' ? 'numeric' : 'number-pad'}
                      placeholderTextColor={isDark ? '#6B7280' : '#94A3B8'}
                      className={`border rounded-2xl px-4 py-3 text-base ${isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-800 border-slate-200'}`}
                    />
                  </View>

                  <View>
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Type</Text>
                    <View className="flex-row" style={{ gap: 8 }}>
                      <Pressable onPress={() => setCpdForm({ ...cpdForm, activityType: 'participatory' })} className={`px-4 py-2 rounded-2xl ${cpdForm.activityType === 'participatory' ? (isDark ? 'bg-slate-700' : 'bg-white') : ''}`}>
                        <Text className={cpdForm.activityType === 'participatory' ? 'font-semibold' : ''}>Participatory</Text>
                      </Pressable>
                      <Pressable onPress={() => setCpdForm({ ...cpdForm, activityType: 'non-participatory' })} className={`px-4 py-2 rounded-2xl ${cpdForm.activityType === 'non-participatory' ? (isDark ? 'bg-slate-700' : 'bg-white') : ''}`}>
                        <Text className={cpdForm.activityType === 'non-participatory' ? 'font-semibold' : ''}>Non-Part.</Text>
                      </Pressable>
                    </View>
                  </View>

                  <View className="pt-4">
                    <Pressable
                      onPress={async () => {
                        // simple validation
                        if (!cpdForm.trainingName.trim() || !cpdForm.activityDate || cpdForm.durationMinutes <= 0) {
                          console.warn('Please fill all fields');
                          return;
                        }
                        setCpdSubmitting(true);
                        try {
                          const token = await AsyncStorage.getItem('authToken');
                          if (!token) throw new Error('Not authenticated');

                          await apiService.post('/api/v1/cpd-hours', {
                            training_name: cpdForm.trainingName,
                            activity_date: cpdForm.activityDate,
                            duration_minutes: cpdForm.durationMinutes,
                            activity_type: cpdForm.activityType,
                          }, token);

                          // reload
                          await loadCpdActivities();
                          setShowAddCpdModal(false);
                          setCpdForm({ trainingName: '', activityDate: '', durationMinutes: 0, activityType: 'participatory' });
                        } catch (err) {
                          console.error('Error creating CPD entry:', err);
                        } finally {
                          setCpdSubmitting(false);
                        }
                      }}
                      className={`px-6 py-3 rounded-2xl items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-[#2563EB]'}`}
                      disabled={cpdSubmitting}
                    >
                      {cpdSubmitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white font-bold">Add Activity</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

        {/* CPD Date Picker Modal */}
        <Modal
          visible={showCpdDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCpdDatePicker(false)}
        >
          <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setShowCpdDatePicker(false)}>
            <Pressable onPress={(e) => e.stopPropagation()} className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-3xl p-6`}>
              <View className="flex-row items-center justify-between mb-4">
                <Pressable onPress={() => navigateMonth('prev')} className="p-2 rounded-full">
                  <MaterialIcons name="chevron-left" size={24} color={isDark ? '#D1D5DB' : '#4B5563'} />
                </Pressable>
                <View className="flex-row items-center gap-2">
                  <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{monthNames[selectedMonth]}</Text>
                  <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedYear}</Text>
                </View>
                <Pressable onPress={() => navigateMonth('next')} className="p-2 rounded-full">
                  <MaterialIcons name="chevron-right" size={24} color={isDark ? '#D1D5DB' : '#4B5563'} />
                </Pressable>
              </View>

              <View className="flex-row justify-between mb-3">
                {dayNames.map((day) => (
                  <View key={day} className="w-10 items-center">
                    <Text className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{day}</Text>
                  </View>
                ))}
              </View>

              <View className="flex-row flex-wrap justify-between mb-6">{renderCpdCalendar()}</View>

              <View className="flex-row gap-3">
                <Pressable onPress={() => setShowCpdDatePicker(false)} className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                  <Text className={`text-center font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
    </SafeAreaView>
  );
}

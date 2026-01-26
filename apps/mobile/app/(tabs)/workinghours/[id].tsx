import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import '../../global.css';

interface WorkSession {
  id: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  workDescription: string | null;
  documentIds: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function WorkHistoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useThemeStore();
  const [session, setSession] = useState<WorkSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadWorkSession();
    }
  }, [id]);

  const loadWorkSession = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const response = await apiService.get<{
        success: boolean;
        data: WorkSession;
      }>(`${API_ENDPOINTS.WORK_HOURS.GET_BY_ID}/${id}`, token);

      if (response.success && response.data) {
        setSession(response.data);
      } else {
        showToast.error('Session not found', 'Error');
        router.back();
      }
    } catch (error: any) {
      console.error('Error loading work session:', error);
      showToast.error(error.message || 'Failed to load session', 'Error');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
          <Text className={`mt-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Loading session details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className={`text-lg ${isDark ? "text-white" : "text-slate-800"}`}>
            Session not found
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-4 px-6 py-3 bg-[#1E61EB] rounded-full"
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const month = monthNames[monthIndex] || 'Unknown';
    const year = date.getFullYear();
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    return { day, month, year, dayOfWeek };
  };

  const dateInfo = formatDate(session.startTime);
  const hours = session.durationMinutes ? session.durationMinutes / 60 : 0;
  const avgHourlyRate = 35; // Should come from user settings
  const earnings = hours * avgHourlyRate;
  
  // Extract location and shift type from description or use defaults
  const descriptionLines = session.workDescription?.split('\n') || [];
  const location = descriptionLines[0] || 'Work Session';
  const shiftType = descriptionLines[1] || 'General Work';
  
  // Format time range
  const startTime = new Date(session.startTime);
  const endTime = session.endTime ? new Date(session.endTime) : null;
  const timeRange = endTime
    ? `${startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : `${startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - Ongoing`;

  const DetailRow = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
    <View className={`flex-row items-start mb-4 p-4 rounded-xl ${
      isDark ? "bg-slate-800 border border-slate-700" : "bg-slate-50 border border-slate-100"
    }`}>
      <View className={`w-10 h-10 rounded-lg items-center justify-center mr-3 ${
        isDark ? "bg-slate-700" : "bg-white"
      }`}>
        <MaterialIcons name={icon as any} size={20} color={isDark ? "#9CA3AF" : "#64748B"} />
      </View>
      <View className="flex-1">
        <Text className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
          isDark ? "text-gray-400" : "text-slate-500"
        }`}>
          {label}
        </Text>
        <Text className={`text-base font-medium ${isDark ? "text-white" : "text-slate-800"}`}>
          {value}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      {/* Header */}
      <View className={`px-4 py-4 border-b ${
        isDark ? "border-slate-700" : "border-slate-200"
      }`}>
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className={`w-10 h-10 items-center justify-center rounded-full mr-3 ${
              isDark ? "bg-slate-700" : "bg-slate-100"
            }`}
          >
            <MaterialIcons name="arrow-back" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
          </Pressable>
          <View className="flex-1">
            <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
              Work Session Details
            </Text>
            <Text className={`text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              {dateInfo.dayOfWeek}, {dateInfo.month} {dateInfo.day}, {dateInfo.year}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Badge Card */}
        <View className="px-4 pt-6 pb-4">
          <View className={`p-6 rounded-3xl shadow-lg ${
            isDark ? "bg-gradient-to-br from-blue-900/30 to-blue-800/20" : "bg-[#1E61EB]"
          }`}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className={`text-sm font-medium uppercase tracking-wider mb-2 ${
                  isDark ? "text-blue-300" : "text-white/80"
                }`}>
                  Session Date
                </Text>
                <View className="flex-row items-baseline">
                  <Text className={`text-4xl font-bold mr-2 ${
                    isDark ? "text-blue-200" : "text-white"
                  }`}>
                    {dateInfo.day}
                  </Text>
                  <View>
                    <Text className={`text-lg font-semibold ${
                      isDark ? "text-blue-300" : "text-white"
                    }`}>
                      {dateInfo.month.substring(0, 3).toUpperCase()}
                    </Text>
                    <Text className={`text-sm ${
                      isDark ? "text-blue-400" : "text-white/70"
                    }`}>
                      {dateInfo.year}
                    </Text>
                  </View>
                </View>
              </View>
              <View className={`w-20 h-20 rounded-2xl items-center justify-center ${
                isDark ? "bg-blue-800/30" : "bg-white/20"
              }`}>
                <MaterialIcons 
                  name="schedule" 
                  size={40} 
                  color={isDark ? "#93C5FD" : "#FFFFFF"} 
                />
              </View>
            </View>
          </View>
        </View>

        {/* Main Details */}
        <View className="px-4 mt-2">
          <DetailRow
            label="Location"
            value={location}
            icon="location-on"
          />
          <DetailRow
            label="Shift Type"
            value={shiftType}
            icon="work"
          />
          <DetailRow
            label="Time Range"
            value={timeRange}
            icon="schedule"
          />
          <DetailRow
            label="Hours Worked"
            value={`${hours.toFixed(1)} hours`}
            icon="access-time"
          />
          <DetailRow
            label="Earnings"
            value={`£${earnings.toFixed(2)}`}
            icon="attach-money"
          />
          <DetailRow
            label="Hourly Rate"
            value={`£${avgHourlyRate.toFixed(2)}/hr`}
            icon="payments"
          />
          {session.documentIds && session.documentIds.length > 0 && (
            <DetailRow
              label="Attached Documents"
              value={`${session.documentIds.length} document${session.documentIds.length !== 1 ? 's' : ''}`}
              icon="description"
            />
          )}
        </View>

        {/* Description Section */}
        {session.workDescription && (
          <View className="px-4 mt-2 mb-6">
            <View className={`p-4 rounded-xl ${
              isDark ? "bg-slate-800 border border-slate-700" : "bg-slate-50 border border-slate-100"
            }`}>
              <View className="flex-row items-center mb-3">
                <MaterialIcons 
                  name="description" 
                  size={20} 
                  color={isDark ? "#9CA3AF" : "#64748B"} 
                />
                <Text className={`text-xs font-semibold uppercase tracking-wider ml-2 ${
                  isDark ? "text-gray-400" : "text-slate-500"
                }`}>
                  Description
                </Text>
              </View>
              <Text className={`text-base leading-6 ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                {session.workDescription}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View className="px-4 mb-6" style={{ gap: 12 }}>
          <Pressable
            className={`p-4 rounded-xl flex-row items-center justify-center ${
              isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200"
            }`}
          >
            <MaterialIcons 
              name="edit" 
              size={20} 
              color={isDark ? "#9CA3AF" : "#64748B"} 
            />
            <Text className={`ml-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>
              Edit Session
            </Text>
          </Pressable>
          <Pressable
            className={`p-4 rounded-xl flex-row items-center justify-center ${
              isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200"
            }`}
          >
            <MaterialIcons 
              name="photo-library" 
              size={20} 
              color={isDark ? "#9CA3AF" : "#64748B"} 
            />
            <Text className={`ml-2 font-semibold ${isDark ? "text-gray-300" : "text-slate-700"}`}>
              View Documents
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

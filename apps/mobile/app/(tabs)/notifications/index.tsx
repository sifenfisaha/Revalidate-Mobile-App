import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import '../../global.css';

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  iconBgColor: string;
  isRead: boolean;
  section: 'today' | 'yesterday' | 'earlier';
  createdAt: Date;
}

interface ApiNotification {
  id: number;
  title: string;
  body: string;
  data?: any;
  createdAt: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadNotifications();
    loadReadState();
  }, []);

  const loadReadState = async () => {
    try {
      const stored = await AsyncStorage.getItem('readNotificationIds');
      if (stored) {
        setReadNotificationIds(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.warn('Error loading read state:', error);
    }
  };

  const saveReadState = async (ids: Set<string>) => {
    try {
      await AsyncStorage.setItem('readNotificationIds', JSON.stringify([...ids]));
    } catch (error) {
      console.warn('Error saving read state:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const response = await apiService.get<{
        success: boolean;
        data: ApiNotification[];
      }>(`${API_ENDPOINTS.NOTIFICATIONS.LIST}?limit=50`, token);

      if (response?.data) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

        const mappedNotifications: Notification[] = response.data.map((n) => {
          const createdAt = new Date(n.createdAt);

          // Determine section based on date
          let section: 'today' | 'yesterday' | 'earlier' = 'earlier';
          if (createdAt >= today) {
            section = 'today';
          } else if (createdAt >= yesterday) {
            section = 'yesterday';
          }

          // Format time display
          const time = formatTimeDisplay(createdAt, section);

          // Determine icon based on title or data
          const iconInfo = getIconForNotification(n.title, n.data);

          return {
            id: String(n.id),
            title: n.title || 'Notification',
            description: n.body || '',
            time,
            icon: iconInfo.icon,
            iconColor: iconInfo.color,
            iconBgColor: iconInfo.bgColor,
            isRead: readNotificationIds.has(String(n.id)),
            section,
            createdAt,
          };
        });

        // Sort by date (newest first)
        mappedNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        setNotifications(mappedNotifications);
      }
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      if (!error?.message?.includes('OFFLINE_MODE')) {
        // Don't show error for notifications - silently fail
        console.warn('Notifications API error:', error?.message);
      }
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTimeDisplay = (date: Date, section: string): string => {
    if (section === 'today' || section === 'yesterday') {
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    // For earlier, show day of week or date
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays < 7) {
      return dayNames[date.getDay()] || 'Unknown';
    }
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const getIconForNotification = (title: string, _data?: any): { icon: keyof typeof MaterialIcons.glyphMap; color: string; bgColor: string } => {
    const titleLower = title?.toLowerCase() || '';

    if (titleLower.includes('appraisal') || titleLower.includes('meeting')) {
      return { icon: 'event', color: '#2563EB', bgColor: 'bg-blue-50' };
    }
    if (titleLower.includes('cpd') || titleLower.includes('training') || titleLower.includes('requirements')) {
      return { icon: 'info', color: '#F59E0B', bgColor: 'bg-amber-50' };
    }
    if (titleLower.includes('upload') || titleLower.includes('confirmed') || titleLower.includes('success')) {
      return { icon: 'check-circle', color: '#10B981', bgColor: 'bg-green-50' };
    }
    if (titleLower.includes('security') || titleLower.includes('password') || titleLower.includes('authentication')) {
      return { icon: 'verified-user', color: '#64748B', bgColor: 'bg-slate-100' };
    }
    if (titleLower.includes('feedback') || titleLower.includes('colleague')) {
      return { icon: 'history-edu', color: '#2563EB', bgColor: 'bg-blue-50' };
    }
    if (titleLower.includes('reminder') || titleLower.includes('deadline')) {
      return { icon: 'alarm', color: '#EF4444', bgColor: 'bg-red-50' };
    }

    // Default
    return { icon: 'notifications', color: '#6B7280', bgColor: 'bg-gray-100' };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
  };

  const markAllAsRead = async () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadNotificationIds(allIds);
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    await saveReadState(allIds);
  };

  const markAsRead = async (id: string) => {
    const newReadIds = new Set([...readNotificationIds, id]);
    setReadNotificationIds(newReadIds);
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    ));
    await saveReadState(newReadIds);
  };

  const todayNotifications = notifications.filter(n => n.section === 'today');
  const yesterdayNotifications = notifications.filter(n => n.section === 'yesterday');
  const earlierNotifications = notifications.filter(n => n.section === 'earlier');

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderSection = (title: string, items: Notification[]) => {
    if (items.length === 0) return null;

    return (
      <View key={title}>
        <View className={`px-4 py-2 ${isDark ? "bg-slate-800" : "bg-slate-100"
          }`}>
          <Text className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-slate-500"
            }`}>
            {title}
          </Text>
        </View>
        {items.map((notification) => (
          <Pressable
            key={notification.id}
            onPress={() => markAsRead(notification.id)}
            className={`flex-row items-center gap-4 px-4 py-4 border-b ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
              } ${!notification.isRead ? 'opacity-100' : 'opacity-80'}`}
          >
            <View className="relative">
              <View className={`w-12 h-12 rounded-xl ${notification.iconBgColor} items-center justify-center`}>
                <MaterialIcons
                  name={notification.icon}
                  size={24}
                  color={notification.iconColor}
                />
              </View>
              {!notification.isRead && (
                <View className={`absolute -top-1 -right-1 w-3 h-3 bg-[#2563EB] border-2 rounded-full ${isDark ? "border-slate-800" : "border-white"
                  }`} />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row justify-between items-baseline mb-1">
                <Text
                  className={`text-[15px] flex-1 ${notification.isRead ? 'font-medium' : 'font-bold'} ${isDark ? "text-white" : "text-slate-800"
                    }`}
                  numberOfLines={1}
                >
                  {notification.title}
                </Text>
                <Text
                  className={`text-xs ml-2 shrink-0 ${!notification.isRead
                    ? 'font-medium text-[#2563EB]'
                    : (isDark ? 'font-normal text-gray-400' : 'font-normal text-slate-500')
                    }`}
                >
                  {notification.time}
                </Text>
              </View>
              <Text
                className={`text-sm font-normal leading-snug ${isDark ? "text-gray-400" : "text-slate-500"
                  }`}
                numberOfLines={2}
              >
                {notification.description}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      {/* Header */}
      <View className={`px-4 pt-4 pb-2 ${isDark ? "bg-slate-800/80" : "bg-white/80"
        }`}>
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-1"
          >
            <MaterialIcons name="chevron-left" size={28} color="#2563EB" />
            <Text className="text-base font-medium text-[#2563EB]">Back</Text>
          </Pressable>
          {unreadCount > 0 && (
            <Pressable onPress={markAllAsRead}>
              <Text className="text-sm font-semibold tracking-tight text-[#2563EB]">
                Mark all as read
              </Text>
            </Pressable>
          )}
        </View>
        <Text className={`text-3xl font-bold tracking-tight px-0.5 ${isDark ? "text-white" : "text-slate-800"
          }`}>
          Notifications
        </Text>
      </View>

      {/* Loading State */}
      {loading && !refreshing && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
          <Text className={`mt-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            Loading notifications...
          </Text>
        </View>
      )}

      {/* Notifications List */}
      {!loading && (
        <ScrollView
          className="flex-1"
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
          {notifications.length > 0 ? (
            <>
              {renderSection('TODAY', todayNotifications)}
              {renderSection('YESTERDAY', yesterdayNotifications)}
              {renderSection('EARLIER', earlierNotifications)}
            </>
          ) : (
            <View className={`p-8 mx-4 mt-4 rounded-2xl border items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
              }`}>
              <MaterialIcons name="notifications-none" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
              <Text className={`mt-4 text-center font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
                No notifications yet
              </Text>
              <Text className={`mt-2 text-center text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                You'll see notifications here when there's activity
              </Text>
            </View>
          )}

          {/* End of notifications indicator */}
          {notifications.length > 0 && (
            <View className="py-12 items-center justify-center opacity-40">
              <MaterialIcons name="notifications-off" size={48} color={isDark ? "#4B5563" : "#94A3B8"} />
              <Text className={`text-sm mt-2 ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                End of notifications
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

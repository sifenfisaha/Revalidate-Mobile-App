import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/features/theme/theme.store';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import '../../global.css';

interface WorkSession {
  id: number;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  workDescription: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EarningsEntry {
  id: string;
  date: string;
  location: string;
  hours: number;
  rate: number;
  amount: string;
  status: 'paid' | 'pending';
  icon: keyof typeof MaterialIcons.glyphMap;
  startTime: string;
}

interface MonthGroup {
  month: string;
  year: number;
  entries: EarningsEntry[];
}

export default function EarningsScreen() {
  const router = useRouter();
  const { isDark } = useThemeStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<EarningsEntry[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [percentageChange, setPercentageChange] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(35); // Default hourly rate

  // Load work hours and calculate earnings
  const loadEarnings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      // Get hourly rate from user settings or use default
      try {
        const userResponse = await apiService.get<{
          success: boolean;
          data: { hourlyRate?: number };
        }>(API_ENDPOINTS.USERS.ME, token);
        if (userResponse?.data?.hourlyRate) {
          setHourlyRate(userResponse.data.hourlyRate);
        }
      } catch (error) {
        console.warn('Could not load hourly rate, using default');
      }

      // Fetch completed work sessions (not active ones)
      const response = await apiService.get<{
        success: boolean;
        data: WorkSession[];
        pagination: { total: number };
      }>(API_ENDPOINTS.WORK_HOURS.LIST, token);

      if (response.success && response.data) {
        // Filter out active sessions and convert to earnings entries
        const completedSessions = response.data.filter(session => 
          !session.isActive && session.endTime && session.durationMinutes
        );

        const earningsEntries: EarningsEntry[] = completedSessions.map((session) => {
          const hours = (session.durationMinutes || 0) / 60;
          const amount = hours * hourlyRate;
          const startDate = new Date(session.startTime);
          
          // Extract location from work description or use default
          const description = session.workDescription || '';
          const location = description.split('\n')[0] || 'Work Session';
          
          // Determine icon based on description
          let icon: keyof typeof MaterialIcons.glyphMap = 'schedule';
          if (location.toLowerCase().includes('hospital') || location.toLowerCase().includes('a&e')) {
            icon = 'local-hospital';
          } else if (location.toLowerCase().includes('gp') || location.toLowerCase().includes('locum')) {
            icon = 'healing';
          } else if (location.toLowerCase().includes('checkup') || location.toLowerCase().includes('health')) {
            icon = 'verified-user';
          }

          // Determine status: if session is older than 7 days, consider it paid
          const daysSinceEnd = (new Date().getTime() - new Date(session.endTime!).getTime()) / (1000 * 60 * 60 * 24);
          const status: 'paid' | 'pending' = daysSinceEnd > 7 ? 'paid' : 'pending';

          return {
            id: String(session.id),
            date: startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            location,
            hours: Math.round(hours * 10) / 10, // Round to 1 decimal
            rate: hourlyRate,
            amount: `£${amount.toFixed(2)}`,
            status,
            icon,
            startTime: session.startTime,
          };
        });

        // Sort by date (newest first)
        earningsEntries.sort((a, b) => 
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );

        setEarnings(earningsEntries);

        // Calculate total earnings
        const total = earningsEntries.reduce((sum, entry) => {
          const amount = parseFloat(entry.amount.replace('£', '').replace(',', ''));
          return sum + amount;
        }, 0);
        setTotalEarnings(total);

        // Calculate percentage change (compare last month to previous month)
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        
        const lastMonthEarnings = earningsEntries
          .filter(e => {
            const entryDate = new Date(e.startTime);
            return entryDate >= lastMonth && entryDate < now;
          })
          .reduce((sum, entry) => {
            const amount = parseFloat(entry.amount.replace('£', '').replace(',', ''));
            return sum + amount;
          }, 0);

        const previousMonthEarnings = earningsEntries
          .filter(e => {
            const entryDate = new Date(e.startTime);
            return entryDate >= twoMonthsAgo && entryDate < lastMonth;
          })
          .reduce((sum, entry) => {
            const amount = parseFloat(entry.amount.replace('£', '').replace(',', ''));
            return sum + amount;
          }, 0);

        if (previousMonthEarnings > 0) {
          const change = ((lastMonthEarnings - previousMonthEarnings) / previousMonthEarnings) * 100;
          setPercentageChange(Math.round(change));
        } else {
          setPercentageChange(0);
        }
      }
    } catch (error: any) {
      console.error('Error loading earnings:', error);
      showToast.error(error.message || 'Failed to load earnings', 'Error');
      setEarnings([]);
      setTotalEarnings(0);
      setPercentageChange(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  // Group earnings by month
  const groupedEarnings: MonthGroup[] = earnings.reduce((acc: MonthGroup[], entry) => {
    const entryDate = new Date(entry.startTime);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[entryDate.getMonth()] || 'Unknown';
    const year = entryDate.getFullYear();
    
    const existingGroup = acc.find(g => g.month === month && g.year === year);
    if (existingGroup) {
      existingGroup.entries.push(entry);
    } else {
      acc.push({ month, year, entries: [entry] });
    }
    
    return acc;
  }, []);

  // Sort groups by date (newest first)
  groupedEarnings.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months.indexOf(b.month) - months.indexOf(a.month);
  });

  // Calculate monthly performance data for bar chart (last 6 months)
  const calculateMonthlyData = () => {
    const now = new Date();
    const months = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIndex = date.getMonth();
      const monthName = monthNames[monthIndex] || 'Unknown';
      
      // Calculate earnings for this month
      const monthEarnings = earnings
        .filter(e => {
          const entryDate = new Date(e.startTime);
          return entryDate.getMonth() === date.getMonth() && 
                 entryDate.getFullYear() === date.getFullYear();
        })
        .reduce((sum, entry) => {
          const amount = parseFloat(entry.amount.replace('£', '').replace(',', ''));
          return sum + amount;
        }, 0);
      
      months.push({
        month: monthName,
        earnings: monthEarnings,
        isCurrent: i === 0,
      });
    }
    
    // Find max earnings for scaling
    const maxEarnings = Math.max(...months.map(m => m.earnings), 1);
    
    // Calculate heights as percentages
    return months.map(m => ({
      month: m.month,
      height: maxEarnings > 0 ? (m.earnings / maxEarnings) * 100 : 0,
      isCurrent: m.isCurrent,
      earnings: m.earnings,
    }));
  };

  const monthlyData = calculateMonthlyData();

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
      {/* Header */}
      <View className={`border-b ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-zinc-100"}`}>
        <View className="flex-row items-center px-4 py-2 justify-between">
          <Pressable onPress={() => router.back()} className="w-12 h-12 shrink-0 items-center justify-center">
            <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
          </Pressable>
          <Text className={`text-lg font-bold flex-1 text-center ${isDark ? "text-white" : "text-[#121417]"}`}>
            Earnings & Financials
          </Text>
          <Pressable className="w-12 h-12 items-center justify-center">
            <MaterialIcons name="settings" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
          </Pressable>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadEarnings}
            tintColor={isDark ? '#D4AF37' : '#2B5F9E'}
            colors={['#D4AF37', '#2B5F9E']}
          />
        }
      >
        {/* Total Earnings Card */}
        <View className="p-4">
          <View className={`flex-col gap-2 rounded-xl p-6 shadow-sm border ${
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-zinc-100"
          }`}>
            <Text className={`text-sm font-medium uppercase tracking-wider ${
              isDark ? "text-gray-400" : "text-[#687482]"
            }`}>
              Total Earnings
            </Text>
            <View className="flex-row items-baseline" style={{ gap: 8 }}>
              <Text className="text-[#00C853] tracking-tight text-3xl font-bold">
                £{totalEarnings.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              {percentageChange !== 0 && (
                <View className={`flex-row items-center px-2 py-0.5 rounded-full ${
                  percentageChange > 0 ? 'bg-[#00C853]/10' : 'bg-red-500/10'
                }`}>
                  <MaterialIcons 
                    name={percentageChange > 0 ? "trending-up" : "trending-down"} 
                    size={14} 
                    color={percentageChange > 0 ? "#00C853" : "#EF4444"} 
                  />
                  <Text className={`text-xs font-bold ml-1 ${
                    percentageChange > 0 ? "text-[#00C853]" : "text-red-500"
                  }`}>
                    {percentageChange > 0 ? '+' : ''}{percentageChange}%
                  </Text>
                </View>
              )}
            </View>
            <Text className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-[#687482]"}`}>
              {loading ? 'Loading...' : `Updated ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
            </Text>
          </View>
        </View>

        {/* Monthly Performance Card */}
        <View className="px-4 py-2">
          <View className={`flex-col gap-4 rounded-xl p-6 shadow-sm border ${
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-zinc-100"
          }`}>
            <View className="flex-row justify-between items-center">
              <View>
                <Text className={`text-base font-bold ${isDark ? "text-white" : "text-[#121417]"}`}>
                  Monthly Performance
                </Text>
                <Text className={`text-sm font-normal mt-0.5 ${isDark ? "text-gray-400" : "text-[#687482]"}`}>
                  Last 6 Months
                </Text>
              </View>
              <MaterialIcons name="info" size={20} color={isDark ? "#9CA3AF" : "#687482"} />
            </View>
            
            {/* Bar Chart */}
            <View className="h-40 flex-row items-end justify-center" style={{ gap: 12 }}>
              {monthlyData.map((data, index) => (
                <View key={index} className="flex-1 flex-col justify-end items-center" style={{ gap: 4 }}>
                  <View 
                    className={`w-full rounded-t-sm ${
                      data.isCurrent ? 'bg-[#2B5E9C]' : 'bg-[#2B5E9C]/20'
                    }`}
                    style={{ height: `${data.height}%` }}
                  />
                  <Text className={`text-[11px] font-bold text-center ${
                    data.isCurrent ? 'text-[#2B5E9C]' : (isDark ? 'text-gray-400' : 'text-[#687482]')
                  }`}>
                    {data.month}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3 px-4 pt-6 pb-2">
          <Pressable className="flex-1 flex-row items-center justify-center gap-2 px-4 h-11 bg-[#2B5E9C]/10 rounded-lg">
            <MaterialIcons name="payments" size={20} color="#2B5E9C" />
            <Text className="text-[#2B5E9C] font-semibold text-sm">
              Set Rate
            </Text>
          </Pressable>
          <Pressable 
            onPress={() => {
              router.push('/(tabs)/gallery');
            }}
            className="flex-[2] flex-row items-center justify-center gap-2 px-4 h-11 bg-[#2B5E9C] rounded-lg shadow-sm"
          >
            <MaterialIcons name="ios-share" size={20} color="#FFFFFF" />
            <Text className="text-white font-semibold text-sm">
              Export Report
            </Text>
          </Pressable>
        </View>

        {/* Loading State */}
        {loading && earnings.length === 0 && (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
            <Text className={`mt-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              Loading earnings...
            </Text>
          </View>
        )}

        {/* Earnings List */}
        {!loading && earnings.length === 0 && (
          <View className={`p-8 rounded-2xl border items-center mx-4 mt-4 ${
            isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
          }`}>
            <MaterialIcons name="payments" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
            <Text className={`mt-4 text-center ${isDark ? "text-gray-400" : "text-slate-400"}`}>
              No earnings data available
            </Text>
            <Text className={`text-sm mt-2 text-center ${isDark ? "text-gray-500" : "text-slate-500"}`}>
              Complete work sessions to see your earnings here
            </Text>
          </View>
        )}

        {earnings.length > 0 && (
        <View className="px-4" style={{ gap: 24 }}>
          {groupedEarnings.map((group) => (
            <View key={`${group.month}-${group.year}`}>
              <View className="flex-row justify-between items-center pb-2 pt-6">
                <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-[#121417]"}`}>
                  {group.month} {group.year}
                </Text>
                <Pressable onPress={() => router.push('/(tabs)/gallery')}>
                  <Text className="text-[#2B5E9C] text-sm font-semibold">See all</Text>
                </Pressable>
              </View>
              
              <View className={`flex-col ${isDark ? "divide-y divide-slate-700" : "divide-y divide-zinc-100"}`}>
                {group.entries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    onPress={() => {
                      router.push(`/(tabs)/workinghours/${entry.id}` as any);
                    }}
                    className={`flex-row gap-4 px-4 py-4 justify-between items-center ${
                      isDark ? "bg-slate-800" : "bg-white"
                    }`}
                  >
                    <View className="flex-row items-start flex-1 min-w-0" style={{ gap: 16 }}>
                      <View className="text-[#2B5E9C] items-center justify-center rounded-lg bg-[#2B5E9C]/10 shrink-0 w-12 h-12">
                        <MaterialIcons name={entry.icon} size={24} color="#2B5E9C" />
                      </View>
                      <View className="flex-1 flex-col justify-center min-w-0">
                        <Text className={`text-base font-semibold mb-1 ${isDark ? "text-white" : "text-[#121417]"}`} numberOfLines={1}>
                          {entry.date} - {entry.location}
                        </Text>
                        <Text className={`text-xs font-normal ${isDark ? "text-gray-400" : "text-[#687482]"}`}>
                          {entry.hours} hrs @ £{entry.rate}/hr
                        </Text>
                      </View>
                    </View>
                    <View className="shrink-0 text-right ml-2">
                      <Text className={`text-base font-bold ${
                        entry.status === 'paid' ? 'text-[#00C853]' : (isDark ? 'text-white' : 'text-[#121417]')
                      }`}>
                        {entry.amount}
                      </Text>
                      <Text className={`text-[10px] uppercase ${
                        entry.status === 'paid' ? 'text-[#00C853]' : (isDark ? 'text-gray-400' : 'text-[#687482]')
                      }`}>
                        {entry.status === 'paid' ? 'Paid' : 'Pending'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

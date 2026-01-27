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

interface Appraisal {
    id: string;
    date: string;
    notes: string;
    createdAt: string;
}

interface ApiAppraisal {
    id: number;
    appraisalDate: string;
    notes: string | null;
    documentIds: number[];
    createdAt: string;
    updatedAt: string;
}

export default function AppraisalScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDark } = useThemeStore();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newAppraisal, setNewAppraisal] = useState({
        date: new Date().toISOString().split('T')[0],
        notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadAppraisals();
    }, []);

    const loadAppraisals = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            const response = await apiService.get<{
                success: boolean;
                data: ApiAppraisal[];
                pagination: { total: number };
            }>(API_ENDPOINTS.APPRAISALS.LIST, token);

            if (response?.data) {
                const mappedAppraisals: Appraisal[] = response.data.map((a) => {
                    return {
                        id: String(a.id),
                        date: formatDate(a.appraisalDate),
                        notes: a.notes || 'No notes provided',
                        createdAt: a.createdAt,
                    };
                });

                // Sort by date descending
                mappedAppraisals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setAppraisals(mappedAppraisals);
            }
        } catch (error: any) {
            console.error('Error loading appraisals:', error);
            showToast.error(error?.message || 'Failed to load appraisals', 'Error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const formatDate = (dateString: string): string => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return dateString;
        }
    };

    const handleAddAppraisal = async () => {
        if (!newAppraisal.date) {
            showToast.error('Please select a date', 'Validation Error');
            return;
        }

        try {
            setIsSubmitting(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            await apiService.post(API_ENDPOINTS.APPRAISALS.CREATE, {
                appraisal_date: newAppraisal.date,
                notes: newAppraisal.notes,
            }, token);

            showToast.success('Appraisal record added', 'Success');
            setShowAddModal(false);
            loadAppraisals();
            setNewAppraisal({
                date: new Date().toISOString().split('T')[0],
                notes: '',
            });
        } catch (error: any) {
            console.error('Error creating appraisal:', error);
            showToast.error(error.message || 'Failed to create appraisal', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAppraisals();
    };

    return (
        <SafeAreaView className={`flex-1 ${isDark ? "bg-background-dark" : "bg-background-light"}`} edges={['top']}>
            {/* Header */}
            <View className={`border-b ${isDark ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-gray-100"
                }`}>
                <View className="flex-row items-center justify-between px-4 py-2">
                    <Pressable onPress={() => router.back()} className="w-12 h-12 shrink-0 items-center justify-center">
                        <MaterialIcons name="arrow-back-ios" size={20} color={isDark ? "#E5E7EB" : "#121417"} />
                    </Pressable>
                    <Text className={`text-lg font-bold flex-1 text-center ${isDark ? "text-white" : "text-[#121417]"}`}>
                        Appraisals
                    </Text>
                    <View className="w-12" />
                </View>
            </View>

            {/* Loading State */}
            {loading && !refreshing && (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={isDark ? '#D4AF37' : '#2B5F9E'} />
                    <Text className={`mt-4 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                        Loading appraisals...
                    </Text>
                </View>
            )}

            {/* Appraisals List */}
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
                    {appraisals.length > 0 ? (
                        <View style={{ gap: 16 }}>
                            {appraisals.map((appraisal) => (
                                <View
                                    key={appraisal.id}
                                    className={`rounded-xl shadow-sm border p-4 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"
                                        }`}
                                >
                                    <View className="flex-row justify-between items-start mb-2">
                                        <View className="flex-row items-center gap-2">
                                            <MaterialIcons name="verified" size={20} color="#E11D48" />
                                            <Text className={`font-bold text-base ${isDark ? "text-white" : "text-[#121417]"}`}>
                                                Annual Appraisal
                                            </Text>
                                        </View>
                                        <Text className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-[#687482]"}`}>
                                            {appraisal.date}
                                        </Text>
                                    </View>
                                    <Text className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-[#121417]"}`}>
                                        {appraisal.notes}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View className={`p-8 rounded-2xl border items-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                            }`}>
                            <MaterialIcons name="verified" size={48} color={isDark ? "#4B5563" : "#CBD5E1"} />
                            <Text className={`mt-4 text-center font-semibold ${isDark ? "text-white" : "text-slate-800"}`}>
                                No appraisals recorded
                            </Text>
                            <Text className={`mt-2 text-center text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                                Add your annual appraisals here
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Floating Action Button */}
            <View
                className="absolute right-6 items-center"
                style={{ bottom: 20 + insets.bottom }}
            >
                <Pressable
                    onPress={() => setShowAddModal(true)}
                    className="w-14 h-14 bg-[#E11D48] rounded-full shadow-lg items-center justify-center"
                >
                    <MaterialIcons name="add" size={32} color="#FFFFFF" />
                </Pressable>
            </View>

            {/* Add Appraisal Modal */}
            <Modal
                visible={showAddModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className={`rounded-t-3xl ${isDark ? "bg-slate-800" : "bg-white"}`}>
                        <View className="p-6 border-b border-gray-200 flex-row justify-between items-center">
                            <Text className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-800"}`}>Log Appraisal</Text>
                            <Pressable onPress={() => setShowAddModal(false)}>
                                <MaterialIcons name="close" size={24} color={isDark ? "#9CA3AF" : "#64748B"} />
                            </Pressable>
                        </View>
                        <View className="p-6 gap-4">
                            <View>
                                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Date (YYYY-MM-DD)</Text>
                                <TextInput
                                    value={newAppraisal.date}
                                    onChangeText={(t) => setNewAppraisal({ ...newAppraisal, date: t })}
                                    className={`p-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-slate-800"}`}
                                    placeholder="2024-03-20"
                                />
                            </View>
                            <View>
                                <Text className={`mb-2 font-medium ${isDark ? "text-gray-300" : "text-slate-700"}`}>Notes / Outcome</Text>
                                <TextInput
                                    value={newAppraisal.notes}
                                    onChangeText={(t) => setNewAppraisal({ ...newAppraisal, notes: t })}
                                    className={`p-3 rounded-lg border ${isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-slate-800"}`}
                                    placeholder="Summary of the appraisal discussion..."
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>
                            <Pressable
                                onPress={handleAddAppraisal}
                                disabled={isSubmitting}
                                className={`mt-4 p-4 rounded-xl items-center justify-center ${isSubmitting ? "bg-gray-400" : "bg-[#E11D48]"
                                    }`}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-base">Save Appraisal</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

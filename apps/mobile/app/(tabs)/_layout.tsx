import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4A90E2',
      }}
    >
      <Tabs.Screen 
        name="dashboard" 
        options={{ title: 'Dashboard' }}
      />
      <Tabs.Screen 
        name="timer" 
        options={{ title: 'Timer' }}
      />
      <Tabs.Screen 
        name="logs" 
        options={{ title: 'Logs' }}
      />
      <Tabs.Screen 
        name="documents" 
        options={{ title: 'Documents' }}
      />
      <Tabs.Screen 
        name="calendar" 
        options={{ title: 'Calendar' }}
      />
      <Tabs.Screen 
        name="analytics" 
        options={{ title: 'Analytics' }}
      />
      <Tabs.Screen 
        name="profile" 
        options={{ title: 'Profile' }}
      />
    </Tabs>
  );
}

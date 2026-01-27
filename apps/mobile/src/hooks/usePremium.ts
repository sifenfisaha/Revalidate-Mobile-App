import { useSubscriptionStore } from '@/features/subscription/subscription.store';

export function usePremium() {
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  // We can add a refresh function that triggers an API check if needed,
  // but apiService handles this on calls. 
  // If we want a manual refresh: use apiService.get('/users/me')?
  // But typically the store state is enough.

  return {
    isPremium,
    isLoading: false, // Store is synchronous after hydration (which happens fast) or we can expose hyrdated state
    refresh: async () => {
      // Optional: force refresh logic if needed
      // We can just rely on side-effects of api calls or implement a specific fetch in store
    }
  };
}

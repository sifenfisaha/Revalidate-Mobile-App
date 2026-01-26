import { useState, useEffect } from 'react';
import { getSubscriptionInfo } from '@/utils/subscription';

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = async () => {
    try {
      const subscriptionInfo = await getSubscriptionInfo();
      setIsPremium(subscriptionInfo?.isPremium || false);
    } catch (error) {
      console.error('Error checking premium status:', error);
      setIsPremium(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { isPremium, isLoading, refresh: checkPremiumStatus };
}

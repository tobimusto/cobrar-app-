import { useAuth } from '../context/AuthContext';

const PLAN_FEATURES = {
  esencial: {
    name: 'Plan Esencial',
    maxProducts: 3500,
    maxUsers: 2,
    hasCatalog: false,
    hasBalanza: false,
    hasSmartScanner: false,
    hasLowRotationAlerts: false,
  },
  pro: {
    name: 'Plan Pro',
    maxProducts: 10000,
    maxUsers: 5,
    hasCatalog: true,
    hasBalanza: false,
    hasSmartScanner: false,
    hasLowRotationAlerts: false,
  },
  ia: {
    name: 'Plan IA',
    maxProducts: 15000,
    maxUsers: 15,
    hasCatalog: true,
    hasBalanza: true,
    hasSmartScanner: true,
    hasLowRotationAlerts: true,
  }
};

export const usePlan = () => {
  const { profile } = useAuth();
  
  // TO PREVENT HACKING IN PRODUCTION:
  // We read the plan directly from the database profile (profile?.plan).
  // A local user cannot modify this unless they have backend access.
  
  // For development/testing, we allow overriding via localStorage.
  // In a real production environment, you should completely remove the localStorage override
  // to ensure users cannot hack their plan from DevTools.
  
  const savedOverride = localStorage.getItem('cobrar_plan_override');
  
  // Determine current plan ID
  const planId = savedOverride || profile?.plan || 'esencial';
  
  // Get features
  const planFeatures = PLAN_FEATURES[planId] || PLAN_FEATURES['esencial'];
  
  return {
    planId,
    ...planFeatures,
    // Helper to check if a feature is available
    canAddProduct: (currentCount) => currentCount < planFeatures.maxProducts,
    canAddUser: (currentCount) => currentCount < planFeatures.maxUsers,
  };
};

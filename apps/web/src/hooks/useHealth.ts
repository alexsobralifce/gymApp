// DESATIVADO — integração Health Connect removida (modo PWA)
export function useHealth() {
  return {
    available: false,
    checked: true,
    authorized: false,
    checking: false,
    error: null,
    platform: 'web' as const,
    requestAccess: async () => false,
    checkAuthorization: async () => false,
    fetchDailySummary: async () => ({ heartRateAvg: null, heartRateSamples: 0, activeCalories: 0 }),
    checkHasHistoricalData: async () => false,
    getHeartRateDuringWorkout: async () => null,
    getCaloriesDuringWorkout: async () => 0,
    syncToBackend: async () => {},
  }
}

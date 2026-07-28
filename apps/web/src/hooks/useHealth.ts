import { useCallback, useEffect, useState } from 'react'
import { Health } from '@capgo/capacitor-health'

interface HealthState {
  available: boolean
  checked: boolean
  authorized: boolean
  checking: boolean
  error: string | null
  platform: 'ios' | 'android' | 'web' | null
}

export interface DailySummary {
  heartRateAvg: number | null
  heartRateSamples: number
  activeCalories: number
}

const TAG = '[Health]'

export function useHealth() {
  const [state, setState] = useState<HealthState>({
    available: false,
    checked: false,
    authorized: false,
    checking: true,
    error: null,
    platform: null,
  })

  useEffect(() => {
    console.log(TAG, 'Verificando disponibilidade do Health...')
    Health.isAvailable()
      .then((result) => {
        console.log(TAG, 'Health.isAvailable resultado:', JSON.stringify(result))
        setState({
          available: result.available,
          checked: true,
          authorized: false,
          checking: false,
          error: null,
          platform: (result.platform as 'ios' | 'android' | 'web') ?? null,
        })
      })
      .catch((err) => {
        console.error(TAG, 'Erro ao verificar disponibilidade:', err)
        setState((prev) => ({
          ...prev,
          checked: true,
          checking: false,
          error: 'Nao foi possivel verificar a disponibilidade dos dados de saude.',
        }))
      })
  }, [])

  const requestAccess = useCallback(async (): Promise<boolean> => {
    console.log(TAG, 'requestAccess() iniciado')
    setState((prev) => ({ ...prev, checking: true, error: null }))

    try {
      console.log(TAG, 'Chamando Health.requestAuthorization com read: [heartRate, calories, steps]')
      const authResult = await Health.requestAuthorization({
        read: ['heartRate', 'calories', 'steps'],
        write: [],
      })
      console.log(TAG, 'Health.requestAuthorization resultado:', JSON.stringify(authResult))

      setState((prev) => ({
        ...prev,
        authorized: true,
        checking: false,
      }))

      console.log(TAG, 'requestAccess() sucesso — authorized: true')
      return true
    } catch (err: any) {
      const message =
        err?.message || 'Permissao de saude negada. Va nas configuracoes do dispositivo para conceder acesso.'

      console.error(TAG, 'requestAccess() erro:', message, err)

      setState((prev) => ({
        ...prev,
        authorized: false,
        checking: false,
        error: message,
      }))

      return false
    }
  }, [])

  const checkAuthorization = useCallback(async (): Promise<boolean> => {
    console.log(TAG, 'checkAuthorization() iniciado')
    try {
      const status = await Health.checkAuthorization({
        read: ['heartRate', 'calories', 'steps'],
        write: [],
      })
      console.log(TAG, 'checkAuthorization() status:', JSON.stringify(status))

      const allGranted = status.readAuthorized.length === 3
      console.log(TAG, 'checkAuthorization() allGranted:', allGranted, 'readAuthorized:', status.readAuthorized)

      setState((prev) => ({ ...prev, authorized: allGranted }))
      return allGranted
    } catch (err) {
      console.error(TAG, 'checkAuthorization() erro:', err)
      setState((prev) => ({ ...prev, authorized: false }))
      return false
    }
  }, [])

  const fetchDailySummary = useCallback(async (): Promise<DailySummary> => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const now = new Date()

    console.log(TAG, 'fetchDailySummary() — periodo:', today.toISOString(), 'ate', now.toISOString())

    const summary: DailySummary = {
      heartRateAvg: null,
      heartRateSamples: 0,
      activeCalories: 0,
    }

    try {
      console.log(TAG, 'fetchDailySummary() lendo heartRate e calories em paralelo...')
      const [heartData, calorieData] = await Promise.all([
        Health.readSamples({
          dataType: 'heartRate',
          startDate: today.toISOString(),
          endDate: now.toISOString(),
        }).catch((err) => {
          console.error(TAG, 'fetchDailySummary() erro ao ler heartRate:', err)
          return { samples: [] }
        }),
        Health.readSamples({
          dataType: 'calories',
          startDate: today.toISOString(),
          endDate: now.toISOString(),
        }).catch((err) => {
          console.error(TAG, 'fetchDailySummary() erro ao ler calories:', err)
          return { samples: [] }
        }),
      ])

      console.log(TAG, 'fetchDailySummary() heartRate samples:', heartData.samples.length)
      console.log(TAG, 'fetchDailySummary() calories samples:', calorieData.samples.length)

      if (heartData.samples.length > 0) {
        const sum = heartData.samples.reduce((acc, s) => acc + s.value, 0)
        summary.heartRateAvg = Math.round(sum / heartData.samples.length)
        summary.heartRateSamples = heartData.samples.length
        console.log(TAG, 'fetchDailySummary() heartRate avg:', summary.heartRateAvg, 'bpm (', summary.heartRateSamples, 'amostras)')
      }

      const totalCal = calorieData.samples.reduce((acc, s) => acc + s.value, 0)
      summary.activeCalories = Math.round(totalCal)
      console.log(TAG, 'fetchDailySummary() activeCalories:', summary.activeCalories, 'kcal')
    } catch (err) {
      console.error(TAG, 'fetchDailySummary() erro inesperado:', err)
    }

    console.log(TAG, 'fetchDailySummary() retornando:', JSON.stringify(summary))
    return summary
  }, [])

  const checkHasHistoricalData = useCallback(async (): Promise<boolean> => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const now = new Date()

    console.log(TAG, 'checkHasHistoricalData() — periodo:', weekAgo.toISOString(), 'ate', now.toISOString())

    try {
      const { samples } = await Health.readSamples({
        dataType: 'heartRate',
        startDate: weekAgo.toISOString(),
        endDate: now.toISOString(),
        limit: 1,
      })

      const result = samples.length > 0
      console.log(TAG, 'checkHasHistoricalData() samples encontrados:', samples.length, '=> tem dados:', result)
      return result
    } catch (err) {
      console.error(TAG, 'checkHasHistoricalData() erro:', err)
      return false
    }
  }, [])

  const getHeartRateDuringWorkout = useCallback(
    async (startDate: string, endDate: string): Promise<number | null> => {
      console.log(TAG, 'getHeartRateDuringWorkout() — periodo:', startDate, 'ate', endDate)
      try {
        const { samples } = await Health.readSamples({
          dataType: 'heartRate',
          startDate,
          endDate,
          limit: 100,
        })

        console.log(TAG, 'getHeartRateDuringWorkout() samples:', samples.length)

        if (samples.length === 0) return null

        const sum = samples.reduce((acc, s) => acc + s.value, 0)
        const avg = Math.round(sum / samples.length)
        console.log(TAG, 'getHeartRateDuringWorkout() avg:', avg, 'bpm')
        return avg
      } catch (err) {
        console.error(TAG, 'getHeartRateDuringWorkout() erro:', err)
        return null
      }
    },
    [],
  )

  const getCaloriesDuringWorkout = useCallback(
    async (startDate: string, endDate: string): Promise<number> => {
      console.log(TAG, 'getCaloriesDuringWorkout() — periodo:', startDate, 'ate', endDate)
      try {
        const { samples } = await Health.readSamples({
          dataType: 'calories',
          startDate,
          endDate,
        })

        const total = Math.round(samples.reduce((acc, s) => acc + s.value, 0))
        console.log(TAG, 'getCaloriesDuringWorkout() samples:', samples.length, 'total:', total, 'kcal')
        return total
      } catch (err) {
        console.error(TAG, 'getCaloriesDuringWorkout() erro:', err)
        return 0
      }
    },
    [],
  )

  return {
    ...state,
    requestAccess,
    checkAuthorization,
    fetchDailySummary,
    checkHasHistoricalData,
    getHeartRateDuringWorkout,
    getCaloriesDuringWorkout,
  }
}

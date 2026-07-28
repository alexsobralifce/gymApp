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
    Health.isAvailable()
      .then((result) => {
        setState({
          available: result.available,
          checked: true,
          authorized: false,
          checking: false,
          error: null,
          platform: (result.platform as 'ios' | 'android' | 'web') ?? null,
        })
      })
      .catch(() => {
        setState((prev) => ({
          ...prev,
          checked: true,
          checking: false,
          error: 'Nao foi possivel verificar a disponibilidade dos dados de saude.',
        }))
      })
  }, [])

  const requestAccess = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, checking: true, error: null }))

    try {
      await Health.requestAuthorization({
        read: ['heartRate', 'calories', 'steps'],
        write: [],
      })

      setState((prev) => ({
        ...prev,
        authorized: true,
        checking: false,
      }))

      return true
    } catch (err: any) {
      const message =
        err?.message || 'Permissao de saude negada. Va nas configuracoes do dispositivo para conceder acesso.'

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
    try {
      const status = await Health.checkAuthorization({
        read: ['heartRate', 'calories', 'steps'],
        write: [],
      })

      const allGranted = status.readAuthorized.length === 3

      setState((prev) => ({ ...prev, authorized: allGranted }))
      return allGranted
    } catch {
      setState((prev) => ({ ...prev, authorized: false }))
      return false
    }
  }, [])

  const fetchDailySummary = useCallback(async (): Promise<DailySummary> => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const now = new Date()

    const summary: DailySummary = {
      heartRateAvg: null,
      heartRateSamples: 0,
      activeCalories: 0,
    }

    try {
      const [heartData, calorieData] = await Promise.all([
        Health.readSamples({
          dataType: 'heartRate',
          startDate: today.toISOString(),
          endDate: now.toISOString(),
        }).catch(() => ({ samples: [] })),
        Health.readSamples({
          dataType: 'calories',
          startDate: today.toISOString(),
          endDate: now.toISOString(),
        }).catch(() => ({ samples: [] })),
      ])

      if (heartData.samples.length > 0) {
        const sum = heartData.samples.reduce((acc, s) => acc + s.value, 0)
        summary.heartRateAvg = Math.round(sum / heartData.samples.length)
        summary.heartRateSamples = heartData.samples.length
      }

      summary.activeCalories = Math.round(
        calorieData.samples.reduce((acc, s) => acc + s.value, 0),
      )
    } catch {
      // silently fail — user can retry
    }

    return summary
  }, [])

  const checkHasHistoricalData = useCallback(async (): Promise<boolean> => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    try {
      const { samples } = await Health.readSamples({
        dataType: 'heartRate',
        startDate: weekAgo.toISOString(),
        endDate: new Date().toISOString(),
        limit: 1,
      })

      return samples.length > 0
    } catch {
      return false
    }
  }, [])

  const getHeartRateDuringWorkout = useCallback(
    async (startDate: string, endDate: string): Promise<number | null> => {
      try {
        const { samples } = await Health.readSamples({
          dataType: 'heartRate',
          startDate,
          endDate,
          limit: 100,
        })

        if (samples.length === 0) return null

        const sum = samples.reduce((acc, s) => acc + s.value, 0)
        return Math.round(sum / samples.length)
      } catch {
        return null
      }
    },
    [],
  )

  const getCaloriesDuringWorkout = useCallback(
    async (startDate: string, endDate: string): Promise<number> => {
      try {
        const { samples } = await Health.readSamples({
          dataType: 'calories',
          startDate,
          endDate,
        })

        return Math.round(samples.reduce((acc, s) => acc + s.value, 0))
      } catch {
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

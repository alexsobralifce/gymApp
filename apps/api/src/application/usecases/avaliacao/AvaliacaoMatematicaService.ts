export interface DobrasInput {
  triceps?: number
  subescapular?: number
  peitoral?: number
  axilar_media?: number
  suprailiaca?: number
  abdominal?: number
  coxa?: number
}

export interface CalculoComporalInput {
  pesoKg: number
  estaturaM: number
  idade: number
  sexo: 'MASCULINO' | 'FEMININO'
  cinturaCm?: number
  quadril_cm?: number
  protocolo: 'JP7' | 'JP3' | 'GUEDES'
  dobras: DobrasInput
}

export interface CalculoResultado {
  imc: number
  rcq: number | null
  somaDobrasMm: number
  densidadeCorporal: number | null
  percentualGordura: number | null
  massaGordaKg: number | null
  massaMagraKg: number | null
  classificacaoGc: string | null
}

export class AvaliacaoMatematicaService {
  static calcularAntropometria(pesoKg: number, estaturaM: number, cinturaCm?: number, quadrilCm?: number) {
    const imc = estaturaM > 0 ? Math.round((pesoKg / (estaturaM * estaturaM)) * 100) / 100 : 0
    const rcq = cinturaCm && quadrilCm && quadrilCm > 0 ? Math.round((cinturaCm / quadrilCm) * 100) / 100 : null
    return { imc, rcq }
  }

  static calcularComposicaoCorporal(input: CalculoComporalInput): CalculoResultado {
    const { imc, rcq } = this.calcularAntropometria(input.pesoKg, input.estaturaM, input.cinturaCm, input.quadril_cm)

    const { triceps = 0, subescapular = 0, peitoral = 0, axilar_media = 0, suprailiaca = 0, abdominal = 0, coxa = 0 } = input.dobras

    let somaDobrasMm = 0
    let dc: number | null = null

    if (input.protocolo === 'JP7') {
      somaDobrasMm = triceps + subescapular + peitoral + axilar_media + suprailiaca + abdominal + coxa
      if (somaDobrasMm > 0) {
        if (input.sexo === 'MASCULINO') {
          dc = 1.112 - 0.00043499 * somaDobrasMm + 0.00000055 * (somaDobrasMm * somaDobrasMm) - 0.00028826 * input.idade
        } else {
          dc = 1.097 - 0.00046971 * somaDobrasMm + 0.00000056 * (somaDobrasMm * somaDobrasMm) - 0.00012828 * input.idade
        }
      }
    } else if (input.protocolo === 'JP3') {
      if (input.sexo === 'MASCULINO') {
        somaDobrasMm = peitoral + abdominal + coxa
        if (somaDobrasMm > 0) {
          dc = 1.10938 - 0.0008267 * somaDobrasMm + 0.0000016 * (somaDobrasMm * somaDobrasMm) - 0.0002574 * input.idade
        }
      } else {
        somaDobrasMm = triceps + suprailiaca + coxa
        if (somaDobrasMm > 0) {
          dc = 1.0994921 - 0.0009929 * somaDobrasMm + 0.0000023 * (somaDobrasMm * somaDobrasMm) - 0.0001392 * input.idade
        }
      }
    }

    let percentualGordura: number | null = null
    let massaGordaKg: number | null = null
    let massaMagraKg: number | null = null

    if (dc && dc > 0) {
      // Equação de Siri
      percentualGordura = Math.round(((4.95 / dc) - 4.50) * 100 * 100) / 100
      if (percentualGordura < 0) percentualGordura = 2.0 // safety floor
      massaGordaKg = Math.round((input.pesoKg * (percentualGordura / 100)) * 100) / 100
      massaMagraKg = Math.round((input.pesoKg - massaGordaKg) * 100) / 100
    }

    let classificacaoGc: string | null = null
    if (percentualGordura !== null) {
      if (input.sexo === 'MASCULINO') {
        if (percentualGordura < 6) classificacaoGc = 'Essencial'
        else if (percentualGordura < 14) classificacaoGc = 'Atleta'
        else if (percentualGordura < 18) classificacaoGc = 'Bom'
        else if (percentualGordura < 25) classificacaoGc = 'Normal'
        else classificacaoGc = 'Elevado'
      } else {
        if (percentualGordura < 13) classificacaoGc = 'Essencial'
        else if (percentualGordura < 21) classificacaoGc = 'Atleta'
        else if (percentualGordura < 25) classificacaoGc = 'Bom'
        else if (percentualGordura < 32) classificacaoGc = 'Normal'
        else classificacaoGc = 'Elevado'
      }
    }

    return {
      imc,
      rcq,
      somaDobrasMm: Math.round(somaDobrasMm * 10) / 10,
      densidadeCorporal: dc ? Math.round(dc * 10000) / 10000 : null,
      percentualGordura,
      massaGordaKg,
      massaMagraKg,
      classificacaoGc,
    }
  }

  static calcularVo2Cooper(distanciaMetros: number): number {
    // VO2max = (Distância em metros - 50.4) / 44.9
    const vo2 = (distanciaMetros - 50.4) / 44.9
    return Math.round(vo2 * 100) / 100
  }

  static calcular1RMBrzycki(cargaKg: number, repeticoes: number): number {
    if (repeticoes <= 1) return cargaKg
    const rm = cargaKg / (1.0278 - 0.0278 * repeticoes)
    return Math.round(rm * 10) / 10
  }

  static calcularZonasCardio(idade: number, fcRepouso?: number) {
    const fcMax = Math.round(208 - 0.7 * idade)
    if (!fcRepouso) {
      return {
        fcMax,
        zona1: `${Math.round(fcMax * 0.5)} - ${Math.round(fcMax * 0.6)} bpm (Recuperação)`,
        zona2: `${Math.round(fcMax * 0.6)} - ${Math.round(fcMax * 0.7)} bpm (Aeróbico Leve)`,
        zona3: `${Math.round(fcMax * 0.7)} - ${Math.round(fcMax * 0.8)} bpm (Aeróbico Moderado)`,
        zona4: `${Math.round(fcMax * 0.8)} - ${Math.round(fcMax * 0.9)} bpm (Limiar Anaeróbico)`,
      }
    }
    // Karvonen
    const fcr = fcMax - fcRepouso
    return {
      fcMax,
      fcRepouso,
      zona1: `${Math.round(fcr * 0.5 + fcRepouso)} - ${Math.round(fcr * 0.6 + fcRepouso)} bpm`,
      zona2: `${Math.round(fcr * 0.6 + fcRepouso)} - ${Math.round(fcr * 0.7 + fcRepouso)} bpm`,
      zona3: `${Math.round(fcr * 0.7 + fcRepouso)} - ${Math.round(fcr * 0.8 + fcRepouso)} bpm`,
      zona4: `${Math.round(fcr * 0.8 + fcRepouso)} - ${Math.round(fcr * 0.9 + fcRepouso)} bpm`,
    }
  }
}

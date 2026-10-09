import type { Idioma } from '../../lib/i18n'
import type { FaixaIMC, NivelAtividade, Objetivo } from '../../lib/calculadoras'

export interface TextosInterface {
  inicio: string
  ferramentas: string
  todasFerramentas: string
  outrasFerramentas: string
  perguntas: string
  aviso: string
  vazio: string
  invalido: string
  peso: string
  altura: string
  idade: string
  anos: string
  sexo: string
  masculino: string
  feminino: string
  atividade: string
  objetivo: string
  pesoMeta: string
  pesoMetaDica: string
  opcional: string
  seuImc: string
  faixa: string
  faixaSaudavel: string
  pesoPorFormula: string
  tmb: string
  tdee: string
  tmbDica: string
  tdeeDica: string
  metaDiaria: string
  ajuste: string
  ritmo: string
  prazo: string
  semanas: (n: number) => string
  semPrazo: string
  limitePiso: string
  kcalDia: string
  kgSemana: string
  ctaTitulo: string
  ctaTexto: string
  ctaBotao: string
  ctaHref: string
  abrir: string
  faixas: Record<FaixaIMC, string>
  niveis: Record<NivelAtividade, { nome: string; dica: string }>
  objetivos: Record<Objetivo, string>
}

export const UI: Record<Idioma, TextosInterface> = {
  pt: {
    inicio: 'Início',
    ferramentas: 'Ferramentas',
    todasFerramentas: 'Calculadoras gratuitas para quem treina',
    outrasFerramentas: 'Outras ferramentas',
    perguntas: 'Perguntas frequentes',
    aviso: 'Resultado estimado, apenas como referência. Não substitui avaliação de médico, nutricionista ou profissional de educação física.',
    vazio: 'Preencha os campos para ver o resultado.',
    invalido: 'Confira os valores: algum está fora do intervalo aceito.',
    peso: 'Peso',
    altura: 'Altura',
    idade: 'Idade',
    anos: 'anos',
    sexo: 'Sexo',
    masculino: 'Masculino',
    feminino: 'Feminino',
    atividade: 'Nível de atividade',
    objetivo: 'Objetivo',
    pesoMeta: 'Peso desejado',
    pesoMetaDica: 'Opcional. Usado só para estimar o prazo.',
    opcional: 'opcional',
    seuImc: 'Seu IMC',
    faixa: 'Classificação',
    faixaSaudavel: 'Faixa de peso saudável para sua altura',
    pesoPorFormula: 'Peso ideal por fórmula',
    tmb: 'Taxa metabólica basal (TMB)',
    tdee: 'Gasto diário total (TDEE)',
    tmbDica: 'Calorias gastas em repouso',
    tdeeDica: 'Calorias gastas com a sua atividade',
    metaDiaria: 'Meta diária',
    ajuste: 'Ajuste sobre o gasto',
    ritmo: 'Ritmo estimado',
    prazo: 'Prazo estimado',
    semanas: (n) => `${n} ${n === 1 ? 'semana' : 'semanas'}`,
    semPrazo: 'Informe um peso desejado coerente com o objetivo para estimar o prazo.',
    limitePiso: 'A meta foi limitada ao mínimo seguro. Déficits maiores não são recomendados.',
    kcalDia: 'kcal/dia',
    kgSemana: 'kg/semana',
    ctaTitulo: 'Acompanhe sua evolução de verdade',
    ctaTexto: 'Crie sua conta grátis no ENDORFINAPP e registre medidas, treinos e progresso em gráficos.',
    ctaBotao: 'Criar conta grátis',
    ctaHref: '/register',
    abrir: 'Abrir',
    faixas: { abaixo: 'Abaixo do peso', normal: 'Peso normal', sobrepeso: 'Sobrepeso', obesidade1: 'Obesidade grau I', obesidade2: 'Obesidade grau II', obesidade3: 'Obesidade grau III' },
    niveis: {
      sedentario: { nome: 'Sedentário', dica: 'Quase sem exercício' },
      leve: { nome: 'Leve', dica: '1 a 3 treinos por semana' },
      moderado: { nome: 'Moderado', dica: '3 a 5 treinos por semana' },
      intenso: { nome: 'Intenso', dica: '6 a 7 treinos por semana' },
      muitoIntenso: { nome: 'Muito intenso', dica: 'Treino pesado diário ou trabalho braçal' },
    },
    objetivos: { perder: 'Perder peso', manter: 'Manter o peso', ganhar: 'Ganhar peso' },
  },
  en: {
    inicio: 'Home',
    ferramentas: 'Tools',
    todasFerramentas: 'Free calculators for people who train',
    outrasFerramentas: 'More tools',
    perguntas: 'Frequently asked questions',
    aviso: 'Estimated result, for reference only. It does not replace advice from a doctor, dietitian or fitness professional.',
    vazio: 'Fill in the fields to see your result.',
    invalido: 'Check your values: one of them is outside the accepted range.',
    peso: 'Weight',
    altura: 'Height',
    idade: 'Age',
    anos: 'years',
    sexo: 'Sex',
    masculino: 'Male',
    feminino: 'Female',
    atividade: 'Activity level',
    objetivo: 'Goal',
    pesoMeta: 'Target weight',
    pesoMetaDica: 'Optional. Only used to estimate the timeline.',
    opcional: 'optional',
    seuImc: 'Your BMI',
    faixa: 'Category',
    faixaSaudavel: 'Healthy weight range for your height',
    pesoPorFormula: 'Ideal weight by formula',
    tmb: 'Basal metabolic rate (BMR)',
    tdee: 'Total daily energy expenditure (TDEE)',
    tmbDica: 'Calories burned at rest',
    tdeeDica: 'Calories burned with your activity',
    metaDiaria: 'Daily target',
    ajuste: 'Adjustment vs. expenditure',
    ritmo: 'Estimated pace',
    prazo: 'Estimated timeline',
    semanas: (n) => `${n} ${n === 1 ? 'week' : 'weeks'}`,
    semPrazo: 'Enter a target weight that matches your goal to estimate the timeline.',
    limitePiso: 'The target was capped at the safe minimum. Larger deficits are not recommended.',
    kcalDia: 'kcal/day',
    kgSemana: 'kg/week',
    ctaTitulo: 'Track your progress for real',
    ctaTexto: 'Create your free ENDORFINAPP account and log measurements, workouts and progress in charts.',
    ctaBotao: 'Create free account',
    ctaHref: '/register',
    abrir: 'Open',
    faixas: { abaixo: 'Underweight', normal: 'Normal weight', sobrepeso: 'Overweight', obesidade1: 'Obesity class I', obesidade2: 'Obesity class II', obesidade3: 'Obesity class III' },
    niveis: {
      sedentario: { nome: 'Sedentary', dica: 'Little or no exercise' },
      leve: { nome: 'Light', dica: '1 to 3 workouts per week' },
      moderado: { nome: 'Moderate', dica: '3 to 5 workouts per week' },
      intenso: { nome: 'Intense', dica: '6 to 7 workouts per week' },
      muitoIntenso: { nome: 'Very intense', dica: 'Hard daily training or a physical job' },
    },
    objetivos: { perder: 'Lose weight', manter: 'Maintain weight', ganhar: 'Gain weight' },
  },
}

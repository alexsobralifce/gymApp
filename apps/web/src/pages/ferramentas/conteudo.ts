// Textos das ferramentas públicas, por idioma. Caminhos devem coincidir com scripts/paresIdioma.mjs.
import type { Idioma } from '../../lib/i18n'

export type FerramentaId = 'imc' | 'pesoIdeal' | 'gasto' | 'meta'

export interface TextoFerramenta {
  caminho: string
  title: string
  description: string
  h1: string
  lead: string
  nome: string
  resumo: string
  explicacao: Array<{ titulo: string; paragrafos: string[] }>
  faqs: Array<{ q: string; a: string }>
}

export const ORDEM: FerramentaId[] = ['imc', 'pesoIdeal', 'gasto', 'meta']

export const FERRAMENTAS: Record<FerramentaId, Record<Idioma, TextoFerramenta>> = {
  imc: {
    pt: {
      caminho: '/ferramentas/calculadora-imc',
      title: 'Calculadora de IMC: índice de massa corporal | ENDORFINAPP',
      description: 'Calcule seu IMC em segundos com peso e altura e veja a faixa de classificação da OMS. Entenda o que o resultado quer dizer e quais são os limites.',
      h1: 'Calculadora de IMC',
      lead: 'Informe peso e altura para ver seu índice de massa corporal e em que faixa da classificação da OMS ele está.',
      nome: 'Calculadora de IMC',
      resumo: 'Índice de massa corporal e faixa da OMS.',
      explicacao: [
        { titulo: 'Como o IMC é calculado', paragrafos: ['O IMC é o peso em quilos dividido pela altura em metros elevada ao quadrado. Uma pessoa com 70 kg e 1,75 m tem IMC de 22,9.', 'A OMS classifica adultos em: abaixo de 18,5 (abaixo do peso), de 18,5 a 24,9 (peso normal), de 25 a 29,9 (sobrepeso) e 30 ou mais (obesidade, em três graus).'] },
        { titulo: 'O que o IMC não mostra', paragrafos: ['O IMC não separa gordura de massa muscular. Quem treina força pode ter IMC alto com baixo percentual de gordura. Também não considera onde a gordura fica, nem idade, sexo ou etnia.', 'Use o número como ponto de partida. Medidas como cintura, percentual de gordura e a evolução ao longo do tempo contam uma história mais completa.'] },
      ],
      faqs: [
        { q: 'O IMC vale para quem treina musculação?', a: 'Vale como referência, mas pode superestimar o risco: músculo pesa mais que gordura. Nesse caso, acompanhe também cintura e percentual de gordura.' },
        { q: 'Qual é o IMC considerado normal?', a: 'Para adultos, entre 18,5 e 24,9, segundo a OMS.' },
        { q: 'Serve para crianças e adolescentes?', a: 'Não. Eles usam curvas de crescimento por idade e sexo, avaliadas por um profissional de saúde.' },
        { q: 'Posso acompanhar meu IMC ao longo do tempo?', a: 'Sim. No ENDORFINAPP você registra medidas corporais e vê a evolução em gráficos.' },
      ],
    },
    en: {
      caminho: '/en/tools/bmi-calculator',
      title: 'BMI Calculator: body mass index with WHO ranges | ENDORFINAPP',
      description: 'Calculate your BMI in seconds from weight and height and see where you fall in the WHO classification. Learn what the result means and where it falls short.',
      h1: 'BMI calculator',
      lead: 'Enter your weight and height to see your body mass index and which WHO category it falls in.',
      nome: 'BMI calculator',
      resumo: 'Body mass index and WHO category.',
      explicacao: [
        { titulo: 'How BMI is calculated', paragrafos: ['BMI is weight in kilograms divided by height in meters squared. Someone who weighs 70 kg and is 1.75 m tall has a BMI of 22.9.', 'The WHO classifies adults as: under 18.5 (underweight), 18.5 to 24.9 (normal weight), 25 to 29.9 (overweight) and 30 or more (obesity, in three classes).'] },
        { titulo: 'What BMI does not show', paragrafos: ['BMI cannot tell fat from muscle. People who lift weights can have a high BMI with a low body fat percentage. It also ignores where fat is stored, as well as age, sex and ethnicity.', 'Treat the number as a starting point. Waist size, body fat percentage and your trend over time tell a fuller story.'] },
      ],
      faqs: [
        { q: 'Does BMI work for people who lift weights?', a: 'It is a rough reference, and it can overstate risk because muscle weighs more than fat. Track waist size and body fat too.' },
        { q: 'What is a normal BMI?', a: 'For adults, between 18.5 and 24.9, according to the WHO.' },
        { q: 'Can I use it for children and teenagers?', a: 'No. They use growth charts by age and sex, read by a health professional.' },
        { q: 'Can I track my BMI over time?', a: 'Yes. In ENDORFINAPP you log body measurements and see your progress in charts.' },
      ],
    },
  },
  pesoIdeal: {
    pt: {
      caminho: '/ferramentas/peso-ideal',
      title: 'Calculadora de peso ideal por altura e sexo | ENDORFINAPP',
      description: 'Descubra seu peso ideal por quatro fórmulas clássicas (Devine, Robinson, Miller e Hamwi) e a faixa saudável pelo IMC para a sua altura.',
      h1: 'Calculadora de peso ideal',
      lead: 'Veja o peso estimado por quatro fórmulas clássicas e a faixa de peso saudável para a sua altura.',
      nome: 'Peso ideal',
      resumo: 'Quatro fórmulas clássicas e a faixa saudável.',
      explicacao: [
        { titulo: 'De onde vêm os números', paragrafos: ['As fórmulas de Devine, Robinson, Miller e Hamwi partem de um peso-base para 1,52 m (5 pés) e somam um valor para cada polegada acima disso, com valores diferentes para homens e mulheres.', 'A faixa saudável é outra conta: é o peso que mantém seu IMC entre 18,5 e 24,9 para a sua altura.'] },
        { titulo: 'Como usar o resultado', paragrafos: ['Cada fórmula dá um valor um pouco diferente, e nenhuma conhece sua composição corporal. Quem tem mais massa muscular pode estar bem acima dessas referências.', 'Prefira olhar a faixa, e acompanhe medidas e desempenho nos treinos em vez de perseguir um número único.'] },
      ],
      faqs: [
        { q: 'Qual fórmula é a mais certa?', a: 'Nenhuma é a mais certa. São estimativas feitas só com altura e sexo; por isso mostramos as quatro e a faixa pelo IMC.' },
        { q: 'Meu peso está fora da faixa. Isso é um problema?', a: 'Não necessariamente. Massa muscular, ossatura e idade mudam o resultado. Converse com um profissional de saúde.' },
        { q: 'A altura mínima das fórmulas?', a: 'Elas partem de 1,52 m. Abaixo disso mostramos o peso-base, sem acréscimo.' },
      ],
    },
    en: {
      caminho: '/en/tools/ideal-weight-calculator',
      title: 'Ideal weight calculator by height and sex | ENDORFINAPP',
      description: 'Find your ideal weight with four classic formulas (Devine, Robinson, Miller and Hamwi) plus the healthy BMI range for your height.',
      h1: 'Ideal weight calculator',
      lead: 'See your estimated weight from four classic formulas and the healthy weight range for your height.',
      nome: 'Ideal weight',
      resumo: 'Four classic formulas and the healthy range.',
      explicacao: [
        { titulo: 'Where the numbers come from', paragrafos: ['The Devine, Robinson, Miller and Hamwi formulas start from a base weight at 5 feet (152 cm) and add an amount for each inch above it, with different values for men and women.', 'The healthy range is a different calculation: the weight that keeps your BMI between 18.5 and 24.9 for your height.'] },
        { titulo: 'How to use the result', paragrafos: ['Each formula gives a slightly different value, and none of them knows your body composition. People with more muscle can sit well above these references.', 'Look at the range, and track measurements and training performance instead of chasing a single number.'] },
      ],
      faqs: [
        { q: 'Which formula is the most accurate?', a: 'None of them. They are estimates based only on height and sex, which is why we show all four plus the BMI range.' },
        { q: 'My weight is outside the range. Is that a problem?', a: 'Not necessarily. Muscle mass, frame and age change the picture. Talk to a health professional.' },
        { q: 'What is the minimum height for the formulas?', a: 'They start at 5 feet (152 cm). Below that we show the base weight with no addition.' },
      ],
    },
  },
  gasto: {
    pt: {
      caminho: '/ferramentas/gasto-calorico',
      title: 'Calculadora de gasto calórico diário (TMB e TDEE) | ENDORFINAPP',
      description: 'Calcule sua taxa metabólica basal (TMB) e quantas calorias você gasta por dia conforme seu nível de atividade, pela equação de Mifflin-St Jeor.',
      h1: 'Calculadora de gasto calórico diário',
      lead: 'Descubra sua taxa metabólica basal e o total de calorias que você gasta por dia com o seu nível de atividade.',
      nome: 'Gasto calórico',
      resumo: 'TMB e calorias gastas por dia.',
      explicacao: [
        { titulo: 'TMB e TDEE', paragrafos: ['A TMB é a energia que o corpo gasta em repouso para manter as funções vitais. Usamos a equação de Mifflin-St Jeor, a mais usada na prática clínica.', 'O TDEE é a TMB multiplicada pelo fator de atividade: 1,2 (sedentário), 1,375 (leve), 1,55 (moderado), 1,725 (intenso) e 1,9 (muito intenso).'] },
        { titulo: 'Para que serve', paragrafos: ['O TDEE é a base para planejar a alimentação: comer perto dele mantém o peso, abaixo tende a reduzir e acima tende a aumentar.', 'É uma estimativa. Acompanhe seu peso por duas a três semanas e ajuste conforme a resposta real do seu corpo.'] },
      ],
      faqs: [
        { q: 'Qual nível de atividade eu escolho?', a: 'Pense na semana inteira: sedentário é quase sem exercício; leve, 1 a 3 treinos; moderado, 3 a 5; intenso, 6 a 7; muito intenso, treino pesado diário ou trabalho braçal.' },
        { q: 'A equação serve para atletas?', a: 'Pode subestimar quem tem muita massa muscular. Como referência inicial, ela funciona.' },
        { q: 'Quantas calorias o treino gasta?', a: 'No ENDORFINAPP, a estimativa de calorias de cada treino usa seus dados e a frequência cardíaca, quando disponível.' },
      ],
    },
    en: {
      caminho: '/en/tools/calorie-calculator',
      title: 'Daily calorie calculator (BMR and TDEE) | ENDORFINAPP',
      description: 'Calculate your basal metabolic rate (BMR) and how many calories you burn per day for your activity level, using the Mifflin-St Jeor equation.',
      h1: 'Daily calorie calculator',
      lead: 'Find your basal metabolic rate and the total calories you burn per day at your activity level.',
      nome: 'Calorie needs',
      resumo: 'BMR and calories burned per day.',
      explicacao: [
        { titulo: 'BMR and TDEE', paragrafos: ['BMR is the energy your body spends at rest to keep vital functions running. We use the Mifflin-St Jeor equation, the most common choice in clinical practice.', 'TDEE is BMR multiplied by an activity factor: 1.2 (sedentary), 1.375 (light), 1.55 (moderate), 1.725 (intense) and 1.9 (very intense).'] },
        { titulo: 'What it is for', paragrafos: ['TDEE is the base for planning what you eat: eating near it tends to maintain weight, below it tends to lower it and above it tends to raise it.', 'It is an estimate. Track your weight for two to three weeks and adjust to how your body actually responds.'] },
      ],
      faqs: [
        { q: 'Which activity level should I pick?', a: 'Think of your whole week: sedentary is almost no exercise; light, 1 to 3 workouts; moderate, 3 to 5; intense, 6 to 7; very intense, hard daily training or a physical job.' },
        { q: 'Does the equation work for athletes?', a: 'It can underestimate people with a lot of muscle. As a starting reference, it works.' },
        { q: 'How many calories does a workout burn?', a: 'In ENDORFINAPP, the calorie estimate for each workout uses your data and heart rate when available.' },
      ],
    },
  },
  meta: {
    pt: {
      caminho: '/ferramentas/calorias-para-meta',
      title: 'Calculadora de calorias para emagrecer ou ganhar peso | ENDORFINAPP',
      description: 'Descubra quantas calorias comer por dia para perder, manter ou ganhar peso e em quantas semanas você pode chegar ao peso desejado.',
      h1: 'Calculadora de calorias para a sua meta',
      lead: 'Escolha seu objetivo e veja a meta diária de calorias e uma estimativa de quantas semanas levaria para chegar ao peso desejado.',
      nome: 'Calorias para a meta',
      resumo: 'Meta diária e prazo estimado.',
      explicacao: [
        { titulo: 'Como a meta é calculada', paragrafos: ['Partimos do seu TDEE. Para perder peso, a meta fica 20% abaixo dele; para ganhar, 10% acima. Ao perder, nunca descemos abaixo da sua TMB, nem de 1.200 kcal (mulheres) ou 1.500 kcal (homens).', 'O prazo usa a regra de que cerca de 7.700 kcal equivalem a 1 kg de peso corporal. É uma média: o ritmo real varia de pessoa para pessoa.'] },
        { titulo: 'Cuidados', paragrafos: ['Déficits grandes cobram o preço em energia, treino e massa muscular. Para ganhar peso com qualidade, combine superávit moderado com treino de força.', 'Em caso de condição de saúde, gravidez ou histórico de transtorno alimentar, planeje a alimentação com nutricionista.'] },
      ],
      faqs: [
        { q: 'Por que o prazo é só uma estimativa?', a: 'O corpo se adapta: o gasto muda conforme o peso muda, e a retenção de líquidos mascara a balança em curto prazo.' },
        { q: 'Posso comer menos para chegar mais rápido?', a: 'Não recomendamos. Por isso a meta tem piso. Perder rápido demais costuma custar músculo e disposição.' },
        { q: 'E a divisão de proteínas, carboidratos e gorduras?', a: 'Esta calculadora trata só do total de calorias. A distribuição de macronutrientes é um bom tema para um nutricionista.' },
      ],
    },
    en: {
      caminho: '/en/tools/calorie-goal-calculator',
      title: 'Calorie goal calculator for weight loss or gain | ENDORFINAPP',
      description: 'Find out how many calories to eat per day to lose, maintain or gain weight, and in how many weeks you could reach your target weight.',
      h1: 'Calorie goal calculator',
      lead: 'Pick your goal and see your daily calorie target and an estimate of how many weeks it would take to reach your target weight.',
      nome: 'Calorie goal',
      resumo: 'Daily target and estimated timeline.',
      explicacao: [
        { titulo: 'How the target is calculated', paragrafos: ['We start from your TDEE. To lose weight, the target is 20% below it; to gain, 10% above. When losing, we never go below your BMR, or below 1,200 kcal (women) or 1,500 kcal (men).', 'The timeline uses the rule that about 7,700 kcal equals 1 kg of body weight. It is an average: real progress varies from person to person.'] },
        { titulo: 'Things to keep in mind', paragrafos: ['Big deficits cost you energy, training quality and muscle. To gain weight well, pair a moderate surplus with strength training.', 'With a health condition, pregnancy or a history of eating disorders, plan your nutrition with a dietitian.'] },
      ],
      faqs: [
        { q: 'Why is the timeline only an estimate?', a: 'The body adapts: expenditure changes as weight changes, and water retention masks the scale in the short term.' },
        { q: 'Can I eat less to get there faster?', a: 'We do not recommend it, which is why the target has a floor. Losing too fast often costs muscle and energy.' },
        { q: 'What about protein, carbs and fat?', a: 'This calculator covers total calories only. Macronutrient split is a good topic for a dietitian.' },
      ],
    },
  },
}

/**
 * rename-exercicios-en-pt.ts
 *
 * Corrige, em bancos já semeados, exercícios cujo nome ficou em inglês
 * (herdado direto da API do gifdotreino.com, sem tradução) e um bug de
 * tradução que corrompia a palavra "pressão" em "desenvolvimentoão"
 * (ver translate-utils.ts — regra /\bpress\b/ sem lookahead para vogais
 * acentuadas casava com o prefixo de "pressão").
 *
 * Idempotente: seguro rodar mais de uma vez — se o nome antigo não existir
 * mais (já renomeado, ou banco semeado a partir do JSON já corrigido),
 * o updateMany simplesmente não encontra linhas e não faz nada.
 *
 * Executar: npx tsx apps/api/prisma/rename-exercicios-en-pt.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const RENAMES: Array<{ de: string; para: string }> = [
  { de: 'Anilha Press', para: 'Press de Anilha no Peito' },
  { de: 'Barbell Hang Clean', para: 'Hang Clean com Barra' },
  { de: 'Dumbbell Devil Press', para: 'Devil Press com Halteres' },
  { de: 'Dumbbell Power Clean', para: 'Power Clean com Halteres' },
  { de: 'Dumbbell-Raise', para: 'Elevação com Halteres' },
  { de: 'Hands Bike', para: 'Bike de Braço' },
  { de: 'Bike', para: 'Bicicleta Ergométrica' },
  { de: 'Medicine Ball Rotational Throw', para: 'Arremesso Rotacional com Bola Medicinal' },
  { de: 'Nave Seal Burpee', para: 'Burpee Navy Seal' },
  { de: 'Pull Up', para: 'Barra Fixa Pronada' },
  { de: 'V-Up com Bola de Estabilidade', para: 'Abdominal em V com Bola de Estabilidade' },
  { de: 'Wall Sit', para: 'Agachamento Isométrico na Parede' },
  { de: 'Wall Sit com Inclinação de Tronco', para: 'Agachamento Isométrico na Parede com Inclinação de Tronco' },
  { de: 'Superman', para: 'Super-Homem' },

  // ── Lote 2: nomes mutilados (palavras coladas/em inglês vindas do sync) ──
  // Ex.: "Smithdeadlift" (equipamento + termo em inglês colados) — corrigido
  // para o padrão didático PT-BR usado no restante da base.
  { de: 'Smithdeadlift', para: 'Levantamento Terra no Smith' },
  { de: 'Smithsquat', para: 'Agachamento no Smith' },
  { de: 'Maquina de Alavancadeadlift', para: 'Levantamento Terra na Máquina de Alavanca' },
  { de: 'Unilateral squat (pistol) male', para: 'Agachamento Unilateral Pistol' },
  { de: 'Superman Flexao de Braco', para: 'Super-Homem com Flexão de Braço' },
  { de: 'Semi squat Salto', para: 'Agachamento Parcial com Salto' },
  // "squatting" = agachado → qualifica o nome para não colidir com a
  // "Rosca na Polia" já existente (id ds-0868) e mantém a fidelidade ao original.
  { de: 'Na Polia squatting Rosca', para: 'Rosca na Polia Agachado' },
  { de: 'Peso Corporal squatting Remada', para: 'Remada com Peso Corporal' },
  { de: 'Com Barra squat Salto Passo Posterior Avanco', para: 'Agachamento com Barra + Avanço' },

  // ── Lote 3: resíduos que ainda falhavam no validador do domínio ──
  // (ExercicioLinguagemDidatica.test.ts). Casos em minúsculas que escaparam
  // das regras do lote 1, um nome com "v-up" e o termo "Navy Seal" (inglês).
  { de: 'Hands bike', para: 'Bike de Braço' },
  { de: 'Com Elastico v-up', para: 'Abdominal em V com Elástico' },
  { de: 'Band Alternado v-up', para: 'Abdominal em V Alternado com Elástico' },
  { de: 'Burpee Navy Seal', para: 'Burpee Fuzileiro Naval' },
]

async function renomearExercicios() {
  let totalRenomeados = 0
  for (const { de, para } of RENAMES) {
    const resultado = await prisma.exercicio.updateMany({
      where: { nome: de },
      data: { nome: para },
    })
    if (resultado.count > 0) {
      console.log(`  ✓ "${de}" → "${para}" (${resultado.count} linha(s))`)
      totalRenomeados += resultado.count
    }
  }
  console.log(`✅ ${totalRenomeados} exercício(s) renomeado(s)`)
}

/** Corrige o bug de tradução que trocou "pressão" por "desenvolvimentoão". */
async function corrigirTextoCorrompido() {
  const candidatos = await prisma.exercicio.findMany({
    where: {
      OR: [
        { dica: { contains: 'desenvolvimentoão' } },
        { descricao_pt: { contains: 'desenvolvimentoão' } },
      ],
    },
  })

  let totalCorrigidos = 0
  for (const ex of candidatos) {
    const corrigirTexto = (s: string) =>
      s.replace(/Desenvolvimentoão/g, 'Pressão').replace(/desenvolvimentoão/g, 'pressão')

    const dica = ex.dica ? corrigirTexto(ex.dica) : ex.dica
    const descricao_pt = ex.descricao_pt ? corrigirTexto(ex.descricao_pt) : ex.descricao_pt
    const passos_pt = (ex.passos_pt || []).map((p) => corrigirTexto(p))

    await prisma.exercicio.update({
      where: { id: ex.id },
      data: { dica, descricao_pt, passos_pt },
    })
    totalCorrigidos++
  }
  console.log(`✅ ${totalCorrigidos} exercício(s) com texto corrompido corrigido(s)`)
}

async function main() {
  console.log('🔤 Corrigindo nomes de exercícios em inglês...')
  await renomearExercicios()
  console.log('🩹 Corrigindo texto corrompido ("desenvolvimentoão" → "pressão")...')
  await corrigirTextoCorrompido()
}

main()
  .catch((err) => {
    console.error('❌ Erro:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

export interface ExerciseDBItem {
  name: string
  bodyPart: string
  equipment: string
  target: string
  instructions: string[]
  gifUrl?: string
}

export const exerciseDB: ExerciseDBItem[] = [
  // ─── CHEST ──────────────────────────────────────────────────────────────
  { name: 'Supino Reto com Barra', bodyPart: 'chest', equipment: 'barbell', target: 'pectorals', instructions: ['Deite-se em um banco reto.', 'Segure a barra com as mãos afastadas na largura dos ombros.', 'Desça a barra até o peito.', 'Empurre de volta à posição inicial.'] },
  { name: 'Supino Inclinado com Halteres', bodyPart: 'chest', equipment: 'dumbbell', target: 'pectorals', instructions: ['Deite-se em um banco inclinado (30-45 graus).', 'Segure um halter em cada mão.', 'Empurre os halteres para cima.', 'Desça controladamente.'] },
  { name: 'Crucifixo Reto', bodyPart: 'chest', equipment: 'dumbbell', target: 'pectorals', instructions: ['Deite-se em um banco reto com halteres.', 'Abra os braços lateralmente com leve flexão do cotovelo.', 'Desça até sentir alongamento no peito.', 'Retorne à posição inicial contraindo o peito.'] },
  { name: 'Flexão de Braço', bodyPart: 'chest', equipment: 'body weight', target: 'pectorals', instructions: ['Posicione-se em prancha com as mãos na largura dos ombros.', 'Desça o corpo até o peito quase tocar o chão.', 'Empurre de volta à posição inicial.'] },
  { name: 'Crossover no Cabo', bodyPart: 'chest', equipment: 'cable', target: 'pectorals', instructions: ['Posicione-se entre duas polias altas.', 'Segure as alças e dê um passo à frente.', 'Traga as mãos juntas à frente do corpo.', 'Retorne controladamente.'] },
  { name: 'Peck Deck (Voador)', bodyPart: 'chest', equipment: 'leverage machine', target: 'pectorals', instructions: ['Sente-se na máquina com os braços abertos.', 'Empurre as almofadas para frente.', 'Aperte o peito no final do movimento.', 'Retorne controladamente.'] },
  { name: 'Supino Declinado', bodyPart: 'chest', equipment: 'barbell', target: 'pectorals', instructions: ['Deite-se em banco declinado.', 'Segure a barra com pegada média.', 'Desça até o peito inferior.', 'Empurre de volta.'] },
  { name: 'Paralelas (Dips)', bodyPart: 'chest', equipment: 'body weight', target: 'pectorals', instructions: ['Segure-se nas barras paralelas.', 'Incline o tronco para frente.', 'Desça flexionando os cotovelos.', 'Empurre de volta à posição inicial.'] },

  // ─── BACK ───────────────────────────────────────────────────────────────
  { name: 'Puxada Frontal (Pulley)', bodyPart: 'back', equipment: 'cable', target: 'latissimus dorsi', instructions: ['Sente-se na máquina de puxada.', 'Segure a barra com pegada larga.', 'Puxe a barra até o peito.', 'Retorne controladamente.'] },
  { name: 'Remada Curvada', bodyPart: 'back', equipment: 'barbell', target: 'latissimus dorsi', instructions: ['Incline o tronco à frente com joelhos flexionados.', 'Segure a barra com pegada pronada.', 'Puxe a barra em direção ao abdômen.', 'Desça controladamente.'] },
  { name: 'Remada Unilateral', bodyPart: 'back', equipment: 'dumbbell', target: 'latissimus dorsi', instructions: ['Apoie um joelho e mão em um banco.', 'Segure o halter com a mão livre.', 'Puxe o halter em direção ao quadril.', 'Desça controladamente.'] },
  { name: 'Barra Fixa (Pull-up)', bodyPart: 'back', equipment: 'body weight', target: 'latissimus dorsi', instructions: ['Segure a barra com pegada pronada.', 'Puxe o corpo para cima até o queixo ultrapassar a barra.', 'Desça controladamente.'] },
  { name: 'Remada Baixa (Cabo)', bodyPart: 'back', equipment: 'cable', target: 'latissimus dorsi', instructions: ['Sente-se na máquina de remada baixa.', 'Segure a alça com as mãos.', 'Puxe em direção ao abdômen.', 'Retorne controladamente.'] },
  { name: 'Puxada Triângulo', bodyPart: 'back', equipment: 'cable', target: 'latissimus dorsi', instructions: ['Sente-se na máquina de puxada.', 'Use o acessório triângulo.', 'Puxe em direção ao peito.', 'Retorne controladamente.'] },
  { name: 'Remada Cavalinho (T-Bar)', bodyPart: 'back', equipment: 'barbell', target: 'latissimus dorsi', instructions: ['Posicione-se sobre a barra.', 'Segure a alça e incline o tronco.', 'Puxe a barra em direção ao peito.', 'Desça controladamente.'] },
  { name: 'Levantamento Terra', bodyPart: 'back', equipment: 'barbell', target: 'spine', instructions: ['Posicione-se com os pés na largura dos ombros.', 'Agache e segure a barra.', 'Mantenha as costas retas.', 'Levante estendendo quadril e joelhos.'] },

  // ─── SHOULDERS ──────────────────────────────────────────────────────────
  { name: 'Desenvolvimento Militar', bodyPart: 'shoulders', equipment: 'barbell', target: 'deltoids', instructions: ['Sentado ou em pé, segure a barra na altura dos ombros.', 'Empurre a barra para cima.', 'Estenda completamente os braços.', 'Desça controladamente.'] },
  { name: 'Desenvolvimento com Halteres', bodyPart: 'shoulders', equipment: 'dumbbell', target: 'deltoids', instructions: ['Sentado com halteres na altura dos ombros.', 'Empurre os halteres para cima.', 'Estenda os braços.', 'Desça controladamente.'] },
  { name: 'Elevação Lateral', bodyPart: 'shoulders', equipment: 'dumbbell', target: 'deltoids', instructions: ['Em pé com halteres ao lado do corpo.', 'Eleve os braços lateralmente até a altura dos ombros.', 'Mantenha leve flexão do cotovelo.', 'Desça controladamente.'] },
  { name: 'Elevação Frontal', bodyPart: 'shoulders', equipment: 'dumbbell', target: 'deltoids', instructions: ['Em pé com halteres à frente do corpo.', 'Eleve um braço de cada vez à frente.', 'Suba até a altura dos ombros.', 'Desça controladamente.'] },
  { name: 'Crucifixo Inverso', bodyPart: 'shoulders', equipment: 'dumbbell', target: 'deltoids', instructions: ['Incline o tronco à frente.', 'Segure halteres com braços pendentes.', 'Eleve os braços lateralmente.', 'Foque na contração do deltoide posterior.'] },
  { name: 'Encolhimento (Shrug)', bodyPart: 'shoulders', equipment: 'dumbbell', target: 'trapezius', instructions: ['Em pé com halteres ao lado do corpo.', 'Eleve os ombros em direção às orelhas.', 'Segure brevemente.', 'Desça controladamente.'] },
  { name: 'Arnold Press', bodyPart: 'shoulders', equipment: 'dumbbell', target: 'deltoids', instructions: ['Segure halteres com palmas viradas para você.', 'Inicie com cotovelos flexionados.', 'Gire as mãos e empurre para cima.', 'Retorne à posição inicial com rotação.'] },

  // ─── BICEPS ─────────────────────────────────────────────────────────────
  { name: 'Rosca Direta', bodyPart: 'upper arms', equipment: 'barbell', target: 'biceps', instructions: ['Em pé, segure a barra com pegada supinada.', 'Flexione os cotovelos.', 'Leve a barra em direção aos ombros.', 'Desça controladamente.'] },
  { name: 'Rosca Alternada', bodyPart: 'upper arms', equipment: 'dumbbell', target: 'biceps', instructions: ['Em pé com halteres ao lado do corpo.', 'Flexione um cotovelo de cada vez.', 'Leve o halter em direção ao ombro.', 'Desça e repita com o outro braço.'] },
  { name: 'Rosca Martelo', bodyPart: 'upper arms', equipment: 'dumbbell', target: 'brachialis', instructions: ['Em pé com halteres, palmas voltadas para o corpo.', 'Flexione os cotovelos mantendo a pegada neutra.', 'Leve os halteres aos ombros.', 'Desça controladamente.'] },
  { name: 'Rosca Concentrada', bodyPart: 'upper arms', equipment: 'dumbbell', target: 'biceps', instructions: ['Sentado, apoie o cotovelo na parte interna da coxa.', 'Segure o halter com pegada supinada.', 'Flexione o cotovelo.', 'Desça controladamente.'] },
  { name: 'Rosca no Cabo (Polia Baixa)', bodyPart: 'upper arms', equipment: 'cable', target: 'biceps', instructions: ['Em pé diante da polia baixa.', 'Segure a barra com pegada supinada.', 'Flexione os cotovelos.', 'Desça controladamente.'] },

  // ─── TRICEPS ────────────────────────────────────────────────────────────
  { name: 'Tríceps Testa', bodyPart: 'upper arms', equipment: 'barbell', target: 'triceps', instructions: ['Deitado no banco, segure a barra com braços estendidos.', 'Flexione os cotovelos baixando a barra em direção à testa.', 'Estenda os braços de volta.', 'Mantenha os cotovelos fixos.'] },
  { name: 'Tríceps Francês', bodyPart: 'upper arms', equipment: 'dumbbell', target: 'triceps', instructions: ['Sentado ou em pé, segure o halter acima da cabeça.', 'Flexione o cotovelo atrás da cabeça.', 'Estenda o braço de volta.', 'Mantenha o cotovelo apontado para cima.'] },
  { name: 'Tríceps Pulley (Corda)', bodyPart: 'upper arms', equipment: 'cable', target: 'triceps', instructions: ['Em pé diante da polia alta com corda.', 'Empurre a corda para baixo.', 'Estenda completamente os braços.', 'Retorne controladamente.'] },
  { name: 'Mergulho no Banco', bodyPart: 'upper arms', equipment: 'body weight', target: 'triceps', instructions: ['Apoie as mãos em um banco atrás do corpo.', 'Estenda as pernas à frente.', 'Desça flexionando os cotovelos.', 'Empurre de volta.'] },
  { name: 'Tríceps Coice (Kickback)', bodyPart: 'upper arms', equipment: 'dumbbell', target: 'triceps', instructions: ['Incline o tronco à frente.', 'Segure o halter com cotovelo flexionado a 90 graus.', 'Estenda o braço para trás.', 'Retorne à posição inicial.'] },

  // ─── LEGS ───────────────────────────────────────────────────────────────
  { name: 'Agachamento Livre', bodyPart: 'upper legs', equipment: 'barbell', target: 'quadriceps', instructions: ['Posicione a barra sobre os ombros.', 'Afaste os pés na largura dos ombros.', 'Desça flexionando joelhos e quadril.', 'Suba empurrando o chão.'] },
  { name: 'Leg Press 45°', bodyPart: 'upper legs', equipment: 'sled machine', target: 'quadriceps', instructions: ['Sente-se na máquina com pés na plataforma.', 'Destrave a plataforma.', 'Flexione os joelhos descendo.', 'Empurre de volta sem travar os joelhos.'] },
  { name: 'Cadeira Extensora', bodyPart: 'upper legs', equipment: 'leverage machine', target: 'quadriceps', instructions: ['Sente-se na máquina.', 'Posicione os tornozelos sob a almofada.', 'Estenda os joelhos.', 'Desça controladamente.'] },
  { name: 'Mesa Flexora', bodyPart: 'upper legs', equipment: 'leverage machine', target: 'hamstrings', instructions: ['Deite-se de bruços na máquina.', 'Posicione os tornozelos sob a almofada.', 'Flexione os joelhos.', 'Desça controladamente.'] },
  { name: 'Stiff', bodyPart: 'upper legs', equipment: 'barbell', target: 'hamstrings', instructions: ['Em pé, segure a barra à frente do corpo.', 'Mantenha joelhos levemente flexionados.', 'Incline o tronco à frente.', 'Desça até sentir alongamento nos posteriores.'] },
  { name: 'Avanço (Passada)', bodyPart: 'upper legs', equipment: 'dumbbell', target: 'quadriceps', instructions: ['Em pé com halteres.', 'Dê um passo largo à frente.', 'Desça o joelho de trás em direção ao chão.', 'Empurre de volta à posição inicial.'] },
  { name: 'Panturrilha em Pé', bodyPart: 'lower legs', equipment: 'leverage machine', target: 'calves', instructions: ['Posicione-se na máquina com ombros sob as almofadas.', 'Eleve os calcanhares.', 'Suba na ponta dos pés.', 'Desça controladamente.'] },
  { name: 'Panturrilha Sentado', bodyPart: 'lower legs', equipment: 'leverage machine', target: 'calves', instructions: ['Sente-se na máquina.', 'Posicione as pontas dos pés na plataforma.', 'Eleve os calcanhares.', 'Desça controladamente.'] },
  { name: 'Búlgaro (Agachamento Búlgaro)', bodyPart: 'upper legs', equipment: 'dumbbell', target: 'quadriceps', instructions: ['Posicione um pé elevado atrás.', 'Segure halteres.', 'Desça flexionando o joelho da frente.', 'Empurre de volta.'] },

  // ─── ABS ────────────────────────────────────────────────────────────────
  { name: 'Abdominal Crunch', bodyPart: 'waist', equipment: 'body weight', target: 'abs', instructions: ['Deite-se de costas com joelhos flexionados.', 'Posicione as mãos atrás da cabeça.', 'Eleve o tronco contraindo o abdômen.', 'Desça controladamente.'] },
  { name: 'Prancha (Plank)', bodyPart: 'waist', equipment: 'body weight', target: 'abs', instructions: ['Apoie antebraços e pontas dos pés no chão.', 'Mantenha o corpo reto.', 'Contraia o abdômen.', 'Segure a posição.'] },
  { name: 'Abdominal Infra', bodyPart: 'waist', equipment: 'body weight', target: 'abs', instructions: ['Deite-se de costas com pernas estendidas.', 'Eleve as pernas em direção ao teto.', 'Desça controladamente sem tocar o chão.', 'Mantenha o abdômen contraído.'] },
  { name: 'Russian Twist', bodyPart: 'waist', equipment: 'body weight', target: 'abs', instructions: ['Sentado com joelhos flexionados.', 'Incline o tronco levemente para trás.', 'Gire o tronco para um lado.', 'Retorne e gire para o outro lado.'] },
  { name: 'Abdominal na Máquina', bodyPart: 'waist', equipment: 'leverage machine', target: 'abs', instructions: ['Sente-se na máquina de abdominal.', 'Segure as alças.', 'Flexione o tronco contraindo o abdômen.', 'Retorne controladamente.'] },

  // ─── GLUTES ─────────────────────────────────────────────────────────────
  { name: 'Hip Thrust', bodyPart: 'upper legs', equipment: 'barbell', target: 'glutes', instructions: ['Apoie as costas em um banco.', 'Posicione a barra sobre o quadril.', 'Empurre o quadril para cima.', 'Desça controladamente.'] },
  { name: 'Elevação Pélvica', bodyPart: 'upper legs', equipment: 'body weight', target: 'glutes', instructions: ['Deite-se de costas com joelhos flexionados.', 'Pés apoiados no chão.', 'Eleve o quadril contraindo glúteos.', 'Desça controladamente.'] },
  { name: 'Abdução de Quadril', bodyPart: 'upper legs', equipment: 'leverage machine', target: 'glutes', instructions: ['Sente-se na máquina de abdução.', 'Posicione as pernas nas almofadas.', 'Abra as pernas lateralmente.', 'Retorne controladamente.'] },

  // ─── FOREARMS ───────────────────────────────────────────────────────────
  { name: 'Rosca Punho', bodyPart: 'upper arms', equipment: 'barbell', target: 'forearms', instructions: ['Sentado, apoie antebraços nos joelhos.', 'Segure a barra com pegada supinada.', 'Flexione os punhos para cima.', 'Desça controladamente.'] },
  { name: 'Rosca Punho Inversa', bodyPart: 'upper arms', equipment: 'barbell', target: 'forearms', instructions: ['Sentado, apoie antebraços nos joelhos.', 'Segure a barra com pegada pronada.', 'Eleve as mãos estendendo os punhos.', 'Desça controladamente.'] },

  // ─── CARDIO ─────────────────────────────────────────────────────────────
  { name: 'Esteira (Caminhada)', bodyPart: 'cardio', equipment: 'treadmill', target: 'cardiovascular system', instructions: ['Suba na esteira.', 'Ajuste velocidade e inclinação.', 'Mantenha postura ereta.', 'Caminhe no ritmo desejado.'] },
  { name: 'Bicicleta Ergométrica', bodyPart: 'cardio', equipment: 'bike', target: 'cardiovascular system', instructions: ['Ajuste o banco.', 'Posicione os pés nos pedais.', 'Pedale no ritmo desejado.', 'Ajuste resistência conforme necessário.'] },
  { name: 'Elíptico', bodyPart: 'cardio', equipment: 'elliptical machine', target: 'cardiovascular system', instructions: ['Suba no elíptico.', 'Segure as alças.', 'Movimente pernas e braços.', 'Ajuste resistência e inclinação.'] },
  { name: 'Remo Ergométrico', bodyPart: 'cardio', equipment: 'rowing machine', target: 'cardiovascular system', instructions: ['Sente-se e prenda os pés.', 'Segure a alça.', 'Empurre com as pernas e puxe com os braços.', 'Retorne controladamente.'] },
]

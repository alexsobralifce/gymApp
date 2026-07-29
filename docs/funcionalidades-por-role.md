# Funcionalidades por Perfil de Usuario

Este documento descreve o que cada perfil de usuario pode fazer no sistema. Ele foi escrito para stakeholders e nao exige conhecimento tecnico.

---

## 1. Visao Geral

O sistema tem quatro perfis:

| Perfil | Quem e | Objetivo principal |
|--------|--------|--------------------|
| **Aluno** | Pessoa que treina | Executar treinos, acompanhar evolucao e interagir na rede social |
| **Professor** | Personal trainer ou preparador fisico | Criar e enviar fichas para alunos, acompanhar resultados |
| **Academia** | Dono ou gestor de uma academia | Gerenciar professores e alunos da unidade |
| **Root** | Administrador da plataforma | Aprovar academias, gerenciar usuarios e manter a operacao |

Um usuario pode ter apenas um perfil. O cadastro define o perfil no momento da criacao da conta.

---

## 2. Aluno

### 2.1 Cadastro e entrada

O aluno se cadastra em tres passos:

1. Dados basicos: nome, email, senha, telefone.
2. Perfil fisico: data de nascimento, peso, altura e sexo.
3. Vinculo: escolhe uma academia ativa ou entra no modo autogestao.

No primeiro login, ele ve uma tela de boas-vindas com instrucoes sobre como usar o app.

### 2.2 Treinos

O aluno pode:

- Criar seus proprios treinos, mesmo que tenha um professor.
- Editar treinos que ja criou ou recebeu.
- Excluir treinos que nao estao em execucao.
- Receber treinos de um professor e aceitar ou recusar.
- Iniciar, executar e finalizar treinos.
- Gerar treinos automaticamente com a assistente de IA, com base no objetivo, nivel, dias disponiveis, grupos musculares e restricoes medicas.

O sistema limita a criacao de treinos por IA: no maximo sete por mes, reiniciando no dia 1 de cada mes.

### 2.3 Execucao de treino

Durante a execucao, o aluno tem:

- Cronometro com tempo decorrido.
- Campos para registrar carga e repeticoes de cada serie.
- Botao para concluir todas as series de um exercicio de uma vez.
- Tela de conclusao ao final.
- Dicas de uso na primeira execucao.

### 2.4 Medidas e evolucao

O aluno pode registrar:

- Peso, altura, percentual de gordura e massa magra.
- IMC calculado automaticamente.

A tela de evolucao mostra:

- Frequencia de treinos no mes.
- Volume total de peso levantado.
- Duracao total e media dos treinos.
- Maior carga registrada.
- Graficos de peso corporal e IMC.
- Analises de correlacao entre medidas e volume de treino.

### 2.5 Rede social

O aluno tem acesso a:

- Mural com posts de treinos, recordes e conquistas.
- Curtidas e comentarios em posts.
- Lista de amigos e solicitacoes de amizade.
- Painel de colegas da mesma academia.
- Clubes de membros com ranking por XP.
- Controle de privacidade: cada post pode ser publico, so para amigos ou privado.

### 2.6 Dados pessoais

O aluno pode alterar nome, telefone, foto de perfil, dados fisicos e vinculos com professor ou academia.

### 2.7 Clube de Vantagens (Parceiros)

O aluno tem acesso a uma vitrine de parceiros do ecossistema, que permite:

- Visualizar descontos exclusivos em suplementacao, vestuario, servicos de nutricao, entre outros.
- Acessar promocoes destacadas com acesso facilitado as paginas dos parceiros.

---

## 3. Professor

### 3.1 Cadastro e vinculo

O professor cria seu perfil com CREF. Para se vincular a uma academia, ele precisa:

1. Solicitar o vinculo.
2. Aguardar aprovacao da academia.
3. Aguardar aprovacao final do Root.

Um professor pode estar vinculado a varias academias.

### 3.2 Alunos

O professor pode:

- Vincular alunos ao seu perfil.
- Ver a lista de alunos vinculados.
- Acompanhar o dashboard de cada aluno.
- Ver as correlacoes estatisticas de evolucao do aluno.

### 3.3 Treinos

O professor pode:

- Criar fichas de treino.
- Enviar treinos para alunos vinculados.
- Editar, clonar e excluir treinos.
- Criar treinos em lote.
- Marcar treinos como templates para reaproveitar.
- Criar exercicios personalizados na biblioteca.

### 3.4 Dashboard

O dashboard do professor mostra:

- Quantos alunos ele atende.
- Quantos treinos estao ativos.
- Quantos alunos tem treino em andamento.
- Cards por aluno com status dos treinos.

### 3.5 Academias

O professor pode listar academias, solicitar vinculo e gerenciar os vinculos ja existentes.

---

## 4. Academia

### 4.1 Cadastro

A academia se cadastra com nome e CNPJ. O cadastro fica com status pendente ate que o Root aprove. Apos aprovacao, fica ativa.

### 4.2 Professores

A academia pode:

- Listar professores vinculados.
- Aprovar ou rejeitar solicitacoes de vinculo de professores.
- Remover professores da academia.

### 4.3 Alunos

A academia pode:

- Listar todos os alunos associados.
- Atribuir um professor a cada aluno.

### 4.4 Treinos

A academia pode criar e gerenciar treinos para seus alunos, com as mesmas funcoes de clonagem, templates e edicao disponiveis ao professor.

### 4.5 Dashboard

O dashboard da academia mostra:

- Nome, CNPJ e status.
- Total de professores.
- Total de alunos.
- Quantos professores ainda estao pendentes.

---

## 5. Root

### 5.1 Visao geral

O Root e o administrador da plataforma. Ele tem acesso ao painel global com:

- Total de academias ativas.
- Academias pendentes de aprovacao.
- Total de professores.
- Total de alunos.

### 5.2 Aprovacao de academias

O Root pode:

- Aprovar ou rejeitar academias cadastradas.
- Definir o limite de professores por academia.
- Desabilitar uma academia ativa.

### 5.3 Vinculos professor-academia

O Root pode:

- Ver todos os vinculos pendentes.
- Aprovar ou rejeitar a etapa final de cada vinculo.

### 5.4 Usuarios

O Root pode:

- Listar todos os usuarios.
- Buscar por nome ou email.
- Filtrar por perfil ou status.
- Ativar ou desativar contas.
- Resetar senhas.

O Root nao pode desativar outro usuario Root.

### 5.5 Moderacao social

O Root tem acesso a uma tela de moderacao do feed social.

---

## 6. Matriz de Permissoes

Esta tabela resume o que cada perfil pode fazer no sistema.

| Funcionalidade | Aluno | Professor | Academia | Root |
|---|---|---|---|---|
| Criar, editar e excluir seus proprios treinos | Sim | Sim | Sim | Nao |
| Enviar treinos para outras pessoas | Nao | Sim, para seus alunos | Sim, para alunos da academia | Nao |
| Clonar treinos em lote | Nao | Sim | Sim | Nao |
| Criar templates de treino | Nao | Sim | Sim | Nao |
| Executar treinos | Sim | Nao | Nao | Nao |
| Gerar treinos com IA | Sim | Nao | Nao | Nao |
| Vincular alunos | Nao | Sim | Sim, atribuindo professor | Nao |
| Aprovar vinculos de professores | Nao | Nao | Sim, primeira etapa | Sim, etapa final |
| Aprovar academias | Nao | Nao | Nao | Sim |
| Gerenciar usuarios do sistema | Nao | Nao | Nao | Sim |
| Resetar senhas | Nao | Nao | Nao | Sim |
| Acessar feed social, amizades e clubes | Sim | Sim | Sim | Nao |
| Acessar vitrine de promocoes e parceiros | Sim | Nao | Nao | Nao |
| Registrar medidas e ver evolucao | Sim, propria | Sim, dos alunos | Nao | Nao |
| Alterar vinculos e dados pessoais | Sim, proprios | Sim, proprios | Sim, proprios | Nao |

---

## 7. Fluxos principais

### 7.1 Aluno recebe treino de um professor

1. Professor cria o treino.
2. Professor envia o treino para o aluno.
3. Aluno recebe notificacao.
4. Aluno aceita ou recusa o treino.
5. Se aceitar, o aluno pode iniciar a execucao.
6. Aluno registra as series e finaliza o treino.

### 7.2 Professor se vincula a uma academia

1. Professor solicita o vinculo.
2. Academia aprova o vinculo.
3. Root faz a aprovacao final.
4. Professor pode criar treinos para alunos da academia.

### 7.3 Academia entra no sistema

1. Academia realiza o cadastro.
2. Root aprova o cadastro.
3. Academia cadastra ou aprova professores.
4. Professores vinculam alunos.
5. Academia acompanha os numeros pelo dashboard.

---

## 8. Observacoes

- Um aluno em autogestao nao depende de professor ou academia.
- Alunos vinculados a professores tambem podem criar treinos proprios.
- A edicao de um treino nao altera o historico de execucoes anteriores.
- A maquina de estados de treino garante que cada treino siga um fluxo valido: Cadastrado, Enviado, Aceito, Em Aberto, Em Execucao e Concluido.
- O limite de treinos por IA e individual por aluno e mensal.

---

*Documento mantido para alinhamento de funcionalidades com stakeholders.*

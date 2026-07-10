-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ROOT', 'ACADEMIA', 'PROFESSOR', 'ALUNO');

-- CreateEnum
CREATE TYPE "AcademiaStatus" AS ENUM ('PENDENTE', 'ATIVO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "VinculoStatus" AS ENUM ('PENDENTE_ACADEMIA', 'PENDENTE_ROOT', 'ATIVO', 'REJEITADO', 'REMOVIDO');

-- CreateEnum
CREATE TYPE "TreinoStatus" AS ENUM ('CADASTRADO', 'ENVIADO', 'ACEITO', 'RECUSADO', 'EM_ABERTO', 'EM_EXECUCAO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "TreinoAtor" AS ENUM ('ALUNO', 'PROFESSOR', 'SISTEMA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "foto_url" TEXT,
    "fcm_token" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academias" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "status" "AcademiaStatus" NOT NULL DEFAULT 'PENDENTE',
    "max_professores" INTEGER NOT NULL DEFAULT 20,
    "rejeitado_motivo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professores" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "cref" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professor_academia" (
    "id" TEXT NOT NULL,
    "professor_id" TEXT NOT NULL,
    "academia_id" TEXT NOT NULL,
    "status" "VinculoStatus" NOT NULL DEFAULT 'PENDENTE_ACADEMIA',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professor_academia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "professor_id" TEXT,
    "academia_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treinos" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dias_semana" INTEGER[],
    "status" "TreinoStatus" NOT NULL DEFAULT 'CADASTRADO',
    "iniciado_em" TIMESTAMP(3),
    "finalizado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treinos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treino_historico" (
    "id" TEXT NOT NULL,
    "treino_id" TEXT NOT NULL,
    "status_anterior" "TreinoStatus" NOT NULL,
    "status_novo" "TreinoStatus" NOT NULL,
    "ator_id" TEXT NOT NULL,
    "ator_tipo" "TreinoAtor" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treino_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercicios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "maquina" TEXT,
    "dica" TEXT,
    "imagem_url" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treino_exercicios" (
    "id" TEXT NOT NULL,
    "treino_id" TEXT NOT NULL,
    "exercicio_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "series" INTEGER NOT NULL DEFAULT 3,
    "repeticoes" INTEGER NOT NULL DEFAULT 12,
    "carga_sugerida_kg" DOUBLE PRECISION,

    CONSTRAINT "treino_exercicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execucao_exercicios" (
    "id" TEXT NOT NULL,
    "treino_id" TEXT NOT NULL,
    "exercicio_id" TEXT NOT NULL,
    "serie_numero" INTEGER NOT NULL,
    "repeticoes" INTEGER NOT NULL,
    "carga_kg" DOUBLE PRECISION NOT NULL,
    "registrado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execucao_exercicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medidas_corporais" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "peso_kg" DOUBLE PRECISION,
    "altura_cm" DOUBLE PRECISION,
    "percentual_bf" DOUBLE PRECISION,
    "massa_magra_kg" DOUBLE PRECISION,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacao" TEXT,

    CONSTRAINT "medidas_corporais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_motivacionais" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumo" TEXT NOT NULL,
    "url_estudo" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_motivacionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_motivacionais_enviadas" (
    "id" TEXT NOT NULL,
    "aluno_id" TEXT NOT NULL,
    "mensagem_id" TEXT NOT NULL,
    "enviada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_motivacionais_enviadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "academias_usuario_id_key" ON "academias"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "academias_cnpj_key" ON "academias"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "professores_usuario_id_key" ON "professores"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "professor_academia_professor_id_academia_id_key" ON "professor_academia"("professor_id", "academia_id");

-- CreateIndex
CREATE UNIQUE INDEX "alunos_usuario_id_key" ON "alunos"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "treino_exercicios_treino_id_ordem_key" ON "treino_exercicios"("treino_id", "ordem");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academias" ADD CONSTRAINT "academias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professores" ADD CONSTRAINT "professores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor_academia" ADD CONSTRAINT "professor_academia_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor_academia" ADD CONSTRAINT "professor_academia_academia_id_fkey" FOREIGN KEY ("academia_id") REFERENCES "academias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_academia_id_fkey" FOREIGN KEY ("academia_id") REFERENCES "academias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treinos" ADD CONSTRAINT "treinos_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treino_historico" ADD CONSTRAINT "treino_historico_treino_id_fkey" FOREIGN KEY ("treino_id") REFERENCES "treinos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treino_exercicios" ADD CONSTRAINT "treino_exercicios_treino_id_fkey" FOREIGN KEY ("treino_id") REFERENCES "treinos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treino_exercicios" ADD CONSTRAINT "treino_exercicios_exercicio_id_fkey" FOREIGN KEY ("exercicio_id") REFERENCES "exercicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execucao_exercicios" ADD CONSTRAINT "execucao_exercicios_treino_id_fkey" FOREIGN KEY ("treino_id") REFERENCES "treinos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execucao_exercicios" ADD CONSTRAINT "execucao_exercicios_exercicio_id_fkey" FOREIGN KEY ("exercicio_id") REFERENCES "exercicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medidas_corporais" ADD CONSTRAINT "medidas_corporais_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_motivacionais_enviadas" ADD CONSTRAINT "mensagens_motivacionais_enviadas_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_motivacionais_enviadas" ADD CONSTRAINT "mensagens_motivacionais_enviadas_mensagem_id_fkey" FOREIGN KEY ("mensagem_id") REFERENCES "mensagens_motivacionais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

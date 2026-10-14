# Plano: GIFs acessíveis (ampliados) e por sexo

Status: planejamento. Nada implementado. Fluxo combinado: mudar local, validar, só então produção.

## Diagnóstico (levantado em 14/10/2026)

- Catálogo: 963 exercícios, todos com GIF hospedado em `gifdotreino.com` (hotlink, sem cópia nossa).
- Cada GIF é 1080×1080 px, 0,8 a 2,9 MB, figura 3D anatômica em fundo branco.
- A figura ocupa só parte do quadro (muita área branca). Em amostra de 6 GIFs: 5 homens, 1 mulher.
- `Aluno.sexo` existe (`MASCULINO | FEMININO`, opcional). `Exercicio` não tem noção de sexo da figura.
- Cadastro de GIF (tela ROOT recém-criada): sem instruções, sem tamanho/proporção exigidos, sem normalização. Só valida tipo pelo conteúdo (magic bytes) e limite de 5 MB.

## Frente 1: cadastro de GIF com padrão e normalização

Espelhar o que a logo da academia já faz (`LogoService`, `LOGO_REGRAS`).
1. `GIF_REGRAS` (formatos, peso máx., lado mín./máx., proporção quadrada) exposto por endpoint e exibido na tela como instruções.
2. Validar pelo conteúdo com `sharp` (dimensões, frames, animado ou não), rejeitando fora do padrão com mensagem clara.
3. Normalizar no envio: recorte quadrado, lado máx. 720 px, WebP animado, remoção de metadados.
4. Mostrar na tela, antes de salvar, a prévia e o resultado (tamanho original → final).

## Frente 2: imagem ampliada para baixa visão e idosos

1. Script único (local) que mede, por exercício, a caixa da figura (união dos pixels não brancos em todos os quadros) e grava um enquadramento (`foco_x, foco_y, foco_larg`) no `Exercicio`.
2. Frontend aplica o enquadramento por CSS (recorte + escala), sem rehospedar nada. Figura passa a preencher ~85% do quadro.
3. Telas de execução: imagem ocupa a largura toda; toque abre em tela cheia com zoom.
4. Preferência "Imagem ampliada" (em Dados/Acessibilidade), ligada por padrão para quem tem 60+ (data de nascimento já existe) ou por escolha.
5. Fase opcional depois: gerar cópias recortadas próprias (WebP) e parar de depender do hotlink.

## Frente 3: imagem por sexo (a parte com risco)

Problema: não existe versão feminina da maioria dos GIFs, e o catálogo atual é quase todo masculino.
1. Modelo: `Exercicio.sexo_figura` (`MASCULINO | FEMININO | NEUTRO`) e `gif_url_feminino` / `gif_url_masculino` (variante opcional).
2. Regra de exibição: aluno FEMININO vê variante feminina se existir, senão a masculina; MASCULINO o inverso. Sem `sexo` informado vê o que houver. Professor vê pelo sexo do aluno do treino.
3. Tela ROOT ganha filtro "Sem versão feminina" e upload por variante, para preencher aos poucos.
4. Fonte das imagens femininas: **decisão do dono do produto**.
   - (a) Verificar se o fornecedor atual tem variante feminina e se a licença permite copiar.
   - (b) Contratar/produzir as figuras (custo e prazo reais para 963).
   - (c) Gerar com IA: não recomendo para movimento correto de exercício (erra anatomia/execução, risco para o aluno).
   - Enquanto isso, priorizar os exercícios mais usados (a tela já mostra "Em N treinos").

## Ordem de execução (tudo local primeiro)

| Fase | Entrega | Validação local |
| --- | --- | --- |
| 1 | Regras e normalização do upload + instruções na tela | Enviar GIF bom, grande, errado, não quadrado |
| 2 | Script de enquadramento + CSS de zoom + tela cheia | Conferir 30 exercícios variados lado a lado, antes/depois |
| 3 | Migração do modelo por sexo + regra de exibição + filtro ROOT | Testes por perfil (aluno F, M, sem sexo, professor) |
| 4 | Preenchimento das variantes femininas (conforme a fonte decidida) | Revisão visual por amostragem |
| 5 | Produção: migração, volume de uploads confirmado, deploy | Checagem pós-deploy |

## Perguntas em aberto

1. Fonte das imagens femininas (a, b ou c acima)?
2. O volume do Railway cobre `public/uploads`? Sem isso, upload some a cada deploy.
3. Hotlink do `gifdotreino.com`: há licença/permissão para copiar e recortar os GIFs?
4. Ampliação ligada por padrão para 60+ ou só por escolha do usuário?

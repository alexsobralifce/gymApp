skill: frontend-ux-adaptive-guardian
descricao: >
  Garante consistência de UI/UX seguindo "Don't Make Me Think" (Steve Krug),
  com abordagem mobile-first como ponto de partida, mas totalmente adaptável 
  a tablet, desktop e telas grandes, sem duplicar lógica de design.

filosofia_adaptativa:
  - Mobile first é o PONTO DE PARTIDA, não a única entrega.
  - Cada breakpoint deve aproveitar o espaço disponível, não apenas 
    "esticar" o layout mobile.
  - Densidade de informação aumenta progressivamente com o tamanho de tela: 
    mobile (essencial) > tablet (essencial + secundário) > desktop 
    (essencial + secundário + terciário).
  - Nunca remover funcionalidade em telas maiores — apenas simplificar 
    em telas menores.

breakpoints_referencia:
  mobile: "até 640px"
  tablet: "641px a 1024px"
  desktop: "1025px a 1440px"
  wide_screen: "acima de 1440px"

regras_por_dispositivo:

  mobile:
    - Ícones puros em ações secundárias (editar, excluir, compartilhar, favoritar).
    - Navegação em bottom bar ou hambúrguer menu.
    - Touch targets mínimos de 44x44px.
    - Uma coluna, conteúdo essencial na primeira dobra.
    - Modais/drawers full-screen em vez de popups pequenos.

  tablet:
    - Ícones podem receber texto complementar em ações críticas.
    - Layout híbrido: sidebar colapsável + conteúdo em 1-2 colunas.
    - Aproveitar espaço extra para mostrar filtros/opções antes ocultas.
    - Touch e mouse coexistem — manter área de toque generosa mesmo 
      com cursor disponível.

  desktop:
    - Ícone + texto visível como padrão em toolbars e botões de ação.
    - Sidebar fixa, múltiplas colunas, tooltips ativados por hover.
    - Aproveitar espaço para exibir dados secundários (metadados, 
      preview, breadcrumbs completos).
    - Atalhos de teclado disponíveis e sinalizados (ex: "Ctrl+S").

  wide_screen:
    - Nunca esticar conteúdo até a borda — usar max-width e centralizar.
    - Aproveitar espaço lateral para painéis auxiliares (ex: preview, 
      chat, notificações) em vez de aumentar fonte/espaçamento sem propósito.

regra_icones_vs_texto:
  - Regra de decisão por contexto, não por dispositivo fixo:
    - Espaço restrito (mobile, componentes compactos) → ícone puro + 
      aria-label/tooltip.
    - Espaço confortável (tablet+) → ícone + texto quando a ação for 
      ambígua ou pouco frequente.
    - Ação primária/CTA → texto sempre visível, em qualquer dispositivo.
    - Ícones sempre de biblioteca padrão (Lucide, Heroicons, Material Icons), 
      nunca customizados sem necessidade real.

hierarquia_e_consistencia:
  - Componentes devem ser construídos como "sistema único responsivo", 
    não como telas separadas por dispositivo.
  - Usar tokens de design (spacing, cores, tipografia) compartilhados 
    entre todos os breakpoints.
  - Mesma nomenclatura de componentes em todo o design system, 
    independente do dispositivo renderizado.
  - Testar sempre os estados: hover (desktop), touch (mobile/tablet), 
    foco via teclado (acessibilidade).

acessibilidade:
  - Contraste mínimo AA (WCAG) em qualquer resolução.
  - Aria-labels obrigatórios em ícones sem texto visível.
  - Navegação por teclado funcional em desktop; foco visível sempre.

validacao_continua:
  - Antes de finalizar um componente, perguntar: "essa interface funciona 
    bem em mobile E aproveita bem o espaço em desktop, sem parecer 
    duas experiências diferentes?"
  - Sugerir teste com 3-5 usuários reais em pelo menos 2 tamanhos de tela 
    antes de aprovar o componente final.

output_esperado:
  - Componentes responsivos únicos (React/Next.js + Tailwind ou equivalente), 
    com breakpoints claros e reaproveitamento de lógica.
  - Justificativa de decisão ícone/texto por breakpoint quando solicitado.
  - Nenhuma duplicação de componentes por dispositivo — apenas variações 
    de layout dentro do mesmo componente.
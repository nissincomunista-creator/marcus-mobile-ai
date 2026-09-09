import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, ChevronRight, ChevronLeft, Sparkles, Filter, 
  MapPin, Calculator, ShieldCheck, CheckCircle2, 
  TrendingUp, Coins, DollarSign, Building2, Gavel, 
  Layers, ArrowUpDown, ArrowRight, Eye, Play, Flame, Scale, Wallet, FileText, User, Bookmark
} from 'lucide-react';

export type TourTab = 'garimpo' | 'calculadora' | 'capital' | 'perfil';

export interface TourStep {
  id: string;
  stepNumber: number;
  totalSteps: number;
  moduleIndex: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  moduleName: string;
  moduleBadge: string;
  moduleColor: 'indigo' | 'amber' | 'emerald' | 'cyan' | 'purple' | 'teal';
  title: string;
  targetSelector: string;
  targetTab: TourTab;
  preferredPlacement?: 'bottom' | 'top' | 'right' | 'left';
  description: string;
  investorBenefit: string;
  actionHint?: string;
  icon: any;
}

export const TOUR_STEPS: TourStep[] = [
  // =========================================================================
  // MÓDULO 1: PAINEL PRINCIPAL DE GARIMPO DE LEILÕES (1 a 6)
  // =========================================================================
  {
    id: 'header-nav',
    stepNumber: 1,
    totalSteps: 21,
    moduleIndex: 1,
    moduleName: 'Módulo 1: Visão Geral e Navegação',
    moduleBadge: 'Módulo 1 • Visão Geral & Navegação',
    moduleColor: 'indigo',
    title: 'Header Estratégico & Alternância de Módulos',
    targetSelector: '[data-tour="header-nav"]',
    targetTab: 'garimpo',
    preferredPlacement: 'bottom',
    description: 'Navegue com agilidade entre o Garimpo de Leilões, a Calculadora de Valor Real, a Alocação Inteligente por Capital e seu Perfil de Investidor.',
    investorBenefit: 'Tenha controle executivo total do ecossistema sem perder filtros ou cálculos anteriores ao alternar entre as abas.',
    actionHint: 'Dica: Você pode retornar a qualquer momento ao Garimpo ou à Calculadora para cruzar análises e laudos.',
    icon: Layers
  },
  {
    id: 'kpis',
    stepNumber: 2,
    totalSteps: 21,
    moduleIndex: 1,
    moduleName: 'Módulo 1: Visão Geral e Navegação',
    moduleBadge: 'Módulo 1 • Visão Geral & Navegação',
    moduleColor: 'indigo',
    title: 'Painel de Indicadores Gerais (KPIs)',
    targetSelector: '[data-tour="kpis"]',
    targetTab: 'garimpo',
    preferredPlacement: 'bottom',
    description: 'Métricas consolidadas de mercado em tempo real: volume total de leilões garimpados, ROI médio estimado da carteira, total de lucro potencial acumulado e contagem de oportunidades com alta liquidez.',
    investorBenefit: 'Visão de helicóptero para identificar instantaneamente a temperatura e a rentabilidade do mercado no estado filtrado.',
    actionHint: 'Mantenha o foco em oportunidades com Liquidez Score ≥ 8 para estratégias de giro rápido de capital.',
    icon: TrendingUp
  },
  {
    id: 'origin-tabs',
    stepNumber: 3,
    totalSteps: 21,
    moduleIndex: 1,
    moduleName: 'Módulo 1: Visão Geral e Navegação',
    moduleBadge: 'Módulo 1 • Visão Geral & Navegação',
    moduleColor: 'indigo',
    title: 'Fontes de Oportunidades & Origem dos Lotes',
    targetSelector: '[data-tour="origin-tabs"]',
    targetTab: 'garimpo',
    preferredPlacement: 'bottom',
    description: 'Filtre instantaneamente por origem jurídica: Imóveis Caixa (leilões SFI e venda direta online), Leilões Judiciais, Leilões Extrajudiciais e Portais Imobiliários para arbitragem (Flip).',
    investorBenefit: 'Cada modalidade possui regras contratuais distintas. A Caixa, por exemplo, quita débitos de IPTU e condomínio que excederem 10% da avaliação.',
    actionHint: 'Imóveis Caixa oferecem financiamento de até 95% do valor arrematado e uso de FGTS.',
    icon: Building2
  },
  {
    id: 'quick-actions',
    stepNumber: 4,
    totalSteps: 21,
    moduleIndex: 1,
    moduleName: 'Módulo 1: Visão Geral e Navegação',
    moduleBadge: 'Módulo 1 • Visão Geral & Navegação',
    moduleColor: 'indigo',
    title: 'Ações Rápidas & Automação Inteligente',
    targetSelector: '[data-tour="quick-actions"]',
    targetTab: 'garimpo',
    preferredPlacement: 'bottom',
    description: 'Dispare a sincronização 100% automatizada da Caixa sem necessidade de baixar planilhas manuais, ou use o \'Alocação por Capital\' para receber uma seleção customizada de acordo com seu orçamento disponível.',
    investorBenefit: 'Economize horas de garimpo manual: a inteligência do sistema varre os editais, extrai metragens e cruza com a base de ITBI automaticamente.',
    actionHint: 'A alocação calcula compras à vista (Full Cash) ou alavancadas (5% de entrada + reforma + cartório).',
    icon: Sparkles
  },
  {
    id: 'filters-bar',
    stepNumber: 5,
    totalSteps: 21,
    moduleIndex: 1,
    moduleName: 'Módulo 1: Visão Geral e Navegação',
    moduleBadge: 'Módulo 1 • Visão Geral & Navegação',
    moduleColor: 'indigo',
    title: 'Filtros de Garimpo e Refinamento de Precisão',
    targetSelector: '[data-tour="filters-bar"]',
    targetTab: 'garimpo',
    preferredPlacement: 'bottom',
    description: 'Refine a busca por Estado (RJ, SP, MG), Cidade, Bairro específico, Tipo de Imóvel (Apartamento, Casa, Comercial, Terreno), Preço Máximo e Condições de Pagamento (Financiamento e Parcelamento).',
    investorBenefit: 'Filtre apenas os ativos compatíveis com a sua tese de investimento, eliminando ruídos e focando em alta margem líquida.',
    actionHint: 'Combine filtros de Bairro e Preço Máximo para localizar os maiores deságios de cada microrregião.',
    icon: Filter
  },
  {
    id: 'sorting-map',
    stepNumber: 6,
    totalSteps: 21,
    moduleIndex: 1,
    moduleName: 'Módulo 1: Visão Geral e Navegação',
    moduleBadge: 'Módulo 1 • Visão Geral & Navegação',
    moduleColor: 'indigo',
    title: 'Ordenação Estratégica & Mapa Georreferenciado',
    targetSelector: '[data-tour="sorting-map"]',
    targetTab: 'garimpo',
    preferredPlacement: 'bottom',
    description: 'Classifique as oportunidades por Maior Lucro Líquido, Maior ROI (%), Maior Liquidez ou Menor Preço. Abra o \'Mapa de Oportunidades\' para visualizar a distribuição geográfica dos imóveis, zonas quentes e proximidade com infraestruturas urbanas.',
    investorBenefit: 'Descubra clusters geográficos de imóveis com desconto e avalie visualmente o posicionamento logístico de cada oportunidade.',
    actionHint: 'A ordenação por \'Maior Lucro\' destaca as melhores arbitragens absolutas para quem busca grande volume.',
    icon: ArrowUpDown
  },

  // =========================================================================
  // MÓDULO 2: ANATOMIA DO CARD DE LEILÃO (7 a 11)
  // =========================================================================
  {
    id: 'card-header',
    stepNumber: 7,
    totalSteps: 21,
    moduleIndex: 2,
    moduleName: 'Módulo 2: Card Analítico do Imóvel',
    moduleBadge: 'Módulo 2 • Anatomia do Card de Leilão',
    moduleColor: 'amber',
    title: 'Identificação do Lote & Nível de Risco',
    targetSelector: '[data-tour="card-header"]',
    targetTab: 'garimpo',
    preferredPlacement: 'right',
    description: 'Cabeçalho do lote contendo tipologia, metragem, quartos, endereço completo normalizado, selos de auditoria de risco jurídico (Baixo, Médio, Alto) e alerta territorial preventivo contra favelas ou facções.',
    investorBenefit: 'Blindagem total: saiba de imediato se o imóvel fica em área de risco antes de gastar tempo analisando a matrícula.',
    actionHint: 'O radar geoespacial aplica depreciação protetiva caso o imóvel esteja a menos de 30m de comunidades.',
    icon: ShieldCheck
  },
  {
    id: 'card-financial',
    stepNumber: 8,
    totalSteps: 21,
    moduleIndex: 2,
    moduleName: 'Módulo 2: Card Analítico do Imóvel',
    moduleBadge: 'Módulo 2 • Anatomia do Card de Leilão',
    moduleColor: 'amber',
    title: 'Matriz Financeira: Custos, Lucro & Gabarito ITBI',
    targetSelector: '[data-tour="card-financial"]',
    targetTab: 'garimpo',
    preferredPlacement: 'right',
    description: 'Quatro colunas alinhadas com o fluxo de caixa real: Lance Mínimo, Custo Total Estimado (Lance + 5% leiloeiro + 3% ITBI + 2% RGI + reformas + condomínio teto 10%), Lucro Líquido Projetado e o Gabarito Oficial de ITBI.',
    investorBenefit: 'O Gabarito ITBI é apurado nas escrituras públicas registradas na Prefeitura para a mesma rua e bairro (NBR 14.653 saneada), eliminando falsos preços de anúncios.',
    actionHint: 'Passe o cursor sobre o Gabarito ITBI para ver a média de preço real por m² apurada no cartório.',
    icon: Coins
  },
  {
    id: 'card-return',
    stepNumber: 9,
    totalSteps: 21,
    moduleIndex: 2,
    moduleName: 'Módulo 2: Card Analítico do Imóvel',
    moduleBadge: 'Módulo 2 • Anatomia do Card de Leilão',
    moduleColor: 'amber',
    title: 'Retorno Projetado, Avaliação & Score de Liquidez',
    targetSelector: '[data-tour="card-return"]',
    targetTab: 'garimpo',
    preferredPlacement: 'right',
    description: 'Segunda linha financeira: ROI Projetado líquido sobre o capital investido, Avaliação Oficial da Caixa, Score de Liquidez (1 a 10) e o Preço Sugerido para Flip Rápido em 60 dias.',
    investorBenefit: 'O Flip Rápido calcula 85% do piso de ITBI + 15% do teto dos portais com depreciação de idade (Ross-Heidecke) para desovar o imóvel em velocidade recorde.',
    actionHint: 'O Score de Liquidez avalia volume histórico de escrituras na rua, segurança de posse e atratividade financeira.',
    icon: DollarSign
  },
  {
    id: 'card-portals',
    stepNumber: 10,
    totalSteps: 21,
    moduleIndex: 2,
    moduleName: 'Módulo 2: Card Analítico do Imóvel',
    moduleBadge: 'Módulo 2 • Anatomia do Card de Leilão',
    moduleColor: 'amber',
    title: 'Benchmark de Mercado: Zap e QuintoAndar',
    targetSelector: '[data-tour="card-portals"]',
    targetTab: 'garimpo',
    preferredPlacement: 'right',
    description: 'Comparativo direto com os maiores portais imobiliários: Média de preço por m² anunciado na rua e comparativo lado a lado das médias ativas no Zap Imóveis e no QuintoAndar.',
    investorBenefit: 'Permite calibrar a margem entre o valor de pedida de anúncios concorrentes e o valor de fechamento real de cartório.',
    actionHint: 'Use os portais como termômetro de concorrência e o ITBI como balizador de valor real de liquidez.',
    icon: Eye
  },
  {
    id: 'card-actions',
    stepNumber: 11,
    totalSteps: 21,
    moduleIndex: 2,
    moduleName: 'Módulo 2: Card Analítico do Imóvel',
    moduleBadge: 'Módulo 2 • Anatomia do Card de Leilão',
    moduleColor: 'amber',
    title: 'Situação Ocupacional & Ações do Lote',
    targetSelector: '[data-tour="card-actions"]',
    targetTab: 'garimpo',
    preferredPlacement: 'top',
    description: 'Badges de status (Desocupado / Ocupado, Financiamento, Parcelamento, Ver no Mapa) e os botões de ação: \'Simular Viabilidade & Jurídico\', \'Acessar Leilão\' e salvar no perfil.',
    investorBenefit: 'Com um clique em \'Simular Viabilidade & Jurídico\', todos os dados deste lote são transferidos automaticamente para a Calculadora de Valor Real.',
    actionHint: 'O botão \'Ver no Mapa\' abre a localização exata do imóvel no mapa satélite interativo.',
    icon: Play
  },

  // =========================================================================
  // MÓDULO 3: CALCULADORA DE VALOR REAL - ETAPA 1 (12 a 14)
  // =========================================================================
  {
    id: 'calc-characteristics',
    stepNumber: 12,
    totalSteps: 21,
    moduleIndex: 3,
    moduleName: 'Módulo 3: Calculadora • Etapa 1',
    moduleBadge: 'Etapa 1 • Pré-Análise & Custos de Entrada',
    moduleColor: 'emerald',
    title: 'Parâmetros Físicos e Localização Pericial',
    targetSelector: '[data-tour="calc-characteristics"]',
    targetTab: 'calculadora',
    preferredPlacement: 'right',
    description: 'Formulário pericial completo: selecione Estado, Cidade, Bairro com autocomplete, Logradouro, Número predial, Tipologia, Metragem privativa (m²), Quartos e Vagas.',
    investorBenefit: 'Permite simular qualquer imóvel do Brasil ou calibrar o lote arrematado para cruzar amostras reais no mesmo condomínio e na mesma rua.',
    actionHint: 'O botão \'Executar Análise Completa (3-em-1)\' cruza ITBI do prédio/rua, varredura online e portais simultaneamente.',
    icon: Calculator
  },
  {
    id: 'calc-costs',
    stepNumber: 13,
    totalSteps: 21,
    moduleIndex: 3,
    moduleName: 'Módulo 3: Calculadora • Etapa 1',
    moduleBadge: 'Etapa 1 • Pré-Análise & Custos de Entrada',
    moduleColor: 'emerald',
    title: 'Lance, Regra e Custos de Arrematação',
    targetSelector: '[data-tour="calc-costs"]',
    targetTab: 'calculadora',
    preferredPlacement: 'bottom',
    description: 'Defina o Lance de Arremate e alterne a Regra de Aquisição: Judicial (art. 895 CPC - 25% entrada), Extrajudicial (30%) ou Caixa (5%). Simule despesas de comissão, ITBI, registro (RGI), reformas e débitos condominiais.',
    investorBenefit: 'Calcula com exatidão tanto o Custo Total de Entrada (À Vista) quanto o Custo Efetivo de Entrada Alavancado (com Financiamento Caixa).',
    actionHint: 'Em imóveis Caixa, qualquer dívida de condomínio acima de 10% da avaliação é quitada integralmente pelo banco.',
    icon: Coins
  },
  {
    id: 'calc-benchmarks',
    stepNumber: 14,
    totalSteps: 21,
    moduleIndex: 3,
    moduleName: 'Módulo 3: Calculadora • Etapa 1',
    moduleBadge: 'Etapa 1 • Pré-Análise & Custos de Entrada',
    moduleColor: 'emerald',
    title: 'Comparativo 1-a-1 & Emissão de Laudo Técnico PTAM',
    targetSelector: '[data-tour="calc-benchmarks"]',
    targetTab: 'calculadora',
    preferredPlacement: 'bottom',
    description: 'Matriz comparativa em 5 níveis oficiais: Mesmo Prédio, Mesma Rua, Ruas do Entorno (Raio), Média do Bairro e Anúncios na Rua. Salve a análise no seu perfil ou gere o Laudo Técnico PTAM em PDF.',
    investorBenefit: 'Emita um Laudo Pericial completo com respaldo da NBR 14.653 para apresentar a sócios, investidores e bancos financiadores.',
    actionHint: 'Avance para a Etapa 2 para simular viabilidade comparada entre Locação e Revenda Rápida (Flip).',
    icon: CheckCircle2
  },

  // =========================================================================
  // MÓDULO 4: CALCULADORA - ETAPA 2 (SIMULADOR DE VIABILIDADE: LOCAÇÃO VS FLIP)
  // =========================================================================
  {
    id: 'calc-flip-rental',
    stepNumber: 15,
    totalSteps: 21,
    moduleIndex: 4,
    moduleName: 'Módulo 4: Calculadora • Etapa 2',
    moduleBadge: 'Etapa 2 • Simulador: Locação vs Flip',
    moduleColor: 'emerald',
    title: 'Simulador de Viabilidade: Locação vs Flip (Revenda)',
    targetSelector: '[data-tour="calc-flip-rental"]',
    targetTab: 'calculadora',
    preferredPlacement: 'top',
    description: 'Simulação comparativa completa: calibre os custos mensais de carregamento (Condomínio, IPTU e Manutenção) e avalie dois caminhos estratégicos: Renda Passiva de Locação (Yield anual líquido e valor acumulado no tempo) versus Flip de Revenda Rápida (projeção em 1, 3, 6, 12 e 24 meses com curva de retorno e pico ideal de liquidez).',
    investorBenefit: 'Saiba com precisão cirúrgica qual é o melhor destino do imóvel: carregar para aluguel ou girar rápido para maximizar o ROI líquido.',
    actionHint: 'A Curva de Retorno identifica o mês exato onde o lucro líquido atinge seu topo antes que o custo de carregamento comece a diminuir sua margem.',
    icon: Flame
  },

  // =========================================================================
  // MÓDULO 5: CALCULADORA - ETAPA 3 (AUDITORIA DA MATRÍCULA & EDITAL)
  // =========================================================================
  {
    id: 'calc-due-diligence',
    stepNumber: 16,
    totalSteps: 21,
    moduleIndex: 5,
    moduleName: 'Módulo 5: Calculadora • Etapa 3',
    moduleBadge: 'Etapa 3 • Due Diligence Jurídica & Matrícula',
    moduleColor: 'amber',
    title: 'Auditoria Técnica da Matrícula & Edital (Due Diligence Jurídica)',
    targetSelector: '[data-tour="calc-due-diligence"]',
    targetTab: 'calculadora',
    preferredPlacement: 'top',
    description: 'Módulo autônomo pericial com inteligência artificial para auditoria jurídica: faça upload em PDF ou cole o texto da Certidão de Matrícula (varredura automática de penhoras, hipotecas, gravames e usufrutos) e do Edital do Leilão & Processo (análise de ônus ocultos, regras de pagamento e imissão na posse).',
    investorBenefit: 'Blindagem jurídica absoluta: classifique o risco do lote em REGULAR, ATENÇÃO ou ALTO RISCO com parecer fundamentado antes de formalizar o lance.',
    actionHint: 'A auditoria jurídica previne arrematações com nulidades processuais ou passivos ocultos de condomínio que não foram informados no edital.',
    icon: ShieldCheck
  },

  // =========================================================================
  // MÓDULO 6: CALCULADORA - ETAPA 4 (BASE LOCAL DE ITBI & HISTÓRICO DE ESCRITURAS)
  // =========================================================================
  {
    id: 'calc-itbi-history',
    stepNumber: 17,
    totalSteps: 21,
    moduleIndex: 6,
    moduleName: 'Módulo 6: Calculadora • Etapa 4',
    moduleBadge: 'Etapa 4 • Base Local de ITBI & Laudo PTAM',
    moduleColor: 'purple',
    title: 'Base Local de ITBI & Histórico Real de Escrituras',
    targetSelector: '[data-tour="calc-itbi-history"]',
    targetTab: 'calculadora',
    preferredPlacement: 'top',
    description: 'Análise de mercado baseada exclusivamente nas escrituras públicas reais lavradas na Prefeitura: veja o Comparativo Visual de Valor m² (Prédio, Rua, Raio de 500m, Bairro e Portais), os cards com médias estatísticas e a tabela auditada de transações reais na mesma rua.',
    investorBenefit: 'Proteção total contra preços falsos de anúncios: o ITBI reflete o dinheiro real transacionado em cartório sob o rigor da NBR 14.653.',
    actionHint: 'Utilize o botão \'Gerar Laudo Técnico PTAM (PDF)\' para exportar um dossiê pericial executivo pronto para apresentação a investidores.',
    icon: Building2
  },

  // =========================================================================
  // MÓDULO 7: ALOCAÇÃO INTELIGENTE DE CAPITAL (18 a 20)
  // =========================================================================
  {
    id: 'capital-input',
    stepNumber: 18,
    totalSteps: 21,
    moduleIndex: 7,
    moduleName: 'Módulo 7: Alocação de Capital',
    moduleBadge: 'Módulo 7 • Alocador Inteligente de Capital',
    moduleColor: 'cyan',
    title: 'Dimensionamento de Caixa & Presets de Investimento',
    targetSelector: '[data-tour="capital-input"]',
    targetTab: 'capital',
    preferredPlacement: 'bottom',
    description: 'Insira o seu capital disponível em caixa (ex: R$ 50k, R$ 150k, R$ 500k ou R$ 1M+). O algoritmo calcula todos os custos reais de fechamento (entrada ou lance à vista, 5% leiloeiro, 3% ITBI, 2% RGI, estimativa de reforma e condomínio Caixa) e filtra instantaneamente os imóveis que cabem no seu bolso.',
    investorBenefit: 'Elimina planilhas manuais: o sistema só apresenta oportunidades cuja liquidação total respeita rigorosamente o seu limite orçamentário.',
    actionHint: 'Use os botões de atalho rápido de R$ 50k a R$ 1M para testar múltiplos cenários de aportes em segundos.',
    icon: Coins
  },
  {
    id: 'capital-filters',
    stepNumber: 19,
    totalSteps: 21,
    moduleIndex: 7,
    moduleName: 'Módulo 7: Alocação de Capital',
    moduleBadge: 'Módulo 7 • Alocador Inteligente de Capital',
    moduleColor: 'cyan',
    title: 'Modalidades de Compra, Estratégia e Liquidez',
    targetSelector: '[data-tour="capital-filters"]',
    targetTab: 'capital',
    preferredPlacement: 'bottom',
    description: 'Alterne a Modalidade entre Compra À Vista ou Financiamento Caixa (apenas 5% de entrada), defina a Estratégia (Revenda Rápida Flip vs Renda / Locação) e estabeleça o Score Mínimo de Liquidez (5 a 8+/10) por Estado, Cidade, Bairro e Tipologia.',
    investorBenefit: 'Descubra como alavancar seu capital com financiamento habitacional da Caixa, multiplicando sua capacidade de arrematação.',
    actionHint: 'A estratégia de Revenda Rápida ordena as oportunidades automaticamente pelo maior ROI líquido anualizado.',
    icon: Filter
  },
  {
    id: 'capital-results',
    stepNumber: 20,
    totalSteps: 21,
    moduleIndex: 7,
    moduleName: 'Módulo 7: Alocação de Capital',
    moduleBadge: 'Módulo 7 • Alocador Inteligente de Capital',
    moduleColor: 'cyan',
    title: 'Vitrine de Oportunidades Sob Medida para o seu Bolso',
    targetSelector: '[data-tour="capital-results"]',
    targetTab: 'capital',
    preferredPlacement: 'top',
    description: 'Grid sob medida com os imóveis mais rentáveis para o seu aporte: cada card destaca o desembolso real necessário, a margem de sobra de caixa, o ROI projetado e selos especiais para oportunidades com ROI ≥ 40% e alta liquidez.',
    investorBenefit: 'Foco cirúrgico nos melhores negócios que você tem capacidade imediata de arrematar hoje.',
    actionHint: 'Clique em \'Simular\' no card para transferir o imóvel diretamente para a Calculadora de Valor Real.',
    icon: TrendingUp
  },

  // =========================================================================
  // MÓDULO 8: PERFIL DO INVESTIDOR & GESTÃO DE LAUDOS (21)
  // =========================================================================
  {
    id: 'profile-analyses',
    stepNumber: 21,
    totalSteps: 21,
    moduleIndex: 8,
    moduleName: 'Módulo 8: Perfil do Investidor',
    moduleBadge: 'Módulo 8 • Análises Salvas & Laudos PTAM',
    moduleColor: 'teal',
    title: 'Minhas Análises de Mercado Salvas & Emissão de Laudos PTAM',
    targetSelector: '[data-tour="profile-analyses"]',
    targetTab: 'perfil',
    preferredPlacement: 'bottom',
    description: 'Central permanente de inteligência do investidor: consulte todas as análises salvas da Calculadora, acesse os 4 balizadores de preço (Gabarito ITBI, Portais Zap/QuintoAndar, Flip Rápido e Caixa) e visualize ou baixe o Laudo Técnico PTAM em PDF a qualquer momento.',
    investorBenefit: 'Histórico pericial auditável e profissional para comprovação de viabilidade perante bancos, credores, sócios e investidores parceiros.',
    actionHint: 'Parabéns! Você concluiu o Tour Completo por todas as ferramentas da plataforma e está pronto para arrematar com máxima segurança e lucro.',
    icon: Bookmark
  }
];

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: TourTab) => void;
}

interface SpotlightCoords {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PopoverCoords {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'right' | 'left';
}

export const InteractiveTour: React.FC<InteractiveTourProps> = ({ 
  isOpen, 
  onClose, 
  onNavigateTab 
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightCoords, setSpotlightCoords] = useState<SpotlightCoords | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<PopoverCoords | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const onNavigateTabRef = useRef(onNavigateTab);
  onNavigateTabRef.current = onNavigateTab;

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastFocusedStepRef = useRef<number | null>(null);

  const step = TOUR_STEPS[currentStepIndex];

  // Helper to calculate target element bounds & non-overlapping popover placement
  const updatePositions = useCallback(() => {
    if (!isOpen || !step) return;

    const el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (!el) {
      setSpotlightCoords(null);
      const popoverWidth = Math.min(430, window.innerWidth - 32);
      const popoverHeight = 310;
      setPopoverCoords({
        top: Math.max(20, (window.innerHeight - popoverHeight) / 2),
        left: Math.max(16, (window.innerWidth - popoverWidth) / 2),
        placement: 'bottom'
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    const padding = 10;

    const top = Math.max(0, rect.top - padding);
    const left = Math.max(0, rect.left - padding);
    const width = Math.min(window.innerWidth - left, rect.width + padding * 2);
    const height = Math.min(window.innerHeight - top, rect.height + padding * 2);

    setSpotlightCoords({ top, left, width, height });

    // Popover sizing
    const popWidth = Math.min(430, window.innerWidth - 32);
    const popHeight = popoverRef.current?.offsetHeight || 310;
    const clearance = 16;
    const isDesktop = window.innerWidth >= 1024;

    const spaceBelow = window.innerHeight - (top + height + clearance);
    const spaceAbove = top - clearance;
    const spaceRight = window.innerWidth - (left + width + clearance);
    const spaceLeft = left - clearance;

    let placement: 'top' | 'bottom' | 'right' | 'left' = step.preferredPlacement || 'bottom';

    // Validate horizontal space if side placement requested
    if ((placement === 'right' || placement === 'left') && !isDesktop) {
      placement = spaceBelow >= popHeight ? 'bottom' : 'top';
    } else if (placement === 'right' && spaceRight < popWidth + 10) {
      placement = spaceLeft >= popWidth + 10 ? 'left' : (spaceBelow >= popHeight ? 'bottom' : 'top');
    } else if (placement === 'left' && spaceLeft < popWidth + 10) {
      placement = spaceRight >= popWidth + 10 ? 'right' : (spaceBelow >= popHeight ? 'bottom' : 'top');
    } else if (placement === 'bottom' && spaceBelow < popHeight + 10) {
      if (spaceAbove >= popHeight + 10) {
        placement = 'top';
      } else if (isDesktop && spaceRight >= popWidth + 10) {
        placement = 'right';
      } else if (isDesktop && spaceLeft >= popWidth + 10) {
        placement = 'left';
      }
    } else if (placement === 'top' && spaceAbove < popHeight + 10) {
      if (spaceBelow >= popHeight + 10) {
        placement = 'bottom';
      } else if (isDesktop && spaceRight >= popWidth + 10) {
        placement = 'right';
      } else if (isDesktop && spaceLeft >= popWidth + 10) {
        placement = 'left';
      }
    }

    let popTop = 0;
    let popLeft = 0;

    if (placement === 'bottom') {
      popTop = top + height + clearance;
      popLeft = Math.max(16, Math.min(window.innerWidth - popWidth - 16, left + (width - popWidth) / 2));
    } else if (placement === 'top') {
      popTop = Math.max(16, top - popHeight - clearance);
      popLeft = Math.max(16, Math.min(window.innerWidth - popWidth - 16, left + (width - popWidth) / 2));
    } else if (placement === 'right') {
      popTop = Math.max(16, Math.min(window.innerHeight - popHeight - 16, top + (height - popHeight) / 2));
      popLeft = left + width + clearance;
    } else if (placement === 'left') {
      popTop = Math.max(16, Math.min(window.innerHeight - popHeight - 16, top + (height - popHeight) / 2));
      popLeft = Math.max(16, left - popWidth - clearance);
    }

    // Boundary protection: NEVER offscreen
    popTop = Math.max(16, Math.min(window.innerHeight - popHeight - 16, popTop));
    popLeft = Math.max(16, Math.min(window.innerWidth - popWidth - 16, popLeft));

    setPopoverCoords({ top: popTop, left: popLeft, placement });
  }, [isOpen, step]);

  // Initial step navigation and auto-scroll ONLY when step index actually changes
  useEffect(() => {
    if (!isOpen || !step) return;

    if (lastFocusedStepRef.current === currentStepIndex) {
      return;
    }
    lastFocusedStepRef.current = currentStepIndex;

    setIsTransitioning(true);

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    if (onNavigateTabRef.current) {
      onNavigateTabRef.current(step.targetTab);
    }

    const attemptFocus = (attemptsLeft: number) => {
      const el = document.querySelector(step.targetSelector) as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        const placement = step.preferredPlacement || 'bottom';
        const headerOffset = 90;

        let targetY = window.scrollY;

        // Intelligent alignment depending on preferred placement
        if (placement === 'top') {
          targetY = window.scrollY + rect.bottom - (window.innerHeight - 90);
        } else if (placement === 'bottom') {
          targetY = window.scrollY + rect.top - headerOffset;
        } else {
          targetY = window.scrollY + rect.top - 120;
        }

        window.scrollTo({
          top: Math.max(0, targetY),
          behavior: 'smooth'
        });

        setTimeout(() => {
          updatePositions();
          setIsTransitioning(false);
        }, 250);
      } else if (attemptsLeft > 0) {
        retryTimeoutRef.current = setTimeout(() => {
          attemptFocus(attemptsLeft - 1);
        }, 120);
      } else {
        updatePositions();
        setIsTransitioning(false);
      }
    };

    setTimeout(() => {
      attemptFocus(6);
    }, 140);
  }, [isOpen, step, updatePositions, currentStepIndex]);

  // Handle overlay wheel scrolling so user can scroll page freely without lock
  const handleOverlayWheel = (e: React.WheelEvent) => {
    window.scrollBy({
      top: e.deltaY,
      left: e.deltaX,
      behavior: 'auto'
    });
  };

  // Passive window scroll/resize listener that ONLY re-positions spotlight/popover (NEVER forces scrollY)
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => {
        updatePositions();
      });
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [isOpen, updatePositions]);

  // Keyboard navigation: ESC to close, Left/Right arrows to step
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('antigravity_tour_completed', 'true');
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen || !step) return null;

  const StepIcon = step.icon;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;
  const progressPct = Math.round(((currentStepIndex + 1) / TOUR_STEPS.length) * 100);

  const moduleColorMap = {
    indigo: {
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      glow: 'border-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.5)]',
      progress: 'from-indigo-500 to-blue-500',
      button: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
    },
    amber: {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      glow: 'border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)]',
      progress: 'from-amber-500 to-orange-500',
      button: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
    },
    emerald: {
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      glow: 'border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)]',
      progress: 'from-emerald-500 to-teal-500',
      button: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
    },
    cyan: {
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      glow: 'border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.5)]',
      progress: 'from-cyan-500 to-blue-500',
      button: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30'
    },
    purple: {
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      glow: 'border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.5)]',
      progress: 'from-purple-500 to-indigo-500',
      button: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
    },
    teal: {
      badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      glow: 'border-teal-400 shadow-[0_0_25px_rgba(20,184,166,0.5)]',
      progress: 'from-teal-500 to-emerald-500',
      button: 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-600/30'
    }
  };

  const moduleColorClasses = moduleColorMap[step.moduleColor] || moduleColorMap.indigo;

  return (
    <div 
      onWheel={handleOverlayWheel}
      className="fixed inset-0 select-none"
      style={{ zIndex: 9990 }}
    >
      {/* Clickable Backdrop to dismiss when clicking outside */}
      <div 
        onClick={handleClose}
        className="fixed inset-0 cursor-pointer"
        style={{ zIndex: 9991 }}
      />

      {/* Driver.js Pure CSS Spotlight: 9999px Box-Shadow technique.
          100% fail-safe across all browsers, zero SVG mask failures, zero black screens. */}
      {spotlightCoords ? (
        <div
          className="fixed pointer-events-none rounded-2xl transition-all duration-300"
          style={{
            top: `${spotlightCoords.top}px`,
            left: `${spotlightCoords.left}px`,
            width: `${spotlightCoords.width}px`,
            height: `${spotlightCoords.height}px`,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.85)',
            border: '2px solid rgba(255, 255, 255, 0.9)',
            zIndex: 9992
          }}
        >
          {/* Subtle pulsating outer glow frame */}
          <div className={`absolute -inset-1 rounded-2xl border-2 ${moduleColorClasses.glow} animate-pulse pointer-events-none`} />
        </div>
      ) : (
        /* Semi-transparent dark fallback if element is missing */
        <div 
          className="fixed inset-0 pointer-events-none bg-slate-950/80 transition-opacity duration-300"
          style={{ zIndex: 9992 }}
        />
      )}

      {/* Popover Card */}
      {popoverCoords && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          className="fixed w-full max-w-[430px] rounded-3xl bg-slate-900/98 border border-slate-700/80 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(15,23,42,0.9)] backdrop-blur-xl transition-all duration-250 ease-out text-slate-100 p-5 sm:p-6"
          style={{
            top: `${popoverCoords.top}px`,
            left: `${popoverCoords.left}px`,
            zIndex: 9995
          }}
        >
          {/* Header row: Module Badge + Step count + Close button */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${moduleColorClasses.badge}`}>
              <StepIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{step.moduleBadge}</span>
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
                {step.stepNumber} de {step.totalSteps}
              </span>

              <button
                onClick={handleClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar tutorial (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body: Title + Description + Investor Benefit Box */}
          <div className="pt-3.5 space-y-3">
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
              {step.title}
            </h3>

            <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
              {step.description}
            </p>

            {/* Investor Benefit Callout Box */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Impacto Estratégico</span>
              </div>
              <p className="text-[12px] text-slate-300 leading-relaxed font-sans">
                {step.investorBenefit}
              </p>
            </div>

            {/* Action Hint (if present) */}
            {step.actionHint && (
              <p className="text-[11px] text-amber-300/90 font-mono italic leading-normal">
                💡 {step.actionHint}
              </p>
            )}
          </div>

          {/* Progress Bar Line */}
          <div className="mt-4 w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div 
              className={`h-full bg-gradient-to-r ${moduleColorClasses.progress} transition-all duration-300`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Footer Actions: Skip + Prev + Next */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <button
              onClick={handleClose}
              className="text-xs font-mono font-bold text-slate-400 hover:text-slate-200 transition-colors px-2 py-1.5 rounded-lg cursor-pointer"
            >
              Pular Tutorial
            </button>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono transition-all cursor-pointer border border-slate-700"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shadow-md ${moduleColorClasses.button}`}
              >
                <span>{isLastStep ? 'Concluir Tour' : 'Próximo'}</span>
                {isLastStep ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

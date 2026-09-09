export interface CityZoneConfig {
  name: string;
  neighborhoods: string[];
}

function normalizeString(str?: string | null): string {
  if (!str) return '';
  return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Mapeamento oficial de Bairros por Zona
export const CITY_ZONES: Record<string, CityZoneConfig[]> = {
  'rio de janeiro': [
    {
      name: 'Zona Sul',
      neighborhoods: [
        'copacabana', 'ipanema', 'leblon', 'botafogo', 'flamengo', 'laranjeiras', 'catete',
        'gloria', 'urca', 'leme', 'gavea', 'jardim botanico', 'humaita', 'lagoa',
        'sao conrado', 'cosme velho', 'rodrigo de freitas', 'vidigal', 'rocinha'
      ]
    },
    {
      name: 'Zona Norte',
      neighborhoods: [
        'tijuca', 'maracana', 'vila isabel', 'grajau', 'meier', 'cachambi', 'del castilho',
        'engenho novo', 'engenho de dentro', 'todos os santos', 'madureira', 'ilha do governador',
        'penha', 'penha circular', 'ramos', 'olaria', 'bonsucesso', 'pavuna', 'iraja',
        'rocha miranda', 'bento ribeiro', 'marechal hermes', 'cascadura', 'campinho', 'piedade',
        'pilares', 'abolicao', 'encantado', 'agua santa', 'riachuelo', 'sampaio', 'sao cristovao',
        'mangueira', 'benfica', 'caju', 'higienopolis', 'maria da graca', 'inhauma', 'engenho da rainha',
        'tomas coelho', 'vicente de carvalho', 'vila da penha', 'vista alegre', 'braz de pina',
        'cordovil', 'parada de lucas', 'vigario geral', 'jardim america', 'coelho neto', 'acari',
        'barros filho', 'costa barros', 'honorio gurgel', 'oswaldo cruz', 'turiaçu', 'vila kosmos',
        'anchieta', 'parque anchieta', 'guadalupe', 'ricardo de albuquerque', 'portuguesa', 'monero',
        'jardim guanabara', 'cacuia', 'taua', 'bancarios', 'freguesia (ilha)', 'pitangueiras',
        'zumbi', 'ribeira', 'galeao', 'cidade universitaria'
      ]
    },
    {
      name: 'Zona Oeste',
      neighborhoods: [
        'barra da tijuca', 'recreio dos bandeirantes', 'recreio', 'jacarepagua', 'taquara',
        'freguesia (jacarepagua)', 'freguesia jacarepagua', 'pechincha', 'anil', 'curicica',
        'camorim', 'vargem grande', 'vargem pequena', 'campo grande', 'bangu', 'realengo',
        'santa cruz', 'senador camara', 'senador vasconcelos', 'santissimo', 'paciencia',
        'cosmos', 'inhoaiba', 'guaratiba', 'barra de guaratiba', 'pedra de guaratiba',
        'ilha de guaratiba', 'deodoro', 'magalhaes bastos', 'vila militar', 'jardim sulacap',
        'vila valqueire', 'praca seca', 'tanque', 'gardenia azul', 'cidade de deus',
        'itaguai', 'padre miguel', 'gericino', 'jabour'
      ]
    },
    {
      name: 'Centro',
      neighborhoods: [
        'centro', 'lapa', 'santa teresa', 'santo cristo', 'gamboa', 'saude', 'estacio',
        'cidade nova', 'praca da bandeira', 'catumbi', 'rio comprido'
      ]
    }
  ],

  'niteroi': [
    {
      name: 'Praias da Baía (Zona Sul)',
      neighborhoods: [
        'icarai', 'santa rosa', 'inga', 'boa viagem', 'sao domingos', 'gragoata',
        'charitas', 'jurujuba', 'sao francisco', 'centro', 'ponta d areia', 'fatima',
        'sao lourenco', 'morro do estado'
      ]
    },
    {
      name: 'Região Oceânica',
      neighborhoods: [
        'piratininga', 'camboinhas', 'itaipu', 'itacoatiara', 'engenho do mato',
        'maravista', 'cafuba', 'santo antonio', 'serra grande', 'jacare'
      ]
    },
    {
      name: 'Região Norte',
      neighborhoods: [
        'fonseca', 'barreto', 'santana', 'engenhoca', 'tenente jardim', 'ilha da conceicao',
        'cubango', 'vicoso jardim', 'caramujo', 'baldeador', 'santa barbara'
      ]
    },
    {
      name: 'Pendotiba & Região Leste',
      neighborhoods: [
        'pendotiba', 'badu', 'cantagalo', 'ititioca', 'maceio', 'sape', 'matapaca',
        'vila progresso', 'largo da batalha', 'maria paula', 'rio do ouro', 'varzea das mocas',
        'muriqui'
      ]
    }
  ],

  'sao paulo': [
    {
      name: 'Zona Sul',
      neighborhoods: [
        'moema', 'vila mariana', 'santo amaro', 'campo belo', 'brooklin', 'itaim bibi',
        'morumbi', 'vila andrade', 'saude', 'jabaquara', 'ipiranga', 'cursino', 'sacoma',
        'cidade ademar', 'campo limpo', 'capao redondo', 'socorro', 'grajau', 'interlagos',
        'pedreira', 'cidade dutra', 'jardim sao luis', 'jardim angela', 'parelheiros'
      ]
    },
    {
      name: 'Zona Oeste',
      neighborhoods: [
        'pinheiros', 'perdizes', 'vila madalena', 'lapa', 'barra funda', 'butanta',
        'jaguare', 'rio pequeno', 'raposo tavares', 'vila leopoldina', 'alto de pinheiros',
        'jaguara', 'morro doce', 'vila sonia'
      ]
    },
    {
      name: 'Zona Norte',
      neighborhoods: [
        'santana', 'tucuruvi', 'mandaqui', 'casa verde', 'limao', 'freguesia do o',
        'brasilandia', 'jacana', 'tremembe', 'vila maria', 'vila guilherme', 'vila medeiros',
        'cachoeirinha', 'pirituba', 'jaragua', 'anhanguera', 'perus'
      ]
    },
    {
      name: 'Zona Leste',
      neighborhoods: [
        'tatuape', 'mooca', 'analia franco', 'belem', 'bras', 'penha', 'vila prudente',
        'carrao', 'vila formosa', 'agua rasa', 'aricanduva', 'itaquera', 'sao mateus',
        'sao miguel paulista', 'guaianases', 'cidade tiradentes', 'itaim paulista',
        'vila matilde', 'arthur alvim', 'ponte rasa', 'ermelino matarazzo', 'sapopemba',
        'iguatemi', 'sao rafael', 'parque do carmo', 'jose bonifacio', 'lajeado', 'vila curuca'
      ]
    },
    {
      name: 'Zona Central',
      neighborhoods: [
        'centro', 'bela vista', 'consolacao', 'republica', 'se', 'santa cecilia',
        'bom retiro', 'liberdade', 'cambuci', 'pari'
      ]
    }
  ],

  'juiz de fora': [
    {
      name: 'Zona Central',
      neighborhoods: ['centro', 'granbery', 'morro da gloria', 'santa helena', 'paineiras', 'sao mateus']
    },
    {
      name: 'Zona Sul',
      neighborhoods: ['cascatinha', 'estrela sul', 'santa luzia', 'teixeiras', 'sagrado coracao', 'dom bosco']
    },
    {
      name: 'Zona Norte',
      neighborhoods: ['benfica', 'barreira do triunfo', 'fontesville', 'francisco bernardino', 'industrial', 'santa cruz']
    },
    {
      name: 'Zona Oeste / Cidade Alta',
      neighborhoods: ['sao pedro', 'marilandia', 'aeroporto', 'santos dumont', 'novo horizonte']
    },
    {
      name: 'Zona Leste / Sudeste',
      neighborhoods: ['manoel honorio', 'bairu', 'progresso', 'santa terezinha', 'costa carvalho', 'vila ideal', 'pocinhos']
    }
  ],

  'belo horizonte': [
    {
      name: 'Centro-Sul',
      neighborhoods: ['savassi', 'lourdes', 'funcionarios', 'sion', 'ancheta', 'serra', 'cruzeiro', 'santo agostinho', 'centro']
    },
    {
      name: 'Zona Sul / Oeste',
      neighborhoods: ['buritis', 'belvedere', 'gutierrez', 'prado', 'grajau', 'estrela dalva', 'palmeiras']
    },
    {
      name: 'Zona Norte / Pampulha',
      neighborhoods: ['pampulha', 'ouro preto', 'castelo', 'itapoa', 'planalto', 'santa amelia', 'sao luiz', 'sao judas tadeu']
    },
    {
      name: 'Zona Leste / Nordeste',
      neighborhoods: ['santa efigenia', 'floresta', 'santa tereza', 'sagrada familia', 'horto', 'cidade nova', 'silveira', 'renascenca']
    },
    {
      name: 'Barreiro / Noroeste',
      neighborhoods: ['barreiro', 'padre eustaquio', 'caicara', 'carlos prates', 'monsenhor messias']
    }
  ]
};

export function getAvailableZonesForCity(cityName?: string | null): string[] {
  if (!cityName) return [];
  const normCity = normalizeString(cityName);
  const configs = CITY_ZONES[normCity];
  if (!configs) return [];
  return configs.map(c => c.name);
}

export function getZoneForNeighborhood(cityName?: string | null, neighborhoodName?: string | null): string | null {
  if (!cityName || !neighborhoodName) return null;
  const normCity = normalizeString(cityName);
  const normNeigh = normalizeString(neighborhoodName);
  const configs = CITY_ZONES[normCity];
  if (!configs) return null;

  for (const zone of configs) {
    for (const n of zone.neighborhoods) {
      if (normNeigh === n || normNeigh.includes(n) || n.includes(normNeigh)) {
        return zone.name;
      }
    }
  }
  return null;
}

export function isNeighborhoodInZone(cityName: string | undefined | null, neighborhoodName: string | undefined | null, targetZone: string): boolean {
  if (!targetZone) return true;
  if (!cityName || !neighborhoodName) return false;
  const determinedZone = getZoneForNeighborhood(cityName, neighborhoodName);
  return determinedZone === targetZone;
}

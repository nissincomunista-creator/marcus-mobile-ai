/**
 * Sistema de Geoprocessamento e Adjacência Geográfica Estrita
 * Previne contaminação cruzada entre zonas e bairros distantes no cálculo pericial de raio.
 * Bloqueia vazamento entre Zona Norte / Barra / Zona Sul e a Zona Oeste Periférica.
 */

function cleanNeighborhoodName(name?: string | null): string {
  if (!name) return '';
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[()]/g, '')
    .trim();
}

// 1. Macro-Zonas do Município do Rio de Janeiro
export const ZONA_SUL_RJ = new Set([
  'copacabana', 'leme', 'ipanema', 'leblon', 'gavea', 'sao conrado', 'vidigal', 'rocinha',
  'jardim botanico', 'lagoa', 'humaita', 'botafogo', 'urca', 'flamengo', 'catete', 'gloria',
  'laranjeiras', 'cosme velho'
]);

export const CENTRO_RJ = new Set([
  'centro', 'lapa', 'santa teresa', 'rio comprido', 'estacio', 'catumbi', 'cidade nova',
  'praca da bandeira', 'santo cristo', 'gamboa', 'saude', 'sao cristovao',
  'imperial de sao cristovao', 'vasco da gama', 'caju', 'benfica'
]);

export const GRANDE_TIJUCA_RJ = new Set([
  'tijuca', 'maracana', 'vila isabel', 'grajau', 'andarai', 'alto da boa vista'
]);

export const ZONA_NORTE_RJ = new Set([
  'meier', 'todos os santos', 'cachambi', 'engenho de dentro', 'engenho novo', 'lins de vasconcelos',
  'agua santa', 'encantado', 'piedade', 'abolicao', 'pilares', 'higienopolis', 'jacare', 'manguinhos',
  'bonsucesso', 'del castilho', 'maria da graca', 'inhauma', 'engenho da rainha', 'tomas coelho',
  'cavalcanti', 'cascadura', 'madureira', 'campinho', 'quintino bocaiuva', 'oswaldo cruz',
  'bento ribeiro', 'marechal hermes', 'turiacu', 'turiaçu', 'vaz lobo', 'rocha miranda', 'honorio gurgel',
  'ramos', 'olaria', 'penha', 'penha circular', 'braz de pina', 'bras de pina', 'cordovil',
  'parada de lucas', 'vigario geral', 'jardim america', 'vila da penha', 'vila kosmos',
  'vicente de carvalho', 'iraja', 'vista alegre', 'colegio', 'coelho neto', 'acari', 'costa barros',
  'barros filho', 'guadalupe', 'anchieta', 'parque anchieta', 'ricardo de albuquerque', 'pavuna',
  'parque columbia', 'ilha do governador', 'jardim guanabara', 'jardim carioca', 'cacuia', 'cocota',
  'taua', 'bancarios', 'freguesia ilha', 'freguesia ilha do governador', 'galeao', 'portuguesa',
  'monero', 'pitangueiras', 'zumbi', 'ribeira', 'paqueta', 'rocha', 'sampaio', 'sao francisco xavier'
]);

export const BARRA_JACAREPAGUA_RJ = new Set([
  'barra da tijuca', 'joa', 'itanhanga', 'recreio dos bandeirantes', 'recreio', 'vargem pequena',
  'vargem grande', 'camorim', 'curicica', 'cidade de deus', 'jacarepagua', 'gardenia azul',
  'anil', 'freguesia jacarepagua', 'freguesia', 'pechincha', 'tanque', 'taquara', 'praca seca',
  'vila valqueire'
]);

export const ZONA_OESTE_PERIFERICA_RJ = new Set([
  'bangu', 'padre miguel', 'realengo', 'deodoro', 'vila militar', 'magalhaes bastos',
  'senador camara', 'santissimo', 'senador vasconcelos', 'campo grande', 'inhoaiba', 'cosmos',
  'paciencia', 'santa cruz', 'sepetiba', 'guaratiba', 'ilha de guaratiba', 'pedra de guaratiba',
  'barra de guaratiba', 'grumari', 'jardim sulacap', 'sulacap', 'jabour', 'gericino'
]);

// 2. Lista Fechada de Adjacência Geográfica Real (Bairros Limítrofes Contíguos no Rio de Janeiro)
export const ADJACENT_NEIGHBORHOODS_RJ: Record<string, string[]> = {
  // Zona Oeste Periférica - Isolamento e Continuidade
  'cosmos': ['cosmos', 'inhoaiba', 'paciencia', 'campo grande', 'guaratiba'],
  'inhoaiba': ['inhoaiba', 'cosmos', 'campo grande', 'senador vasconcelos', 'guaratiba'],
  'paciencia': ['paciencia', 'cosmos', 'santa cruz', 'guaratiba', 'sepetiba'],
  'santa cruz': ['santa cruz', 'paciencia', 'sepetiba', 'guaratiba'],
  'sepetiba': ['sepetiba', 'santa cruz', 'paciencia', 'pedra de guaratiba', 'guaratiba'],
  'campo grande': ['campo grande', 'inhoaiba', 'senador vasconcelos', 'santissimo', 'guaratiba', 'cosmos', 'pedra de guaratiba'],
  'senador vasconcelos': ['senador vasconcelos', 'campo grande', 'santissimo', 'inhoaiba'],
  'santissimo': ['santissimo', 'senador vasconcelos', 'campo grande', 'senador camara'],
  'senador camara': ['senador camara', 'santissimo', 'bangu'],
  'bangu': ['bangu', 'senador camara', 'padre miguel', 'gericino'],
  'padre miguel': ['padre miguel', 'bangu', 'realengo'],
  'realengo': ['realengo', 'padre miguel', 'magalhaes bastos', 'jardim sulacap', 'sulacap'],
  'magalhaes bastos': ['magalhaes bastos', 'realengo', 'vila militar', 'jardim sulacap', 'sulacap'],
  'vila militar': ['vila militar', 'magalhaes bastos', 'deodoro', 'jardim sulacap', 'sulacap'],
  'deodoro': ['deodoro', 'vila militar', 'magalhaes bastos', 'guadalupe', 'ricardo de albuquerque', 'anchieta'],
  'jardim sulacap': ['jardim sulacap', 'sulacap', 'realengo', 'magalhaes bastos', 'vila militar', 'vila valqueire', 'taquara'],
  'sulacap': ['sulacap', 'jardim sulacap', 'realengo', 'magalhaes bastos', 'vila militar', 'vila valqueire', 'taquara'],

  // Guaratiba e Faixa Litorânea Oeste
  'guaratiba': ['guaratiba', 'pedra de guaratiba', 'ilha de guaratiba', 'barra de guaratiba', 'campo grande', 'cosmos', 'paciencia', 'santa cruz', 'recreio dos bandeirantes', 'recreio', 'vargem grande'],
  'pedra de guaratiba': ['pedra de guaratiba', 'guaratiba', 'barra de guaratiba', 'ilha de guaratiba', 'campo grande', 'sepetiba'],
  'ilha de guaratiba': ['ilha de guaratiba', 'guaratiba', 'barra de guaratiba', 'pedra de guaratiba', 'vargem grande', 'recreio dos bandeirantes', 'recreio'],
  'barra de guaratiba': ['barra de guaratiba', 'guaratiba', 'ilha de guaratiba', 'pedra de guaratiba', 'grumari', 'recreio dos bandeirantes', 'recreio'],
  'grumari': ['grumari', 'barra de guaratiba', 'recreio dos bandeirantes', 'recreio'],

  // Barra da Tijuca, Recreio e Jacarepaguá
  'recreio': ['recreio', 'recreio dos bandeirantes', 'barra da tijuca', 'vargem pequena', 'vargem grande', 'camorim', 'barra de guaratiba', 'grumari', 'guaratiba'],
  'recreio dos bandeirantes': ['recreio', 'recreio dos bandeirantes', 'barra da tijuca', 'vargem pequena', 'vargem grande', 'camorim', 'barra de guaratiba', 'grumari', 'guaratiba'],
  'barra da tijuca': ['barra da tijuca', 'recreio dos bandeirantes', 'recreio', 'joa', 'itanhanga', 'camorim', 'curicica', 'jacarepagua', 'gardenia azul', 'anil', 'sao conrado'],
  'vargem grande': ['vargem grande', 'vargem pequena', 'recreio dos bandeirantes', 'recreio', 'camorim', 'guaratiba', 'ilha de guaratiba'],
  'vargem pequena': ['vargem pequena', 'vargem grande', 'recreio dos bandeirantes', 'recreio', 'camorim'],
  'camorim': ['camorim', 'curicica', 'jacarepagua', 'vargem pequena', 'vargem grande', 'recreio dos bandeirantes', 'recreio', 'barra da tijuca'],
  'curicica': ['curicica', 'camorim', 'jacarepagua', 'taquara', 'cidade de deus', 'barra da tijuca', 'anil'],
  'cidade de deus': ['cidade de deus', 'curicica', 'taquara', 'jacarepagua', 'gardenia azul', 'freguesia jacarepagua', 'anil'],
  'gardenia azul': ['gardenia azul', 'anil', 'jacarepagua', 'barra da tijuca', 'cidade de deus', 'freguesia jacarepagua'],
  'anil': ['anil', 'jacarepagua', 'gardenia azul', 'freguesia jacarepagua', 'freguesia', 'curicica', 'taquara', 'pechincha', 'cidade de deus', 'barra da tijuca'],
  'freguesia jacarepagua': ['freguesia jacarepagua', 'freguesia', 'anil', 'pechincha', 'tanque', 'jacarepagua', 'cidade de deus'],
  'freguesia': ['freguesia', 'freguesia jacarepagua', 'anil', 'pechincha', 'tanque', 'jacarepagua', 'cidade de deus'],
  'pechincha': ['pechincha', 'freguesia jacarepagua', 'freguesia', 'tanque', 'taquara', 'anil'],
  'tanque': ['tanque', 'pechincha', 'freguesia jacarepagua', 'freguesia', 'taquara', 'praca seca'],
  'taquara': ['taquara', 'curicica', 'jacarepagua', 'tanque', 'pechincha', 'camorim', 'vargem grande', 'cidade de deus', 'praca seca', 'vila valqueire', 'jardim sulacap', 'sulacap'],
  'praca seca': ['praca seca', 'tanque', 'taquara', 'vila valqueire', 'campinho', 'cascadura'],
  'vila valqueire': ['vila valqueire', 'praca seca', 'taquara', 'campinho', 'jardim sulacap', 'sulacap'],
  'itanhanga': ['itanhanga', 'barra da tijuca', 'joa', 'alto da boa vista', 'jacarepagua'],
  'joa': ['joa', 'barra da tijuca', 'sao conrado', 'itanhanga'],
  'jacarepagua': ['jacarepagua', 'barra da tijuca', 'anil', 'gardenia azul', 'curicica', 'taquara', 'freguesia jacarepagua', 'freguesia', 'itanhanga'],

  // Grande Tijuca
  'grajau': ['grajau', 'vila isabel', 'andarai', 'tijuca', 'alto da boa vista', 'engenho novo', 'lins de vasconcelos'],
  'vila isabel': ['vila isabel', 'grajau', 'andarai', 'maracana', 'tijuca', 'engenho novo', 'sampaio', 'riachuelo'],
  'andarai': ['andarai', 'grajau', 'vila isabel', 'tijuca', 'alto da boa vista'],
  'tijuca': ['tijuca', 'maracana', 'vila isabel', 'andarai', 'alto da boa vista', 'rio comprido', 'estacio', 'praca da bandeira'],
  'maracana': ['maracana', 'tijuca', 'vila isabel', 'praca da bandeira', 'sao cristovao', 'mangueira'],
  'alto da boa vista': ['alto da boa vista', 'tijuca', 'andarai', 'grajau', 'itanhanga', 'sao conrado', 'gavea', 'jardim botanico'],

  // Zona Sul
  'copacabana': ['copacabana', 'leme', 'ipanema', 'botafogo', 'lagoa', 'humaita'],
  'leme': ['leme', 'copacabana', 'botafogo', 'urca'],
  'ipanema': ['ipanema', 'copacabana', 'leblon', 'lagoa'],
  'leblon': ['leblon', 'ipanema', 'gavea', 'lagoa', 'vidigal'],
  'gavea': ['gavea', 'leblon', 'jardim botanico', 'lagoa', 'sao conrado', 'vidigal', 'rocinha', 'alto da boa vista'],
  'sao conrado': ['sao conrado', 'gavea', 'joa', 'barra da tijuca', 'vidigal', 'rocinha', 'alto da boa vista'],
  'botafogo': ['botafogo', 'copacabana', 'humaita', 'urca', 'flamengo', 'laranjeiras', 'cosme velho'],
  'humaita': ['humaita', 'botafogo', 'copacabana', 'lagoa', 'jardim botanico'],
  'jardim botanico': ['jardim botanico', 'humaita', 'lagoa', 'gavea', 'alto da boa vista'],
  'lagoa': ['lagoa', 'copacabana', 'ipanema', 'leblon', 'gavea', 'jardim botanico', 'humaita'],
  'flamengo': ['flamengo', 'botafogo', 'catete', 'gloria', 'laranjeiras'],
  'catete': ['catete', 'flamengo', 'gloria', 'laranjeiras', 'santa teresa'],
  'gloria': ['gloria', 'catete', 'flamengo', 'santa teresa', 'lapa', 'centro'],
  'laranjeiras': ['laranjeiras', 'flamengo', 'catete', 'cosme velho', 'botafogo', 'santa teresa'],
  'cosme velho': ['cosme velho', 'laranjeiras', 'botafogo', 'santa teresa', 'alto da boa vista'],
  'urca': ['urca', 'botafogo', 'leme'],
  'vidigal': ['vidigal', 'leblon', 'sao conrado', 'gavea'],
  'rocinha': ['rocinha', 'sao conrado', 'gavea', 'vidigal'],

  // Centro
  'centro': ['centro', 'lapa', 'santa teresa', 'estacio', 'cidade nova', 'santo cristo', 'gamboa', 'saude', 'gloria', 'praca da bandeira'],
  'lapa': ['lapa', 'centro', 'santa teresa', 'gloria', 'estacio', 'cidade nova'],
  'santa teresa': ['santa teresa', 'centro', 'lapa', 'gloria', 'catete', 'laranjeiras', 'cosme velho', 'rio comprido', 'catumbi', 'estacio'],
  'rio comprido': ['rio comprido', 'santa teresa', 'catumbi', 'estacio', 'praca da bandeira', 'tijuca'],
  'estacio': ['estacio', 'centro', 'cidade nova', 'praca da bandeira', 'rio comprido', 'catumbi', 'santa teresa', 'tijuca'],
  'cidade nova': ['cidade nova', 'centro', 'estacio', 'praca da bandeira', 'sao cristovao', 'santo cristo'],
  'praca da bandeira': ['praca da bandeira', 'tijuca', 'maracana', 'sao cristovao', 'cidade nova', 'estacio', 'rio comprido'],
  'sao cristovao': ['sao cristovao', 'imperial de sao cristovao', 'maracana', 'praca da bandeira', 'cidade nova', 'santo cristo', 'caju', 'benfica', 'manguinhos'],
  'imperial de sao cristovao': ['imperial de sao cristovao', 'sao cristovao', 'maracana', 'praca da bandeira', 'cidade nova', 'santo cristo', 'caju', 'benfica', 'manguinhos'],
  'santo cristo': ['santo cristo', 'gamboa', 'saude', 'centro', 'cidade nova', 'sao cristovao', 'caju'],
  'gamboa': ['gamboa', 'saude', 'santo cristo', 'centro'],
  'saude': ['saude', 'gamboa', 'santo cristo', 'centro']
};

/**
 * Verifica se dois bairros são geograficamente contíguos ou compatíveis.
 * Bloqueia contaminação cruzada entre regiões distintas (ex: Grajaú/Recreio em Cosmos).
 */
export function isNeighborhoodCompatible(
  targetNeighborhood?: string | null,
  candidateNeighborhood?: string | null,
  cityName?: string | null
): boolean {
  if (!targetNeighborhood || !candidateNeighborhood) return true;

  const tClean = cleanNeighborhoodName(targetNeighborhood);
  const cClean = cleanNeighborhoodName(candidateNeighborhood);

  if (!tClean || !cClean) return true;
  if (tClean === cClean) return true;
  if (tClean.includes(cClean) || cClean.includes(tClean)) return true;

  const isRJ = !cityName || cleanNeighborhoodName(cityName).includes('rio de janeiro');
  if (isRJ) {
    // 1. Bloqueio Macro-Zonal Estrito para Zona Oeste Periférica
    // (Cosmos, Inhoaíba, Paciência, Campo Grande, Santa Cruz NUNCA podem receber dados da Zona Norte, Sul, Centro ou Jacarepaguá)
    const isTargetPeripheral = ZONA_OESTE_PERIFERICA_RJ.has(tClean);
    const isCandidatePeripheral = ZONA_OESTE_PERIFERICA_RJ.has(cClean);

    if (isTargetPeripheral !== isCandidatePeripheral) {
      // Exceção única de fronteira marítima/montanhosa: Guaratiba / Recreio / Vargem Grande
      const isGuaratibaBorderTarget = (tClean === 'guaratiba' || tClean === 'ilha de guaratiba' || tClean === 'barra de guaratiba');
      const isGuaratibaBorderCandidate = (cClean === 'recreio' || cClean === 'recreio dos bandeirantes' || cClean === 'vargem grande');
      const isCandidateBorderTarget = (cClean === 'guaratiba' || cClean === 'ilha de guaratiba' || cClean === 'barra de guaratiba');
      const isTargetBorderCandidate = (tClean === 'recreio' || tClean === 'recreio dos bandeirantes' || tClean === 'vargem grande');

      const isAllowedBorder = (isGuaratibaBorderTarget && isGuaratibaBorderCandidate) ||
                              (isCandidateBorderTarget && isTargetBorderCandidate);

      if (!isAllowedBorder) {
        return false;
      }
    }

    // 2. Bloqueio Macro-Zonal entre Zona Sul e Zona Norte/Centro
    const isTargetSouth = ZONA_SUL_RJ.has(tClean);
    const isCandidateNorth = ZONA_NORTE_RJ.has(cClean) || GRANDE_TIJUCA_RJ.has(cClean);
    if ((isTargetSouth && isCandidateNorth) || (ZONA_SUL_RJ.has(cClean) && (ZONA_NORTE_RJ.has(tClean) || GRANDE_TIJUCA_RJ.has(tClean)))) {
      return false;
    }

    // 3. Verificação na Lista Fechada de Adjacência Geográfica Real
    const targetNeighbors = ADJACENT_NEIGHBORHOODS_RJ[tClean];
    if (targetNeighbors && targetNeighbors.includes(cClean)) {
      return true;
    }

    const candidateNeighbors = ADJACENT_NEIGHBORHOODS_RJ[cClean];
    if (candidateNeighbors && candidateNeighbors.includes(tClean)) {
      return true;
    }

    // Se ambos estão definidos e não são adjacentes registrados, rejeita a inclusão radial
    if (targetNeighbors || candidateNeighbors) {
      return false;
    }
  }

  return true;
}

import { AuctionProperty } from '../types.ts';
import streetCoordsRaw from './streetCoordsData.json';

const streetCoords = streetCoordsRaw as Record<string, { lat: number; lng: number }>;

export function normalizeGeoString(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// 1. Municipalities Coordinates (RJ, SP, MG)
export const CITY_COORDS: Record<string, [number, number]> = {
  // RJ
  'rio de janeiro': [-22.9068, -43.1729],
  'niteroi': [-22.8859, -43.1153],
  'sao goncalo': [-22.8268, -43.0537],
  'duque de caxias': [-22.7856, -43.3115],
  'nova iguacu': [-22.7565, -43.4607],
  'belford roxo': [-22.7636, -43.3995],
  'sao joao de meriti': [-22.8042, -43.3728],
  'nilopolis': [-22.8064, -43.4144],
  'mesquita': [-22.7831, -43.4283],
  'queimados': [-22.7153, -43.5550],
  'itaborai': [-22.7444, -42.8594],
  'marica': [-22.9194, -42.8186],
  'itaguai': [-22.8683, -43.7758],
  'seropedica': [-22.7447, -43.7083],
  'japeri': [-22.6444, -43.6631],
  'paracambi': [-22.6089, -43.7125],
  'mangaratiba': [-22.9597, -44.0408],
  'angra dos reis': [-23.0067, -44.3181],
  'paraty': [-23.2178, -44.7131],
  'petropolis': [-22.5050, -43.1789],
  'teresopolis': [-22.4125, -42.9664],
  'nova friburgo': [-22.2889, -42.5344],
  'cabo frio': [-22.8797, -42.0189],
  'armacao dos buzios': [-22.7469, -41.8817],
  'buzios': [-22.7469, -41.8817],
  'arraial do cabo': [-22.9661, -42.0278],
  'saquarema': [-22.9208, -42.5103],
  'araruama': [-22.8733, -42.3431],
  'sao pedro da aldeia': [-22.8417, -42.1039],
  'iguaba grande': [-22.8417, -42.1867],
  'rio das ostras': [-22.5269, -41.9450],
  'macae': [-22.3768, -41.7869],
  'campos dos goytacazes': [-21.7622, -41.3283],
  'volta redonda': [-22.5231, -44.1042],
  'barra mansa': [-22.5442, -44.1714],
  'resende': [-22.4697, -44.4469],
  'barra do pirai': [-22.4708, -43.8256],
  'valenca': [-22.2458, -43.7031],
  'tres rios': [-22.1167, -43.2089],
  'paraiba do sul': [-22.1611, -43.2928],
  'cachoeiras de macacu': [-22.4631, -42.6531],
  'rio bonito': [-22.7058, -42.6289],
  'casimiro de abreu': [-22.4819, -42.2044],
  'tangua': [-22.7308, -42.7156],
  'itaperuna': [-21.2056, -41.8875],
  'mage': [-22.6531, -43.0408],
  'guapimirim': [-22.5367, -42.9819],

  // SP
  'sao paulo': [-23.5505, -46.6333],
  'campinas': [-22.9099, -47.0626],
  'santos': [-23.9608, -46.3336],
  'praia grande': [-24.0058, -46.4028],
  'sao vicente': [-23.9631, -46.3919],
  'guaruja': [-23.9931, -46.2564],
  'santo andre': [-23.6639, -46.5383],
  'sao bernardo do campo': [-23.6944, -46.5653],
  'sao caetano do sul': [-23.6228, -46.5544],
  'diadema': [-23.6864, -46.6228],
  'osasco': [-23.5325, -46.7917],
  'guarulhos': [-23.4542, -46.5333],
  'barueri': [-23.5111, -46.8761],
  'santana de parnaiba': [-23.4442, -46.9189],
  'cotia': [-23.6039, -46.9189],
  'sorocaba': [-23.5017, -47.4581],
  'jundiai': [-23.1858, -46.8978],
  'ribeirao preto': [-21.1704, -47.8103],
  'sao jose dos campos': [-23.2237, -45.9009],
  'taubate': [-23.0264, -45.5553],
  'piracicaba': [-22.7253, -47.6492],
  'bauru': [-22.3147, -49.0606],
  'sao jose do rio preto': [-20.8114, -49.3758],
  'franca': [-20.5386, -47.4008],
  'limeira': [-22.5647, -47.4017],
  'sumare': [-22.8219, -47.2667],
  'americana': [-22.7394, -47.3314],
  'hortolandia': [-22.8583, -47.2200],
  'indaiatuba': [-23.0903, -47.2181],
  'valinhos': [-22.9706, -46.9958],
  'vinhedo': [-23.0297, -46.9831],
  'suzano': [-23.5425, -46.3108],
  'mogi das cruzes': [-23.5206, -46.1856],
  'araraquara': [-21.7944, -48.1758],
  'marilia': [-22.2139, -49.9458],
  'jaboticabal': [-21.2556, -48.3208],
  'votuporanga': [-20.4228, -49.9728],
  'presidente prudente': [-22.1256, -51.3889],
  'aracatuba': [-21.2089, -50.4406],
  "santa barbara d'oeste": [-22.7547, -47.4144],

  // MG
  'belo horizonte': [-19.9167, -43.9345],
  'uberlandia': [-18.9186, -48.2772],
  'uberaba': [-19.7472, -47.9392],
  'juiz de fora': [-21.7642, -43.3503],
  'contagem': [-19.9386, -44.0536],
  'betim': [-19.9678, -44.1983],
  'ribeirao das neves': [-19.7672, -44.0869],
  'governador valadares': [-18.8511, -41.9494],
  'ipatinga': [-19.4681, -42.5367],
  'montes claros': [-16.7281, -43.8617],
  'pocos de caldas': [-21.7878, -46.5681],
  'divinopolis': [-20.1439, -44.8889],
  'esmeraldas': [-19.7622, -44.3139]
};

// 2. Exact Bairros of Rio de Janeiro City (109 Bairros)
export const RIO_DE_JANEIRO_BAIRROS: Record<string, [number, number]> = {
  // Zona Sul
  'copacabana': [-22.9698, -43.1864],
  'leme': [-22.9620, -43.1670],
  'ipanema': [-22.9836, -43.2045],
  'leblon': [-22.9856, -43.2230],
  'gavea': [-22.9790, -43.2340],
  'sao conrado': [-22.9920, -43.2680],
  'vidigal': [-22.9930, -43.2420],
  'rocinha': [-22.9880, -43.2480],
  'jardim botanico': [-22.9680, -43.2260],
  'lagoa': [-22.9720, -43.2070],
  'humaita': [-22.9575, -43.2000],
  'botafogo': [-22.9519, -43.1856],
  'urca': [-22.9554, -43.1647],
  'flamengo': [-22.9376, -43.1764],
  'catete': [-22.9260, -43.1795],
  'gloria': [-22.9210, -43.1770],
  'laranjeiras': [-22.9333, -43.1917],
  'cosme velho': [-22.9410, -43.1980],

  // Centro
  'centro': [-22.9035, -43.1813],
  'lapa': [-22.9129, -43.1810],
  'santa teresa': [-22.9250, -43.1930],
  'rio comprido': [-22.9230, -43.2100],
  'estacio': [-22.9140, -43.2060],
  'catumbi': [-22.9170, -43.1980],
  'cidade nova': [-22.9100, -43.2040],
  'praca da bandeira': [-22.9100, -43.2160],
  'santo cristo': [-22.8990, -43.1990],
  'gamboa': [-22.8970, -43.1920],
  'saude': [-22.8960, -43.1830],
  'imperial de sao cristovao': [-22.9020, -43.2240],
  'sao cristovao': [-22.9020, -43.2240],
  'vasco da gama': [-22.8930, -43.2280],
  'caju': [-22.8850, -43.2150],
  'benfica': [-22.8920, -43.2360],

  // Grande Tijuca
  'maracana': [-22.9122, -43.2300],
  'vila isabel': [-22.9167, -43.2500],
  'grajau': [-22.9222, -43.2639],
  'andarai': [-22.9270, -43.2530],
  'tijuca': [-22.9329, -43.2386],
  'alto da boa vista': [-22.9630, -43.2750],

  // Grande Méier
  'sao francisco xavier': [-22.9080, -43.2430],
  'rocha': [-22.9040, -43.2500],
  'riachuelo': [-22.9050, -43.2570],
  'sampaio': [-22.9060, -43.2630],
  'engenho novo': [-22.9056, -43.2722],
  'lins de vasconcelos': [-22.9160, -43.2840],
  'meier': [-22.9010, -43.2800],
  'todos os santos': [-22.8980, -43.2840],
  'cachambi': [-22.8917, -43.2778],
  'engenho de dentro': [-22.8972, -43.2972],
  'agua santa': [-22.9080, -43.3080],
  'encantado': [-22.9010, -43.3040],
  'piedade': [-22.8917, -43.3083],
  'abolicao': [-22.8890, -43.2980],
  'pilares': [-22.8830, -43.2920],

  // Inhaúma, Del Castilho e Região
  'higienopolis': [-22.8710, -43.2620],
  'jacare': [-22.8900, -43.2560],
  'manguinhos': [-22.8810, -43.2510],
  'bonsucesso': [-22.8667, -43.2556],
  'del castilho': [-22.8778, -43.2722],
  'maria da graca': [-22.8840, -43.2680],
  'inhauma': [-22.8730, -43.2860],
  'engenho da rainha': [-22.8670, -43.2980],
  'tomas coelho': [-22.8650, -43.3080],
  'cavalcanti': [-22.8690, -43.3160],

  // Madureira e Cascadura
  'cascadura': [-22.8806, -43.3250],
  'madureira': [-22.8760, -43.3360],
  'campinho': [-22.8861, -43.3444],
  'quintino bocaiuva': [-22.8880, -43.3180],
  'oswaldo cruz': [-22.8690, -43.3490],
  'bento ribeiro': [-22.8680, -43.3600],
  'marechal hermes': [-22.8620, -43.3720],
  'turiacu': [-22.8640, -43.3390],
  'vaz lobo': [-22.8580, -43.3260],
  'rocha miranda': [-22.8528, -43.3472],
  'honorio gurgel': [-22.8460, -43.3550],

  // Leopoldina e Penha
  'ramos': [-22.8556, -43.2556],
  'olaria': [-22.8444, -43.2667],
  'penha': [-22.8444, -43.2778],
  'penha circular': [-22.8361, -43.2889],
  'bras de pina': [-22.8278, -43.3000],
  'braz de pina': [-22.8278, -43.3000],
  'cordovil': [-22.8278, -43.3111],
  'parada de lucas': [-22.8194, -43.3167],
  'vigario geral': [-22.8139, -43.3111],
  'jardim america': [-22.8120, -43.3220],
  'vila da penha': [-22.8460, -43.3100],
  'vila kosmos': [-22.8530, -43.3070],
  'vicente de carvalho': [-22.8550, -43.3120],
  'iraja': [-22.8333, -43.3278],
  'vista alegre': [-22.8340, -43.3130],
  'colegio': [-22.8450, -43.3350],
  'coelho neto': [-22.8333, -43.3444],
  'acari': [-22.8230, -43.3420],
  'costa barros': [-22.8250, -43.3550],
  'barros filho': [-22.8360, -43.3580],
  'guadalupe': [-22.8390, -43.3750],
  'anchieta': [-22.8220, -43.3980],
  'parque anchieta': [-22.8320, -43.4020],
  'ricardo de albuquerque': [-22.8400, -43.4000],
  'pavuna': [-22.8111, -43.3667],
  'parque columbia': [-22.8180, -43.3350],

  // Barra, Recreio e Jacarepaguá
  'barra da tijuca': [-23.0004, -43.3658],
  'joa': [-23.0120, -43.2920],
  'itanhanga': [-22.9890, -43.3060],
  'recreio dos bandeirantes': [-23.0180, -43.4650],
  'recreio': [-23.0180, -43.4650],
  'vargem pequena': [-22.9972, -43.4500],
  'vargem grande': [-23.0083, -43.4917],
  'camorim': [-22.9778, -43.4111],
  'curicica': [-22.9694, -43.3861],
  'cidade de deus': [-22.9480, -43.3620],
  'jacarepagua': [-22.9680, -43.3400],
  'gardenia azul': [-22.9620, -43.3480],
  'anil': [-22.9583, -43.3361],
  'freguesia (jacarepagua)': [-22.9417, -43.3417],
  'freguesia jacarepagua': [-22.9417, -43.3417],
  'freguesia': [-22.9417, -43.3417],
  'pechincha': [-22.9333, -43.3583],
  'tanque': [-22.9190, -43.3570],
  'taquara': [-22.9222, -43.3694],
  'praca seca': [-22.8944, -43.3556],
  'vila valqueire': [-22.8889, -43.3667],

  // Ilha do Governador e Paquetá
  'ilha do governador': [-22.8130, -43.2010],
  'jardim guanabara': [-22.8058, -43.2042],
  'jardim carioca': [-22.8090, -43.2090],
  'cacuia': [-22.8170, -43.1950],
  'cocota': [-22.8190, -43.1890],
  'taua': [-22.8030, -43.1860],
  'bancarios': [-22.7960, -43.1780],
  'freguesia (ilha do governador)': [-22.7920, -43.1710],
  'freguesia ilha': [-22.7920, -43.1710],
  'freg n s d ajuda': [-22.7920, -43.1710],
  'galeao': [-22.8150, -43.2420],
  'portuguesa': [-22.8020, -43.2080],
  'monero': [-22.7980, -43.2020],
  'pitangueiras': [-22.8220, -43.1840],
  'zumbi': [-22.8240, -43.1790],
  'ribeira': [-22.8260, -43.1740],
  'paqueta': [-22.7600, -43.1070],

  // Zona Oeste - Bangu, Campo Grande, Santa Cruz
  'deodoro': [-22.8560, -43.3780],
  'vila militar': [-22.8630, -43.4030],
  'magalhaes bastos': [-22.8730, -43.4180],
  'realengo': [-22.8789, -43.4328],
  'padre miguel': [-22.8780, -43.4480],
  'bangu': [-22.8753, -43.4678],
  'senador camara': [-22.8840, -43.4920],
  'santissimo': [-22.8910, -43.5210],
  'senador vasconcelos': [-22.8980, -43.5350],
  'campo grande': [-22.9036, -43.5583],
  'inhoaiba': [-22.9080, -43.5850],
  'cosmos': [-22.9056, -43.6192],
  'paciencia': [-22.8989, -43.6417],
  'santa cruz': [-22.9169, -43.6847],
  'sepetiba': [-22.9722, -43.7028],
  'guaratiba': [-22.9989, -43.5978],
  'ilha de guaratiba': [-23.0110, -43.5580],
  'pedra de guaratiba': [-22.9970, -43.6330],
  'barra de guaratiba': [-23.0670, -43.5650],
  'grumari': [-23.0480, -43.5250],
  'jardim sulacap': [-22.8890, -43.3980],
  'sulacap': [-22.8890, -43.3980]
};

// 3. São Gonçalo Bairros
export const SAO_GONCALO_BAIRROS: Record<string, [number, number]> = {
  'centro': [-22.8270, -43.0530],
  'alcantara': [-22.8180, -43.0080],
  'jardim catarina': [-22.8120, -43.0020],
  'tribobo': [-22.8420, -43.0450],
  'mutondo': [-22.8330, -43.0330],
  'ze garoto': [-22.8250, -43.0480],
  'itauna': [-22.8090, -43.0420],
  'neves': [-22.8590, -43.0890],
  'santa catarina': [-22.8390, -43.0180],
  'trindade': [-22.8150, -43.0350],
  'barro vermelho': [-22.8460, -43.0370],
  'porto da pedra': [-22.8190, -43.0610],
  'gradim': [-22.8140, -43.0780],
  'laranjal': [-22.8020, -43.0050],
  'vista alegre': [-22.8050, -43.0190],
  'pacheco': [-22.8520, -43.0230],
  'bom retiro': [-22.7830, -42.9850],
  'monjolos': [-22.7960, -42.9960],
  'coelho': [-22.8280, -43.0230],
  'marambaia': [-22.7840, -42.9460],
  'maria paula': [-22.8710, -43.0480],
  'pe pequeno': [-22.8320, -43.0420],
  'arsenal': [-22.8680, -43.0280],
  'patronato': [-22.8350, -43.0620],
  'paraiso': [-22.8420, -43.0710]
};

// 4. Niterói Bairros
export const NITEROI_BAIRROS: Record<string, [number, number]> = {
  'centro': [-22.8833, -43.1167],
  'icarai': [-22.9064, -43.1111],
  'inga': [-22.9030, -43.1250],
  'santa rosa': [-22.9028, -43.1000],
  'sao francisco': [-22.9222, -43.0944],
  'charitas': [-22.9306, -43.0972],
  'jurujuba': [-22.9390, -43.1080],
  'fonseca': [-22.8800, -43.0890],
  'barreto': [-22.8680, -43.1060],
  'itaipu': [-22.9667, -43.0444],
  'piratininga': [-22.9556, -43.0667],
  'camboinhas': [-22.9611, -43.0556],
  'itacoatiara': [-22.9730, -43.0310],
  'pendotiba': [-22.9150, -43.0620],
  'badu': [-22.9220, -43.0540],
  'mataruna': [-22.9180, -43.0580]
};

// 5. Nova Iguaçu Bairros
export const NOVA_IGUACU_BAIRROS: Record<string, [number, number]> = {
  'centro': [-22.7565, -43.4607],
  'cabucu': [-22.7840, -43.5130],
  'ponto chic': [-22.7480, -43.4860],
  'campo alegre': [-22.7750, -43.5420],
  'ipiranga': [-22.7720, -43.5280],
  'lagoinha': [-22.7680, -43.5180],
  'jardim palmares': [-22.7790, -43.5350],
  'marapicu': [-22.8120, -43.5680],
  'palhada': [-22.7610, -43.5020],
  'austin': [-22.7230, -43.5180],
  'comendador soares': [-22.7380, -43.4850],
  'posse': [-22.7420, -43.4420],
  'rancho novo': [-22.7590, -43.4470],
  'ceramica': [-22.7510, -43.4350]
};

// 6. Itaboraí Bairros
export const ITABORAI_BAIRROS: Record<string, [number, number]> = {
  'centro': [-22.7444, -42.8594],
  'venda das pedras': [-22.7310, -42.8420],
  'caluge': [-22.7580, -42.8480],
  'novo horizonte (manilha)': [-22.7380, -42.9320],
  'manilha': [-22.7380, -42.9320],
  'outeiro das pedras': [-22.7490, -42.8680],
  'itambi': [-22.7410, -42.9810],
  'morada do sol i (itambi)': [-22.7410, -42.9810],
  'areal': [-22.7520, -42.8750]
};

// 7. Belford Roxo Bairros
export const BELFORD_ROXO_BAIRROS: Record<string, [number, number]> = {
  'centro': [-22.7636, -43.3995],
  'sao vicente': [-22.7480, -43.3850],
  'bom pastor': [-22.7390, -43.3760],
  'areia branca': [-22.7520, -43.4120],
  'vila dagmar': [-22.7610, -43.3880],
  'shangri-la': [-22.7290, -43.4020]
};

// 8. Duque de Caxias Bairros
export const DUQUE_DE_CAXIAS_BAIRROS: Record<string, [number, number]> = {
  'centro': [-22.7856, -43.3115],
  'jardim gramacho': [-22.7690, -43.2620],
  'jardim vinte e cinco de agosto': [-22.7880, -43.3080],
  'parque duque': [-22.7950, -43.2980],
  'parque paulista': [-22.6980, -43.2680],
  'vila centenario': [-22.7750, -43.3020],
  'olavo bilac': [-22.7780, -43.3250],
  'saracuruna': [-22.6820, -43.2640]
};

export function getPropertyCoordinates(prop: AuctionProperty): [number, number] | null {
  // Nunca exibir uma coordenada que o pipeline já marcou como não confiável.
  if (prop.precisa_revisao || prop.status_geocodificacao === 'PENDENTE_REVISAO') {
    return null;
  }

  const uf = (prop.state || 'RJ').toLowerCase().trim();
  const cityNorm = normalizeGeoString(prop.city);
  const neighNorm = normalizeGeoString(prop.neighborhood);

  let streetHit: { lat: number; lng: number } | null = null;

  if (prop.address) {
    const rawAddr = prop.address.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    let cleanStreet = rawAddr.split(',')[0].trim();
    cleanStreet = cleanStreet.replace(/\b(n[ºo°.]?|\d+).*$/, '').trim();
    cleanStreet = cleanStreet.replace(/^r\.\s*/, 'rua ').replace(/^av\.\s*/, 'avn ').replace(/^est\.\s*/, 'etr ');
    cleanStreet = cleanStreet.replace(/^trav\.\s*/, 'trv ').replace(/^pca\.\s*/, 'prc ');

    // Try exact street key with bairro
    const kWithBairro = `${uf}_${cityNorm}_${neighNorm}_${cleanStreet}`;
    if (streetCoords[kWithBairro] && streetCoords[kWithBairro].lat !== 0) {
      streetHit = streetCoords[kWithBairro];
    }
  }

  // Coordenadas já resolvidas pelo geocoder predial ou pela base oficial têm
  // precedência. Não as "corrigimos" por uma estimativa de eixo de rua.
  if (prop.lat && prop.lng && !isNaN(prop.lat) && !isNaN(prop.lng) && prop.lat !== 0 && prop.lng !== 0) {
    return [
      Number(prop.lat.toFixed(6)),
      Number(prop.lng.toFixed(6))
    ];
  }

  // Sem coordenada predial, a única alternativa visual permitida é o eixo da
  // mesma rua, na mesma cidade e no mesmo bairro. Não há interpolação inventada
  // por número nem busca frouxa por uma rua homônima em outro bairro.
  if (streetHit) {
    return [
      Number(streetHit.lat.toFixed(6)),
      Number(streetHit.lng.toFixed(6))
    ];
  }

  // ETAPA 3: Bloqueio Rigoroso de Falsa Precisão (Regra de Ouro)
  return null;
}

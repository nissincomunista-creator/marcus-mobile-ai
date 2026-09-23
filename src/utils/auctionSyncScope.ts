export const SYNC_TARGETS = [
 {city:'Rio de Janeiro',state:'RJ',ibge:'3304557',slug:'rio-de-janeiro'},
 {city:'Niterói',state:'RJ',ibge:'3303302',slug:'niteroi'},
 {city:'Juiz de Fora',state:'MG',ibge:'3136702',slug:'juiz-de-fora'},
];
export const SYNC_SOURCE_IDS = 'rogeriomenezes leilaoimovel joaoemilio biasi silas portella rioleiloes alexandro paulobotelho jv depaula rymer megaleiloes ayupp portalzuk saraiva sold schulmann comprei pestana onildo gustavo mgl leiloei bb emgea santander vitrinebradesco ricart pamela facanha frazao leilaovip freitas'.split(' ');
export const normalizeAuctionText = (value: string) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export const allowedSyncLocation = (city: string, state: string) => SYNC_TARGETS.some(target => target.state === state && normalizeAuctionText(city) === normalizeAuctionText(target.city));

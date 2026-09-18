const fs=require('fs');const f='src/components/RealValueCalculator.tsx';let s=fs.readFileSync(f,'utf8');fs.copyFileSync(f,'C:/Users/Marcus/Documents/Codex/2026-09-13/quero-que-foque-em-2-coisas/work/calculator-before-selectors.tsx');
s="import { locationOptions, selectOfficialOption, normalizeLocationOption } from '../utils/locationOptions.ts';\n"+s;
s=s.replace("useState(prefillData?.state || 'RJ')","useState('')").replace("useState(prefillData?.city || 'Rio de Janeiro')","useState('')").replace("useState(prefillData?.neighborhood || '')","useState('')").replace("useState(initialAddr.street || '')","useState('')");
let a=s.indexOf('  // Extract unique neighborhoods');let b=s.indexOf('  const prefillInitializedRef',a);
s=s.slice(0,a)+`  const officialOptions = useMemo(() => locationOptions(itbiStats, selectedState, selectedCity), [itbiStats, selectedState, selectedCity]);
  const neighborhoodsList = officialOptions.neighborhoods;
  const cityStats = useMemo(() => itbiStats.filter(row => normalizeLocationOption(row.state) === normalizeLocationOption(selectedState) && normalizeLocationOption(row.city) === normalizeLocationOption(selectedCity)), [itbiStats, selectedState, selectedCity]);
  const locationPrefillRef = useRef('');
  const [locationNotice, setLocationNotice] = useState('');
  useEffect(() => {
    if (!itbiStats.length) return;
    const identity = JSON.stringify([prefillData?.id, prefillData?.address, prefillData?.state, prefillData?.city, prefillData?.neighborhood]);
    if (locationPrefillRef.current === identity) return;
    locationPrefillRef.current = identity;
    const states = locationOptions(itbiStats).states;
    const state = selectOfficialOption(prefillData?.state || 'RJ', states);
    const cities = locationOptions(itbiStats, state).cities;
    const city = selectOfficialOption(prefillData?.city || (!prefillData ? 'Rio de Janeiro' : ''), cities);
    const neighborhoods = locationOptions(itbiStats, state, city).neighborhoods;
    const neighborhood = selectOfficialOption(prefillData?.neighborhood, neighborhoods);
    setSelectedState(state); setSelectedCity(city);
    setSelectedNeighborhood(neighborhood); setNeighborhoodInput(neighborhood);
    setSelectedStreet(''); setStreetInput('');
    setLocationNotice(!state || !city ? 'Cidade do anúncio não encontrada na base importada. Selecione uma cidade cadastrada.' : prefillData && !neighborhood ? 'Bairro do anúncio não confirmado. Buscando o logradouro na cidade selecionada.' : '');
    if (!city || !state || neighborhood || !prefillData?.address) return;
    const controller = new AbortController();
    const query = new URLSearchParams({state,city,street:parseAddressComponents(prefillData.address).street});
    fetch('/api/itbi/resolve-street?' + query, {signal:controller.signal}).then(r => r.json()).then(result => {
      if (controller.signal.aborted) return;
      const officialNeighborhood = selectOfficialOption(result.neighborhood, neighborhoods);
      if (result.found && officialNeighborhood) {
        setSelectedNeighborhood(officialNeighborhood); setNeighborhoodInput(officialNeighborhood);
        setLocationNotice('');
      } else setLocationNotice('Bairro não confirmado na base desta cidade. Selecione uma opção cadastrada para calcular.');
    }).catch(error => { if (error.name !== 'AbortError') setLocationNotice('Selecione o bairro na lista da cidade para calcular.'); });
    return () => controller.abort();
  }, [prefillData, itbiStats]);

`+s.slice(b);
a=s.indexOf('    if (prefillData.state) setSelectedState');b=s.indexOf('    if (prefillData.propertyType)',a);
s=s.slice(0,a)+`    if (prefillData.address) setStreetNumber(parseAddressComponents(prefillData.address).number || '');
`+s.slice(b);
s=s.replace("const cities = newState === 'RJ' ? ['Rio de Janeiro'] : newState === 'SP' ? ['São Paulo'] : ['Juiz de Fora', 'Santos Dumont'];\n                    setSelectedCity(cities[0]);", "setSelectedCity('');\n                    setLocationNotice('Selecione a cidade e o bairro cadastrados.');");
a=s.indexOf('                  <option value="RJ">RJ - Rio de Janeiro</option>');b=s.indexOf('                </select>',a);s=s.slice(0,a)+`                  <option value="">Selecione a UF</option>
                  {officialOptions.states.map(state => <option key={state} value={state}>{state}</option>)}
`+s.slice(b);
a=s.indexOf("                  {selectedState === 'RJ' && (");b=s.indexOf('                </select>',a);s=s.slice(0,a)+`                  <option value="">Selecione a cidade</option>
                  {officialOptions.cities.map(city => <option key={city} value={city}>{city}</option>)}
`+s.slice(b);
s=s.replace('                  setSelectedNeighborhood(val);',"                  setSelectedNeighborhood('');\n                  setSelectedStreet('');").replace('                  setSelectedStreet(val);',"                  setSelectedStreet('');");
s=s.replace('            {/* Autocomplete Neighborhood */}',`            {locationNotice && <p role="status" className="text-xs text-amber-300">{locationNotice}</p>}
            {/* Autocomplete Neighborhood */}`);
s=s.replace('                          setSelectedNeighborhood(nb);',"                          setLocationNotice('');\n                          setSelectedNeighborhood(nb);");
s=s.replaceAll('itbiStats.find(', 'cityStats.find(').replaceAll('itbiStats.map(s => s.averageValueSqm)', 'cityStats.map(s => s.averageValueSqm)');
s=s.replace('selectedNeighborhood, itbiStats, propertyType]', 'selectedNeighborhood, cityStats, propertyType]').replace('propertyType, itbiStats, sizeSqm','propertyType, cityStats, sizeSqm');
s=s.replace('  const neighborhoodStats = useMemo(() => {',"  const neighborhoodStats = useMemo(() => {\n    if (!selectOfficialOption(selectedNeighborhood, neighborhoodsList)) return null;");
s=s.replace('  const nearbyStats = useMemo(() => {',"  const nearbyStats = useMemo(() => {\n    if (!selectOfficialOption(selectedNeighborhood, neighborhoodsList)) return {avgSqm:0,medianSqm:0,count:0,source:'Selecione um bairro cadastrado'} as any;");
// Cancel obsolete municipality requests and clear old transaction evidence immediately.
s=s.replace("    const controller = new AbortController();\n\n    async function loadTransactions()", "    const controller = new AbortController();\n    setRawTransactions([]);\n\n    async function loadTransactions()");
s=s.replace("    async function loadStreets() {", "    const controller = new AbortController();\n    setStreetsList([]);\n    setSelectedStreet('');\n    async function loadStreets() {");
s=s.replace('fetch(`/api/itbi/streets?state=${selectedState}&city=${selectedCity}&neighborhood=${encodeURIComponent(selectedNeighborhood)}`)', 'fetch(`/api/itbi/streets?state=${selectedState}&city=${encodeURIComponent(selectedCity)}&neighborhood=${encodeURIComponent(selectedNeighborhood)}`, {signal: controller.signal})');
s=s.replace('          setStreetsList(data);', '          if (controller.signal.aborted) return;\n          setStreetsList(data);');
s=s.replace('if (resolved.found && resolved.neighborhood && cleanNeighborhood(resolved.neighborhood)', 'if (!controller.signal.aborted && resolved.found && selectOfficialOption(resolved.neighborhood, neighborhoodsList) && cleanNeighborhood(resolved.neighborhood)');
s=s.replace('    loadStreets();\n  }, [selectedNeighborhood', '    loadStreets();\n    return () => controller.abort();\n  }, [selectedNeighborhood');
fs.writeFileSync(f,s);

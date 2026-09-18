const fs=require('fs');const f='src/components/RealValueCalculator.tsx';let s=fs.readFileSync(f,'utf8');s=s.replace("  const [locationNotice, setLocationNotice] = useState('');","  const [locationNotice, setLocationNotice] = useState('');\n  const [autoResolveLocation, setAutoResolveLocation] = useState(false);");
let a=s.indexOf('    if (!city || !state || neighborhood || !prefillData?.address) return;');let b=s.indexOf('    const controller = new AbortController();',a);s=s.slice(0,a)+`    setAutoResolveLocation(Boolean(city && state && !neighborhood && prefillData?.address));
  }, [prefillData, itbiStats]);
  useEffect(() => {
    if (!autoResolveLocation || !selectedCity || !selectedState || !prefillData?.address) return;
    const state = selectedState, city = selectedCity, neighborhoods = neighborhoodsList;
`+s.slice(b);
s=s.replace("      if (controller.signal.aborted) return;\n      const officialNeighborhood", "      if (controller.signal.aborted) return;\n      setAutoResolveLocation(false);\n      const officialNeighborhood");
// Change the dependencies of the resolver only.
a=s.indexOf("    fetch('/api/itbi/resolve-street?' + query");b=s.indexOf('  }, [prefillData, itbiStats]);',a);s=s.slice(0,b)+s.slice(b).replace('  }, [prefillData, itbiStats]);','  }, [autoResolveLocation, selectedState, selectedCity, prefillData, neighborhoodsList]);');
a=s.indexOf('  // Sync neighborhood input text');b=s.indexOf('  // Load streets when neighborhood changes',a);s=s.slice(0,a)+s.slice(b);
s=s.replace("                    const newState = e.target.value;", "                    setAutoResolveLocation(false);\n                    setNeighborhoodInput(''); setStreetInput('');\n                    const newState = e.target.value;");
s=s.replace('                    setSelectedCity(e.target.value);',"                    setAutoResolveLocation(false);\n                    setNeighborhoodInput(''); setStreetInput('');\n                    setSelectedCity(e.target.value);");
s=s.replace('                  setNeighborhoodInput(val);',"                  setAutoResolveLocation(false);\n                  setNeighborhoodInput(val);");
s=s.replace("                          setLocationNotice('');", "                          setAutoResolveLocation(false);\n                          setLocationNotice('');");
s=s.replace("const queryStreet = streetInput || (prefillData?.address ? parseAddressComponents(prefillData.address).street : '');", "const queryStreet = streetInput || (prefillData?.address && normalizeLocationOption(prefillData.city) === normalizeLocationOption(selectedCity) && normalizeLocationOption(prefillData.state) === normalizeLocationOption(selectedState) ? parseAddressComponents(prefillData.address).street : '');");
s=s.replace("    const controller = new AbortController();\n\n    async function loadTransactions()", "    const controller = new AbortController();\n    setRawTransactions([]);\n\n    async function loadTransactions()");
s=s.replace("{avgSqm:0,medianSqm:0,count:0,source:'Selecione um bairro cadastrado'} as any", "{avgSqm:0,medianSqm:0,count:0,source:'Selecione um bairro cadastrado',minSqm:0,maxSqm:0,rawAvgSqm:0,rawCount:0,outliersCount:0,similarAvgSqm:0,similarCount:0,allAreasAvgSqm:0,allAreasCount:0,isSimilarActive:false,minSimilarSize:0,maxSimilarSize:0} as any");
fs.writeFileSync(f,s);

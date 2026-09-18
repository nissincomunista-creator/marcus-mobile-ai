import importlib.util
from pathlib import Path
p=Path(__file__).parent/'refresh_map_locations.py'
spec=importlib.util.spec_from_file_location('map_refresh',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
for address,expected in [('Rua 7 de Setembro, N. 105',('7 setembro','105')),('RUA 7, N. 155, LT 14 QD 11',('7','155')),('RUA X, N. SN, QD 19 LT 05',('','')),('ALAMEDA X, N. S/N, LOTE 7',('','')),('Rua Bento Gonçalves, 411, Benfica',('bento goncalves','411')),('do Imóvel: Rua Silva Rabelo, 57, Sala 205',('silva rabelo','57'))]:
 assert m.parse({'address':address})==expected,(address,m.parse({'address':address}))
assert m.comp('APTO 202 BL 019 LT02',r'(?:bloco|bl)')=='19'
assert m.comp('Apto 401 BL R',r'(?:bloco|bl)')=='r'
assert m.street('Av. Dr. Fábio da Luz')==m.street('Avenida Doutor Fabio Luz')
print('Parser regressions passed: numbered streets, dates, S/N, lot numbers, accents and block identity.')

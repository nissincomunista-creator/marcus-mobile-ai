import importlib.util
from pathlib import Path
p=Path(__file__).parent/'refresh_map_locations.py'
spec=importlib.util.spec_from_file_location('map_refresh',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
for address,expected in [('Rua 7 de Setembro, N. 105',('7 setembro','105')),('RUA 7, N. 155, LT 14 QD 11',('7','155')),('RUA X, N. SN, QD 19 LT 05',('','')),('ALAMEDA X, N. S/N, LOTE 7',('','')),('Rua Bento Gonçalves, 411, Benfica',('bento goncalves','411')),('do Imóvel: Rua Silva Rabelo, 57, Sala 205',('silva rabelo','57'))]:
 assert m.parse({'address':address})==expected,(address,m.parse({'address':address}))
assert m.comp('APTO 202 BL 019 LT02',r'(?:bloco|bl)')=='19'
assert m.comp('Apto 401 BL R',r'(?:bloco|bl)')=='r'
assert m.street('Av. Dr. Fábio da Luz')==m.street('Avenida Doutor Fabio Luz')
assert m.house_unit('AVENIDA PRINCESA ISABEL, N. 412, CS 4A')==('4','a')
unit_target={'id':'case','address':'AVENIDA PRINCESA ISABEL, N. 412, CS 4A','city':'Rio de Janeiro','state':'RJ','neighborhood':'COPACABANA'}
unit_candidates={'princesa isabel|412':[
 {'lat':-22.96124,'lng':-43.174952,'level':'1','street':'AVENIDA PRINCESA ISABEL','number':'412','locality':'COPACABANA','complements':{'casa':'4'},'cnefeId':'wrong-unit'},
 {'lat':-22.961484,'lng':-43.174921,'level':'1','street':'AVENIDA PRINCESA ISABEL','number':'412','locality':'COPACABANA','complements':{'casa':'4','outros':'a'},'cnefeId':'exact-unit'}
]}
resolved=m.resolve_record(unit_target,unit_candidates,'fixture')
assert resolved['status']=='located' and resolved['cnefeId']=='exact-unit',resolved
block_target={'id':'same-building','address':'AVENIDA M, N. 10, BLOCO 4','city':'Rio de Janeiro','state':'RJ','neighborhood':'CENTRO'}
block_candidates={'m|10':[
 {'lat':-22.9,'lng':-43.2,'level':'1','street':'AVENIDA M','number':'10','locality':'CENTRO','complements':{'bloco':'2'},'cnefeId':'block-2'},
 {'lat':-22.90001,'lng':-43.20001,'level':'1','street':'AVENIDA M','number':'10','locality':'CENTRO','complements':{'bloco':'3'},'cnefeId':'block-3'}
]}
resolved_block=m.resolve_record(block_target,block_candidates,'fixture')
assert resolved_block['status']=='located',resolved_block
print('Map parser regressions passed: numbered streets, house-unit matching and same-building block fallback.')

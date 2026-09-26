# Pipeline de leilões

## Fluxo

1. Adaptadores em `listedPortalSync.ts` e `auctioneerSyncService.ts` extraem dados estruturados e guardam a evidência oficial. O texto do detalhe fornece os fallbacks de praça, lance, avaliação, endereço e área.
2. `lifecycle.ts` classifica HTTP 404/410, redirecionamento para a home, encerramento explícito e vencimento das rodadas. Datas sem horário terminam às 23:59:59 de Brasília. Terceira praça futura impede expiração temporal. CAPTCHA, timeout e HTTP 500 não comprovam encerramento.
3. `location.ts` normaliza bairro contra os bairros cadastrados da cidade e ITBI. Correspondência aproximada exige resultado único e distância máxima de um caractere. A consulta interna opcional `cep_cache.json` usa CEP sem pontuação como chave e `{logradouro,bairro,cidade,uf}` como valor. Sem evidência suficiente, o bairro permanece pendente.
4. `validation.ts` exige preço positivo confirmado, bairro, endereço, detalhe e modalidade confirmados. Registros insuficientes vão para `sync-audits/quarentena_extracao`, com motivos e HTML quando obtido. `source-evidence` guarda a página/API de suporte. Arquivos da fila são atualizados pela URL; resolução mantém o histórico.
5. `aggregation.ts` reúne URLs canônicas e identidade de endereço/número/unidade/cidade, mantém os metadados mais recentes e seleciona a menor oferta válida. Link, preço e datas vêm da mesma oferta. `sourceRecords`, `offers` e `links_adicionais` preservam as demais fontes. Unidades diferentes, direitos parciais e contratos distintos da Caixa não são fundidos apenas pelo endereço.

`ingestionStatus` representa a sanidade da coleta e é separado do campo de acompanhamento pessoal `status`. A API da vitrine usa `catalogEligible`: encerrados e itens em quarentena não participam da listagem/ranking. Área não confirmada continua sem metragem inventada; área total usada como alternativa é sinalizada como aproximada.

## Atualização

A coleta automática inicia uma vez por abertura do app. Não há atualização periódica da pesquisa. A conferência verifica também as ofertas secundárias armazenadas. As APIs dedicadas dos bancos têm sua própria coleta; indisponibilidade ou ausência no catálogo não prova, isoladamente, venda/encerramento.

## Auditoria de setembro de 2026

`work/catalog-audit` contém a amostra completa do catálogo existente, páginas recebidas/renderizadas, respostas de APIs, plano de correção e relatório de aplicação. A lista Caixa utilizada informa geração em 23/09/2026. A consulta de MG e diversos detalhes Caixa retornaram proteção antirobô: esses casos não foram tratados como páginas de imóveis verificadas.

A cobertura de todos os portais continua condicionada a respostas públicas utilizáveis. Resultados bloqueados ficam explícitos na quarentena; testes locais não equivalem a comprovação de cobertura integral dos sites.

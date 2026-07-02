# Processos — atualização automática e notificações

Esta pasta documenta o subsistema de atualização de processos do Magistrum: como os
andamentos são puxados do DataJud (sob demanda e por rotina diária), como o histórico de
sincronização é guardado e como as notificações chegam ao advogado responsável.

- [`process-updates.md`](./process-updates.md) — arquitetura completa, fluxo de
  sincronização, derivação de tribunal por CNJ, agendador diário, notificações,
  histórico de execuções, regras de negócio e variáveis de ambiente.

O contexto de importação inicial de processos (que já existia antes deste subsistema)
está descrito junto às regras de modelo de dados em `../data-model-decisions.md` e no
módulo `apps/api/src/modules/cases`.

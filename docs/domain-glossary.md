# Domain Glossary

This glossary keeps product language stable across docs, API contracts, UI labels, and tests.

Frontend visible text should be in pt-BR. Backend code and API contracts should use en-US names.

## Core Terms

| English / Code | pt-BR UI | Meaning |
| --- | --- | --- |
| Client | Cliente | Person or company served by the law office. Root entity for cases, payments, and documents. |
| Individual client | Pessoa física | Client represented by a person and optionally identified by CPF. |
| Company client | Pessoa jurídica | Client represented by a company and optionally identified by CNPJ. |
| Case | Processo | Legal matter or internal case handled by the office. |
| Judicial case | Processo judicial | Case with court involvement. Can have a CNJ number. |
| Extrajudicial case | Processo extrajudicial | Case or matter outside the judicial system. Must not have a CNJ number. |
| Finance | Financeiro | Area for receivables, payments, installments, overdue amounts, and dashboard metrics. |
| Payment | Pagamento | Receivable or paid amount linked to a client and optionally to a case. |
| Document | Documento | Uploaded or registered file linked to a client and optionally to a case. |
| User | Usuário | Person using JurisFlow internally, such as lawyer or assistant. |

## Status Terms

| English / Code | pt-BR UI | Meaning |
| --- | --- | --- |
| active | Ativo | Client or user is part of current operation. |
| inactive | Inativo | Client or user is preserved historically but hidden from default active workflows. |
| pending | Pendente | Payment is expected but not paid or canceled. |
| paid | Pago | Payment was received. |
| canceled | Cancelado | Payment or case was canceled without physical deletion. |
| on hold | Em espera | Case is paused but not closed or canceled. |
| closed | Encerrado | Case is completed. |

## Client Terms

| English / Code | pt-BR UI | Meaning |
| --- | --- | --- |
| document | Documento | CPF or CNPJ depending on client type. Stored as digits only. |
| CPF | CPF | Brazilian individual taxpayer identifier. |
| CNPJ | CNPJ | Brazilian company taxpayer identifier. |
| notes | Observações | Internal free-text notes about a client. |
| address | Endereço | Free-text address in v1. |

## Case Terms

| English / Code | pt-BR UI | Meaning |
| --- | --- | --- |
| CNJ number | Número CNJ | Brazilian judicial process number. Only valid for judicial cases. |
| legal area | Área jurídica | Broad legal category such as criminal, labor, family, or tax. |
| case stage | Fase | Current operational/legal stage of a case. |
| opposing party | Parte contrária | Person or organization on the other side of the matter. |
| court | Tribunal | Court or tribunal name. |
| jurisdiction | Comarca / Foro | Jurisdiction, venue, or court location. |
| division | Vara / Turma | Court division, chamber, or panel. |
| responsible user | Responsável | Main internal user responsible for a case. |
| total fee amount | Valor total dos honorários | Agreed case fee stored in cents. |

## Finance Terms

| English / Code | pt-BR UI | Meaning |
| --- | --- | --- |
| receivable | A receber | Pending amount expected from a client. |
| overdue | Em atraso | Pending payment with due date before today. Computed, not stored as a status. |
| installment | Parcela | One payment in a payment schedule. |
| payment schedule | Cronograma de pagamentos | Generated group of installments for one case fee. |
| manual payment | Pagamento manual | Payment created directly, not generated from a case schedule. |
| generated payment | Pagamento gerado | Payment created from a case payment schedule. |
| payment method | Forma de pagamento | PIX, cash, bank transfer, credit card, debit card, boleto, or other. |
| due date | Vencimento | Date when a pending payment is expected. |
| paid at | Data de pagamento | Date when payment was actually received. |
| cancel reason | Motivo do cancelamento | Required explanation when canceling a payment. |

## Document Terms

| English / Code | pt-BR UI | Meaning |
| --- | --- | --- |
| file | Arquivo | Uploaded binary file. |
| mime type | Tipo do arquivo | Technical content type such as `application/pdf` or `image/png`. |
| original name | Nome original | File name from the upload before system storage naming. |
| storage key | Chave de armazenamento | Internal path or object key used to locate the stored file. |
| file size | Tamanho do arquivo | File size in bytes. |

## Naming Rules

- API and backend names use English: `client`, `case`, `payment`, `document`.
- Frontend labels use pt-BR: `Cliente`, `Processo`, `Pagamento`, `Documento`.
- Database enum values stay uppercase English.
- API enum values exposed to frontend use lowercase English where already established.
- Money is stored as integer cents and displayed as BRL.
- CPF, CNPJ, phone, and CNJ formatting belongs at the UI/display edge; persisted values should be normalized where rules require it.

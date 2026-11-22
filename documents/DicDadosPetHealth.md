# Dicionário de Dados: Projeto PetHealth: Gerenciador de Saúde Animal

Este dicionário descreve os dados do projeto **PetHealth**, aplicação web para o acompanhamento da saúde de animais de estimação por seus tutores. O sistema permite o gerenciamento de conta do tutor, cadastro de múltiplos pets, carteira de vacinação, controle de medicamentos com registro diário de doses, histórico e agendamento de consultas veterinárias, além do armazenamento de fotos e documentos anexados.

A arquitetura do projeto é composta por backend em Node.js/Express (utilizando o driver oficial do MongoDB), MongoDB Atlas (banco `pethealth`), com armazenamento de sessões via `connect-mongo` e de arquivos binários via GridFS. Para o cálculo do painel de saúde do pet, o backend envia os dados coletados do banco, via TCP/JSON, a um servidor Java *stateless*.

## 1. Histórico de versões (ou revisões)

| Data | Autor | Versão | Comentários |
| :---: | :---: | ---: | :--- |
| 22/11/2026 | GRUPO COMPLETO | 1.0.0 | Publicação da versão 1.0.0 |
| 21/11/2026 | Felipe Nasser Coelho Moussa | 1.0.0-alfa9 | Revisão de índices, sessões no banco `pethealth`, buckets GridFS e inconsistências conhecidas |
| 20/11/2026 | Felipe Nasser Coelho Moussa | 1.0.0-alfa8 | Desdobramento físico para MongoDB (coleções, exemplos JSON, GridFS e justificativas) |
| 20/11/2026 | Felipe Nasser Coelho Moussa | 1.0.0-alfa7 | Entidade Medicamento e Registro de dose Estruturada |
| 18/11/2026 | Maria Júlia de Souza Oliveira | 1.0.0-alfa6 | Entidade Tutor e Pet com informações adicionais (ex: telefone e cidade) |
| 18/11/2026 | Giovanni Joseppe Bozelli | 1.0.0-alfa5 | Entidade Vacina Estruturada |
| 16/11/2026 | Mateus de Souza Campos | 1.0.0-alfa4 | Entidade Consulta Estruturada |
| 04/11/2026 | Felipe Nasser Coelho Moussa | 1.0.0-alfa3 | Entidades Vacina, Medicamento, Registro de dose, Consulta básicos para Testes no MongoDB|
| 28/10/2026 | Felipe Nasser Coelho Moussa | 1.0.0-alfa2 | Entidades Tutor e Pet com regras de validação |
| 26/10/2026 | Felipe Nasser Coelho Moussa | 1.0.0-alfa1 | Versão inicial com título, estrutura do documento e definição das entidades conceituais |

## 2. Entidades e atributos conceituais

### 2.1. Tutor

Tutor representa a pessoa física cadastrada no PetHealth responsável por gerenciar a saúde de um ou mais animais de estimação. Essa entidade é essencial para o negócio porque sustenta a autenticação, o controle de acesso e a personalização do perfil de conta.

#### Atributos de Tutor

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| identificador | Código | Sim | Simples | `673f1a2b3c4d5e6f7a8b9c01` | vazio, nulo | Identificador único do tutor gerado automaticamente pelo banco. |
| nome | Texto | Sim | Simples | `Testador Silva`, `Ana Clara` | `""`, `"   "`, texto com mais de 80 caracteres | Nome do tutor. Deve ter entre 1 e 80 caracteres após remoção de espaços nas extremidades. |
| email | Texto | Sim | Simples | `teste@pethealth.com`, `tutor@exemplo.com.br` | `""`, `teste@`, `email sem arroba`, e-mail já cadastrado | E-mail de login, único no sistema. Armazenado sempre em minúsculas e sem espaços nas extremidades. Não é editável após o cadastro. |
| senha | Texto (hash) | Sim | Simples | Hash bcrypt de senha com 8 a 72 caracteres | senha com menos de 8 caracteres, mais de 72 caracteres, vazia | A senha em texto plano é validada (8 a 72 caracteres) e armazenada exclusivamente como hash `bcrypt` (custo 12). Na troca de senha, a nova senha deve diferir da atual. |
| telefone | Texto numérico | Não | Simples | `19999990000`, `1932324455` | `12345`, `199999900001`, `abc1234567` | Telefone de contato informado na edição de perfil. Aceita formatação na entrada (`()+-` e espaços), mas deve conter 10 ou 11 dígitos e é salvo apenas com dígitos. |
| cidade | Texto | Não | Simples | `Campinas`, `São Paulo` | texto com mais de 80 caracteres | Cidade informada na edição de perfil. Máximo de 80 caracteres após `trim`. |
| fotoPerfil | Referência de arquivo | Não | Simples | Referência a imagem JPEG, PNG ou WebP de até 2 MB | arquivo PDF, imagem > 2 MB, arquivo corrompido ou com assinatura inválida | Referência à imagem de perfil do tutor armazenada em bucket próprio. Tipo real verificado por *magic bytes* (JPEG, PNG ou WebP). |
| criadoEm | Data e hora | Sim | Simples | `2026-11-21T22:12:59.273Z` | data inválida | Data e hora de criação da conta, gerada automaticamente no registro. |

### 2.2. Pet

Pet representa cada animal de estimação vinculado a um tutor. É a entidade central: todas as vacinas, medicamentos, registros de doses, consultas e anexos são organizados em torno de um pet específico.

#### Atributos de Pet

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| identificador | Código | Sim | Simples | `673f1a2b3c4d5e6f7a8b9c10` | vazio, nulo | Identificador único do pet gerado automaticamente pelo banco. |
| tutor | Tutor | Sim | Relacionamento | Referência ao tutor `Testador Silva` | nulo, referência inexistente | Tutor proprietário do pet. Garante isolamento de dados por conta autenticada. |
| nome | Texto | Sim | Simples | `Luna`, `Garfield`, `Thor` | `""`, `"   "`, texto com mais de 50 caracteres | Nome do animal. Deve ter entre 1 e 50 caracteres após `trim`. |
| especie | Texto enumerado | Sim | Simples | `cachorro`, `gato`, `outro` | `coelho`, `ave`, `""`, nulo | Espécie do pet, normalizada em minúsculas. Aceita estritamente os três valores da lista. |
| raca | Texto | Não | Simples | `SRD`, `Persa`, `Golden Retriever` | texto com mais de 50 caracteres | Raça do animal. Quando omitida ou vazia, é persistida como nula (`null`). |
| dataNascimento | Data | Sim | Simples | `2020-05-10`, `2022-01-15` | `2026-02-30`, `10/05/2020`, data futura em relação ao fuso de São Paulo | Data de nascimento no formato `AAAA-MM-DD`, validada como data real de calendário e não futura. Usada no cálculo de idade no painel. |
| peso | Número decimal | Sim | Simples | `5.5`, `15.2`, `0.4`, `200` | `0`, `-2`, `200.1`, `"leve"`, `true`, vazio | Peso atual do animal em quilogramas (kg). Deve ser maior que `0` e menor ou igual a `200`. |
| sexo | Texto enumerado | Não | Simples | `femea`, `macho` | `F`, `M`, `indefinido`, `fêmea` (com acento) | Sexo do pet, normalizado em minúsculas. Aceita apenas `femea` ou `macho`. |
| comprimentoCm | Número decimal | Não | Simples | `46`, `65`, `120.5` | `0`, `-10`, `301`, `false`, `"grande"` | Comprimento do animal em centímetros (cm). Quando informado, deve ser maior que `0` e até `300`. |
| alturaCm | Número decimal | Não | Simples | `28`, `48`, `90.5` | `0`, `-5`, `305`, `true`, `"alto"` | Altura do animal em centímetros (cm). Quando informada, deve ser maior que `0` e até `300`. |
| fotoPet | Referência de arquivo | Não | Simples | Referência a imagem JPEG, PNG ou WebP de até 2 MB | arquivo PDF, imagem > 2 MB, assinatura binária inválida | Referência à foto do pet. Tipo real validado por *magic bytes* (JPEG, PNG ou WebP). |
| criadoEm | Data e hora | Sim | Simples | `2026-11-21T22:15:13.203Z` | data inválida | Momento do cadastro do pet. |
| atualizadoEm | Data e hora | Não | Simples | `2026-11-21T22:15:42.501Z` | data inválida | Momento da última atualização dos dados ou da foto do pet. |

### 2.3. Vacina

Vacina representa o registro individual de uma dose vacinal de um pet, podendo estar já aplicada (histórico de imunização) ou pendente (dose agendada ou esperada). Essa entidade permite acompanhar o calendário vacinal, alertar sobre doses atrasadas ou próximas no painel de saúde e guardar comprovantes da carteirinha.

#### Atributos de Vacina

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| identificador | Código | Sim | Simples | `673f1a2b3c4d5e6f7a8b9c20` | vazio, nulo | Identificador único do registro de vacina. |
| pet | Pet | Sim | Relacionamento | Referência ao pet `Luna` | nulo, pet de outro tutor | Pet ao qual a dose vacinal pertence. |
| status | Texto enumerado | Sim | Simples | `aplicada`, `pendente` | `agendada`, `atrasada`, `""`, nulo | Situação da dose. Define quais campos de data e local são obrigatórios. |
| titulo | Texto | Sim | Simples | `V10`, `Antirrábica`, `Gripe canina` | `"V"`, `""`, texto com mais de 100 caracteres | Nome da vacina. Deve ter entre 2 e 100 caracteres após `trim`. |
| dose | Texto enumerado | Sim | Simples | `1ª dose`, `2ª dose`, `3ª dose`, `Reforço`, `Dose única` | `4ª dose`, `1a dose`, `reforco`, `""` | Identificação da dose. Aceita exclusivamente os cinco valores exatos da lista. |
| dataAplicacao | Data | Não | Simples | `2025-11-20`, `2026-10-17` | vazio quando `status = aplicada`, `20/11/2025`, data futura em relação ao fuso de São Paulo | Formato `AAAA-MM-DD`. Obrigatória quando `status = aplicada` (e não pode estar no futuro); omitida quando `status = pendente`. |
| proximaDose | Data | Não | Simples | `2026-11-26`, `2026-12-21` | vazio quando `status = pendente`, anterior a `dataAplicacao` quando `status = aplicada`, `26/11/2026` | Formato `AAAA-MM-DD`. Obrigatória quando `status = pendente`; opcional quando `status = aplicada` (neste caso, não pode ser anterior a `dataAplicacao`). |
| lote | Texto | Não | Simples | `VT26A1`, `AR2509` | preenchido em registro com `status = pendente` (descartado pela aplicação) | Código do lote da vacina. Persistido apenas quando `status = aplicada`; truncado em até 60 caracteres. |
| fabricante | Texto | Não | Simples | `Zoetis`, `Boehringer Ingelheim` | preenchido em registro com `status = pendente` (descartado pela aplicação) | Laboratório fabricante. Persistido apenas quando `status = aplicada`; truncado em até 80 caracteres. |
| local | Texto | Não | Simples | `Clínica VetVida — Av. Brasil, 1420` | `"A"`, vazio quando `status = aplicada`, texto > 150 caracteres | Clínica ou local da aplicação. Obrigatório (2 a 150 caracteres) quando `status = aplicada`; opcional (até 150 caracteres) quando `status = pendente`. |
| veterinario | Texto | Não | Simples | `Dra. Camila Nogueira`, `Dr. Rafael Mendes` | `"A"`, vazio quando `status = aplicada`, texto > 100 caracteres | Médico veterinário responsável. Obrigatório (2 a 100 caracteres) quando `status = aplicada`; opcional (até 100 caracteres) quando `status = pendente`. |
| observacoes | Texto | Não | Simples | `Sem reações adversas.`, `Levar carteirinha física.` | — (textos acima de 500 caracteres são truncados) | Anotações complementares, aceitas em ambos os status, limitadas a 500 caracteres. |
| documentos | Documento anexado | Não | Multivalorado e Composto (MC) | Lista de anexos PDF ou imagem (até 10 MB cada, máx. 5 por envio) | arquivo `.docx`, `.exe`, arquivo > 10 MB, mais de 5 arquivos no mesmo envio | Comprovantes, selos ou fotos da carteirinha vinculados à vacina. Inicializado como lista vazia. Ver seção 3.1. |
| criadoEm | Data e hora | Sim | Simples | `2026-11-21T22:24:27.112Z` | data inválida | Momento de criação do registro. |
| atualizadoEm | Data e hora | Não | Simples | `2026-11-21T22:30:00.000Z` | data inválida | Momento da última edição do registro. |

### 2.4. Medicamento

Medicamento representa um tratamento medicamentoso ou suplementação prescrita para um pet, contendo sua posologia, agenda semanal/diária, período de vigência e situação atual. É fundamental para gerar automaticamente a lista de doses previstas para o dia e alimentar os indicadores de adesão no painel do pet.

#### Atributos de Medicamento

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| identificador | Código | Sim | Simples | `673f1a2b3c4d5e6f7a8b9c30` | vazio, nulo | Identificador único do medicamento. |
| pet | Pet | Sim | Relacionamento | Referência ao pet `Luna` | nulo, pet de outro tutor | Pet ao qual o tratamento pertence. |
| medicamento | Texto | Sim | Simples | `Amoxicilina`, `Dipirona`, `Suplemento articular` | `""`, `"   "`, texto com mais de 100 caracteres | Nome comercial ou popular do medicamento (1 a 100 caracteres). |
| principioAtivo | Texto | Não | Simples | `Amoxicilina`, `Dipirona sódica` | texto com mais de 100 caracteres | Nome da droga ou sal ativo. Omitido se não informado. |
| formato | Texto enumerado | Sim | Simples | `Comprimido`, `Cápsula`, `Líquido`, `Gotas`, `Pomada`, `Injeção` | `Xarope`, `Spray`, `comprimido` (minúsculo), `""` | Apresentação farmacêutica. Aceita estritamente os seis valores exatos da lista. |
| dose | Dose do medicamento | Sim | Composto (C) | Dosagem `1` + unidade `comprimido` → `"1 comprimido"` | dosagem `0` ou negativa, unidade fora da lista | Reúne o valor numérico da dosagem, a unidade de medida e o texto composto gerado automaticamente. Ver seção 3.3. |
| agenda | Agenda do medicamento | Sim | Composto (C) | Dias `[0, 1, 2, 3, 4, 5, 6]` e horários `["08:00", "20:00"]` | lista de dias vazia, dia `7`, horário `25:00`, mais de 6 horários, horários repetidos | Reúne os dias da semana (obrigatório) e os horários do dia (opcional, até 6). Ver seção 3.2. |
| dataInicio | Data | Sim | Simples | `2026-11-16`, `2026-10-22` | `2026-02-30`, `16/11/2026`, `""`, nulo | Data de início do tratamento (`AAAA-MM-DD`), validada como data real de calendário. |
| dataFim | Data | Não | Simples | `2026-11-26`, `null` (uso contínuo) | `2026-02-30`, data anterior a `dataInicio` | Data final do tratamento (`AAAA-MM-DD`). Quando nula (`null`), indica tratamento contínuo. |
| status | Texto enumerado | Sim | Simples | `ativo`, `concluido`, `arquivado` | `pausado`, `cancelado`, `ATIVO` | Na criação/edição, calculado automaticamente (`ativo` ou `concluido`, preservando `arquivado`). Ativos com `dataFim < hoje` passam a `concluido` na listagem. Na rota de alteração de status, o tutor só alterna entre `ativo` e `arquivado` (não podendo reativar se `dataFim < hoje`). |
| criadoEm | Data e hora | Sim | Simples | `2026-11-21T22:26:23.204Z` | data inválida | Momento do cadastro do medicamento. |
| atualizadoEm | Data e hora | Não | Simples | `2026-11-21T22:26:23.204Z` | data inválida | Momento da última alteração, arquivamento/reativação ou conclusão automática. |

### 2.5. Registro de dose

Registro de dose representa a confirmação de que uma dose específica de um medicamento ativo foi administrada ao pet em determinada data e horário. Essa entidade separa o plano terapêutico (Medicamento) dos eventos diários de administração, permitindo histórico auditável sem sobrecarregar o documento do medicamento.

#### Atributos de Registro de dose

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| identificador | Código | Sim | Simples | `673f1a2b3c4d5e6f7a8b9c40` | vazio, nulo | Identificador único do registro de dose. |
| pet | Pet | Sim | Relacionamento | Referência ao pet `Luna` | nulo, pet de outro tutor | Pet que recebeu a dose. Facilita consultas agregadas de todas as doses do pet no dia. |
| medicamento | Medicamento | Sim | Relacionamento | Referência ao medicamento `Amoxicilina` | nulo, medicamento inativo ou não previsto para hoje | Medicamento administrado. |
| data | Data | Sim | Simples | `2026-11-21` | data diferente da data atual (no fluxo pela API) | Data da administração no formato `AAAA-MM-DD`, preenchida automaticamente pelo servidor com a data atual no fuso `America/Sao_Paulo`. |
| horario | Hora | Sim | Simples | `"08:00"`, `"20:00"`, `""` (quando medicamento não tem horários definidos) | `"09:00"` se o medicamento só tem `["08:00", "20:00"]`, `"25:00"` | Horário da dose previsto na agenda do medicamento, ou string vazia (`""`) quando o medicamento não possui horários cadastrados. A combinação `(medicamento, data, horario)` é única. |
| tomadoEm | Data e hora | Sim | Simples | `2026-11-21T22:26:28.099Z` | data inválida | Instante exato em que o tutor registrou a dose como tomada. |
| doseRegistrada | Texto | Não | Simples | `Meio comprimido (0.5)`, `8 gotas por orientação` | texto com mais de 100 caracteres | Observação opcional de dose específica efetivamente administrada (enviada pela API como `doseEspecifica`). Omitida quando vazia. |

### 2.6. Consulta

Consulta representa um atendimento veterinário agendado ou já realizado para o pet. Permite acompanhar consultas futuras, manter o prontuário resumido (motivo, diagnóstico e observações), calcular há quantos dias foi a última consulta e armazenar receitas, laudos e exames vinculados ao atendimento.

#### Atributos de Consulta

| Atributo / Dado | Tipo conceitual | Obrigatório | Característica | Ex. aceitos | Ex. não aceitos | Comentários |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| identificador | Código | Sim | Simples | `673f1a2b3c4d5e6f7a8b9c50` | vazio, nulo | Identificador único da consulta. |
| pet | Pet | Sim | Relacionamento | Referência ao pet `Luna` | nulo, pet de outro tutor | Pet atendido na consulta. |
| motivo | Texto | Sim | Simples | `Check-up anual`, `Dor de ouvido` | `"A"`, `""`, texto com mais de 120 caracteres | Motivo principal do atendimento (2 a 120 caracteres). |
| data | Data | Sim | Simples | `2026-11-09`, `2026-11-25` | `09/11/2026`, `""`, nulo | Data da consulta no formato `AAAA-MM-DD`. |
| horario | Hora | Sim | Simples | `10:00`, `14:30`, `16:00` | `10h00`, `8:00`, `""`, nulo | Horário da consulta no formato `HH:MM`. |
| local | Texto | Sim | Simples | `Clínica VetVida — Av. Brasil, 1420` | `"A"`, `""`, texto com mais de 150 caracteres | Clínica ou hospital veterinário (2 a 150 caracteres). |
| veterinario | Texto | Sim | Simples | `Dra. Camila Nogueira`, `Dr. Rafael Mendes` | `"A"`, `""`, texto com mais de 100 caracteres | Profissional responsável (2 a 100 caracteres). |
| status | Texto enumerado | Sim | Simples | `agendada`, `realizada` | `cancelada`, `concluida`, `""` | Calculado automaticamente comparando `data` e `horario` com o momento atual no fuso `America/Sao_Paulo`. Consultas `agendada` cuja data/horário já passaram são convertidas para `realizada` ao listar. |
| diagnostico | Texto | Não | Simples | `Saudável`, `Otite leve`, `Dermatite alérgica` | preenchido quando `status = agendada` (descartado pela aplicação) | Diagnóstico registrado apenas para consultas com `status = realizada`; truncado em até 200 caracteres. |
| observacoes | Texto | Não | Simples | `Peso estável. Retorno em 12 meses.` | preenchido quando `status = agendada` (descartado pela aplicação) | Recomendações e anotações registradas apenas para consultas com `status = realizada`; truncado em até 500 caracteres. |
| documentos | Documento anexado | Não | Multivalorado e Composto (MC) | Lista de anexos PDF ou imagem (até 10 MB cada, máx. 5 por envio) | arquivo `.zip`, `.txt`, arquivo > 10 MB, mais de 5 arquivos por envio | Receitas, pedidos de exame e laudos anexados à consulta. Inicializado como lista vazia. Ver seção 3.1. |
| criadoEm | Data e hora | Sim | Simples | `2026-11-21T22:22:15.315Z` | data inválida | Momento de registro da consulta. |
| atualizadoEm | Data e hora | Não | Simples | `2026-11-21T22:25:00.000Z` | data inválida | Momento da última edição ou da transição automática de `agendada` para `realizada`. |

## 3. Tipos especiais, compostos ou específicos

### 3.1. Documento anexado

Documento anexado é uma estrutura composta utilizada como atributo multivalorado e composto nas entidades **Vacina** e **Consulta**. Ela armazena os metadados de cada arquivo enviado (PDF ou imagem de até 10 MB, no máximo 5 arquivos por requisição) e a referência para o conteúdo binário armazenado no GridFS.

Atributos do tipo Documento anexado:

| Atributo / Dado | Tipo conceitual | Obrigatório | Comentários |
| :---: | :--- | :---: | :--- |
| `_id` | Código | Sim | Identificador único (`ObjectId`) do metadado do anexo dentro da lista, usado na URL de download. |
| `nome` | Texto | Sim | Nome original do arquivo sanitizado (remove caracteres `/\?%*:|"<>` e colapsa espaços), limitado a 150 caracteres. Fallback: `"arquivo"`. |
| `tipo` | Texto (MIME type) | Sim | Tipo MIME informado no envio. Aceita apenas `application/pdf` ou `image/*`. Usado no cabeçalho `Content-Type` do download. |
| `tamanho` | Número inteiro | Sim | Tamanho do arquivo em bytes (máximo de `10485760` bytes = 10 MB). |
| `fileId` | Código (Referência) | Sim | Referência (`ObjectId`) ao documento correspondente em `consultaDocumentos.files` ou `vacinaDocumentos.files` no GridFS. |
| `enviadoEm` | Data e hora | Sim | Data e hora em que o anexo foi salvo. |

### 3.2. Agenda do medicamento

Agenda do medicamento é um tipo composto presente na entidade **Medicamento** que combina dois atributos multivalorados, os dias da semana em que o medicamento deve ser administrado e os horários diários previstos.

Atributos do tipo Agenda do medicamento:

| Atributo / Dado | Tipo conceitual | Obrigatório | Comentários |
| :---: | :--- | :---: | :--- |
| `diasDaSemana` | Lista de inteiros (M) | Sim | Deve conter ao menos 1 inteiro no intervalo `0` (domingo) a `6` (sábado). Valores são deduplicados e ordenados crescentemente. |
| `horarios` | Lista de textos (M) | Não | Lista opcional de até 6 horários no formato `HH:MM` (`00:00` a `23:59`), sem duplicatas, ordenados crescentemente. Pode ser vazia (`[]`) para medicamentos sem hora fixa. |

### 3.3. Dose do medicamento

Dose do medicamento é um tipo composto presente na entidade **Medicamento** que agrupa a quantidade numérica, a unidade padronizada e a representação textual.

Atributos do tipo Dose do medicamento:

| Atributo / Dado | Tipo conceitual | Obrigatório | Comentários |
| :---: | :--- | :---: | :--- |
| `dosagem` | Número decimal | Sim | Quantidade numérica finita e estritamente maior que zero (`> 0`). |
| `unidade` | Texto enumerado | Sim | Um dos valores permitidos: `mg`, `ml`, `g`, `gotas`, `comprimido`, `cápsula`, `unidade`. |
| `dose` | Texto (derivado) | Sim | Texto composto gerado automaticamente pelo backend na forma `"${dosagem} ${unidade}"` (ex.: `"1 comprimido"`, `"10 gotas"`). |

## 4. Desdobramento físico ou tecnológico

O projeto utiliza exclusivamente o **MongoDB** (Atlas, banco `pethealth`) por meio do driver oficial `mongodb` para Node.js. Os identificadores primários (`_id`) e referências (`donoId`, `petId`, `medicationId`, `fotoId`, `fileId`) utilizam o tipo BSON `ObjectId`, e carimbos de tempo (`criadoEm`, `atualizadoEm`, `tomadoEm`, `enviadoEm`, `expires`) utilizam o tipo BSON `Date` (`ISODate`). Nos exemplos JSON abaixo, esses tipos são representados em sintaxe Extended JSON (`$oid` e `$date`) para manter JSON válido.

### 4.1. Desdobramento para banco orientado a documentos

| Entidade conceitual | Coleção | Estratégia |
| :--- | :--- | :--- |
| Tutor | `users` | Documento próprio. `fotoId` referencia o binário no bucket GridFS `fotosPerfil`. |
| Pet | `pets` | Documento próprio, referenciando `users._id` via `donoId`. `fotoId` referencia o bucket GridFS `fotosPets`. |
| Vacina | `vaccines` | Documento próprio, referenciando `pets._id` via `petId`. Embute o array `documentos`, cujos itens referenciam `vacinaDocumentos` no GridFS via `fileId`. |
| Medicamento | `medications` | Documento próprio, referenciando `pets._id` via `petId`. Embute os arrays `horarios` e `diasDaSemana` e os campos de dose (`dosagem`, `unidade`, `dose`) na raiz do documento. |
| Registro de dose | `medicationLogs` | Documento próprio, referenciando `pets._id` via `petId` e `medications._id` via `medicationId`. |
| Consulta | `consultations` | Documento próprio, referenciando `pets._id` via `petId`. Embute o array `documentos`, cujos itens referenciam `consultaDocumentos` no GridFS via `fileId`. |
| Sessão HTTP (infraestrutura) | `sessions` | Documento próprio gerenciado pelo `connect-mongo` no banco `pethealth`, com expiração automática por índice TTL em `expires`. |
| Arquivos e fotos (infraestrutura) | `fotosPerfil.*`, `fotosPets.*`, `consultaDocumentos.*`, `vacinaDocumentos.*` | Armazenamento binário via GridFS (cada bucket gera uma coleção `.files` de metadados e uma `.chunks` de blocos de até 255 KB). |

---

#### Coleção `users`

Exemplo de documento:

```json
{
  "_id": { "$oid": "673f1a2b3c4d5e6f7a8b9c01" },
  "name": "Testador Silva",
  "email": "teste@pethealth.com",
  "password": "$2b$12$...hash_bcrypt_ficticio...",
  "telefone": "19999990000",
  "cidade": "Campinas",
  "fotoId": { "$oid": "673f1a2b3c4d5e6f7a8b9c09" },
  "criadoEm": { "$date": "2026-11-21T22:12:59.273Z" }
}
```

**Observação:** `telefone`, `cidade` e `fotoId` são campos opcionais e só existem no documento após preenchimento ou envio pelo tutor e são removidos com `$unset` quando apagados.

**Justificativa:** Tutores ficam em coleção própria porque são consultados de forma independente na autenticação (`email` único) e no carregamento de sessão (`_id`). Os pets não são embutidos em `users` porque cada pet possui grande volume de dados clínicos associados. A foto de perfil é referenciada via `fotoId` no GridFS para evitar adicionar o documento de conta a cada leitura de perfil ou login.

---

#### Coleção `pets`

Exemplo de documento:

```json
{
  "_id": { "$oid": "673f1a2b3c4d5e6f7a8b9c10" },
  "donoId": { "$oid": "673f1a2b3c4d5e6f7a8b9c01" },
  "nome": "Luna",
  "especie": "cachorro",
  "raca": "SRD",
  "dataNascimento": "2020-05-10",
  "peso": 15.2,
  "sexo": "femea",
  "comprimentoCm": 65,
  "alturaCm": 48,
  "fotoId": { "$oid": "673f1a2b3c4d5e6f7a8b9c19" },
  "criadoEm": { "$date": "2026-11-21T22:15:13.203Z" },
  "atualizadoEm": { "$date": "2026-11-21T22:15:42.501Z" }
}
```

**Observação:** `raca` é salva como `null` quando vazia; `sexo`, `comprimentoCm`, `alturaCm`, `fotoId` e `atualizadoEm` são omitidos quando não informados ou não aplicáveis.

**Justificativa:** Manter `pets` em coleção separada com referência `donoId` permite listar rapidamente todos os pets de um tutor com projeção reduzida e validar propriedade em todas as rotas (`/api/pets/:petId/...`).

---

#### Coleção `vaccines`

Exemplo de documento:

```json
{
  "_id": { "$oid": "673f1a2b3c4d5e6f7a8b9c20" },
  "petId": { "$oid": "673f1a2b3c4d5e6f7a8b9c10" },
  "titulo": "V10",
  "dose": "1ª dose",
  "status": "aplicada",
  "dataAplicacao": "2026-10-17",
  "proximaDose": "2026-11-18",
  "lote": "VT26A1",
  "fabricante": "Zoetis",
  "local": "Clínica VetVida — Av. Brasil, 1420",
  "veterinario": "Dra. Camila Nogueira",
  "observacoes": "Sem reações adversas.",
  "documentos": [
    {
      "_id": { "$oid": "673f1a2b3c4d5e6f7a8b9c21" },
      "nome": "comprovante-v10.pdf",
      "tipo": "application/pdf",
      "tamanho": 248310,
      "fileId": { "$oid": "673f1a2b3c4d5e6f7a8b9c22" },
      "enviadoEm": { "$date": "2026-11-21T22:25:10.000Z" }
    }
  ],
  "criadoEm": { "$date": "2026-11-21T22:24:27.112Z" }
}
```

**Observação:** Quando `status` é `"pendente"`, os campos `dataAplicacao`, `lote` e `fabricante` não existem no documento; `documentos` inicia como `[]`.

**Justificativa:** Cada dose vacinal é um documento independente referenciando `petId`, pois tem ciclo de vida próprio. Já o array `documentos` é embutido diretamente na vacina porque a quantidade de comprovantes por dose é pequena e sempre consultada junto à própria vacina.

---

#### Coleção `medications`

Exemplo de documento:

```json
{
  "_id": { "$oid": "673f1a2b3c4d5e6f7a8b9c30" },
  "petId": { "$oid": "673f1a2b3c4d5e6f7a8b9c10" },
  "medicamento": "Amoxicilina",
  "principioAtivo": "Amoxicilina",
  "formato": "Comprimido",
  "dosagem": 1,
  "unidade": "comprimido",
  "dose": "1 comprimido",
  "horarios": ["08:00", "20:00"],
  "diasDaSemana": [0, 1, 2, 3, 4, 5, 6],
  "dataInicio": "2026-11-16",
  "dataFim": null,
  "status": "ativo",
  "criadoEm": { "$date": "2026-11-21T22:26:23.204Z" }
}
```

**Justificativa:** Medicamentos ficam em coleção separada por terem ciclo de vida próprio, edições frequentes e atualização em lote para conclusão automática. Os arrays `horarios` e `diasDaSemana` são sempre necessários juntos ao avaliar se o medicamento vale para o dia atual. O campo derivado `dose` evita recomposição repetida no frontend e no servidor Java.

---

#### Coleção `medicationLogs`

Exemplo de documento:

```json
{
  "_id": { "$oid": "673f1a2b3c4d5e6f7a8b9c40" },
  "petId": { "$oid": "673f1a2b3c4d5e6f7a8b9c10" },
  "medicationId": { "$oid": "673f1a2b3c4d5e6f7a8b9c30" },
  "data": "2026-11-21",
  "horario": "08:00",
  "tomadoEm": { "$date": "2026-11-21T22:26:28.099Z" },
  "doseRegistrada": "1 comprimido com alimento"
}
```

**Observação:** `doseRegistrada` é opcional e só é gravada quando o tutor informa uma dose específica no registro.

**Justificativa:** Os registros de doses tomadas **não** são embutidos em `medications` devido ao padrão de crescimento ilimitado. Separar `medicationLogs` em coleção própria garante unicidade por dose/dia/horário via índice único e possibilita buscar todas as doses de hoje de um pet em uma única consulta indexada.

---

#### Coleção `consultations`

Exemplo de documento:

```json
{
  "_id": { "$oid": "673f1a2b3c4d5e6f7a8b9c50" },
  "petId": { "$oid": "673f1a2b3c4d5e6f7a8b9c10" },
  "motivo": "Check-up anual",
  "data": "2026-11-09",
  "horario": "10:00",
  "local": "Clínica VetVida — Av. Brasil, 1420",
  "veterinario": "Dra. Camila Nogueira",
  "status": "realizada",
  "diagnostico": "Saudável",
  "observacoes": "Peso estável. Retorno em 12 meses.",
  "documentos": [
    {
      "_id": { "$oid": "673f1a2b3c4d5e6f7a8b9c51" },
      "nome": "receita-checkup.pdf",
      "tipo": "application/pdf",
      "tamanho": 182400,
      "fileId": { "$oid": "673f1a2b3c4d5e6f7a8b9c52" },
      "enviadoEm": { "$date": "2026-11-21T22:28:00.000Z" }
    }
  ],
  "criadoEm": { "$date": "2026-11-21T22:22:15.315Z" }
}
```

**Observação:** Quando `status` é `"agendada"`, os campos `diagnostico` e `observacoes` não existem no documento.

**Justificativa:** Consultas contém histórico crescente ao longo da vida do pet, exigem atualização de status quando vencem e ordenação cronológica; por isso pertencem a uma coleção dedicada com referência `petId`. O array `documentos` permanece embutido porque o volume de anexos por consulta é restrito e exibido sob demanda no contexto daquela consulta.

---

#### Coleções do GridFS (armazenamento de fotos e documentos)

O PetHealth utiliza quatro *buckets* do GridFS dentro do banco `pethealth`. Cada *bucket* cria automaticamente duas coleções: `<bucket>.files` (metadados do arquivo) e `<bucket>.chunks` (blocos binários de até `261120` bytes / 255 KB). Os *buckets* são criados sob demanda no primeiro upload.

| Bucket | Coleções geradas | Referenciado por | Limites e tipos aceitos | Metadados (`metadata`) | Estado atual no Atlas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `fotosPerfil` | `fotosPerfil.files`, `fotosPerfil.chunks` | `users.fotoId` | 1 foto, máx. 2 MB; JPEG, PNG, WebP (MIME + *magic bytes*) | `{ userId }` | Existente |
| `fotosPets` | `fotosPets.files`, `fotosPets.chunks` | `pets.fotoId` | 1 foto, máx. 2 MB; JPEG, PNG, WebP (MIME + *magic bytes*) | `{ petId }` | Existente |
| `consultaDocumentos` | `consultaDocumentos.files`, `consultaDocumentos.chunks` | `consultations.documentos[].fileId` | Até 5/envio, máx. 10 MB/arquivo; PDF ou `image/*` | `{ petId, consultaId }` | Criado no 1º upload |
| `vacinaDocumentos` | `vacinaDocumentos.files`, `vacinaDocumentos.chunks` | `vaccines.documentos[].fileId` | Até 5/envio, máx. 10 MB/arquivo; PDF ou `image/*` | `{ petId, vacinaId }` | Criado no 1º upload |

Exemplo de documento em `fotosPerfil.files`:

```json
{
  "_id": { "$oid": "673f1a2b3c4d5e6f7a8b9c09" },
  "length": 152617,
  "chunkSize": 261120,
  "uploadDate": { "$date": "2026-11-21T22:17:51.824Z" },
  "filename": "perfil-673f1a2b3c4d5e6f7a8b9c01",
  "metadata": {
    "userId": { "$oid": "673f1a2b3c4d5e6f7a8b9c01" }
  }
}
```

Exemplo de documento em `fotosPerfil.chunks`:

```json
{
  "_id": { "$oid": "673f1a2b3c4d5e6f7a8b9c99" },
  "files_id": { "$oid": "673f1a2b3c4d5e6f7a8b9c09" },
  "n": 0,
  "data": "<BinData>"
}
```

**Justificativa:** O GridFS mantém fotos e PDFs dentro do mesmo banco MongoDB Atlas sem sobrecarregar os documentos principais com dados binários.

---

#### Coleção `sessions`

Exemplo de documento:

```json
{
  "_id": "SessaoFicticiaExemplo1234567890",
  "expires": { "$date": "2026-11-22T06:27:30.121Z" },
  "session": "{\"cookie\":{\"originalMaxAge\":28800000,\"expires\":\"2026-11-22T06:27:30.121Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":\"673f1a2b3c4d5e6f7a8b9c01\"}"
}
```

**Justificativa:** Persistir sessões no MongoDB garante continuidade da autenticação entre reinicializações do servidor e permite expiração automática após 8 horas (`maxAge: 28800000` ms) por meio do índice TTL criado automaticamente pelo `connect-mongo` no campo `expires`.

## 5. Consultas, índices e observações de arquitetura

Os índices da aplicação são garantidos automaticamente na inicialização do servidor, além dos índices padrão `_id_`, do índice TTL de `sessions` e dos índices internos do GridFS.

### 5.1. Consultas esperadas e índices

| Consulta esperada (por fluxo/tela) | Campos envolvidos | Índice existente | Observações |
| :--- | :--- | :--- | :--- |
| Listar pets do tutor (`GET /api/pets`) | `pets.donoId` | `{ donoId: 1 }` | Projeta apenas `nome`, `especie`, `raca` e `dataNascimento`. |
| Validar propriedade e carregar/editar pet (`GET/PUT /api/pets/:petId`) | `pets._id`, `pets.donoId` | `_id_` (e `{ donoId: 1 }`) | Executada como verificação de posse (`verificarDonoPet` / `buscarPetDoUsuario`) em praticamente todas as rotas de `/api/pets/:petId/*`. |
| Painel de saúde do pet (`GET /api/pets/:petId/dashboard`) | `pets.{_id, donoId}`; `vaccines.petId`; `medications.petId`; `consultations.petId`; `medicationLogs.petId` | `vaccines`: `{ petId: 1 }`; `medications`: `{ petId: 1, status: 1 }`; `consultations`: `{ petId: 1, data: -1 }`; `medicationLogs`: `{ petId: 1, data: 1 }` | As 4 coleções clínicas são consultadas em paralelo (`Promise.all`) e enviadas ao servidor Java. |
| Listar consultas do pet e atualizar vencidas (`GET /api/pets/:petId/consultas`) | `consultations.petId`, `consultations.data`, `consultations._id` | `{ petId: 1, data: -1 }` | Atualmente o controller busca por `{ petId }` e ordena `realizadas` e `agendadas` em memória. |
| Buscar/editar/excluir consulta específica (`PUT/DELETE/documentos`) | `consultations._id`, `consultations.petId` | `_id_` | A conferência de `petId` impede acesso cruzado entre pets. |
| Listar vacinas do pet (`GET /api/pets/:petId/vacinas`) | `vaccines.petId` | `{ petId: 1 }` | Filtra `aplicadas` e `pendentes` e ordena em memória. |
| Listar medicamentos, concluir vencidos e montar doses de hoje (`GET /api/pets/:petId/medicamentos`) | `medications.{petId, status, dataFim}`; `medicationLogs.{petId, data}` | `medications`: `{ petId: 1, status: 1 }`; `medicationLogs`: `{ petId: 1, data: 1 }` | `updateMany` conclui ativos com `dataFim < hoje`; logs do dia são buscados pelo índice `{ petId: 1, data: 1 }`. |
| Registrar ou desfazer dose de hoje (`POST/DELETE .../doses`) | `medicationLogs.{petId, medicationId, data, horario}` | `{ medicationId: 1, data: 1, horario: 1 }` (único) e `{ petId: 1, data: 1 }` | O índice único impede duplicação de dose em cliques simultâneos. |
| Excluir medicamento e seus logs (`DELETE .../medicamentos/:medicamentoId`) | `medications.{_id, petId}`; `medicationLogs.{petId, medicationId}` | `medicationLogs`: `{ medicationId: 1, data: 1, horario: 1 }` (prefixo `medicationId`) | Remove os logs e o medicamento em paralelo. |
| Login e verificação de unicidade de cadastro (`POST /api/auth/login` e `/register`) | `users.email` | `{ email: 1 }` (único) | Garante unicidade em nível de banco. |
| Carregar/atualizar perfil e foto do tutor (`GET/PUT /api/auth/me*`) | `users._id`; `sessions._id`; `fotosPerfil.files._id` | `_id_` em `users`, `sessions` e `fotosPerfil.files`; TTL `expires_1` em `sessions` | `password` é excluído via projeção `{ password: 0 }` nas respostas. |
| Exclusão em cascata de pet (`DELETE /api/pets/:petId`) e de conta (`DELETE /api/auth/me`) | `pets.donoId`; `consultations.petId`; `vaccines.petId`; `medications.petId`; `medicationLogs.petId`; `*.files._id`; `*.chunks.files_id` | Índices em `donoId`, `petId`, `_id_` e índices padrão do GridFS (`{ files_id: 1, n: 1 }`) | `petCleanupService.js` remove anexos no GridFS (`consultaDocumentos`, `vacinaDocumentos`), documentos clínicos, fotos dos pets (`fotosPets`) e por fim os documentos em `pets`; na exclusão de conta, `authController.js` remove ainda `fotosPerfil`, o documento em `users` e destrói a sessão. |

### 5.2. Integração com o servidor Java

O servidor Java é completamente *stateless* e **não se conecta ao MongoDB**.

- **O que o backend lê do MongoDB e envia ao servidor Java** (mensagem `PEDIDO_CALCULAR_PAINEL` em `GET /api/pets/:petId/dashboard`):
  - `pet`: documento completo do pet selecionado (da coleção `pets`);
  - `vaccines`: todos os documentos de `vaccines` daquele `petId`;
  - `medications`: todos os documentos de `medications` daquele `petId`;
  - `medicationLogs`: todos os documentos de `medicationLogs` daquele `petId`;
  - `consultations`: todos os documentos de `consultations` daquele `petId`;
  - `hojeStr`: data atual em formato `AAAA-MM-DD` no fuso `America/Sao_Paulo`.
- **O que o servidor Java retorna** (`RESULTADO_PAINEL`): `pet`, `diasDesdeUltimaConsulta`, `medicamentosHoje`, `atrasados`, `hoje` e `proximos7Dias`.
- **O que NUNCA é enviado ao servidor Java:**
  - Documentos da coleção `users` (nome, e-mail, telefone, cidade ou hash `password` do tutor);
  - Documentos da coleção `sessions` ou tokens/cookies de autenticação;
  - Dados de outros pets do mesmo tutor ou de outros tutores;
  - Conteúdos binários ou chunks do GridFS (`fotosPerfil`, `fotosPets`, `consultaDocumentos`, `vacinaDocumentos`).

### 5.3. Observações

1. **Nomenclatura mista (inglês e português):** As coleções principais têm nomes em inglês (`users`, `pets`, `vaccines`, `medications`, `medicationLogs`, `consultations`, `sessions`), enquanto os buckets do GridFS estão em português (`fotosPerfil`, `fotosPets`, `consultaDocumentos`, `vacinaDocumentos`).
2. **Ausência de `atualizadoEm` em `users`:** Diferentemente de `pets`, `vaccines`, `medications` e `consultations`, as rotas de atualização de conta (`updateMe`, `updatePassword`, `uploadProfilePhoto`, `deleteProfilePhoto`) não gravam `atualizadoEm` em `users`.
3. **Criação sob demanda dos buckets GridFS:** Os buckets `consultaDocumentos` e `vacinaDocumentos` só passam a existir no banco quando o primeiro anexo é enviado.
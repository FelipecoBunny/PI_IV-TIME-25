# PetHealth - PI IV TIME 25
## Sobre o Projeto
O **PetHealth** é um app baseado em navegador (WebApp) desenvolvido para a disciplina **Projeto Integrador IV** do curso de **Engenharia de Software da PUC-Campinas**.

O sistema serve como base inicial para o **monitoramento da saúde do seu pet**, incluindo histórico de vacinações, de consultas e medicamentos; além de lembretes para te ajudar a cuidar do seu animal de estimação.

---

## Funcionalidades Atuais
- **Autenticação e segurança:** criação de conta, login com sessões no MongoDB, logout e recuperação de senha por e-mail com código de 6 dígitos.
- **Perfil do tutor:** edição de dados pessoais, upload/remoção de foto de perfil, alteração de senha e exclusão de conta com limpeza completa de dados.
- **Gestão de pets:** cadastro, edição, foto de perfil, exclusão de pets e seletor rápido no painel para alternar entre múltiplos animais.
- **Painel inicial:** resumo diário com medicamentos de hoje, compromissos do dia, próximos 7 dias e vacinas atrasadas (calculados pelo servidor Java).
- **Consultas médicas:** agendamento de consultas futuras, histórico de realizadas, contador de dias desde a última consulta, busca por texto e filtro por período.
- **Carteira de vacinação:** registro de vacinas aplicadas e agendadas, alertas de vencimento/atraso e marcação rápida como aplicada.
- **Controle de medicamentos:** cadastro com frequência diária ou semanal, múltiplos horários, registro de doses tomadas (com desfazer), conclusão automática e arquivamento.
- **Documentos anexados:** envio, visualização e exclusão individual de arquivos (PDF e imagens) em consultas e vacinas via GridFS.

---

## Tecnologias Utilizadas

### Frontend (WebApp)
- **HTML**
- **CSS**
- **Javascript**

### Backend
- **JavaScript**
- **Node.js**
- **Express:** framework web para rotas, middlewares e servidor HTTP
- **Mongodb:** driver oficial do MongoDB
- **Multer:** middleware para upload de arquivos em memória
- **Bcryptjs:** hash e verificação segura de senhas
- **Express-session e Connect-mongo:** gerenciamento de sessões persistidas no MongoDB
- **Dotenv:** carregamento das variáveis de ambiente a partir do .env
- **Helmet:** configuração de cabeçalhos HTTP de segurança
- **Express-rate-limit:** proteção contra excesso de tentativas em login, troca/exclusão por senha e recuperação de senha
- **Nodemailer:** envio de e-mails de recuperação de senha via SMTP

### Servidor
- **Java**
- **Gson:** serialização e desserialização de JSON na comunicação TCP com o Node.js

### Banco de Dados
- **MongoDB**
- **GridFS:** ferramenta nativa para armazenar PDFs e imagens

### Ferramentas e IDEs
- **Git/GitHub e GitHub Projects**
- **Visual Studio Code**
- **JUnit:** testes unitários

---

## Arquitetura do Projeto
- **`web/`:** interface estática em HTML, CSS e JavaScript servida pelo backend Express.
- **`backend/`:** API REST em Node.js + Express (porta `3000`) responsável por autenticação, CRUD, uploads no GridFS, envio de e-mails e comunicação TCP com o servidor Java.
- **Servidor Java:** serviço TCP (porta `4000`) responsável pelas regras de cálculo do painel de saúde do pet.
- **MongoDB:** banco de dados NoSQL para persistência dos registros, sessões e arquivos (GridFS).

---

## Execução do Projeto

Para instruções passo a passo de instalação de dependências, configuração do MongoDB, variáveis de ambiente (`.env`), Senha de App do Gmail, servidor Java e scripts de teste (`seed` e `resetDb`), consulte o guia dedicado em `documents/config.md`:

**[Abrir Guia de Configuração e Execução](documents/config.md)**

---

## Documentos Principais

### Guia de Configuração e Execução
O passo a passo para configurar o ambiente e executar o repositório está disponível em `documents/config.md`.
**[Abrir Guia de Configuração e Execução](documents/config.md)**

### Dicionário de Dados
O dicionário de dados pode ser encontrado no arquivo `documents/DicDadosPetHealth.md`.

**[Abrir Dicionário de Dados](documents/DicDadosPetHealth.md)**

### Relatório de Ideação
O relatório de ideação pode ser encontrado no arquivo `documents/RELATÓRIO DE IDEAÇÃO - PetHealth.docx`.

**[Abrir Relatório de Ideação](<documents/RELATÓRIO DE IDEAÇÃO - PetHealth.docx>)**

### Relatório de Testes
O relatório de testes pode ser encontrado nos arquivos `documents/Teste do Servidor JAVA PI IV - PetHealth.pdf` e `documents/Teste do Servidor JAVA PI IV - PetHealth.docx`

**[Abrir Relatório de Testes](<documents/Teste do Servidor JAVA PI IV - PetHealth.pdf>)**

---

## Integrantes
| Nome Completo                 | RA       |
| ----------------------------- | -------- |
| Felipe Nasser Coelho Moussa   | 25004922 |
| Giovanni Joseppe Bozelli      | 25006837 |
| Maria Júlia Souza de Oliveira | 25007909 |
| Mateus de Souza Campos        | 25009935 |

---

## Disciplina
Projeto Integrador IV - Curso de Engenharia de Software - PUC-Campinas - 2026
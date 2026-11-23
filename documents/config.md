# Guia de Configuração e Execução — PetHealth

Este documento explica como configurar o ambiente de desenvolvimento, preencher as variáveis de ambiente e executar todas as partes do repositório **PetHealth**.

---

## Visão Geral da Arquitetura

O projeto funciona a partir da integração de três componentes:

1. **Banco de dados (MongoDB):** armazena usuários, pets, consultas, vacinas, medicamentos, logs de doses, códigos de recuperação, sessões e arquivos (via GridFS).
2. **Servidor de cálculo (Java: porta TCP `4000`):** recebe os dados do pet em JSON via socket TCP e calcula os indicadores do painel inicial (pendências de hoje, próximos 7 dias, atrasados e dias desde a última consulta).
3. **Backend e Frontend (Node.js + Express: porta HTTP `3000`):** expõe a API REST em `/api/*` e serve os arquivos estáticos do WebApp localizados em `web/`.

---

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Git**
- **Node.js** versão `20` ou superior (recomendado LTS, com `npm` incluso)
- **Java JDK** JDK 21+
- **MongoDB** — pode ser uma conta gratuita no **MongoDB Atlas** (recomendado) ou uma instância local do **MongoDB Community Server**
- **Conta Gmail com Verificação em 2 Etapas ativada** *(opcional para rodar o app, mas necessária para testar a recuperação de senha por e-mail)*

---

## 1. Clonar o repositório

```bash
git clone https://github.com/FelipecoBunny/PI_IV-TIME-25
cd PI_IV-TIME-25
```

---

## 2. Instalar as dependências do Backend (Node.js)

Entre na pasta `backend/` e instale os pacotes listados no `package.json`:

```bash
cd backend
npm install
```

---

## 3. Configurar o Banco de Dados (MongoDB)

Você pode usar o MongoDB Atlas (na nuvem) ou o MongoDB local:

### Opção A — MongoDB Atlas (recomendado)
1. Crie um cluster gratuito no [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Em **Database Access**, crie um usuário e senha com permissão de leitura e escrita.
3. Em **Network Access**, libere o seu IP atual (ou `0.0.0.0/0` em ambiente de testes).
4. Clique em **Connect -> Drivers** e copie a string de conexão (`mongodb+srv://...`).

### Opção B — MongoDB Local
- Com o serviço `mongod` em execução na porta padrão, utilize:
  ```text
  mongodb://127.0.0.1:27017
  ```

> **Observação:** o backend cria automaticamente o banco `pethealth` e os índices necessários na primeira inicialização.

---

## 4. Configurar a Senha de App do Gmail (Recuperação de Senha)

Para que o envio do código de 6 dígitos por e-mail funcione:

1. Acesse [myaccount.google.com](https://myaccount.google.com) com a conta Gmail que fará os envios.
2. Vá em **Segurança** e ative a **Verificação em duas etapas**.
3. Pesquise por **Senhas de app** na barra de busca do topo da Conta Google.
4. Informe um nome (ex.: `PetHealth`) e clique em **Criar**.
5. Copie a senha de **16 letras** gerada e remova os espaços ao colocá-la no `.env`.

---

## 5. Criar o arquivo `backend/.env`

Dentro da pasta `backend/`, crie um arquivo chamado `.env` (você pode usar `backend/.env.example` como base) com o seguinte conteúdo:

```env
# Porta do servidor HTTP (Node.js + Express)
PORT=3000

# Ambiente de execução (use development localmente)
NODE_ENV=development

# String de conexão do MongoDB (Atlas ou local)
MONGODB_URI=mongodb+srv://USUARIO:SENHA@CLUSTER.mongodb.net/?retryWrites=true&w=majority

# Chave secreta usada na assinatura de sessões e no hash dos códigos de recuperação
SESSION_SECRET=substitua-por-uma-chave-aleatoria-segura

# Endereço e porta do servidor TCP em Java
JAVA_SERVER_HOST=127.0.0.1
JAVA_SERVER_PORT=4000

# Credenciais Gmail (Nodemailer) para recuperação de senha
SMTP_USER=seu-email@gmail.com
SMTP_PASS=senhadeappde16letrassemespacos
```

---

## 6. Iniciar o Servidor Java (Porta `4000`)

O painel inicial (`inicial.html`) depende do servidor TCP em Java rodando na porta configurada em `JAVA_SERVER_PORT` (`4000` por padrão).

1. Abra a pasta do servidor Java na sua IDE (VS Code, IntelliJ ou Eclipse) ou pelo terminal.
2. Execute a classe principal do servidor Java e aguarde a confirmação de que ele está escutando na porta `4000`.

---

## 7. Iniciar o Backend Node.js (Porta `3000`)

Em outro terminal, dentro da pasta `backend/`:

- **Modo desenvolvimento** (reinicia automaticamente ao salvar arquivos):
  ```bash
  npm run dev
  ```

- **Modo padrão:**
  ```bash
  npm start
  ```

Se tudo estiver correto, o terminal exibirá:

```text
MongoDB conectado com sucesso.
PetHealth disponível em http://localhost:3000
```

---

## 8. Acessar e testar a aplicação

1. Verifique a saúde da API acessando:
   - `http://localhost:3000/api/health`
   - Resposta esperada: `{"status":"ok","application":"PetHealth"}`
2. Abra a aplicação no navegador:
   - `http://localhost:3000` (redireciona automaticamente para `/login.html`).
3. Faça login com o usuário do seed (`teste@pethealth.com` / `senha123`) ou crie uma nova conta em **Criar conta**.
# Montaki — Sistema de Gestão de Montagens e Orçamentos

Sistema completo para gestão de demandas (montagens e desmontagens de móveis), cálculo e recebimento de orçamentos online e controle financeiro da **Montaki**.

Conta com painel administrativo com controle total de lojas, montadores, comissões e orçamentos, além de painel individual para cada montador da equipe e autoatendimento para clientes.

---

## Recursos do Sistema

### 👑 Painel do Administrador
- **Gestão de Montagens:** Criação manual, importação automática de notas fiscais via foto/OCR ou XML da NF-e, atribuição a montadores e agendamento.
- **Orçamentos Online (Novo):**
  - Geração e compartilhamento de link público para clientes (`/orcamento/solicitar`).
  - Painel de recepção de orçamentos em tempo real com protocolo, detalhes dos móveis e estimativa de valores.
  - Ações rápidas: conversa direta no WhatsApp com mensagem pré-preenchida, aprovação/recusa e conversão de orçamento em montagem com 1 clique.
- **Equipe de Montadores:** Cadastro de montadores, geração de senhas e acompanhamento de comissões por loja.
- **Lojas Parceiras:** Cadastro de parceiros e lojas com CNPJ e regras de comissão específicas.
- **Controle Financeiro:** Acompanhamento de pagamentos de clientes/lojas e repasses de comissões da equipe.

### 🔨 Painel do Montador
- Visualização das montagens atribuídas ao montador logado.
- Endereço com link para Google Maps / Waze e botão de contato com cliente (WhatsApp e ligação).
- Fluxo de execução da montagem (iniciar serviço, coletar assinatura do cliente, foto de comprovante e concluir).
- Painel financeiro próprio com histórico de ganhos e comissões pendentes.

### 🌐 Autoatendimento e Clientes
- **Calculadora e Solicitação de Orçamento:** `/orcamento/solicitar` e `/solicitar-orcamento`
- **Tabela de Preços Oficial:** `/tabela-precos`
- **Página de Avaliação Pós-Serviço:** `/avaliar/[id]`

---

## Acesso e Administradores do Sistema

### Administradores Autorizados
O acesso administrativo está configurado para os e-mails:
- **`pedrobmcity@gmail.com`**
- **`brisasofc@gmail.com`**

Os administradores entram diretamente com o botão **“Entrar com Google”** na tela de login. No primeiro acesso, o sistema cadastra a conta automaticamente com papel de Administrador ativo (`ADMIN`).

### Montadores
Os montadores acessam o sistema com **e-mail e senha** cadastrados previamente pelo administrador no painel.

### Script de Inicialização (Opcional)
Para garantir que os administradores estejam criados no banco antes mesmo do primeiro login:
```bash
npm run admin:criar
```
Ou para cadastrar uma senha de emergência para acesso sem Google:
```bash
npm run admin:criar -- pedrobmcity@gmail.com --senha=SuaSenhaForte123
```

---

## Como Rodar Localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/santwoxx/montaki.git
   cd montaki
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Copie `.env.example` para `.env` e preencha as credenciais do Firebase:
   ```bash
   cp .env.example .env
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Abra [http://localhost:3000](http://localhost:3000) no navegador.

---

## Deploy e Hospedagem (Vercel + Firebase)

O projeto está pronto para deploy automático na **Vercel** conectado ao GitHub (`https://github.com/santwoxx/montaki.git`).

### Variáveis de Ambiente Necessárias no Vercel:
- `FIREBASE_SERVICE_ACCOUNT`: Conteúdo JSON da conta de serviço do Firebase (ou configure `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).
- `SESSION_SECRET`: Chave secreta longa gerada com `openssl rand -base64 32`.
- `BLOB_READ_WRITE_TOKEN`: Token do Vercel Blob (para upload de fotos de comprovantes e assinaturas).
- `ADMIN_EMAILS`: `"pedrobmcity@gmail.com,brisasofc@gmail.com"`

---

## Contato Montaki

- **WhatsApp:** [(24) 99321-0547](https://wa.me/5524993210547)
- **Instagram:** [@montaki_sevices](https://instagram.com/montaki_sevices)

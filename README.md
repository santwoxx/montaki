# Montaki — Sistema de gestão de montagens

Sistema para organizar as demandas (montagens e desmontagens de móveis) e as
finanças da Montaki, com um painel para o administrador e um painel
individual para cada montador.

> **Implantação personalizada.** Esta versão já está configurada para a
> Montaki: identidade visual (nome, cores, contato) e o acesso do
> administrador (veja a seção "Acesso do administrador" abaixo). O login é
> sempre feito com e-mail e senha, tanto para o administrador quanto para os
> montadores — não há login com Google/Firebase.

## O que o sistema faz

**Painel do administrador**
- Cadastra e gerencia os montadores da equipe (cria login e senha de cada um).
- Cadastra as lojas parceiras que enviam pedidos.
- Define a porcentagem de comissão de cada montador, individualmente por loja.
- Cria e atribui montagens a um montador específico (ou deixa "a definir").
- Importa uma nota fiscal para preencher uma montagem nova sozinho: aceita o
  XML da NFe ou uma foto/imagem da nota impressa (a leitura da foto é feita
  por OCR direto no navegador, sem custo). Se a loja da nota ainda não
  estiver cadastrada, o sistema cadastra ela automaticamente.
- Acompanha o status de cada montagem (pendente, em andamento, concluída).
- Controla os pagamentos: se a loja já pagou a empresa e se o montador já
  recebeu sua comissão.
- Tem uma tela financeira com totais por mês, por loja e por montador.

**Painel do montador**
- Vê apenas as montagens atribuídas a ele.
- Ao abrir uma montagem, vê o endereço do cliente (com link direto para o
  mapa), telefone (com botão de ligar e de WhatsApp), o serviço a ser feito
  e o valor da sua comissão.
- Pode marcar a montagem como "iniciada" e depois "concluída".
- Tem uma tela financeira própria mostrando quanto já ganhou, quanto está
  pendente de pagamento e o histórico de montagens concluídas.

**Página pública de avaliação**
- Depois de uma montagem concluída, o cliente final recebe um link para
  avaliar o serviço (estrelas + comentário), sem precisar de login.

## Como rodar o sistema no seu computador

Pré-requisitos:
- [Node.js](https://nodejs.org) instalado (versão 18 ou superior).
- Um banco Postgres na nuvem (gratuito). Recomendado:
  [neon.com](https://neon.com) — crie um projeto e copie as duas strings de
  conexão (pooled e direct) para o arquivo `.env`, nas variáveis
  `DATABASE_URL` e `DIRECT_URL` (veja `.env.example`).

```bash
npm install              # instala as dependências e gera o cliente do Prisma
npx prisma migrate dev   # cria as tabelas no banco (só precisa fazer uma vez)
npm run db:seed          # cria o usuário administrador
npm run dev              # inicia o sistema
```

Depois abra **http://localhost:3000** no navegador.

## Acesso do administrador

O login do administrador (e de cada montador) é feito com **e-mail e
senha** na tela inicial — não existe atalho de login social.

- **E-mail:** `pedrobmcity@gmail.com`
- **Senha:** foi gerada na entrega deste sistema e enviada separadamente
  (fora deste repositório, que é público). Guarde-a em um lugar seguro.

Depois de entrar, use o painel do administrador para cadastrar as lojas
parceiras, os montadores da equipe e as comissões — tudo pela própria
interface, sem precisar mexer em código. O sistema começa "zerado" (sem
lojas, montadores ou montagens de exemplo), pronto para os dados reais.

### Trocar a senha do administrador

Ainda não há uma tela de "trocar senha" para o próprio administrador (os
montadores têm a senha redefinida por ele, no painel). Para trocar a senha
do admin agora, gere um novo hash e atualize o usuário no banco:

```bash
node -e "console.log(require('bcryptjs').hashSync('SUA-NOVA-SENHA', 10))"
npx prisma studio   # abre uma planilha visual do banco; cole o hash no campo "senha" do usuário
```

## Sobre onde os dados ficam guardados

Os dados (montadores, lojas, montagens, comissões etc.) ficam guardados num
banco Postgres na nuvem (Neon), não em um arquivo local — assim o mesmo
banco funciona tanto no seu computador quanto no site publicado na Vercel.
Para visualizar/editar os dados diretamente (uma planilha visual), rode:

```bash
npx prisma studio
```

**Importante:** o provedor do banco (Neon) já cuida de backups automáticos,
mas vale a pena checar as opções de backup do plano escolhido — é lá que
fica todo o histórico financeiro da empresa.

## Integração com sistema externo (opcional)

Se você já tem outro sistema (ex: um app de pedidos/entregas) e quer que
pedidos designados por lá cheguem aqui automaticamente como "notas
pendentes" (em vez de importar manualmente por XML/foto), configure as
variáveis `EXTERNAL_INTEGRATION_*` do `.env.example`. Sem elas, essa
integração fica desativada e o cadastro manual de montagens continua
funcionando normalmente — não é um recurso necessário para usar o sistema.

## Publicando o sistema no Vercel

O deploy é feito subindo este projeto para o Vercel — pela CLI (`vercel`)
ou conectando o repositório do GitHub. As variáveis `DATABASE_URL`,
`DIRECT_URL` e `SESSION_SECRET` do `.env.example` precisam ser cadastradas
nas "Environment Variables" do projeto no Vercel (gere a `SESSION_SECRET`
com `openssl rand -base64 32` — **não deixe em branco**, veja o aviso
abaixo). O `npm install` do build já roda `prisma generate` automaticamente
(script `postinstall` do `package.json`). Depois disso, o link gerado (ex:
`montaki.vercel.app`) já funciona tanto para o admin quanto para os
montadores, em qualquer dispositivo com internet.

> **Atenção:** se `SESSION_SECRET` ficar vazia (variável criada mas sem
> valor) ou ausente, o sistema cai num valor padrão inseguro escrito no
> código-fonte — como este repositório é público, isso permitiria forjar um
> login de administrador. Sempre configure um valor real gerado
> aleatoriamente.

## Contato Montaki

- WhatsApp: [(24) 99321-0547](https://wa.me/5524993210547)
- Instagram: [@montaki_sevices](https://instagram.com/montaki_sevices)

## Estrutura do projeto (para referência técnica)

- `prisma/schema.prisma` — modelo do banco de dados (usuários, lojas,
  comissões, montagens).
- `prisma/seed.ts` — cria o usuário administrador (`npm run db:seed`).
- `lib/prisma.ts` — cliente do Prisma (conecta usando `DATABASE_URL`).
- `lib/auth.ts` — login, sessão e proteção de acesso por papel (admin/montador).
- `lib/actions/` — as ações do sistema (login, criar montador, criar
  montagem, marcar pagamento, etc).
- `app/admin/` — todas as telas do painel do administrador.
- `app/montador/` — todas as telas do painel do montador.
- `app/avaliar/[id]/` — página pública de avaliação para o cliente final.
- `components/` — componentes visuais reutilizados nas telas.

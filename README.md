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

Pré-requisito: [Node.js](https://nodejs.org) instalado (versão 18 ou
superior).

```bash
npm install     # instala as dependências (só precisa fazer uma vez)
npm run dev     # inicia o sistema
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
do admin agora, gere um novo hash e substitua o campo `senha` do usuário
`admin-1` em `lib/mock-db/data.ts`:

```bash
node -e "console.log(require('bcryptjs').hashSync('SUA-NOVA-SENHA', 10))"
```

Copie o hash impresso para o arquivo e reimplante o sistema.

## Sobre onde os dados ficam guardados

Nesta implantação, os dados (montadores, lojas, montagens, comissões etc.)
ficam guardados em memória no próprio servidor (arquivo
`lib/mock-db/data.ts`, através de `lib/prisma.ts`) — não em um banco de
dados externo. Isso quer dizer que os dados **somem a cada novo deploy ou
reinício do servidor**. É suficiente para começar a usar e validar o
sistema no dia a dia, mas para manter o histórico financeiro de forma
permanente o próximo passo recomendado é conectar um banco Postgres real
(ex: [neon.com](https://neon.com), gratuito) via Prisma no lugar do mock —
`lib/prisma.ts` já foi escrito pensando nessa troca.

## Integração com sistema externo (opcional)

Se você já tem outro sistema (ex: um app de pedidos/entregas) e quer que
pedidos designados por lá cheguem aqui automaticamente como "notas
pendentes" (em vez de importar manualmente por XML/foto), configure as
variáveis `EXTERNAL_INTEGRATION_*` do `.env.example`. Sem elas, essa
integração fica desativada e o cadastro manual de montagens continua
funcionando normalmente — não é um recurso necessário para usar o sistema.

## Publicando o sistema no Vercel

O deploy é feito subindo este projeto para o Vercel — pela CLI (`vercel`)
ou conectando o repositório do GitHub. A variável `SESSION_SECRET` do
`.env.example` precisa ser cadastrada nas "Environment Variables" do
projeto no Vercel (gere uma com `openssl rand -base64 32`). Depois disso, o
link gerado (ex: `montaki.vercel.app`) já funciona tanto para o admin
quanto para os montadores, em qualquer dispositivo com internet.

## Contato Montaki

- WhatsApp: [(24) 99321-0547](https://wa.me/5524993210547)
- Instagram: [@montaki_sevices](https://instagram.com/montaki_sevices)

## Estrutura do projeto (para referência técnica)

- `lib/mock-db/` — dados em memória (usuários, lojas, comissões,
  montagens) e o cliente que imita a API do Prisma.
- `lib/auth.ts` — login, sessão e proteção de acesso por papel (admin/montador).
- `lib/actions/` — as ações do sistema (login, criar montador, criar
  montagem, marcar pagamento, etc).
- `app/admin/` — todas as telas do painel do administrador.
- `app/montador/` — todas as telas do painel do montador.
- `app/avaliar/[id]/` — página pública de avaliação para o cliente final.
- `components/` — componentes visuais reutilizados nas telas.

import { Role, StatusMontagem, TipoOcorrencia, User, Loja, ComissaoLoja, Montagem, NotaPendente, Ocorrencia, Avaliacao } from "./types";

// Usuário administrador real do cliente (Montaki). A senha nunca fica em
// texto puro aqui -- é o hash bcrypt gerado uma vez na entrega do sistema
// (veja o README, seção "Acesso do administrador", para instruções de como
// trocar essa senha).
export const usersData: User[] = [
  {
    id: "admin-1",
    nome: "Pedro",
    email: "pedrobmcity@gmail.com",
    telefone: "24993210547",
    fotoUrl: null,
    senha: "$2b$10$OgdzZG3Hx.mJe805P2lgYOD7FXekBNypgIioLo3/Mr6psa88sqSYS",
    role: "ADMIN",
    ativo: true,
    comissaoPadrao: 0,
    createdAt: new Date(),
    _count: { montagens: 0 },
  },
];

// Sem lojas, montadores ou montagens de exemplo: o sistema entra em produção
// com uma folha em branco, pronta para o próprio administrador cadastrar sua
// equipe, lojas parceiras e montagens reais pelo painel.
export const lojasData: Loja[] = [];

export const comissoesData: ComissaoLoja[] = [];

export const montagensData: Montagem[] = [];

export const notasData: NotaPendente[] = [];
export const ocorrenciasData: Ocorrencia[] = [];
export const avaliacoesData: Avaliacao[] = [];

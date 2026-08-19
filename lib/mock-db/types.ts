export type Role = "ADMIN" | "MONTADOR";

export type StatusMontagem = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO" | "CANCELADO";

export type TipoOcorrencia = "CLIENTE_AUSENTE" | "PECA_DANIFICADA" | "REAGENDAR" | "OUTRO";

export interface User {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  fotoUrl: string | null;
  senha?: string;
  role: Role;
  ativo: boolean;
  comissaoPadrao: number;
  createdAt: Date;
  _count?: any;
}

export interface Loja {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  cnpj: string | null;
  ativo: boolean;
  createdAt: Date;
  _count?: any;
}

export interface ComissaoLoja {
  id: string;
  montadorId: string;
  lojaId: string;
  percentual: number;
}

export interface Montagem {
  id: string;
  numeroPedido: string | null;
  lojaId: string;
  montadorId: string | null;
  clienteNome: string;
  clienteTelefone: string | null;
  clienteEndereco: string;
  descricaoServico: string;
  valorServico: number;
  percentualMontador: number;
  valorMontador: number;
  valorAssistencia: number;
  feitoPorAdm: boolean;
  dataAgendada: Date | null;
  status: StatusMontagem;
  pagoPelaLoja: boolean;
  pagoAoMontador: boolean;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
  concluidoEm: Date | null;
  fotoProdutoUrl: string | null;
  assinaturaMontador: string | null;
  assinaturaCliente: string | null;
  manualUrl: string | null;
  manualNomeArquivo: string | null;
  manualTipo: string | null;
  notificadoCentralSyncEm: Date | null;
  avaliacaoSolicitadaEm: Date | null;
  loja: Loja;
  montador: User | null;
  avaliacao: Avaliacao | null;
  ocorrencias: Ocorrencia[];
  _count?: any;
}

export interface NotaPendente {
  id: string;
  numeroPedido: string | null;
  clienteNome: string;
  clienteTelefone: string | null;
  clienteEndereco: string;
  descricaoServico: string;
  valorServico: number | null;
  dataAgendada: Date | null;
  observacoes: string | null;
  lojaNomeSugerida: string | null;
  lojaCnpjSugerido: string | null;
  fotoReferenciaUrl: string | null;
  montadorSugeridoId: string | null;
  montadorSugerido?: User | null;
  criadaEm: Date;
}

export interface Ocorrencia {
  id: string;
  montagemId: string;
  tipo: TipoOcorrencia;
  observacao: string | null;
  fotoUrl: string | null;
  criadoEm: Date;
}

export interface Avaliacao {
  id: string;
  montagemId: string;
  montadorId: string;
  estrelas: number;
  comentario: string | null;
  criadoEm: Date;
  montagem: Montagem;
  montador: User;
}

export namespace Prisma {
  export type MontagemWhereInput = Omit<Partial<Montagem>, 'status' | 'createdAt' | 'dataAgendada' | 'concluidoEm'> & {
    AND?: MontagemWhereInput[];
    OR?: MontagemWhereInput[];
    NOT?: MontagemWhereInput[];
    dataAgendada?: any;
    createdAt?: any;
    concluidoEm?: any;
    status?: any;
  };

  export type UserWhereInput = Partial<User>;
}

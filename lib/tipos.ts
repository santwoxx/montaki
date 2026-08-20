// Tipos do domínio do sistema.
//
// Antes estes tipos vinham gerados pelo Prisma a partir do schema do
// Postgres. Com os dados no Firestore (que não tem schema), eles são a
// única definição do formato de cada documento -- é aqui que se olha para
// saber o que existe em cada coleção.
//
// Convenção: campos de data são sempre `Date` do lado do TypeScript. A
// conversão de/para `Timestamp` do Firestore acontece em lib/db.ts, para
// que nenhuma página precise saber que o Firestore existe.

export type Papel = "ADMIN" | "MONTADOR";

// Distingue quem é da equipe fixa de quem é prestador/parceiro. Só um
// rótulo organizacional: não muda permissão nenhuma (ambos entram com
// e-mail e senha e enxergam o mesmo painel), serve para o admin saber com
// quem está falando na hora de pagar comissão.
export type Vinculo = "FUNCIONARIO" | "COLABORADOR";

export type StatusMontagem =
  | "PENDENTE"
  | "EM_ANDAMENTO"
  | "CONCLUIDO"
  | "CANCELADO";

export type StatusOrcamento = "PENDENTE" | "APROVADO" | "REJEITADO";

export type TipoOcorrencia =
  | "CLIENTE_AUSENTE"
  | "PECA_DANIFICADA"
  | "REAGENDAR"
  | "OUTRO";

export const VINCULO_LABEL: Record<Vinculo, string> = {
  FUNCIONARIO: "Funcionário",
  COLABORADOR: "Colaborador",
};

export type Usuario = {
  id: string;
  nome: string;
  /** Sempre em minúsculas -- é a chave de login e de vínculo com o Google. */
  email: string;
  telefone: string | null;
  fotoUrl: string | null;
  /**
   * Hash bcrypt da senha. `null` para quem entra só com o Google (o
   * administrador), já que nesse caso não existe senha neste sistema.
   */
  senha: string | null;
  role: Papel;
  vinculo: Vinculo | null;
  ativo: boolean;
  comissaoPadrao: number;
  /** uid do Firebase Auth, preenchido no primeiro login com o Google. */
  googleUid: string | null;
  createdAt: Date;
};

export type Loja = {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  /** Só dígitos (ver lib/cnpj.ts) ou null. */
  cnpj: string | null;
  ativo: boolean;
  createdAt: Date;
};

export type ComissaoLoja = {
  id: string;
  montadorId: string;
  lojaId: string;
  percentual: number;
};

export type Montagem = {
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
  orcamentoId: string | null;
};

export type NotaPendente = {
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
  criadaEm: Date;
};

export type Ocorrencia = {
  id: string;
  montagemId: string;
  tipo: TipoOcorrencia;
  observacao: string | null;
  fotoUrl: string | null;
  criadoEm: Date;
};

export type Avaliacao = {
  /** É o próprio id da montagem: garante uma avaliação por montagem. */
  id: string;
  montagemId: string;
  montadorId: string;
  estrelas: number;
  comentario: string | null;
  criadoEm: Date;
};

export type ItemOrcamento = {
  servicoId?: string;
  nome: string;
  quantidade: number;
  valorUnitario: number | null;
  total: number | null;
};

export type Orcamento = {
  id: string;
  cliente: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  observacoes: string | null;
  itens: ItemOrcamento[];
  status: StatusOrcamento;
  total: number;
  origem: "CLIENTE" | "ADMIN";
  criadoEm: Date;
  validoAte: Date | null;
};

/** Montagem com a loja e o montador já resolvidos (o `include` do Prisma). */
export type MontagemComRelacoes = Montagem & {
  loja: Loja | null;
  montador: Usuario | null;
};

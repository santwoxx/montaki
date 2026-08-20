import "server-only";

// Camada de acesso aos dados (Firestore).
//
// Regras que valem para o arquivo inteiro:
//
// 1. Nenhuma página, componente ou ação fala com o Firestore direto -- tudo
//    passa por aqui. Assim o formato dos documentos fica descrito num lugar
//    só e o resto do sistema continua trabalhando com objetos comuns.
//
// 2. As consultas usam no máximo UM filtro `where` e nunca combinam filtro
//    com ordenação. Isso é de propósito: o Firestore indexa cada campo
//    sozinho automaticamente, mas exige um "índice composto" criado à mão
//    para qualquer combinação -- e a consulta quebra em produção enquanto
//    esse índice não existir. Filtrar/ordenar o resto em memória custa
//    pouco no volume deste sistema e não deixa o painel quebrar por causa
//    de um índice esquecido.
//
// 3. As listagens são memoizadas por requisição com `cache()` do React: uma
//    página que precisa de montagens em cinco lugares lê a coleção uma vez
//    só.

import { cache } from "react";
import { Timestamp } from "firebase-admin/firestore";
import { firestore } from "@/lib/firebase/admin";
import { COLECOES, type NomeColecao } from "@/lib/colecoes";
import type {
  Avaliacao,
  ComissaoLoja,
  Loja,
  Montagem,
  NotaPendente,
  Ocorrencia,
  Orcamento,
  Papel,
  StatusMontagem,
  StatusOrcamento,
  TipoOcorrencia,
  Usuario,
  Vinculo,
} from "@/lib/tipos";

export { COLECOES, idComissao } from "@/lib/colecoes";
export type { NomeColecao } from "@/lib/colecoes";

// --- leitura de campos ----------------------------------------------------
// O Firestore não tem schema: um documento pode estar sem um campo que foi
// criado depois, ou com o tipo trocado por uma escrita manual no console.
// Estes conversores garantem que o resto do sistema sempre receba o tipo
// que espera -- um campo faltando vira o padrão, nunca `undefined` solto.

type Dados = Record<string, unknown>;

function texto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo === "" ? null : limpo;
}

function textoObrigatorio(valor: unknown, padrao = ""): string {
  return texto(valor) ?? padrao;
}

function numero(valor: unknown, padrao = 0): number {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string") {
    const convertido = Number(valor);
    if (Number.isFinite(convertido)) return convertido;
  }
  return padrao;
}

function numeroOuNulo(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  return null;
}

function booleano(valor: unknown, padrao = false): boolean {
  return typeof valor === "boolean" ? valor : padrao;
}

function data(valor: unknown): Date | null {
  if (valor instanceof Timestamp) return valor.toDate();
  if (valor instanceof Date) return valor;
  if (typeof valor === "string") {
    const convertida = new Date(valor);
    if (!Number.isNaN(convertida.getTime())) return convertida;
  }
  return null;
}

function dataObrigatoria(valor: unknown): Date {
  return data(valor) ?? new Date(0);
}

function umDe<T extends string>(valor: unknown, opcoes: readonly T[], padrao: T): T {
  return opcoes.includes(valor as T) ? (valor as T) : padrao;
}

function umDeOuNulo<T extends string>(valor: unknown, opcoes: readonly T[]): T | null {
  return opcoes.includes(valor as T) ? (valor as T) : null;
}

const STATUS_MONTAGEM = [
  "PENDENTE",
  "EM_ANDAMENTO",
  "CONCLUIDO",
  "CANCELADO",
] as const satisfies readonly StatusMontagem[];

const STATUS_ORCAMENTO = [
  "PENDENTE",
  "APROVADO",
  "REJEITADO",
] as const satisfies readonly StatusOrcamento[];

const TIPOS_OCORRENCIA = [
  "CLIENTE_AUSENTE",
  "PECA_DANIFICADA",
  "REAGENDAR",
  "OUTRO",
] as const satisfies readonly TipoOcorrencia[];

const VINCULOS = ["FUNCIONARIO", "COLABORADOR"] as const satisfies readonly Vinculo[];

const PAPEIS = ["ADMIN", "MONTADOR"] as const satisfies readonly Papel[];

// --- conversores por coleção ---------------------------------------------

type Documento = { id: string; dados: Dados };

function paraUsuario({ id, dados: d }: Documento): Usuario {
  return {
    id,
    nome: textoObrigatorio(d.nome),
    email: textoObrigatorio(d.email).toLowerCase(),
    telefone: texto(d.telefone),
    fotoUrl: texto(d.fotoUrl),
    senha: texto(d.senha),
    role: umDe(d.role, PAPEIS, "MONTADOR"),
    vinculo: umDeOuNulo(d.vinculo, VINCULOS),
    // Documento antigo sem o campo continua valendo como ativo -- só some
    // da lista quem foi desativado de propósito.
    ativo: booleano(d.ativo, true),
    comissaoPadrao: numero(d.comissaoPadrao),
    googleUid: texto(d.googleUid),
    createdAt: dataObrigatoria(d.createdAt),
  };
}

function paraLoja({ id, dados: d }: Documento): Loja {
  return {
    id,
    nome: textoObrigatorio(d.nome),
    telefone: texto(d.telefone),
    endereco: texto(d.endereco),
    cnpj: texto(d.cnpj),
    ativo: booleano(d.ativo, true),
    createdAt: dataObrigatoria(d.createdAt),
  };
}

function paraComissao({ id, dados: d }: Documento): ComissaoLoja {
  return {
    id,
    montadorId: textoObrigatorio(d.montadorId),
    lojaId: textoObrigatorio(d.lojaId),
    percentual: numero(d.percentual),
  };
}

function paraMontagem({ id, dados: d }: Documento): Montagem {
  return {
    id,
    numeroPedido: texto(d.numeroPedido),
    lojaId: textoObrigatorio(d.lojaId),
    montadorId: texto(d.montadorId),
    clienteNome: textoObrigatorio(d.clienteNome),
    clienteTelefone: texto(d.clienteTelefone),
    clienteEndereco: textoObrigatorio(d.clienteEndereco),
    descricaoServico: textoObrigatorio(d.descricaoServico),
    valorServico: numero(d.valorServico),
    percentualMontador: numero(d.percentualMontador),
    valorMontador: numero(d.valorMontador),
    valorAssistencia: numero(d.valorAssistencia),
    feitoPorAdm: booleano(d.feitoPorAdm),
    dataAgendada: data(d.dataAgendada),
    status: umDe(d.status, STATUS_MONTAGEM, "PENDENTE"),
    pagoPelaLoja: booleano(d.pagoPelaLoja),
    pagoAoMontador: booleano(d.pagoAoMontador),
    observacoes: texto(d.observacoes),
    createdAt: dataObrigatoria(d.createdAt),
    updatedAt: data(d.updatedAt) ?? dataObrigatoria(d.createdAt),
    concluidoEm: data(d.concluidoEm),
    fotoProdutoUrl: texto(d.fotoProdutoUrl),
    assinaturaMontador: texto(d.assinaturaMontador),
    assinaturaCliente: texto(d.assinaturaCliente),
    manualUrl: texto(d.manualUrl),
    manualNomeArquivo: texto(d.manualNomeArquivo),
    manualTipo: texto(d.manualTipo),
    notificadoCentralSyncEm: data(d.notificadoCentralSyncEm),
    avaliacaoSolicitadaEm: data(d.avaliacaoSolicitadaEm),
    orcamentoId: texto(d.orcamentoId),
  };
}

function paraNotaPendente({ id, dados: d }: Documento): NotaPendente {
  return {
    id,
    numeroPedido: texto(d.numeroPedido),
    clienteNome: textoObrigatorio(d.clienteNome),
    clienteTelefone: texto(d.clienteTelefone),
    clienteEndereco: textoObrigatorio(d.clienteEndereco),
    descricaoServico: textoObrigatorio(d.descricaoServico),
    valorServico: numeroOuNulo(d.valorServico),
    dataAgendada: data(d.dataAgendada),
    observacoes: texto(d.observacoes),
    lojaNomeSugerida: texto(d.lojaNomeSugerida),
    lojaCnpjSugerido: texto(d.lojaCnpjSugerido),
    fotoReferenciaUrl: texto(d.fotoReferenciaUrl),
    montadorSugeridoId: texto(d.montadorSugeridoId),
    criadaEm: dataObrigatoria(d.criadaEm),
  };
}

function paraOcorrencia({ id, dados: d }: Documento): Ocorrencia {
  return {
    id,
    montagemId: textoObrigatorio(d.montagemId),
    tipo: umDe(d.tipo, TIPOS_OCORRENCIA, "OUTRO"),
    observacao: texto(d.observacao),
    fotoUrl: texto(d.fotoUrl),
    criadoEm: dataObrigatoria(d.criadoEm),
  };
}

function paraAvaliacao({ id, dados: d }: Documento): Avaliacao {
  return {
    id,
    montagemId: textoObrigatorio(d.montagemId, id),
    montadorId: textoObrigatorio(d.montadorId),
    estrelas: Math.min(5, Math.max(1, Math.round(numero(d.estrelas, 5)))),
    comentario: texto(d.comentario),
    criadoEm: dataObrigatoria(d.criadoEm),
  };
}

function paraOrcamento({ id, dados: d }: Documento): Orcamento {
  const itensBrutos = Array.isArray(d.itens) ? d.itens : [];
  const itens = itensBrutos.map((item: any) => ({
    servicoId: texto(item?.servicoId) || undefined,
    nome: texto(item?.nome) || "Item",
    quantidade: numero(item?.quantidade, 1),
    valorUnitario:
      item?.valorUnitario !== null && item?.valorUnitario !== undefined
        ? numero(item.valorUnitario)
        : null,
    total:
      item?.total !== null && item?.total !== undefined
        ? numero(item.total)
        : null,
  }));

  const origemValida = d.origem === "CLIENTE" || d.origem === "ADMIN" ? d.origem : "ADMIN";

  return {
    id,
    cliente: texto(d.cliente),
    telefone: texto(d.telefone),
    endereco: texto(d.endereco),
    cidade: texto(d.cidade),
    observacoes: texto(d.observacoes),
    itens,
    status: umDe(d.status, STATUS_ORCAMENTO, "PENDENTE"),
    total: numero(d.total),
    origem: origemValida,
    criadoEm: dataObrigatoria(d.criadoEm),
    validoAte: data(d.validoAte),
  };
}

// --- primitivas -----------------------------------------------------------

type Filtro = { campo: string; valor: unknown };

async function lerColecao<T>(
  colecao: NomeColecao,
  converter: (doc: Documento) => T,
  filtro?: Filtro
): Promise<T[]> {
  const base = firestore().collection(colecao);
  const consulta = filtro ? base.where(filtro.campo, "==", filtro.valor) : base;
  const resultado = await consulta.get();
  return resultado.docs.map((doc) => converter({ id: doc.id, dados: doc.data() }));
}

async function lerDocumento<T>(
  colecao: NomeColecao,
  id: string,
  converter: (doc: Documento) => T
): Promise<T | null> {
  if (!id) return null;
  const doc = await firestore().collection(colecao).doc(id).get();
  if (!doc.exists) return null;
  return converter({ id: doc.id, dados: doc.data() ?? {} });
}

/** Cria um documento. Com `id`, usa esse id; sem, o Firestore sorteia um. */
export async function criarDocumento(
  colecao: NomeColecao,
  dados: Dados,
  id?: string
): Promise<string> {
  const ref = id
    ? firestore().collection(colecao).doc(id)
    : firestore().collection(colecao).doc();
  await ref.set(dados);
  return ref.id;
}

/**
 * Cria um documento com um id escolhido, falhando se ele já existir. É como
 * as chaves únicas do Postgres eram usadas: a avaliação é gravada com o id
 * da montagem, então duas tentativas simultâneas não viram duas avaliações.
 */
export async function criarDocumentoExclusivo(
  colecao: NomeColecao,
  id: string,
  dados: Dados
): Promise<void> {
  await firestore().collection(colecao).doc(id).create(dados);
}

export async function atualizarDocumento(
  colecao: NomeColecao,
  id: string,
  dados: Dados
): Promise<void> {
  await firestore().collection(colecao).doc(id).update(dados);
}

/**
 * Atualiza uma montagem carimbando `updatedAt`, que no Postgres era
 * preenchido automaticamente pelo banco.
 */
export async function atualizarMontagem(id: string, dados: Dados): Promise<void> {
  await atualizarDocumento(COLECOES.montagens, id, { ...dados, updatedAt: new Date() });
}

export async function removerDocumento(colecao: NomeColecao, id: string): Promise<void> {
  await firestore().collection(colecao).doc(id).delete();
}

/**
 * Remove vários documentos de uma vez. Usado nas exclusões em cascata que o
 * Postgres fazia sozinho (apagar uma montagem apaga as ocorrências dela).
 */
export async function removerVarios(
  colecao: NomeColecao,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const db = firestore();
  // O limite de operações por lote no Firestore é 500.
  for (let inicio = 0; inicio < ids.length; inicio += 400) {
    const lote = db.batch();
    for (const id of ids.slice(inicio, inicio + 400)) {
      lote.delete(db.collection(colecao).doc(id));
    }
    await lote.commit();
  }
}

// --- ordenação em memória -------------------------------------------------

type Direcao = "asc" | "desc";

function comparar(a: unknown, b: unknown, direcao: Direcao): number {
  // Nulos por último em qualquer direção -- é o comportamento que o painel
  // espera ("sem data" nunca deve encabeçar a lista de próximas montagens).
  const aVazio = a === null || a === undefined;
  const bVazio = b === null || b === undefined;
  if (aVazio && bVazio) return 0;
  if (aVazio) return 1;
  if (bVazio) return -1;

  let resultado: number;
  if (a instanceof Date && b instanceof Date) resultado = a.getTime() - b.getTime();
  else if (typeof a === "number" && typeof b === "number") resultado = a - b;
  else resultado = String(a).localeCompare(String(b), "pt-BR");

  return direcao === "desc" ? -resultado : resultado;
}

/**
 * Ordena por um ou mais campos, do mais importante para o menos. Devolve um
 * array novo (não mexe no original, que costuma vir do cache da requisição).
 */
export function ordenarPor<T>(
  itens: readonly T[],
  ...criterios: Array<[campo: keyof T, direcao?: Direcao]>
): T[] {
  return [...itens].sort((a, b) => {
    for (const [campo, direcao = "asc"] of criterios) {
      const resultado = comparar(a[campo], b[campo], direcao);
      if (resultado !== 0) return resultado;
    }
    return 0;
  });
}

/** Indexa uma lista por id, para resolver relações sem ida extra ao banco. */
export function porId<T extends { id: string }>(itens: readonly T[]): Map<string, T> {
  return new Map(itens.map((item) => [item.id, item]));
}

// --- usuários -------------------------------------------------------------

export const listarUsuarios = cache(async (): Promise<Usuario[]> => {
  const usuarios = await lerColecao(COLECOES.usuarios, paraUsuario);
  return ordenarPor(usuarios, ["nome", "asc"]);
});

export const listarMontadores = cache(async (): Promise<Usuario[]> => {
  const usuarios = await listarUsuarios();
  return usuarios.filter((u) => u.role === "MONTADOR");
});

export async function buscarUsuario(id: string): Promise<Usuario | null> {
  return lerDocumento(COLECOES.usuarios, id, paraUsuario);
}

export async function buscarUsuarioPorEmail(email: string): Promise<Usuario | null> {
  const normalizado = email.trim().toLowerCase();
  if (!normalizado) return null;
  const encontrados = await lerColecao(COLECOES.usuarios, paraUsuario, {
    campo: "email",
    valor: normalizado,
  });
  return encontrados[0] ?? null;
}

// --- lojas ----------------------------------------------------------------

export const listarLojas = cache(async (): Promise<Loja[]> => {
  const lojas = await lerColecao(COLECOES.lojas, paraLoja);
  return ordenarPor(lojas, ["nome", "asc"]);
});

export async function buscarLoja(id: string): Promise<Loja | null> {
  return lerDocumento(COLECOES.lojas, id, paraLoja);
}

export async function buscarLojaPorCnpj(cnpj: string): Promise<Loja | null> {
  if (!cnpj) return null;
  const encontradas = await lerColecao(COLECOES.lojas, paraLoja, {
    campo: "cnpj",
    valor: cnpj,
  });
  return encontradas[0] ?? null;
}

// --- comissões ------------------------------------------------------------

export const listarComissoes = cache(async (): Promise<ComissaoLoja[]> => {
  return lerColecao(COLECOES.comissoes, paraComissao);
});

export async function listarComissoesDoMontador(
  montadorId: string
): Promise<ComissaoLoja[]> {
  const comissoes = await listarComissoes();
  return comissoes.filter((c) => c.montadorId === montadorId);
}

// --- montagens ------------------------------------------------------------

/**
 * Todas as montagens, da mais recente para a mais antiga. Só o painel do
 * admin usa esta versão sem filtro; o montador usa
 * `listarMontagensDoMontador`, que já corta no banco o que não é dele.
 */
export const listarMontagens = cache(async (): Promise<Montagem[]> => {
  const montagens = await lerColecao(COLECOES.montagens, paraMontagem);
  return ordenarPor(montagens, ["createdAt", "desc"]);
});

export const listarMontagensDoMontador = cache(
  async (montadorId: string): Promise<Montagem[]> => {
    const montagens = await lerColecao(COLECOES.montagens, paraMontagem, {
      campo: "montadorId",
      valor: montadorId,
    });
    return ordenarPor(montagens, ["createdAt", "desc"]);
  }
);

export async function listarMontagensDaLoja(lojaId: string): Promise<Montagem[]> {
  return lerColecao(COLECOES.montagens, paraMontagem, {
    campo: "lojaId",
    valor: lojaId,
  });
}

export async function listarMontagensDoOrcamento(
  orcamentoId: string
): Promise<Montagem[]> {
  return lerColecao(COLECOES.montagens, paraMontagem, {
    campo: "orcamentoId",
    valor: orcamentoId,
  });
}

export async function buscarMontagem(id: string): Promise<Montagem | null> {
  return lerDocumento(COLECOES.montagens, id, paraMontagem);
}

export async function buscarMontagens(ids: string[]): Promise<Montagem[]> {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (unicos.length === 0) return [];
  const db = firestore();
  const docs = await db.getAll(
    ...unicos.map((id) => db.collection(COLECOES.montagens).doc(id))
  );
  return docs
    .filter((doc) => doc.exists)
    .map((doc) => paraMontagem({ id: doc.id, dados: doc.data() ?? {} }));
}

// --- notas pendentes ------------------------------------------------------

export const listarNotasPendentes = cache(async (): Promise<NotaPendente[]> => {
  const notas = await lerColecao(COLECOES.notasPendentes, paraNotaPendente);
  return ordenarPor(notas, ["criadaEm", "asc"]);
});

export async function buscarNotaPendente(id: string): Promise<NotaPendente | null> {
  return lerDocumento(COLECOES.notasPendentes, id, paraNotaPendente);
}

// --- ocorrências ----------------------------------------------------------

export const listarOcorrencias = cache(async (): Promise<Ocorrencia[]> => {
  const ocorrencias = await lerColecao(COLECOES.ocorrencias, paraOcorrencia);
  return ordenarPor(ocorrencias, ["criadoEm", "desc"]);
});

export async function listarOcorrenciasDaMontagem(
  montagemId: string
): Promise<Ocorrencia[]> {
  const ocorrencias = await lerColecao(COLECOES.ocorrencias, paraOcorrencia, {
    campo: "montagemId",
    valor: montagemId,
  });
  return ordenarPor(ocorrencias, ["criadoEm", "desc"]);
}

/** Quantas ocorrências cada montagem tem -- o `_count` da listagem. */
export async function contarOcorrenciasPorMontagem(): Promise<Map<string, number>> {
  const ocorrencias = await listarOcorrencias();
  const contagem = new Map<string, number>();
  for (const ocorrencia of ocorrencias) {
    contagem.set(ocorrencia.montagemId, (contagem.get(ocorrencia.montagemId) ?? 0) + 1);
  }
  return contagem;
}

// --- avaliações -----------------------------------------------------------

export const listarAvaliacoes = cache(async (): Promise<Avaliacao[]> => {
  const avaliacoes = await lerColecao(COLECOES.avaliacoes, paraAvaliacao);
  return ordenarPor(avaliacoes, ["criadoEm", "desc"]);
});

export async function listarAvaliacoesDoMontador(
  montadorId: string
): Promise<Avaliacao[]> {
  const avaliacoes = await lerColecao(COLECOES.avaliacoes, paraAvaliacao, {
    campo: "montadorId",
    valor: montadorId,
  });
  return ordenarPor(avaliacoes, ["criadoEm", "desc"]);
}

/** A avaliação é gravada com o id da própria montagem (uma por montagem). */
export async function buscarAvaliacaoDaMontagem(
  montagemId: string
): Promise<Avaliacao | null> {
  return lerDocumento(COLECOES.avaliacoes, montagemId, paraAvaliacao);
}

export type ResumoAvaliacoes = { media: number; total: number };

export function resumirAvaliacoes(avaliacoes: readonly Avaliacao[]): ResumoAvaliacoes {
  if (avaliacoes.length === 0) return { media: 0, total: 0 };
  const soma = avaliacoes.reduce((total, a) => total + a.estrelas, 0);
  return { media: soma / avaliacoes.length, total: avaliacoes.length };
}

/** Média e total de estrelas por montador, para as listagens de equipe. */
export async function resumirAvaliacoesPorMontador(): Promise<
  Map<string, ResumoAvaliacoes>
> {
  const avaliacoes = await listarAvaliacoes();
  const porMontador = new Map<string, Avaliacao[]>();
  for (const avaliacao of avaliacoes) {
    const lista = porMontador.get(avaliacao.montadorId);
    if (lista) lista.push(avaliacao);
    else porMontador.set(avaliacao.montadorId, [avaliacao]);
  }
  return new Map(
    [...porMontador].map(([montadorId, lista]) => [montadorId, resumirAvaliacoes(lista)])
  );
}

// --- orçamentos -----------------------------------------------------------

export const listarOrcamentos = cache(async (): Promise<Orcamento[]> => {
  const orcamentos = await lerColecao(COLECOES.orcamentos, paraOrcamento);
  return ordenarPor(orcamentos, ["criadoEm", "desc"]);
});

export async function buscarOrcamento(id: string): Promise<Orcamento | null> {
  return lerDocumento(COLECOES.orcamentos, id, paraOrcamento);
}


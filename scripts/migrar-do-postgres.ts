// Copia os dados do Postgres antigo (a versão do sistema que usava Prisma)
// para o Firestore.
//
//   npm run migrar:postgres
//
// Precisa de duas coisas no .env: a conexão do Postgres antigo
// (`DATABASE_URL` ou `DIRECT_URL`) e a credencial do Firebase
// (`FIREBASE_SERVICE_ACCOUNT` ou `FIREBASE_CLIENT_EMAIL` +
// `FIREBASE_PRIVATE_KEY`).
//
// Só é necessário para quem já tinha o sistema rodando com dados reais. Se
// o Firestore vai começar zerado, pode ignorar este script.
//
// Os ids são preservados: os links já entregues a clientes (avaliação e
// orçamento) continuam funcionando depois da migração. Rodar de novo
// regrava os mesmos documentos por cima -- é seguro repetir se algo falhar
// no meio.

import "dotenv/config";
import { Client } from "pg";
import { COLECOES, idComissao, type NomeColecao } from "../lib/colecoes";
import { firestore } from "../lib/firebase/admin";

type Linha = Record<string, unknown>;

const db = firestore();

function texto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo === "" ? null : limpo;
}

function numero(valor: unknown, padrao = 0): number {
  const convertido = typeof valor === "string" ? Number(valor) : valor;
  return typeof convertido === "number" && Number.isFinite(convertido)
    ? convertido
    : padrao;
}

function numeroOuNulo(valor: unknown): number | null {
  const convertido = typeof valor === "string" ? Number(valor) : valor;
  return typeof convertido === "number" && Number.isFinite(convertido)
    ? convertido
    : null;
}

function booleano(valor: unknown, padrao = false): boolean {
  return typeof valor === "boolean" ? valor : padrao;
}

function data(valor: unknown): Date | null {
  if (valor instanceof Date) return valor;
  if (typeof valor === "string") {
    const convertida = new Date(valor);
    if (!Number.isNaN(convertida.getTime())) return convertida;
  }
  return null;
}

function dataObrigatoria(valor: unknown): Date {
  return data(valor) ?? new Date();
}

/** Grava em lotes de 400 (o limite do Firestore por lote é 500). */
async function gravar(
  colecao: NomeColecao,
  documentos: Array<{ id: string; dados: Linha }>
) {
  for (let inicio = 0; inicio < documentos.length; inicio += 400) {
    const lote = db.batch();
    for (const { id, dados } of documentos.slice(inicio, inicio + 400)) {
      lote.set(db.collection(colecao).doc(id), dados);
    }
    await lote.commit();
  }
  console.log(`  ${colecao}: ${documentos.length} documento(s)`);
}

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Configure DATABASE_URL (ou DIRECT_URL) no .env com a conexão do Postgres antigo."
    );
  }

  const cliente = new Client({
    connectionString,
    // Neon e a maioria dos Postgres gerenciados exigem TLS, mas o
    // certificado não bate com o host pelo pooler -- é uma cópia pontual de
    // dados, feita pelo dono do banco.
    ssl: { rejectUnauthorized: false },
  });
  await cliente.connect();
  console.log("Conectado ao Postgres. Copiando para o Firestore...\n");

  const ler = async (tabela: string): Promise<Linha[]> => {
    const resultado = await cliente.query(`SELECT * FROM "${tabela}"`);
    return resultado.rows as Linha[];
  };

  const usuarios = await ler("User");
  await gravar(
    COLECOES.usuarios,
    usuarios.map((u) => ({
      id: String(u.id),
      dados: {
        nome: texto(u.nome) ?? "",
        email: (texto(u.email) ?? "").toLowerCase(),
        telefone: texto(u.telefone),
        fotoUrl: texto(u.fotoUrl),
        // O hash bcrypt vai como está: as senhas da equipe continuam
        // valendo exatamente como antes da migração.
        senha: texto(u.senha),
        role: u.role === "ADMIN" ? "ADMIN" : "MONTADOR",
        // O vínculo (funcionário/colaborador) não existia no banco antigo.
        // Fica em branco e o admin define no painel, pessoa por pessoa.
        vinculo: null,
        ativo: booleano(u.ativo, true),
        comissaoPadrao: numero(u.comissaoPadrao),
        googleUid: null,
        createdAt: dataObrigatoria(u.createdAt),
      },
    }))
  );

  const lojas = await ler("Loja");
  await gravar(
    COLECOES.lojas,
    lojas.map((l) => ({
      id: String(l.id),
      dados: {
        nome: texto(l.nome) ?? "",
        telefone: texto(l.telefone),
        endereco: texto(l.endereco),
        cnpj: texto(l.cnpj),
        ativo: booleano(l.ativo, true),
        createdAt: dataObrigatoria(l.createdAt),
      },
    }))
  );

  const comissoes = await ler("ComissaoLoja");
  await gravar(
    COLECOES.comissoes,
    comissoes.map((c) => ({
      // Id derivado do par (montador, loja) -- é o que substitui a chave
      // única do Postgres.
      id: idComissao(String(c.montadorId), String(c.lojaId)),
      dados: {
        montadorId: String(c.montadorId),
        lojaId: String(c.lojaId),
        percentual: numero(c.percentual),
      },
    }))
  );

  const montagens = await ler("Montagem");
  await gravar(
    COLECOES.montagens,
    montagens.map((m) => ({
      id: String(m.id),
      dados: {
        numeroPedido: texto(m.numeroPedido),
        lojaId: String(m.lojaId),
        montadorId: texto(m.montadorId),
        clienteNome: texto(m.clienteNome) ?? "",
        clienteTelefone: texto(m.clienteTelefone),
        clienteEndereco: texto(m.clienteEndereco) ?? "",
        descricaoServico: texto(m.descricaoServico) ?? "",
        valorServico: numero(m.valorServico),
        percentualMontador: numero(m.percentualMontador),
        valorMontador: numero(m.valorMontador),
        valorAssistencia: numero(m.valorAssistencia),
        feitoPorAdm: booleano(m.feitoPorAdm),
        dataAgendada: data(m.dataAgendada),
        status: texto(m.status) ?? "PENDENTE",
        pagoPelaLoja: booleano(m.pagoPelaLoja),
        pagoAoMontador: booleano(m.pagoAoMontador),
        observacoes: texto(m.observacoes),
        createdAt: dataObrigatoria(m.createdAt),
        updatedAt: dataObrigatoria(m.updatedAt),
        concluidoEm: data(m.concluidoEm),
        fotoProdutoUrl: texto(m.fotoProdutoUrl),
        assinaturaMontador: texto(m.assinaturaMontador),
        assinaturaCliente: texto(m.assinaturaCliente),
        manualUrl: texto(m.manualUrl),
        manualNomeArquivo: texto(m.manualNomeArquivo),
        manualTipo: texto(m.manualTipo),
        notificadoCentralSyncEm: data(m.notificadoCentralSyncEm),
        avaliacaoSolicitadaEm: data(m.avaliacaoSolicitadaEm),
        orcamentoId: texto(m.orcamentoId),
      },
    }))
  );

  const notas = await ler("NotaPendente");
  await gravar(
    COLECOES.notasPendentes,
    notas.map((n) => ({
      id: String(n.id),
      dados: {
        numeroPedido: texto(n.numeroPedido),
        clienteNome: texto(n.clienteNome) ?? "",
        clienteTelefone: texto(n.clienteTelefone),
        clienteEndereco: texto(n.clienteEndereco) ?? "",
        descricaoServico: texto(n.descricaoServico) ?? "",
        valorServico: numeroOuNulo(n.valorServico),
        dataAgendada: data(n.dataAgendada),
        observacoes: texto(n.observacoes),
        lojaNomeSugerida: texto(n.lojaNomeSugerida),
        lojaCnpjSugerido: texto(n.lojaCnpjSugerido),
        fotoReferenciaUrl: texto(n.fotoReferenciaUrl),
        montadorSugeridoId: texto(n.montadorSugeridoId),
        criadaEm: dataObrigatoria(n.criadaEm),
      },
    }))
  );

  const ocorrencias = await ler("Ocorrencia");
  await gravar(
    COLECOES.ocorrencias,
    ocorrencias.map((o) => ({
      id: String(o.id),
      dados: {
        montagemId: String(o.montagemId),
        tipo: texto(o.tipo) ?? "OUTRO",
        observacao: texto(o.observacao),
        fotoUrl: texto(o.fotoUrl),
        criadoEm: dataObrigatoria(o.criadoEm),
      },
    }))
  );

  const avaliacoes = await ler("Avaliacao");
  await gravar(
    COLECOES.avaliacoes,
    avaliacoes.map((a) => ({
      // A avaliação passa a ser gravada com o id da própria montagem -- é
      // assim que "uma avaliação por montagem" continua garantido.
      id: String(a.montagemId),
      dados: {
        montagemId: String(a.montagemId),
        montadorId: String(a.montadorId),
        estrelas: numero(a.estrelas, 5),
        comentario: texto(a.comentario),
        criadoEm: dataObrigatoria(a.criadoEm),
      },
    }))
  );

  const orcamentos = await ler("Orcamento");
  await gravar(
    COLECOES.orcamentos,
    orcamentos.map((o) => ({
      id: String(o.id),
      dados: {
        cliente: texto(o.cliente),
        telefone: texto(o.telefone),
        status: texto(o.status) ?? "PENDENTE",
        total: numero(o.total),
        criadoEm: dataObrigatoria(o.criadoEm),
        validoAte: data(o.validoAte),
      },
    }))
  );

  await cliente.end();
  console.log("\nMigração concluída.");
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error("\nFalha na migração:", erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });

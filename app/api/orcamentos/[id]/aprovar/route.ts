import { NextRequest, NextResponse } from "next/server";
import { COLECOES, atualizarDocumento, buscarOrcamento } from "@/lib/db";

// Rota pública de propósito: quem aprova é o cliente final, pelo link do
// orçamento, sem login. A proteção é o id do orçamento (sorteado, não
// enumerável) somada à checagem de que ele ainda está pendente -- uma vez
// respondido, não dá para mudar a resposta por aqui.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await req.json(); // "APROVAR" ou "REJEITAR"

    if (action !== "APROVAR" && action !== "REJEITAR") {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }

    const orcamento = await buscarOrcamento(id);

    if (!orcamento) {
      return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
    }

    if (orcamento.status !== "PENDENTE") {
      return NextResponse.json({ error: "O orçamento não está mais pendente." }, { status: 400 });
    }

    const status = action === "APROVAR" ? "APROVADO" : "REJEITADO";
    await atualizarDocumento(COLECOES.orcamentos, id, { status });

    return NextResponse.json({ orcamento: { ...orcamento, status } }, { status: 200 });
  } catch (error) {
    console.error("Erro ao atualizar orçamento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

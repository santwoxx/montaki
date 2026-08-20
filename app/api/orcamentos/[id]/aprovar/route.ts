import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

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

    const orcamentoRef = adminDb.collection("orcamentos").doc(id);
    const orcamentoDoc = await orcamentoRef.get();

    if (!orcamentoDoc.exists) {
      return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
    }

    const orcamento = orcamentoDoc.data();

    if (orcamento?.status !== "PENDENTE") {
      return NextResponse.json({ error: "O orçamento não está mais pendente." }, { status: 400 });
    }

    const newStatus = action === "APROVAR" ? "APROVADO" : "REJEITADO";

    await orcamentoRef.update({
      status: newStatus,
    });

    return NextResponse.json({ orcamento: { id, ...orcamento, status: newStatus } }, { status: 200 });
  } catch (error) {
    console.error("Erro ao atualizar orçamento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

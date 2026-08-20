import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const orcamento = await prisma.orcamento.findUnique({
      where: { id },
    });

    if (!orcamento) {
      return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
    }

    if (orcamento.status !== "PENDENTE") {
      return NextResponse.json({ error: "O orçamento não está mais pendente." }, { status: 400 });
    }

    const updated = await prisma.orcamento.update({
      where: { id },
      data: {
        status: action === "APROVAR" ? "APROVADO" : "REJEITADO",
      },
    });

    return NextResponse.json({ orcamento: updated }, { status: 200 });
  } catch (error) {
    console.error("Erro ao atualizar orçamento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

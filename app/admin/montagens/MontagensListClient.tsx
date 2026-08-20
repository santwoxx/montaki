"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Vazio } from "@/components/ui";
import { formatarData, formatarMoeda, STATUS_COLOR, STATUS_LABEL } from "@/lib/format";
import type { StatusMontagem } from "@/lib/tipos";

type Montagem = {
  id: string;
  clienteNome: string;
  feitoPorAdm: boolean;
  dataAgendada: Date | null;
  valorServico: number;
  status: StatusMontagem;
  pagoPelaLoja: boolean;
  loja: { nome: string };
  montador: { nome: string } | null;
  _count: { ocorrencias: number };
};

export default function MontagensListClient({
  montagens,
}: {
  montagens: Montagem[];
}) {
  const router = useRouter();
  const [selecaoAtiva, setSelecaoAtiva] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSelecao = (id: string) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleGerarOrcamento = async () => {
    if (selecionados.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/orcamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montagensIds: selecionados }),
      });
      if (res.ok) {
        const { orcamentoId } = await res.json();
        router.push(`/admin/orcamentos/${orcamentoId}`);
      } else {
        alert("Erro ao gerar orçamento");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar orçamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (montagens.length === 0) {
    return <Vazio>Nenhuma montagem encontrada com esses filtros.</Vazio>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {selecaoAtiva ? (
          <div className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm w-full md:w-auto justify-between border border-slate-200">
            <span className="text-sm font-medium text-slate-700">
              {selecionados.length} selecionada(s)
            </span>
            <div className="flex gap-2">
              <Button
                variante="secundario"
                type="button"
                onClick={() => {
                  setSelecaoAtiva(false);
                  setSelecionados([]);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleGerarOrcamento}
                disabled={selecionados.length === 0 || isSubmitting}
              >
                {isSubmitting ? "Gerando..." : "Gerar Orçamento"}
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variante="secundario" onClick={() => setSelecaoAtiva(true)}>
            Selecionar para Orçamento
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {montagens.map((m) => {
          const isSelected = selecionados.includes(m.id);
          const cardContent = (
            <Card
              className={`transition-shadow hover:shadow-md ${
                selecaoAtiva && isSelected ? "border-navy ring-2 ring-navy/20" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  {selecaoAtiva && (
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="h-5 w-5 rounded border-slate-300 text-navy focus:ring-navy"
                      />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{m.clienteNome}</p>
                    <p className="text-sm text-slate-500">
                      {m.loja.nome} ·{" "}
                      {m.feitoPorAdm ? (
                        <span className="font-medium text-navy">
                          A própria empresa (ADM)
                        </span>
                      ) : m.montador ? (
                        m.montador.nome
                      ) : (
                        "Sem montador"
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatarData(m.dataAgendada)} · {formatarMoeda(m.valorServico)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={STATUS_COLOR[m.status]}>
                    {STATUS_LABEL[m.status]}
                  </Badge>
                  {!m.pagoPelaLoja && m.status !== "CANCELADO" ? (
                    <span className="text-xs text-amber-600">Loja não pagou</span>
                  ) : null}
                  {m._count.ocorrencias > 0 ? (
                    <span className="text-xs font-medium text-red-600">
                      ⚠ {m._count.ocorrencias} ocorrência
                      {m._count.ocorrencias > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            </Card>
          );

          if (selecaoAtiva) {
            return (
              <div
                key={m.id}
                onClick={() => toggleSelecao(m.id)}
                className="cursor-pointer"
              >
                {cardContent}
              </div>
            );
          }

          return (
            <Link key={m.id} href={`/admin/montagens/${m.id}`}>
              {cardContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

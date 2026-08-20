"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export default function OrcamentoActionsClient({ orcamentoId }: { orcamentoId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async (action: "APROVAR" | "REJEITAR") => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orcamentos/${orcamentoId}/aprovar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Ocorreu um erro ao processar sua solicitação.");
      }
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro ao processar sua solicitação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mt-6">
      <Button
        variante="sucesso"
        className="w-full"
        onClick={() => handleAction("APROVAR")}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Processando..." : "Aprovar Orçamento"}
      </Button>
      <Button
        variante="perigo"
        className="w-full"
        onClick={() => {
          if (confirm("Tem certeza que deseja recusar este orçamento?")) {
            handleAction("REJEITAR");
          }
        }}
        disabled={isSubmitting}
      >
        Recusar
      </Button>
    </div>
  );
}

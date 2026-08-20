"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";

export default function LinkClient({ orcamentoId }: { orcamentoId: string }) {
  const [link, setLink] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    // Generate the full URL only on the client to get the correct origin
    setLink(`${window.location.origin}/orcamento/${orcamentoId}`);
  }, [orcamentoId]);

  const handleCopy = () => {
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  if (!link) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
        <span className="truncate text-sm text-slate-600 mr-2">{link}</span>
        <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
          {copiado ? "Copiado!" : "Copiar"}
        </Button>
      </div>
      <Button
        className="w-full"
        onClick={() => {
          const text = encodeURIComponent(`Olá! Segue o link para o seu orçamento de montagem:\n\n${link}`);
          window.open(`https://wa.me/?text=${text}`, "_blank");
        }}
      >
        Enviar pelo WhatsApp
      </Button>
    </div>
  );
}

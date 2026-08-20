"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

// O link chega pronto do servidor (ver lib/urlBase.ts): montar aqui com
// window.location obrigaria a renderizar uma vez sem link para não quebrar
// a hidratação.
export default function LinkClient({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
        <span className="truncate text-sm text-slate-600 mr-2">{link}</span>
        <Button variante="secundario" onClick={handleCopy} className="shrink-0 text-sm px-3 py-2 sm:px-3 sm:py-2">
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

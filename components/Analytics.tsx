"use client";

import { useEffect } from "react";
import { iniciarAnalytics } from "@/lib/firebase/cliente";

/**
 * Liga o Google Analytics do Firebase uma vez, depois que a página carrega.
 * Não renderiza nada e nunca quebra a navegação: se o Analytics não puder
 * subir (navegador sem suporte, bloqueador de rastreamento), o sistema
 * segue normalmente.
 */
export function Analytics() {
  useEffect(() => {
    void iniciarAnalytics();
  }, []);

  return null;
}

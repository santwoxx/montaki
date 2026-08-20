import "server-only";

import { headers } from "next/headers";

/**
 * Endereço público do sistema, para montar links que vão sair daqui (o link
 * de avaliação e o de orçamento enviados ao cliente por WhatsApp).
 *
 * Prefere `NEXT_PUBLIC_APP_URL` quando configurada; senão, deduz do host da
 * requisição. Fica no servidor de propósito: montar o link no navegador com
 * `window.location.origin` obrigaria a renderizar duas vezes (uma sem link)
 * para não quebrar a hidratação.
 */
export async function obterUrlBase() {
  const configurada = process.env.NEXT_PUBLIC_APP_URL;
  if (configurada) return configurada.replace(/\/+$/, "");

  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "localhost:3000";
  const proto =
    cabecalhos.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

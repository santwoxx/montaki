import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { normalizarCnpj } from "@/lib/cnpj";

const ALLOWED_ORIGIN = process.env.EXTERNAL_INTEGRATION_ORIGIN;
const TAMANHO_MAXIMO_CAMPO = 300;
const TAMANHO_MAXIMO_TEXTO_LONGO = 2000;
const TAMANHO_MAXIMO_URL = 2000;

function corsHeaders(): Record<string, string> {
  if (!ALLOWED_ORIGIN) return {};
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-integracao-key",
    Vary: "Origin",
  };
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function textoValido(valor: unknown, tamanhoMaximo: number): string | undefined {
  if (typeof valor !== "string") return undefined;
  const texto = valor.trim().slice(0, tamanhoMaximo);
  return texto || undefined;
}

function urlValida(valor: unknown, tamanhoMaximo: number): string | undefined {
  const texto = textoValido(valor, tamanhoMaximo);
  if (!texto) return undefined;
  try {
    const url = new URL(texto);
    return url.protocol === "https:" || url.protocol === "http:" ? texto : undefined;
  } catch {
    return undefined;
  }
}

function numeroPositivoValido(valor: unknown): number | undefined {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) return undefined;
  return Math.round(valor * 100) / 100;
}

export async function POST(request: Request) {
  const chaveEsperada = process.env.EXTERNAL_INTEGRATION_API_KEY;
  const chaveRecebida = request.headers.get("x-integracao-key");

  if (!chaveEsperada || chaveRecebida !== chaveEsperada) {
    return jsonResponse(401, { ok: false, erro: "Chave de acesso inválida." });
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, erro: "JSON inválido." });
  }

  const dados = corpo as Record<string, unknown>;

  const clienteNome = textoValido(dados.clienteNome, TAMANHO_MAXIMO_CAMPO);
  const clienteEndereco = textoValido(dados.clienteEndereco, TAMANHO_MAXIMO_CAMPO);
  const descricaoServico = textoValido(dados.descricaoServico, TAMANHO_MAXIMO_TEXTO_LONGO);

  if (!clienteNome || !clienteEndereco || !descricaoServico) {
    return jsonResponse(400, {
      ok: false,
      erro: "clienteNome, clienteEndereco e descricaoServico são obrigatórios.",
    });
  }

  const clienteTelefone = textoValido(dados.clienteTelefone, TAMANHO_MAXIMO_CAMPO);
  const numeroPedido = textoValido(dados.numeroPedido, TAMANHO_MAXIMO_CAMPO);
  const observacoes = textoValido(dados.observacoes, TAMANHO_MAXIMO_TEXTO_LONGO);
  const montadorSugeridoNome = textoValido(dados.montadorSugerido, TAMANHO_MAXIMO_CAMPO);
  const valorServico = numeroPositivoValido(dados.valorServico);
  const fotoReferenciaUrl = urlValida(dados.fotoReferenciaUrl, TAMANHO_MAXIMO_URL);
  
  const lojaNomeSugerida = textoValido(dados.lojaNome, TAMANHO_MAXIMO_CAMPO);
  const lojaCnpjSugerido = normalizarCnpj(textoValido(dados.lojaCnpj, TAMANHO_MAXIMO_CAMPO)) ?? undefined;

  let dataAgendada: Date | undefined;
  const dataAgendadaBruta = textoValido(dados.dataAgendada, 20);
  if (dataAgendadaBruta) {
    const parsed = new Date(`${dataAgendadaBruta}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) dataAgendada = parsed;
  }

  let montadorSugeridoId: string | undefined;
  if (montadorSugeridoNome) {
    const usersSnapshot = await adminDb.collection("users")
      .where("role", "==", "MONTADOR")
      .where("ativo", "==", true)
      .where("nome", "==", montadorSugeridoNome) // Firebase requires exact match, case sensitive. For insensitive we'd need another field or search tool like Algolia.
      .limit(1)
      .get();
      
    if (!usersSnapshot.empty) {
      montadorSugeridoId = usersSnapshot.docs[0].id;
    }
  }

  const notaData = {
    numeroPedido: numeroPedido || null,
    clienteNome,
    clienteTelefone: clienteTelefone || null,
    clienteEndereco,
    descricaoServico,
    valorServico: valorServico || null,
    dataAgendada: dataAgendada || null,
    observacoes: observacoes || null,
    fotoReferenciaUrl: fotoReferenciaUrl || null,
    montadorSugeridoId: montadorSugeridoId || null,
    lojaNomeSugerida: lojaNomeSugerida || null,
    lojaCnpjSugerido: lojaCnpjSugerido || null,
    criadaEm: new Date(),
  };

  const notaPendenteRef = await adminDb.collection("notasPendentes").add(notaData);

  return jsonResponse(201, { ok: true, id: notaPendenteRef.id });
}

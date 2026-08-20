import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "O arquivo precisa ser uma imagem (JPG, PNG, WebP)." },
        { status: 400 }
      );
    }

    // Limite de 15MB
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: "A imagem deve ter no máximo 15 MB." },
        { status: 400 }
      );
    }

    // Se temos o token do Vercel Blob configurado, usamos o Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const partesNome = file.name.split(".");
      const extensao = partesNome.length > 1 ? partesNome.pop() : "jpg";
      const blob = await put(`orcamentos-clientes/${Date.now()}.${extensao}`, file, {
        access: "public",
        addRandomSuffix: true,
      });

      return NextResponse.json({ url: blob.url });
    }

    // Fallback seguro para desenvolvimento local sem Blob configurado:
    // Converte para Base64 Data URL para permitir teste completo
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({ url: dataUrl });
  } catch (error) {
    console.error("Erro no upload de foto do móvel:", error);
    return NextResponse.json(
      { error: "Não foi possível enviar a imagem. Tente novamente." },
      { status: 500 }
    );
  }
}

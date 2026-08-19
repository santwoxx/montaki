"use client";

import { useId, useState } from "react";

export type PontoFaturamento = {
  /** Rótulo curto do mês (ex: "mar") */
  label: string;
  /** Rótulo completo pro tooltip (ex: "Março de 2026") */
  labelCompleto: string;
  valor: number;
  atual?: boolean;
};

function formatarMoedaCompacta(valor: number) {
  if (valor >= 1000) {
    return `R$ ${(valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  }
  return `R$ ${valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

function formatarMoedaCompleta(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Caminho de uma barra com cantos arredondados só no topo (base reta,
// encostada na linha de base) — SVG não tem um jeito nativo de arredondar
// só duas pontas de um <rect>.
function caminhoBarra(x: number, y: number, largura: number, altura: number, raio: number) {
  const r = Math.min(raio, largura / 2, Math.max(altura, 0));
  if (altura <= 0) return "";
  return `M${x},${y + altura} V${y + r} Q${x},${y} ${x + r},${y} H${x + largura - r} Q${x + largura},${y} ${x + largura},${y + r} V${y + altura} Z`;
}

/**
 * Barras do faturamento dos últimos meses — uma série só (o valor total das
 * montagens por mês), então não precisa de legenda: o título já diz o que é
 * plotado. Cada barra já mostra o valor (não depende de hover pra ser lida),
 * o hover/foco só adiciona o valor exato e destaca a barra.
 */
export function GraficoFaturamento({ dados }: { dados: PontoFaturamento[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const idBase = useId();

  const largura = 560;
  const altura = 190;
  const margemBaixo = 28;
  const margemCima = 28;
  const alturaUtil = altura - margemBaixo - margemCima;
  const maximo = Math.max(...dados.map((d) => d.valor), 1);
  const passo = largura / dados.length;
  const larguraBarra = Math.min(28, passo * 0.5);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        role="img"
        aria-label={`Faturamento por mês: ${dados.map((d) => `${d.labelCompleto} ${formatarMoedaCompleta(d.valor)}`).join(", ")}`}
        className="w-full overflow-visible"
      >
        {/* Linha de base */}
        <line
          x1={0}
          y1={altura - margemBaixo}
          x2={largura}
          y2={altura - margemBaixo}
          stroke="var(--color-navy)"
          strokeOpacity={0.12}
          strokeWidth={1}
        />

        {dados.map((d, i) => {
          const centroX = passo * i + passo / 2;
          const x = centroX - larguraBarra / 2;
          const alturaBarra = maximo > 0 ? (d.valor / maximo) * alturaUtil : 0;
          const y = altura - margemBaixo - alturaBarra;
          const destacada = ativo === i || (ativo === null && d.atual);
          const corBarra = d.atual ? "var(--color-gold)" : "var(--color-navy)";

          return (
            <g
              key={i}
              tabIndex={0}
              role="img"
              aria-label={`${d.labelCompleto}: ${formatarMoedaCompleta(d.valor)}`}
              className="cursor-default outline-none"
              onMouseEnter={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
              onFocus={() => setAtivo(i)}
              onBlur={() => setAtivo(null)}
            >
              {/* Alvo de toque/hover maior que a barra em si */}
              <rect x={passo * i} y={0} width={passo} height={altura} fill="transparent" />

              <path
                d={caminhoBarra(x, y, larguraBarra, Math.max(alturaBarra, 2), 4)}
                fill={corBarra}
                opacity={destacada ? 1 : 0.85}
                style={{ transition: "opacity 120ms ease" }}
              />
              {ativo === i ? (
                <rect
                  x={x}
                  y={y}
                  width={larguraBarra}
                  height={Math.max(alturaBarra, 2)}
                  rx={4}
                  fill="white"
                  opacity={0.18}
                />
              ) : null}

              {/* Valor no topo da barra */}
              <text
                x={centroX}
                y={y - 8}
                textAnchor="middle"
                fontSize={11}
                fontWeight={ativo === i || d.atual ? 700 : 500}
                fill="var(--foreground)"
                fillOpacity={ativo === i || d.atual ? 1 : 0.55}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatarMoedaCompacta(d.valor)}
              </text>

              {/* Rótulo do mês */}
              <text
                x={centroX}
                y={altura - margemBaixo + 16}
                textAnchor="middle"
                fontSize={11}
                fontWeight={d.atual ? 700 : 500}
                fill={d.atual ? "var(--color-navy)" : "var(--foreground)"}
                fillOpacity={d.atual ? 1 : 0.5}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {ativo !== null ? (
        <div
          className="pointer-events-none absolute -top-2 -translate-y-full rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-navy/20"
          style={{
            left: `${((ativo + 0.5) / dados.length) * 100}%`,
            transform: "translate(-50%, -100%)",
          }}
          aria-hidden="true"
        >
          <p className="font-semibold">{formatarMoedaCompleta(dados[ativo].valor)}</p>
          <p className="text-white/70">{dados[ativo].labelCompleto}</p>
        </div>
      ) : null}

      <p id={`${idBase}-legenda`} className="sr-only">
        Gráfico de barras mostrando o faturamento total por mês.
      </p>
    </div>
  );
}

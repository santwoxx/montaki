import Image from "next/image";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Avatar({
  nome,
  fotoUrl,
  tamanho = "h-10 w-10",
  className,
}: {
  nome: string;
  fotoUrl?: string | null;
  tamanho?: string;
  className?: string;
}) {
  const iniciais = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");

  if (fotoUrl) {
    return (
      <div className={cx(tamanho, "relative shrink-0 overflow-hidden rounded-full border border-slate-200", className)}>
        <Image src={fotoUrl} alt={nome} fill sizes="56px" className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cx(
        tamanho,
        "flex items-center justify-center rounded-full bg-navy/10 font-bold text-navy",
        className
      )}
    >
      {iniciais || "?"}
    </div>
  );
}

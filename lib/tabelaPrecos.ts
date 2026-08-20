export type CategoriaServico = "Principal" | "Adicional";

export interface ItemTabelaPreco {
  id: string;
  nome: string;
  precoBase: number | null; // null significa "Orçamento" ou porcentagem
  precoFormatado: string; // ex: "R$ 44,00", "R$ 275,00+", "Orçamento"
  categoria: CategoriaServico;
  observacao?: string;
}

export const tabelaPrecos: ItemTabelaPreco[] = [
  // SERVIÇOS PRINCIPAIS
  { id: "s1", nome: "Criado-mudo / mesinha de cabeceira", precoBase: 44, precoFormatado: "R$ 44,00", categoria: "Principal" },
  { id: "s2", nome: "Mesa simples", precoBase: 66, precoFormatado: "R$ 66,00", categoria: "Principal" },
  { id: "s3", nome: "Rack", precoBase: 77, precoFormatado: "R$ 77,00", categoria: "Principal" },
  { id: "s4", nome: "Cômoda", precoBase: 88, precoFormatado: "R$ 88,00", categoria: "Principal" },
  { id: "s5", nome: "Estante", precoBase: 88, precoFormatado: "R$ 88,00", categoria: "Principal" },
  { id: "s6", nome: "Multiuso pequeno", precoBase: 66, precoFormatado: "R$ 66,00", categoria: "Principal" },
  { id: "s7", nome: "Multiuso grande", precoBase: 99, precoFormatado: "R$ 99,00", categoria: "Principal" },
  { id: "s8", nome: "Cama solteiro", precoBase: 88, precoFormatado: "R$ 88,00", categoria: "Principal" },
  { id: "s9", nome: "Cama casal", precoBase: 110, precoFormatado: "R$ 110,00", categoria: "Principal" },
  { id: "s10", nome: "Cama box", precoBase: 77, precoFormatado: "R$ 77,00", categoria: "Principal" },
  { id: "s11", nome: "Cama box baú", precoBase: 132, precoFormatado: "R$ 132,00", categoria: "Principal" },
  { id: "s12", nome: "Beliche", precoBase: 143, precoFormatado: "R$ 143,00", categoria: "Principal" },
  { id: "s13", nome: "Guarda-roupa 2 portas", precoBase: 110, precoFormatado: "R$ 110,00", categoria: "Principal" },
  { id: "s14", nome: "Guarda-roupa 3 portas", precoBase: 143, precoFormatado: "R$ 143,00", categoria: "Principal" },
  { id: "s15", nome: "Guarda-roupa 4 portas", precoBase: 176, precoFormatado: "R$ 176,00", categoria: "Principal" },
  { id: "s16", nome: "Guarda-roupa 6 portas", precoBase: 220, precoFormatado: "R$ 220,00", categoria: "Principal" },
  { id: "s17", nome: "Guarda-roupa casal grande", precoBase: 242, precoFormatado: "R$ 242,00", categoria: "Principal" },
  { id: "s18", nome: "Painel de TV", precoBase: 110, precoFormatado: "R$ 110,00", categoria: "Principal" },
  { id: "s19", nome: "Painel + instalação na parede", precoBase: 165, precoFormatado: "R$ 165,00", categoria: "Principal" },
  { id: "s20", nome: "Mesa + 4 cadeiras", precoBase: 132, precoFormatado: "R$ 132,00", categoria: "Principal" },
  { id: "s21", nome: "Mesa + 6 cadeiras", precoBase: 165, precoFormatado: "R$ 165,00", categoria: "Principal" },
  { id: "s22", nome: "Armário de cozinha pequeno", precoBase: 110, precoFormatado: "R$ 110,00", categoria: "Principal" },
  { id: "s23", nome: "Armário de cozinha completo", precoBase: 275, precoFormatado: "R$ 275,00+", categoria: "Principal", observacao: "A partir de R$ 275,00" },
  { id: "s24", nome: "Cristaleira / torre", precoBase: 132, precoFormatado: "R$ 132,00", categoria: "Principal" },
  // SERVIÇOS ADICIONAIS
  { id: "a1", nome: "Desmontagem de móvel", precoBase: null, precoFormatado: "50% do valor da montagem", categoria: "Adicional" },
  { id: "a2", nome: "Remontagem em outro endereço", precoBase: null, precoFormatado: "Orçamento", categoria: "Adicional" },
  { id: "a3", nome: "Fixação de móvel na parede", precoBase: 33, precoFormatado: "R$ 33,00+", categoria: "Adicional" },
  { id: "a4", nome: "Instalação de suporte de TV", precoBase: 88, precoFormatado: "R$ 88,00+", categoria: "Adicional" },
  { id: "a5", nome: "Instalação de espelho", precoBase: 60.5, precoFormatado: "R$ 60,50+", categoria: "Adicional" },
  { id: "a6", nome: "Instalação de prateleira", precoBase: 36.3, precoFormatado: "R$ 36,30+/un.", categoria: "Adicional" },
  { id: "a7", nome: "Corte/adaptação de móvel", precoBase: 60.5, precoFormatado: "R$ 60,50+", categoria: "Adicional" },
  { id: "a8", nome: "Ajustes ou reparos", precoBase: 60.5, precoFormatado: "R$ 60,50+", categoria: "Adicional" },
  { id: "a9", nome: "Móvel com montagem complexa", precoBase: null, precoFormatado: "Orçamento", categoria: "Adicional" },
  { id: "a10", nome: "Deslocamento fora da área padrão", precoBase: 2.2, precoFormatado: "R$ 2,20/km", categoria: "Adicional" },
];

export const regrasComerciais = [
  "Os valores são 'a partir de' e podem variar conforme tamanho, modelo, quantidade de peças e dificuldade da montagem.",
  "Montagem realizada com ferramentas profissionais.",
  "O cliente deve disponibilizar o local livre para montagem.",
  "Móveis usados ou com peças danificadas serão avaliados antes da montagem.",
  "Deslocamento pode ser cobrado conforme a distância.",
  "Montagens de vários móveis no mesmo endereço podem receber valor especial.",
  "Desmontagem e remontagem são cobradas separadamente.",
  "Instalações elétricas, hidráulicas ou alterações estruturais não estão incluídas.",
];


import {
  usersData,
  lojasData,
  comissoesData,
  montagensData,
  notasData,
  ocorrenciasData,
  avaliacoesData,
} from "./data";
import {
  User,
  Loja,
  ComissaoLoja,
  Montagem,
  NotaPendente,
  Ocorrencia,
  Avaliacao,
} from "./types";

// Utilitário simples para gerar IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

class MockCollection<T extends { id: string }> {
  constructor(private data: T[]) {}

  async findMany(args?: { where?: any; orderBy?: any; include?: any; select?: any; take?: number; skip?: number }): Promise<T[]> {
    let result = [...this.data];

    if (args?.where) {
      result = result.filter((item) => {
        return Object.entries(args.where).every(([key, value]) => {
          if (value === undefined) return true;
          if (typeof value === "object" && value !== null) {
            // Simplified handling for operators like "not", "in", "gte", "lte"
            const objValue = value as any;
            if (objValue.not !== undefined) return (item as any)[key] !== objValue.not;
            if (objValue.in !== undefined) return objValue.in.includes((item as any)[key]);
            if (objValue.gte !== undefined) return (item as any)[key] >= objValue.gte;
            if (objValue.lte !== undefined) return (item as any)[key] <= objValue.lte;
            if (objValue.equals !== undefined) return (item as any)[key] === objValue.equals;
          }
          return (item as any)[key] === value;
        });
      });
    }

    if (args?.orderBy) {
      const entries = Object.entries(args.orderBy);
      if (entries.length > 0) {
        const [key, dir] = entries[0];
        result.sort((a, b) => {
          const valA = (a as any)[key];
          const valB = (b as any)[key];
          if (valA < valB) return dir === "asc" ? -1 : 1;
          if (valA > valB) return dir === "asc" ? 1 : -1;
          return 0;
        });
      }
    }

    if (args?.skip) result = result.slice(args.skip);
    if (args?.take) result = result.slice(0, args.take);

    return result;
  }

  async findUnique(args: { where: any; include?: any; select?: any }): Promise<T | null> {
    const items = await this.findMany({ where: args.where });
    return items[0] || null;
  }

  async findFirst(args?: { where?: any; orderBy?: any; include?: any; select?: any }): Promise<T | null> {
    const items = await this.findMany(args);
    return items[0] || null;
  }

  async create(args: { data: any }): Promise<T> {
    const newItem = { id: generateId(), ...args.data, createdAt: new Date(), updatedAt: new Date() } as T;
    this.data.push(newItem);
    return newItem;
  }

  async update(args: { where: any; data: any }): Promise<T> {
    const index = this.data.findIndex((item) => {
      return Object.entries(args.where).every(([key, value]) => (item as any)[key] === value);
    });
    if (index === -1) throw new Error("Record not found");

    this.data[index] = { ...this.data[index], ...args.data, updatedAt: new Date() };
    return this.data[index];
  }

  async upsert(args: { where: any; update: any; create: any }): Promise<T> {
    const existing = await this.findUnique({ where: args.where });
    if (existing) {
      return this.update({ where: args.where, data: args.update });
    } else {
      return this.create({ data: args.create });
    }
  }

  async delete(args: { where: any }): Promise<T> {
    const index = this.data.findIndex((item) => {
      return Object.entries(args.where).every(([key, value]) => (item as any)[key] === value);
    });
    if (index === -1) throw new Error("Record not found");

    const deleted = this.data[index];
    this.data.splice(index, 1);
    return deleted;
  }

  async count(args?: { where?: any }): Promise<number> {
    const items = await this.findMany({ where: args?.where });
    return items.length;
  }

  async aggregate(args: { where?: any; _sum?: any; _count?: any; _avg?: any }): Promise<any> {
    const items = await this.findMany({ where: args?.where });
    
    const result: any = {};
    if (args._sum) {
      result._sum = {};
      for (const key of Object.keys(args._sum)) {
        result._sum[key] = items.reduce((acc, curr) => acc + ((curr as any)[key] || 0), 0);
      }
    }
    if (args._count) {
      result._count = {};
      for (const key of Object.keys(args._count)) {
        if (key === "_all") {
          result._count._all = items.length;
        } else {
          result._count[key] = items.filter(i => (i as any)[key] != null).length;
        }
      }
    }
    return result;
  }

  async groupBy(args: { by: string[]; where?: any; _sum?: any; _count?: any; _avg?: any }): Promise<any[]> {
    const items = await this.findMany({ where: args?.where });
    
    const groups: Record<string, any[]> = {};
    for (const item of items) {
      const key = args.by.map((b) => String((item as any)[b])).join("-");
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    return Object.values(groups).map((groupItems) => {
      const rep = groupItems[0];
      const result: any = {};
      for (const b of args.by) result[b] = (rep as any)[b];

      if (args._sum) {
        result._sum = {};
        for (const key of Object.keys(args._sum)) {
          result._sum[key] = groupItems.reduce((acc, curr) => acc + ((curr as any)[key] || 0), 0);
        }
      }
      if (args._count) {
        result._count = {};
        for (const key of Object.keys(args._count)) {
          if (key === "_all") {
            result._count._all = groupItems.length;
          } else {
            result._count[key] = groupItems.filter(i => (i as any)[key] != null).length;
          }
        }
      }
      return result;
    });
  }
}

export class MockPrismaClient {
  user = new MockCollection<User>(usersData);
  loja = new MockCollection<Loja>(lojasData);
  comissaoLoja = new MockCollection<ComissaoLoja>(comissoesData);
  montagem = new MockCollection<Montagem>(montagensData);
  notaPendente = new MockCollection<NotaPendente>(notasData);
  ocorrencia = new MockCollection<Ocorrencia>(ocorrenciasData);
  avaliacao = new MockCollection<Avaliacao>(avaliacoesData);

  async $disconnect() {
    // nothing to do
  }
  
  async $transaction(operations: any[]) {
    // In a real mock, we would try to execute all or none, but for demo, sequentially is fine
    const results = [];
    for (const op of operations) {
      results.push(await op);
    }
    return results;
  }
}

/**
 * Pure (browser-safe) Supabase-compatible query builder.
 * No database imports — execution is delegated to a `runner` provided by the
 * caller (server uses a direct execQuery; client POSTs to /api/sb).
 */

type Filter = { op: "eq"; col: string; val: any };
type Order = { col: string; ascending: boolean };

export interface SerializedQuery {
  table: string;
  op: "select" | "insert" | "update" | "delete" | "upsert";
  cols?: string;
  payload?: any;
  upsertOpts?: { onConflict?: string };
  filters: Filter[];
  orders: Order[];
  limitN?: number;
  single?: boolean;
  maybeSingle?: boolean;
  countMode?: "exact";
  head?: boolean;
  postSelectCols?: string;
  postSelectSingle?: boolean;
}

export type Result<T = any> = { data: T; error: { message: string } | null; count?: number };

export function createBuilderFactory(runner: (q: SerializedQuery) => Promise<Result>) {
  return function from(table: string) {
    const state: SerializedQuery = { table, op: "select", filters: [], orders: [] };
    const exec = (): Promise<Result> => runner({ ...state });

    const finalisable: any = {
      then: (resolve: any, reject: any) => exec().then(resolve, reject)
    };

    function asSelect() {
      finalisable.eq = (col: string, val: any) => { state.filters.push({ op: "eq", col, val }); return finalisable; };
      finalisable.order = (col: string, opts?: { ascending?: boolean }) => { state.orders.push({ col, ascending: opts?.ascending ?? true }); return finalisable; };
      finalisable.limit = (n: number) => { state.limitN = n; return finalisable; };
      finalisable.single = () => { state.single = true; return finalisable; };
      finalisable.maybeSingle = () => { state.maybeSingle = true; return finalisable; };
      return finalisable;
    }

    function asMutating() {
      finalisable.eq = (col: string, val: any) => { state.filters.push({ op: "eq", col, val }); return finalisable; };
      finalisable.select = (cols?: string) => {
        state.postSelectCols = cols ?? "*";
        const wrap: any = {
          then: (resolve: any, reject: any) => exec().then(resolve, reject),
          single: () => { state.postSelectSingle = true; return wrap; }
        };
        return wrap;
      };
      return finalisable;
    }

    return {
      select(cols = "*", opts?: { count?: "exact"; head?: boolean }) {
        state.op = "select"; state.cols = cols;
        if (opts?.count) state.countMode = opts.count;
        if (opts?.head) state.head = true;
        return asSelect();
      },
      insert(payload: any) { state.op = "insert"; state.payload = payload; return asMutating(); },
      update(payload: any) { state.op = "update"; state.payload = payload; return asMutating(); },
      delete() { state.op = "delete"; return asMutating(); },
      upsert(payload: any, opts?: { onConflict?: string }) {
        state.op = "upsert"; state.payload = payload; state.upsertOpts = opts;
        return asMutating();
      }
    };
  };
}

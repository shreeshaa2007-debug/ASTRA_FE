import { getProducts } from '../services/api';
import { ProductRow } from '../types/api';
import { useFetch } from './useFetch';

// The ledger tracks 40 products but the synthetic supplier roster covers three, so only those
// can be planned; every plan for the rest is INFEASIBLE (GET /api/products says which).
export function useProducts() {
  const r = useFetch(getProducts, []);
  const all: ProductRow[] = r.data ?? [];
  return { all, plannable: all.filter((p) => p.has_suppliers), loading: r.loading, error: r.error, reload: r.reload };
}

export function productLabel(p: ProductRow): string {
  return p.has_suppliers ? `${p.product_id} · ${p.supplier_count} suppliers` : `${p.product_id} · no suppliers`;
}

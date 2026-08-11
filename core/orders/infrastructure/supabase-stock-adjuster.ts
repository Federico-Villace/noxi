import type {
  StockAdjuster,
  StockAdjustment,
} from "../domain/stock-adjuster";
import { supabaseAdmin } from "./supabase-client";

interface AdjustmentRow {
  product_id: string;
  remaining: number;
}

/**
 * ADAPTADOR de descuento de stock.
 *
 * Toda la lógica vive en la función `apply_stock_for_order` de Postgres, no
 * acá: leer stock, restar y guardar desde JavaScript abriría una ventana entre
 * la lectura y la escritura donde dos ventas simultáneas se pisan. En SQL es
 * una sola sentencia atómica.
 */
export function createSupabaseStockAdjuster(): StockAdjuster {
  return {
    async applyForOrder(reference: string): Promise<StockAdjustment[]> {
      const { data, error } = await supabaseAdmin().rpc(
        "apply_stock_for_order",
        { p_reference: reference },
      );

      if (error) {
        throw new Error(`No se pudo descontar el stock: ${error.message}`);
      }

      return ((data ?? []) as AdjustmentRow[]).map((row) => ({
        productId: row.product_id,
        remaining: row.remaining,
      }));
    },
  };
}

import type { OrderRecord, OrderLineRecord } from "../domain/order";
import type { OrderStatus } from "../domain/order-status";
import type {
  ConfirmPaymentInput,
  ConfirmPaymentResult,
  OrderRepository,
} from "../domain/order-repository";
import { shouldApplyTransition } from "../domain/status-transition";
import { supabaseAdmin } from "./supabase-client";

interface OrderRow {
  reference: string;
  status: OrderStatus;
  total_in_cents: number;
  payment_id: string | null;
  payer_email: string | null;
  needs_review: boolean;
  created_at: string;
  paid_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_doc: string | null;
  shipping_street: string | null;
  shipping_extra: string | null;
  shipping_city: string | null;
  shipping_province: string | null;
  shipping_zip: string | null;
  customer_notes: string | null;
  order_lines?: LineRow[];
}

interface LineRow {
  product_id: string;
  title: string;
  unit_price_in_cents: number;
  quantity: number;
}

function toRecord(row: OrderRow): OrderRecord {
  return {
    reference: row.reference,
    status: row.status,
    totalInCents: Number(row.total_in_cents),
    paymentId: row.payment_id,
    payerEmail: row.payer_email,
    needsReview: row.needs_review,
    // `?? ""` y no `null`: las órdenes viejas son anteriores al formulario.
    // El panel muestra un campo vacío, no tiene que distinguir dos ausencias.
    customer: {
      name: row.customer_name ?? "",
      email: row.customer_email ?? "",
      phone: row.customer_phone ?? "",
      docId: row.customer_doc ?? "",
      street: row.shipping_street ?? "",
      streetExtra: row.shipping_extra ?? "",
      city: row.shipping_city ?? "",
      province: row.shipping_province ?? "",
      zip: row.shipping_zip ?? "",
      notes: row.customer_notes ?? "",
    },
    createdAt: row.created_at,
    paidAt: row.paid_at,
    lines: (row.order_lines ?? []).map(
      (line): OrderLineRecord => ({
        productId: line.product_id,
        title: line.title,
        unitPriceInCents: Number(line.unit_price_in_cents),
        quantity: line.quantity,
      }),
    ),
  };
}

async function findByReference(reference: string): Promise<OrderRecord | null> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("*, order_lines(*)")
    .eq("reference", reference)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer la orden: ${error.message}`);

  return data ? toRecord(data as OrderRow) : null;
}

async function findRecent(limit: number): Promise<OrderRecord[]> {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("*, order_lines(*)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`No se pudieron leer las órdenes: ${error.message}`);

  return (data as OrderRow[]).map(toRecord);
}

export function createSupabaseOrderRepository(): OrderRepository {
  return {
    async create(order) {
      const db = supabaseAdmin();

      const { error: orderError } = await db.from("orders").insert({
        reference: order.reference,
        status: order.status,
        total_in_cents: order.totalInCents,
        customer_name: order.customer.name,
        customer_email: order.customer.email,
        customer_phone: order.customer.phone,
        customer_doc: order.customer.docId,
        shipping_street: order.customer.street,
        shipping_extra: order.customer.streetExtra,
        shipping_city: order.customer.city,
        shipping_province: order.customer.province,
        shipping_zip: order.customer.zip,
        customer_notes: order.customer.notes,
      });

      if (orderError) {
        throw new Error(`No se pudo guardar la orden: ${orderError.message}`);
      }

      const { error: linesError } = await db.from("order_lines").insert(
        order.lines.map((line) => ({
          order_reference: order.reference,
          product_id: line.productId,
          title: line.title,
          unit_price_in_cents: line.unitPriceInCents,
          quantity: line.quantity,
        })),
      );

      if (linesError) {
        // El cliente de Supabase no hace transacciones multi-sentencia.
        // Compensamos: una orden sin líneas es peor que ninguna orden, porque
        // parece una venta válida de la que no sabés qué se llevó.
        await db.from("orders").delete().eq("reference", order.reference);
        throw new Error(
          `No se pudieron guardar las líneas: ${linesError.message}`,
        );
      }
    },

    findRecent,

    async confirmPayment({
      reference,
      status,
      paymentId,
      payerEmail,
    }: ConfirmPaymentInput): Promise<ConfirmPaymentResult> {
      const db = supabaseAdmin();
      // Función libre, no `this`: si alguien desestructura el repositorio
      // (`const { confirmPayment } = repo`), `this` se pierde y esto explota.
      const current = await findByReference(reference);

      if (!current) return { outcome: "no-encontrada" };
      if (!shouldApplyTransition(current.status, status)) {
        return { outcome: "ignorada", order: current };
      }

      // `.eq("status", current.status)` es control de concurrencia optimista:
      // si otra notificación simultánea ya cambió el estado, esto actualiza
      // 0 filas y no pisamos su resultado.
      const { data, error } = await db
        .from("orders")
        .update({
          status,
          payment_id: paymentId,
          payer_email: payerEmail ?? null,
          paid_at: status === "pagada" ? new Date().toISOString() : null,
        })
        .eq("reference", reference)
        .eq("status", current.status)
        .select("*, order_lines(*)");

      if (error) {
        throw new Error(`No se pudo confirmar el pago: ${error.message}`);
      }

      const updated = (data as OrderRow[] | null)?.[0];
      if (!updated) return { outcome: "ignorada", order: current };

      return { outcome: "actualizada", order: toRecord(updated) };
    },

    findByReference,

    async markForReview(reference, motivo) {
      const { error } = await supabaseAdmin()
        .from("orders")
        .update({ needs_review: true, review_reason: motivo })
        .eq("reference", reference);

      if (error) {
        throw new Error(`No se pudo marcar para revisión: ${error.message}`);
      }
    },
  };
}

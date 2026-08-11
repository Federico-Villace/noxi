import { describe, it, expect, vi } from "vitest";
import type { PaymentVerifier } from "@/core/checkout/domain/payment-verifier";
import type { OrderRepository } from "../domain/order-repository";
import type { StockAdjuster } from "../domain/stock-adjuster";
import { confirmOrderPayment } from "./confirm-order-payment";

const pagoAprobado = {
  id: "PAY-1",
  status: "approved",
  externalReference: "noxi-1",
  payerEmail: "compradora@test.com",
};

function verifier(payment: unknown = pagoAprobado): PaymentVerifier {
  return { getPayment: vi.fn().mockResolvedValue(payment) };
}

function orderEn(status: string) {
  return { reference: "noxi-1", status, lines: [], totalInCents: 0 };
}

function orders(
  confirmResult: unknown = { outcome: "actualizada", order: orderEn("pagada") },
): OrderRepository {
  return {
    create: vi.fn(),
    confirmPayment: vi.fn().mockResolvedValue(confirmResult),
    findByReference: vi.fn(),
    markForReview: vi.fn(),
  } as unknown as OrderRepository;
}

function stock(adjustments: Array<{ productId: string; remaining: number }>) {
  return {
    applyForOrder: vi.fn().mockResolvedValue(adjustments),
  } satisfies StockAdjuster;
}

describe("confirmOrderPayment + stock", () => {
  it("descuenta stock cuando la orden pasa a pagada", async () => {
    const adjuster = stock([{ productId: "NX-001", remaining: 2 }]);

    await confirmOrderPayment("PAY-1", {
      verifier: verifier(),
      orders: orders(),
      stock: adjuster,
    });

    expect(adjuster.applyForOrder).toHaveBeenCalledWith("noxi-1");
  });

  /**
   * La clave de no descontar dos veces: si la confirmación fue ignorada
   * (duplicada), el stock NO se toca. MercadoPago manda hasta tres avisos por
   * venta, más la vuelta de la compradora al sitio.
   */
  it("no descuenta stock si la confirmación fue ignorada", async () => {
    const adjuster = stock([]);

    await confirmOrderPayment("PAY-1", {
      verifier: verifier(),
      orders: orders({ outcome: "ignorada", order: orderEn("pagada") }),
      stock: adjuster,
    });

    expect(adjuster.applyForOrder).not.toHaveBeenCalled();
  });

  it("no descuenta stock si el pago no quedó pagado", async () => {
    const adjuster = stock([]);

    await confirmOrderPayment("PAY-1", {
      verifier: verifier({ ...pagoAprobado, status: "rejected" }),
      orders: orders({ outcome: "actualizada", order: orderEn("rechazada") }),
      stock: adjuster,
    });

    expect(adjuster.applyForOrder).not.toHaveBeenCalled();
  });

  it("marca la orden para revisión si hubo sobreventa", async () => {
    const repo = orders();

    await confirmOrderPayment("PAY-1", {
      verifier: verifier(),
      orders: repo,
      stock: stock([
        { productId: "NX-001", remaining: 1 },
        { productId: "NX-007", remaining: -1 },
      ]),
    });

    expect(repo.markForReview).toHaveBeenCalledWith(
      "noxi-1",
      expect.stringContaining("NX-007"),
    );
  });

  it("no marca revisión cuando el stock alcanzó", async () => {
    const repo = orders();

    await confirmOrderPayment("PAY-1", {
      verifier: verifier(),
      orders: repo,
      stock: stock([{ productId: "NX-001", remaining: 0 }]),
    });

    expect(repo.markForReview).not.toHaveBeenCalled();
  });

  /**
   * El pago YA ocurrió. Si falla el descuento de stock no podemos "desconfirmar"
   * la orden: se confirma igual y se marca para revisión humana.
   */
  it("confirma igual si el descuento de stock falla, y marca revisión", async () => {
    const repo = orders();
    const adjuster: StockAdjuster = {
      applyForOrder: vi.fn().mockRejectedValue(new Error("db caída")),
    };

    const result = await confirmOrderPayment("PAY-1", {
      verifier: verifier(),
      orders: repo,
      stock: adjuster,
    });

    expect(result.outcome).toBe("actualizada");
    expect(repo.markForReview).toHaveBeenCalledWith(
      "noxi-1",
      expect.stringContaining("stock"),
    );
  });

  it("funciona sin adaptador de stock configurado", async () => {
    const result = await confirmOrderPayment("PAY-1", {
      verifier: verifier(),
      orders: orders(),
    });

    expect(result.outcome).toBe("actualizada");
  });
});

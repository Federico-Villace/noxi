import { describe, it, expect, vi } from "vitest";
import type { PaymentVerifier } from "@/core/checkout/domain/payment-verifier";
import type { OrderRepository } from "../domain/order-repository";
import { confirmOrderPayment } from "./confirm-order-payment";

function verifier(payment: unknown): PaymentVerifier {
  return { getPayment: vi.fn().mockResolvedValue(payment) };
}

function orders(overrides: Partial<OrderRepository> = {}): OrderRepository {
  return {
    create: vi.fn(),
    confirmPayment: vi.fn().mockResolvedValue({
      outcome: "actualizada",
      order: { reference: "noxi-1", status: "pagada", lines: [], totalInCents: 0 },
    }),
    findByReference: vi.fn(),
    findRecent: vi.fn(),
    markForReview: vi.fn(),
    ...overrides,
  };
}

const pagoAprobado = {
  id: "171978151367",
  status: "approved",
  externalReference: "noxi-1",
  payerEmail: "compradora@test.com",
};

describe("confirmOrderPayment", () => {
  it("confirma la orden con los datos que devuelve MercadoPago", async () => {
    const repo = orders();

    const result = await confirmOrderPayment("171978151367", {
      verifier: verifier(pagoAprobado),
      orders: repo,
    });

    expect(result.outcome).toBe("actualizada");
    expect(repo.confirmPayment).toHaveBeenCalledWith({
      reference: "noxi-1",
      status: "pagada",
      paymentId: "171978151367",
      payerEmail: "compradora@test.com",
    });
  });

  /**
   * El corazón de la seguridad: el estado NUNCA sale de quien nos llama, sale
   * de la respuesta autenticada de MercadoPago. Si alguien postea "approved"
   * para un pago que MP dice rechazado, gana MP.
   */
  it("ignora el estado que venga de afuera y usa el de MercadoPago", async () => {
    const repo = orders();

    await confirmOrderPayment("171978151367", {
      verifier: verifier({ ...pagoAprobado, status: "rejected" }),
      orders: repo,
    });

    expect(repo.confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({ status: "rechazada" }),
    );
  });

  it("no toca nada si MercadoPago no conoce el pago", async () => {
    const repo = orders();

    const result = await confirmOrderPayment("no-existe", {
      verifier: verifier(null),
      orders: repo,
    });

    expect(result.outcome).toBe("pago-inexistente");
    expect(repo.confirmPayment).not.toHaveBeenCalled();
  });

  it("no toca nada si el pago no tiene external_reference", async () => {
    const repo = orders();

    const result = await confirmOrderPayment("171978151367", {
      verifier: verifier({ ...pagoAprobado, externalReference: null }),
      orders: repo,
    });

    expect(result.outcome).toBe("sin-referencia");
    expect(repo.confirmPayment).not.toHaveBeenCalled();
  });

  it("informa cuando la referencia no corresponde a ninguna orden nuestra", async () => {
    const repo = orders({
      confirmPayment: vi.fn().mockResolvedValue({ outcome: "no-encontrada" }),
    });

    const result = await confirmOrderPayment("171978151367", {
      verifier: verifier({ ...pagoAprobado, externalReference: "de-otro-lado" }),
      orders: repo,
    });

    expect(result.outcome).toBe("no-encontrada");
  });

  it("es idempotente: reprocesar el mismo pago no vuelve a actualizar", async () => {
    const repo = orders({
      confirmPayment: vi.fn().mockResolvedValue({
        outcome: "ignorada",
        order: {
          reference: "noxi-1",
          status: "pagada",
          lines: [],
          totalInCents: 0,
        },
      }),
    });

    const result = await confirmOrderPayment("171978151367", {
      verifier: verifier(pagoAprobado),
      orders: repo,
    });

    expect(result.outcome).toBe("ignorada");
  });
});

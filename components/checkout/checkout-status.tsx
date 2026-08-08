import Link from "next/link";

interface CheckoutStatusProps {
  tone: "ok" | "error" | "pending";
  title: string;
  message: string;
  note?: string;
}

const RULE: Record<CheckoutStatusProps["tone"], string> = {
  ok: "bg-chrome",
  error: "bg-blood",
  pending: "bg-silver",
};

export function CheckoutStatus({
  tone,
  title,
  message,
  note,
}: CheckoutStatusProps) {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-start px-5 py-20 md:py-32">
      <span className={`h-px w-16 ${RULE[tone]}`} aria-hidden />

      <h1 className="mt-8 text-[clamp(2rem,7vw,3.5rem)] font-medium uppercase leading-[0.9] tracking-[-0.03em] text-chrome">
        {title}
      </h1>

      <p className="mt-6 max-w-md text-sm leading-relaxed text-silver">
        {message}
      </p>

      {note && <p className="label mt-8 text-silver/50">{note}</p>}

      <Link
        href="/"
        className="label mt-12 border border-chrome bg-chrome px-8 py-4 text-void transition-colors hover:border-blood hover:bg-blood"
      >
        Volver al drop
      </Link>
    </section>
  );
}

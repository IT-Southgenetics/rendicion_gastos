import { redirect } from "next/navigation";
import { NewExpenseForm } from "@/components/expenses/NewExpenseForm";

interface NewExpensePageProps {
  searchParams: Promise<{ reportId?: string }>;
}

export default async function NewExpensePage({ searchParams }: NewExpensePageProps) {
  const { reportId } = await searchParams;

  if (!reportId) {
    redirect("/dashboard/reports");
  }

  const returnTo = `/dashboard/reports/${reportId}`;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="card overflow-hidden">
        <div className="bg-[var(--color-primary)] px-6 py-4 text-white">
          <h1 className="text-lg font-semibold">Nuevo gasto</h1>
          <p className="text-xs opacity-80">
            Adjuntá el comprobante y completá los datos del gasto.
          </p>
        </div>
        <div className="p-6">
          <NewExpenseForm reportId={reportId} returnTo={returnTo} />
        </div>
      </div>
    </div>
  );
}

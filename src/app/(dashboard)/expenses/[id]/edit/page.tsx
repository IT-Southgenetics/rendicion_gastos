import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EditExpenseForm } from "@/components/expenses/EditExpenseForm";

interface EditExpensePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const { data: expense } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!expense) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Editar gasto</h1>
        <p className="page-subtitle">{expense.description}</p>
      </div>
      <div className="card p-6">
        <EditExpenseForm expense={expense} />
      </div>
    </div>
  );
}

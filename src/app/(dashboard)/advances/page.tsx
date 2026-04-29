import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/getMyProfile";
import { AdvancesTable } from "@/components/advances/AdvancesTable";

export default async function AdvancesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const me = await getMyProfile(supabase, session);

  const query = supabase
    .from("advances")
    .select("id, title, advance_date, advance_end_date, requested_amount, currency, status, created_at")
    .order("created_at", { ascending: false });

  if (me?.role !== "admin") {
    query.eq("user_id", session.user.id);
  }

  const { data: advances } = await query;

  return (
    <div className="w-full max-w-full space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Anticipos</h1>
          <p className="page-subtitle">Solicita y hace seguimiento de tus anticipos.</p>
        </div>
        <Link href="/dashboard/advances/new" className="btn-primary btn-shimmer w-full text-center text-sm sm:w-auto">
          Solicitar anticipo
        </Link>
      </div>

      <AdvancesTable advances={advances ?? []} />
    </div>
  );
}

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/auth/getMyProfile";

export async function returnReportAction(formData: FormData) {
  "use server";

  const reportId = formData.get("reportId") as string | null;
  if (!reportId) {
    throw new Error("reportId requerido");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) redirect("/login");

  const me = await getMyProfile(supabase, { user: { id: user.id, email: user.email } });
  if (!me || !["aprobador", "admin"].includes(me.role ?? "")) {
    throw new Error("No tenés permisos para devolver rendiciones para corrección.");
  }

  const { data: report, error: reportError } = await supabase
    .from("weekly_reports")
    .select("id, user_id")
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    throw new Error("No se encontró la rendición.");
  }
  if (report.user_id === user.id) {
    throw new Error("No podés devolver tus propias rendiciones.");
  }

  const { data: employeeData, error: ownerError } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", report.user_id)
    .single();

  if (ownerError) {
    throw new Error("No se pudo obtener el dueño de la rendición.");
  }

  const { error: updateError } = await supabase
    .from("weekly_reports")
    .update({ workflow_status: "needs_correction" })
    .eq("id", reportId);

  if (updateError) {
    throw new Error("No se pudo devolver la rendición para corrección.");
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL_RENDICION_DEVUELTA;
  if (webhookUrl) {
    const targetEmails =
      typeof employeeData.email === "string" && employeeData.email.trim().length > 0
        ? employeeData.email
        : "";

    const payload = {
      reportId,
      employeeEmail: employeeData.email,
      employeeName: employeeData.full_name,
      // Compatibilidad con flujos n8n anteriores
      targetEmails,
    };

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.error("Error devuelto por n8n (rendición devuelta):", await response.text());
      }
    } catch (error) {
      console.error("Error enviando webhook de rendición devuelta a N8N:", error);
    }
  }

  revalidatePath(`/dashboard/reports/${reportId}`);
}

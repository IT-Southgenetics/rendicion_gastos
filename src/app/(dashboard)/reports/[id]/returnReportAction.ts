import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function returnReportAction(formData: FormData) {
  "use server";

  const reportId = formData.get("reportId") as string | null;
  if (!reportId) {
    throw new Error("reportId requerido");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data: report, error: reportError } = await supabase
    .from("weekly_reports")
    .select("id, user_id")
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    throw new Error("No se encontró la rendición.");
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
      typeof employeeData?.email === "string" && employeeData.email.trim().length > 0
        ? employeeData.email
        : "";

    const payload = {
      reportId,
      employeeEmail: employeeData?.email,
      employeeName: employeeData?.full_name,
      // Compatibilidad con flujos n8n antiguos
      targetEmails,
    };

    console.log("Payload hacia n8n (rendición devuelta):", payload);

    try {
      const response = await fetch(webhookUrl as string, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("Status de n8n (rendición devuelta):", response.status);
      if (!response.ok) {
        console.error("Error devuelto por n8n (rendición devuelta):", await response.text());
      }
    } catch (error) {
      console.error("Error enviando webhook de rendición devuelta a N8N:", error);
    }
  }

  revalidatePath(`/dashboard/reports/${reportId}`);
}


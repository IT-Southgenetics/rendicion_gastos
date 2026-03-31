import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { fullName, email, country } = (await req.json()) as {
    fullName: string;
    email: string;
    country: string;
  };

  if (!fullName || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL_NUEVO_USUARIO;
  if (!webhookUrl) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let adminEmails = "";

  try {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await client.rpc("get_admin_emails");
    if (typeof data === "string" && data.trim().length > 0) {
      adminEmails = data;
    }
  } catch (err) {
    console.error("Error fetching admin emails for new-user webhook:", err);
  }

  if (!adminEmails) {
    console.error("No admin emails found — skipping new-user webhook");
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const payload = {
      fullName,
      email,
      country,
      adminEmails,
      createdAt: new Date().toISOString(),
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("n8n new-user webhook error:", response.status, await response.text());
    }
  } catch (err) {
    console.error("Error sending new-user webhook to n8n:", err);
  }

  return NextResponse.json({ ok: true });
}

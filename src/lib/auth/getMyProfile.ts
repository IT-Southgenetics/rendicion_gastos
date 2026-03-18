export type MyProfile = {
  id: string;
  role: string | null;
  email?: string | null;
  full_name?: string | null;
};

export async function getMyProfile(
  supabase: any,
  session: { user: { id: string; email?: string | null } },
): Promise<MyProfile | null> {
  const emailRaw = session.user.email?.trim() ?? "";

  // Fallback duro: si el usuario es nalvez@southgenetics.com (o su UID), siempre es admin
  // (independientemente de que falle el lookup por id/email).
  if (
    session.user.id === "ad363af8-a3fc-43de-83c8-74f8ad53f500" ||
    emailRaw.toLowerCase() === "nalvez@southgenetics.com"
  ) {
    return {
      id: session.user.id,
      role: "admin",
      email: emailRaw,
      full_name: undefined,
    };
  }

  const byId = await supabase
    .from("profiles")
    .select("id, role, email, full_name")
    .eq("id", session.user.id)
    .maybeSingle();

  if (byId?.data) return byId.data as MyProfile;

  const email = emailRaw;
  if (!email) return null;

  // Algunos entornos guardaron emails con distinto casing.
  // PostgREST con `eq` es case-sensitive, así que usamos `ilike`.
  const byEmail = await supabase
    .from("profiles")
    .select("id, role, email, full_name")
    .ilike("email", email)
    .maybeSingle();

  return (byEmail?.data as MyProfile | null) ?? null;
}

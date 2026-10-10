import { createClient } from "@supabase/supabase-js";

const [emailArg, ...nameParts] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const name = nameParts.join(" ").trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !email.includes("@") || !name) {
  console.error(
    'Uso: npm run bootstrap:admin -- "correo@dominio.com" "Nombre completo"',
  );
  process.exit(1);
}

if (!url || !serviceKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { count, error: countError } = await supabase
  .from("user_roles")
  .select("user_id", { count: "exact", head: true })
  .eq("role", "admin");

if (countError) throw countError;
if ((count ?? 0) > 0) {
  console.error(
    "Ya existe un administrador. Las cuentas siguientes deben gestionarse desde My Magic.",
  );
  process.exit(1);
}

const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const { data, error: inviteError } = await supabase.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: { data: { name } },
});

if (inviteError || !data.user)
  throw inviteError ?? new Error("Supabase no devolvió el usuario invitado");

try {
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: data.user.id, name, active: true });
  if (profileError) throw profileError;

  const { error: roleError } = await supabase
    .from("user_roles")
    .insert({ user_id: data.user.id, role: "admin" });
  if (roleError) throw roleError;
} catch (error) {
  await supabase.auth.admin.deleteUser(data.user.id);
  throw error;
}

const tokenHash = data.properties.hashed_token;
if (!tokenHash) throw new Error("Supabase no devolvió un enlace de activación");
const activationUrl = new URL("/activar", appUrl);
activationUrl.searchParams.set("token_hash", tokenHash);
activationUrl.searchParams.set("type", data.properties.verification_type);
console.log(`Comparte este enlace de activación con ${email}:\n${activationUrl}`);

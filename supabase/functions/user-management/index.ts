import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getCallerProfile(supabase: ReturnType<typeof createClient>, token: string) {
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .maybeSingle();
  return profile;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Unauthenticated setup endpoint to fix the broken admin user
  if (action === "fix-admin" && req.method === "POST") {
    try {
      const adminEmail = "admin@cafedesa.id";
      const adminPassword = "admin123";

      // Find existing users
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email === adminEmail);

      if (existingUser) {
        await adminClient.auth.admin.deleteUser(existingUser.id);
      }

      // Create user properly through GoTrue admin API
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { display_name: "Super Admin", role: "super_admin" },
      });

      if (createError) {
        return json({ error: createError.message }, 500);
      }

      // Update profile with correct role
      const { error: profileError } = await adminClient
        .from("profiles")
        .upsert({
          id: newUser.user.id,
          email: adminEmail,
          display_name: "Super Admin",
          role: "super_admin",
          is_active: true,
        }, { onConflict: "id" });

      if (profileError) {
        return json({ error: profileError.message }, 500);
      }

      return json({ success: true, message: "Admin user fixed", user_id: newUser.user.id });
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, 401);
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const profile = await getCallerProfile(client, authHeader.replace("Bearer ", ""));
  if (!profile || profile.role !== "super_admin") {
    return json({ error: "Forbidden. Super Admin only." }, 403);
  }

  // GET: list all users
  if (req.method === "GET") {
    const { data, error } = await adminClient.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) return json({ error: error.message }, 500);
    return json({ profiles: data });
  }

  // POST: create new user
  if (req.method === "POST") {
    const body = await req.json();
    const { email, password, displayName, role } = body;
    if (!email || !password) return json({ error: "Email and password are required" }, 400);
    if (role && !["super_admin", "kasir"].includes(role)) {
      return json({ error: "Invalid role" }, 400);
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName || "Kasir",
        role: role || "kasir",
      },
    });
    if (error) return json({ error: error.message }, 400);

    // Ensure profile exists (trigger should handle it, but as fallback)
    if (data.user) {
      await adminClient.from("profiles").upsert({
        id: data.user.id,
        email,
        display_name: displayName || "Kasir",
        role: role || "kasir",
        is_active: true,
      }, { onConflict: "id" });
    }
    return json({ success: true, user: { id: data.user?.id, email } });
  }

  // PUT: update user (role, display_name, is_active, password)
  if (req.method === "PUT") {
    const body = await req.json();
    const { userId, role, displayName, isActive, password } = body;
    if (!userId) return json({ error: "userId is required" }, 400);

    const updates: Record<string, unknown> = {};
    if (role !== undefined) {
      if (!["super_admin", "kasir"].includes(role)) return json({ error: "Invalid role" }, 400);
      updates.role = role;
    }
    if (displayName !== undefined) updates.display_name = displayName;
    if (isActive !== undefined) updates.is_active = isActive;

    if (Object.keys(updates).length > 0) {
      const { error } = await adminClient.from("profiles").update(updates).eq("id", userId);
      if (error) return json({ error: error.message }, 500);
    }

    if (password) {
      const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
      if (error) return json({ error: error.message }, 400);
    }

    return json({ success: true });
  }

  // DELETE: remove user
  if (req.method === "DELETE") {
    const userId = url.searchParams.get("userId");
    if (!userId) return json({ error: "userId is required" }, 400);

    if (userId === profile.id) {
      return json({ error: "Cannot delete yourself" }, 400);
    }

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) return json({ error: error.message }, 400);

    await adminClient.from("profiles").delete().eq("id", userId);
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, 405);
});

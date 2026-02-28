import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============ SECURITY UTILITIES ============

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/** Timing-safe string comparison to prevent timing attacks */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign("HMAC", key, encoder.encode(a)),
    crypto.subtle.sign("HMAC", key, encoder.encode(b)),
  ]);
  const viewA = new Uint8Array(sigA);
  const viewB = new Uint8Array(sigB);
  if (viewA.length !== viewB.length) return false;
  let result = 0;
  for (let i = 0; i < viewA.length; i++) {
    result |= viewA[i] ^ viewB[i];
  }
  return result === 0;
}

/** Validate Telegram initData signature (same logic as telegram-auth) */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function validateTelegramInitData(initDataString: string, botToken: string): Promise<{ valid: boolean; telegramId?: number }> {
  try {
    const params = new URLSearchParams(initDataString);
    const hash = params.get("hash");
    const authDate = params.get("auth_date");
    const userStr = params.get("user");
    if (!hash || !authDate) return { valid: false };

    // Check expiration (1 hour)
    const now = Math.floor(Date.now() / 1000);
    if (now - parseInt(authDate) > 3600) return { valid: false };

    params.delete("hash");
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const encoder = new TextEncoder();
    const webAppDataKey = await crypto.subtle.importKey(
      "raw", encoder.encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const secretKeyBuffer = await crypto.subtle.sign("HMAC", webAppDataKey, encoder.encode(botToken));
    const secretKey = await crypto.subtle.importKey(
      "raw", secretKeyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const hashBuffer = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(sortedParams));
    const calculatedHash = arrayBufferToHex(hashBuffer);

    if (calculatedHash !== hash) return { valid: false };

    // Extract telegram user ID
    if (userStr) {
      const user = JSON.parse(decodeURIComponent(userStr));
      return { valid: true, telegramId: user.id };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

/** Rate limiting constants */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Limit request body size (1MB max)
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 1_048_576) {
      return new Response(
        JSON.stringify({ error: "Request too large" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, path: requestPath, method: requestMethod, adminPassword, initData, ...body } = await req.json().catch(() => ({}));
    
    const url = new URL(req.url);
    const path = requestPath || url.pathname.replace("/admin-api", "") || "/";
    const method = requestMethod || req.method;

    // Derive a rate-limit key from forwarded IP or fallback
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    // Hash the IP so we don't store raw IPs
    const encoder = new TextEncoder();
    const ipHashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(clientIp + supabaseServiceKey));
    const ipHint = arrayBufferToHex(ipHashBuf).substring(0, 16);

    // ============ AUTHENTICATION ============
    let isAuthed = false;
    let authMethod = "none";

    // Method 1: Admin password
    const configuredPassword = Deno.env.get("ADMIN_PASSWORD");
    if (adminPassword && configuredPassword) {
      // Check rate limiting BEFORE password comparison
      const cutoff = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();
      const { count: recentFailures } = await supabase
        .from("admin_login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("ip_hint", ipHint)
        .eq("success", false)
        .gte("attempted_at", cutoff);

      if ((recentFailures || 0) >= MAX_ATTEMPTS) {
        console.log(`Admin API: Rate limited IP ${ipHint}`);
        return new Response(
          JSON.stringify({ error: "Too many attempts. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Timing-safe comparison
      const passwordMatch = await timingSafeEqual(adminPassword, configuredPassword);

      // Log the attempt
      await supabase.from("admin_login_attempts").insert({
        ip_hint: ipHint,
        success: passwordMatch,
      });

      // Cleanup old attempts (older than 24h)
      const cleanupCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("admin_login_attempts").delete().lt("attempted_at", cleanupCutoff);

      if (passwordMatch) {
        isAuthed = true;
        authMethod = "password";
      } else {
        console.log(`Admin API: Invalid password from ${ipHint}`);
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Method 2: Telegram initData verification + role check
    if (!isAuthed && initData) {
      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (botToken) {
        const validation = await validateTelegramInitData(initData, botToken);
        if (validation.valid && validation.telegramId) {
          // Look up profile by telegram_id
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("telegram_id", validation.telegramId)
            .single();

          if (profile?.id) {
            const { data: roles } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", profile.id);

            const hasAdminRole = roles?.some((r) => r.role === "admin" || r.role === "moderator");
            if (hasAdminRole) {
              isAuthed = true;
              authMethod = "telegram";
            }
          }
        }
      }
    }

    // Method 3: Legacy userId (DEPRECATED - kept for backward compatibility but validated)
    if (!isAuthed && userId && !initData) {
      // Only accept valid UUIDs
      if (!isValidUUID(userId)) {
        console.log(`Admin API: Invalid userId format: ${userId}`);
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesError) {
        console.error("Admin API: Role check error:", rolesError);
        return new Response(
          JSON.stringify({ error: "Authorization failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const hasAdminRole = roles?.some((r) => r.role === "admin" || r.role === "moderator");
      if (hasAdminRole) {
        isAuthed = true;
        authMethod = "role";
      }
    }

    // Allow public endpoints without admin auth
    const publicPaths = ["/promos/validate"];
    const isPublicPath = publicPaths.some(p => path === p);

    if (!isAuthed && !isPublicPath) {
      console.log("Admin API: Authentication failed - no valid method");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin API: ${method} ${path} (auth: ${authMethod})`);

    // Validate UUID in path segments where expected
    const pathParts = path.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      const possibleId = pathParts[1];
      // If it looks like it should be a UUID (not a keyword like "validate")
      if (possibleId && possibleId.length > 10 && !isValidUUID(possibleId)) {
        return new Response(
          JSON.stringify({ error: "Invalid ID format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Route handling
    switch (true) {
      // ============ BATCH (all data in one call) ============
      case path === "/batch" && method === "GET": {
        const [
          { count: usersCount },
          { count: ordersCount },
          { data: revenue },
          { count: productsCount },
          { data: productsData },
          { data: ordersData },
          { data: depositsData },
          { data: usersData },
          { data: categoriesData },
          { data: promosData },
          { data: ticketsData },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed"),
          supabase.from("orders").select("total").eq("status", "completed"),
          supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("products").select("*, categories(name, icon)").order("created_at", { ascending: false }),
          supabase.from("orders").select("*, profiles(username, first_name, telegram_id), order_items(*)").order("created_at", { ascending: false }).limit(100),
          supabase.from("transactions").select("*, profiles:user_id(username, first_name, telegram_id)").eq("type", "deposit").order("created_at", { ascending: false }).limit(100),
          supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false }).limit(100),
          supabase.from("categories").select("*").order("sort_order"),
          supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
          supabase.from("support_tickets").select("*, profiles:user_id(username, first_name, telegram_id)").order("created_at", { ascending: false }),
        ]);

        const totalRevenue = revenue?.reduce((sum: number, o: { total: string }) => sum + parseFloat(o.total), 0) || 0;

        return new Response(
          JSON.stringify({
            stats: { users: usersCount || 0, orders: ordersCount || 0, revenue: totalRevenue, products: productsCount || 0 },
            products: productsData || [],
            orders: ordersData || [],
            deposits: depositsData || [],
            users: usersData || [],
            categories: categoriesData || [],
            promos: promosData || [],
            tickets: ticketsData || [],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ============ ANALYTICS ============
      case path === "/stats" && method === "GET": {
        const [
          { count: usersCount },
          { count: ordersCount },
          { data: revenue },
          { count: productsCount },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed"),
          supabase.from("orders").select("total").eq("status", "completed"),
          supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        ]);

        const totalRevenue = revenue?.reduce((sum, o) => sum + parseFloat(o.total), 0) || 0;

        return new Response(
          JSON.stringify({
            users: usersCount || 0,
            orders: ordersCount || 0,
            revenue: totalRevenue,
            products: productsCount || 0,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ============ PRODUCTS ============
      case path === "/products" && method === "GET": {
        const { data, error } = await supabase
          .from("products")
          .select("*, categories(name, icon)")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path === "/products" && method === "POST": {
        const { data, error } = await supabase
          .from("products")
          .insert(body.product)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/products/") && method === "PUT": {
        const productId = path.split("/")[2];
        const { data, error } = await supabase
          .from("products")
          .update(body.product)
          .eq("id", productId)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/products/") && method === "DELETE": {
        const productId = path.split("/")[2];
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", productId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============ ORDERS ============
      case path === "/orders" && method === "GET": {
        // Fetch orders with items
        const { data: ordersData, error: ordersErr } = await supabase
          .from("orders")
          .select("*, profiles(username, first_name, telegram_id), order_items(*)")
          .order("created_at", { ascending: false })
          .limit(100);

        if (ordersErr) throw ordersErr;

        // Fetch deposit transactions
        const { data: depositsData, error: depositsErr } = await supabase
          .from("transactions")
          .select("*, profiles:user_id(username, first_name, telegram_id)")
          .eq("type", "deposit")
          .order("created_at", { ascending: false })
          .limit(100);

        if (depositsErr) throw depositsErr;

        return new Response(JSON.stringify({ orders: ordersData, deposits: depositsData }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/orders/") && method === "PUT": {
        const orderId = path.split("/")[2];
        const { data, error } = await supabase
          .from("orders")
          .update({ status: body.status })
          .eq("id", orderId)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============ USERS ============
      case path === "/users" && method === "GET": {
        const { data, error } = await supabase
          .from("profiles")
          .select("*, user_roles(role)")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/users/") && path.endsWith("/ban") && method === "POST": {
        const targetUserId = path.split("/")[2];
        const { error } = await supabase
          .from("profiles")
          .update({ is_banned: body.banned, ban_reason: body.reason })
          .eq("id", targetUserId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/users/") && path.endsWith("/role") && method === "POST": {
        const targetUserId = path.split("/")[2];
        
        // Remove existing role and add new one
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", targetUserId);

        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: targetUserId, role: body.role });

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============ CATEGORIES ============
      case path === "/categories" && method === "GET": {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("sort_order");

        if (error) throw error;
        return new Response(JSON.stringify(data || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path === "/categories" && method === "POST": {
        const categoryData = body.category || body;
        if (!categoryData || !categoryData.name || !categoryData.slug) {
          return new Response(
            JSON.stringify({ error: "Missing category name or slug" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase
          .from("categories")
          .insert({
            name: categoryData.name,
            slug: categoryData.slug,
            icon: categoryData.icon || null,
            description: categoryData.description || null,
            cashback_percent: categoryData.cashback_percent || 0,
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/categories/") && method === "PUT": {
        const categoryId = path.split("/")[2];
        const categoryData = body.category || body;
        const updateFields: Record<string, unknown> = {};
        if (categoryData.name !== undefined) updateFields.name = categoryData.name;
        if (categoryData.slug !== undefined) updateFields.slug = categoryData.slug;
        if (categoryData.icon !== undefined) updateFields.icon = categoryData.icon || null;
        if (categoryData.description !== undefined) updateFields.description = categoryData.description || null;
        if (categoryData.is_active !== undefined) updateFields.is_active = categoryData.is_active;
        if (categoryData.sort_order !== undefined) updateFields.sort_order = categoryData.sort_order;
        if (categoryData.cashback_percent !== undefined) updateFields.cashback_percent = categoryData.cashback_percent;

        const { data, error } = await supabase
          .from("categories")
          .update(updateFields)
          .eq("id", categoryId)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/categories/") && method === "DELETE": {
        const categoryId = path.split("/")[2];
        const { error } = await supabase
          .from("categories")
          .delete()
          .eq("id", categoryId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case path === "/promos" && method === "GET": {
        const { data, error } = await supabase
          .from("promo_codes")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify(data || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path === "/promos" && method === "POST": {
        const promoData = body.promo || body;
        if (!promoData?.code || !promoData?.discount_percent) {
          return new Response(
            JSON.stringify({ error: "Missing code or discount_percent" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase
          .from("promo_codes")
          .insert({
            code: promoData.code,
            discount_percent: promoData.discount_percent,
            max_uses: promoData.max_uses || 1,
            expires_at: promoData.expires_at || null,
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/promos/") && method === "DELETE": {
        const promoId = path.split("/")[2];
        const { error } = await supabase
          .from("promo_codes")
          .update({ is_active: false })
          .eq("id", promoId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate promo code (public-facing)
      case path === "/promos/validate" && method === "POST": {
        const { code: promoCode, userId: promoUserId } = body;
        if (!promoCode) {
          return new Response(JSON.stringify({ valid: false, error: "No code" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // System promo code WELCOME10 — hardcoded, no DB required
        const SYSTEM_PROMOS: Record<string, { discount_percent: number; first_order_only: boolean }> = {
          "WELCOME10": { discount_percent: 10, first_order_only: true },
        };

        const upperCode = promoCode.toUpperCase();
        const systemPromo = SYSTEM_PROMOS[upperCode];

        if (systemPromo) {
          // Check first-order restriction
          if (systemPromo.first_order_only && promoUserId) {
            // Check if user already used this system promo
            const { data: existingUse } = await supabase
              .from("promo_uses")
              .select("id")
              .eq("user_id", promoUserId)
              .filter("promo_id", "eq", `system:${upperCode}`)
              .maybeSingle();

            if (existingUse) {
              return new Response(JSON.stringify({ valid: false, error: "Вы уже использовали этот промокод" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            const { count } = await supabase
              .from("orders")
              .select("id", { count: "exact", head: true })
              .eq("user_id", promoUserId)
              .in("status", ["paid", "completed"]);

            if (count && count > 0) {
              return new Response(JSON.stringify({ valid: false, error: "Промокод только для первого заказа" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }

          return new Response(JSON.stringify({
            valid: true,
            discount_percent: systemPromo.discount_percent,
            promo_id: `system:${upperCode}`,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Regular DB-based promo codes
        const { data: promo, error: promoErr } = await supabase
          .from("promo_codes")
          .select("*")
          .eq("code", upperCode)
          .eq("is_active", true)
          .single();

        if (promoErr || !promo) {
          return new Response(JSON.stringify({ valid: false, error: "Промокод не найден" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (promo.used_count >= promo.max_uses) {
          return new Response(JSON.stringify({ valid: false, error: "Промокод исчерпан" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
          return new Response(JSON.stringify({ valid: false, error: "Промокод истёк" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if user already used this promo
        if (promoUserId) {
          const { data: existing } = await supabase
            .from("promo_uses")
            .select("id")
            .eq("promo_id", promo.id)
            .eq("user_id", promoUserId)
            .maybeSingle();

          if (existing) {
            return new Response(JSON.stringify({ valid: false, error: "Вы уже использовали этот промокод" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        return new Response(JSON.stringify({
          valid: true,
          discount_percent: promo.discount_percent,
          promo_id: promo.id,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============ PRODUCT ITEMS ============
      case path === "/product-items" && method === "POST": {
        const { items, productId, fileItems } = body;
        
        // Text items (legacy)
        if (items && items.length > 0) {
          const insertData = items.map((content: string) => ({
            product_id: productId,
            content,
          }));

          const { data, error } = await supabase
            .from("product_items")
            .insert(insertData)
            .select();

          if (error) throw error;
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // File items
        if (fileItems && fileItems.length > 0) {
          const insertData = fileItems.map((item: { content: string; file_url: string }) => ({
            product_id: productId,
            content: item.content,
            file_url: item.file_url,
          }));

          const { data, error } = await supabase
            .from("product_items")
            .insert(insertData)
            .select();

          if (error) throw error;
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ error: "No items provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/product-items/") && method === "GET": {
        const productId = path.split("/")[2];
        const { data, error } = await supabase
          .from("product_items")
          .select("*, profiles(username)")
          .eq("product_id", productId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/product-items/") && method === "DELETE": {
        const itemId = path.split("/")[2];
        
        // Check if item is sold — don't allow deleting sold items
        const { data: item, error: fetchErr } = await supabase
          .from("product_items")
          .select("id, is_sold, file_url")
          .eq("id", itemId)
          .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (!item) {
          // Item already deleted — return success (idempotent)
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (item.is_sold) {
          return new Response(JSON.stringify({ error: "Cannot delete sold item" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Delete file from storage if exists
        if (item.file_url) {
          try {
            const url = new URL(item.file_url);
            const storagePath = url.pathname.split('/storage/v1/object/public/delivery-files/')[1];
            if (storagePath) {
              await supabase.storage.from('delivery-files').remove([decodeURIComponent(storagePath)]);
            }
          } catch (e) {
            console.error("Failed to delete file from storage:", e);
          }
        }

        const { error: delErr } = await supabase
          .from("product_items")
          .delete()
          .eq("id", itemId);

        if (delErr) throw delErr;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============ SUPPORT TICKETS ============
      case path === "/support-tickets" && method === "GET": {
        const { data, error } = await supabase
          .from("support_tickets")
          .select("*, profiles:user_id(username, first_name, telegram_id)")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path === "/support-tickets" && method === "POST": {
        const { ticketUserId, subject, message: ticketMessage } = body;
        if (!ticketUserId || !subject || !ticketMessage) {
          return new Response(JSON.stringify({ error: "Missing fields" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data, error } = await supabase
          .from("support_tickets")
          .insert({ user_id: ticketUserId, subject, message: ticketMessage })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/support-tickets/") && path.endsWith("/reply") && method === "POST": {
        const ticketId = path.split("/")[2];
        const { reply, adminId } = body;

        // Update ticket
        const { data: ticket, error: updateErr } = await supabase
          .from("support_tickets")
          .update({
            admin_reply: reply,
            status: "answered",
            replied_at: new Date().toISOString(),
            replied_by: adminId || null,
          })
          .eq("id", ticketId)
          .select("*, profiles:user_id(telegram_id, username, first_name)")
          .single();

        if (updateErr) throw updateErr;

        // Send Telegram message
        const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (botToken && ticket?.profiles?.telegram_id) {
          try {
            const text = `💬 *Ответ от поддержки*\n\n*Тема:* ${ticket.subject}\n*Ответ:* ${reply}`;
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: ticket.profiles.telegram_id,
                text,
                parse_mode: "Markdown",
              }),
            });

            await supabase
              .from("support_tickets")
              .update({ telegram_sent: true })
              .eq("id", ticketId);
          } catch (tgErr) {
            console.error("Telegram send error:", tgErr);
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/support-tickets/") && method === "PUT": {
        const ticketId = path.split("/")[2];
        const { error } = await supabase
          .from("support_tickets")
          .update({ status: body.status })
          .eq("id", ticketId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============ USER MANAGEMENT (extended) ============
      case path.startsWith("/users/") && path.endsWith("/balance") && method === "POST": {
        const targetUserId = path.split("/")[2];
        const { amount: balanceAmount, action } = body;

        // Get current balance
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("balance")
          .eq("id", targetUserId)
          .single();

        if (profileErr) throw profileErr;

        const currentBalance = parseFloat(profile.balance) || 0;
        const changeAmount = parseFloat(balanceAmount) || 0;
        let newBalance = action === "set" ? changeAmount : currentBalance + changeAmount;

        // Clamp to database precision limits (numeric 12,2 → max ~9999999999.99)
        const MAX_BALANCE = 9999999999.99;
        if (newBalance > MAX_BALANCE) newBalance = MAX_BALANCE;
        if (newBalance < -MAX_BALANCE) newBalance = -MAX_BALANCE;
        newBalance = Math.round(newBalance * 100) / 100;

        const { error: updateErr } = await supabase
          .from("profiles")
          .update({ balance: newBalance })
          .eq("id", targetUserId);

        if (updateErr) throw updateErr;

        // Record transaction
        await supabase.from("transactions").insert({
          user_id: targetUserId,
          type: changeAmount >= 0 ? "bonus" : "purchase",
          amount: Math.abs(action === "set" ? newBalance - currentBalance : changeAmount),
          balance_after: newBalance,
          description: action === "set" 
            ? `Баланс установлен админом: ${newBalance}₽` 
            : `Изменение баланса админом: ${changeAmount >= 0 ? "+" : ""}${changeAmount}₽`,
        });

        return new Response(JSON.stringify({ success: true, balance: newBalance }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/users/") && path.endsWith("/details") && method === "GET": {
        const targetUserId = path.split("/")[2];

        const [profileRes, ordersRes, transactionsRes, ticketsRes, eventsRes] = await Promise.all([
          supabase.from("profiles").select("*, user_roles(role)").eq("id", targetUserId).single(),
          supabase.from("orders").select("*, order_items(*)").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(50),
          supabase.from("transactions").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(50),
          supabase.from("support_tickets").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(50),
          supabase.from("analytics_events").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(100),
        ]);

        return new Response(JSON.stringify({
          profile: profileRes.data,
          orders: ordersRes.data || [],
          transactions: transactionsRes.data || [],
          tickets: ticketsRes.data || [],
          events: eventsRes.data || [],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============ SEND MESSAGE TO USER ============
      case path.startsWith("/users/") && path.endsWith("/message") && method === "POST": {
        const targetUserId = path.split("/")[2];
        const { text: msgText } = body;

        if (!msgText) {
          return new Response(JSON.stringify({ error: "Missing text" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get user's telegram_id
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("telegram_id")
          .eq("id", targetUserId)
          .single();

        if (profileErr || !profile?.telegram_id) {
          return new Response(JSON.stringify({ error: "User not found or no telegram_id" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (!botToken) {
          return new Response(JSON.stringify({ error: "Bot token not configured" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: profile.telegram_id,
            text: msgText,
            parse_mode: "Markdown",
          }),
        });

        const tgData = await tgRes.json();
        if (!tgData.ok) {
          console.error("Telegram send error:", tgData);
          return new Response(JSON.stringify({ error: "Failed to send message", details: tgData.description }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============ DELIVER PRODUCT TO USER ============
      case path.startsWith("/users/") && path.endsWith("/deliver") && method === "POST": {
        const targetUserId = path.split("/")[2];
        const { productId: deliverProductId, quantity: deliverQty } = body;

        if (!deliverProductId) {
          return new Response(JSON.stringify({ error: "Missing productId" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const qty = parseInt(String(deliverQty)) || 1;

        // Get product info
        const { data: product, error: productErr } = await supabase
          .from("products")
          .select("id, name, price")
          .eq("id", deliverProductId)
          .single();

        if (productErr || !product) {
          return new Response(JSON.stringify({ error: "Product not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create order
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert({
            user_id: targetUserId,
            total: 0,
            status: "completed",
            payment_method: "admin_delivery",
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (orderErr) throw orderErr;

        // Create order item
        await supabase.from("order_items").insert({
          order_id: order.id,
          product_id: product.id,
          product_name: product.name,
          price: 0,
          quantity: qty,
        });

        // Claim product items
        const claimedItems: Array<{ content: string; file_url?: string }> = [];
        for (let i = 0; i < qty; i++) {
          const { data: claimed } = await supabase.rpc("claim_product_item", {
            p_product_id: deliverProductId,
            p_user_id: targetUserId,
            p_order_id: order.id,
          });
          if (claimed && claimed.length > 0) {
            claimedItems.push({ content: claimed[0].content, file_url: claimed[0].file_url });
          }
        }

        // Update order with delivered content
        if (claimedItems.length > 0) {
          await supabase.from("orders").update({
            delivered_content: claimedItems.map(i => i.content).join("\n---\n"),
          }).eq("id", order.id);
        }

        // Send Telegram notification
        const botToken2 = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (botToken2) {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("telegram_id")
            .eq("id", targetUserId)
            .single();

          if (userProfile?.telegram_id) {
            const chatId = userProfile.telegram_id;
            const textItems = claimedItems.filter(i => !i.file_url);
            const fileItems = claimedItems.filter(i => !!i.file_url);

            // Send text message
            const deliveryText = textItems.length > 0
              ? `🎁 *Вам выдан товар!*\n\n*Товар:* ${product.name}\n*Количество:* ${qty}\n\n${textItems.map(i => i.content).join("\n---\n")}`
              : `🎁 *Вам выдан товар!*\n\n*Товар:* ${product.name}\n*Количество:* ${qty}`;

            await fetch(`https://api.telegram.org/bot${botToken2}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: deliveryText,
                parse_mode: "Markdown",
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "⭐ Оставить отзыв", callback_data: `review_start:${order.id.substring(0, 8)}` }],
                    [{ text: "🛍 Вернуться в магазин", url: "https://t.me/Temka_Store_Bot/app" }],
                  ],
                },
              }),
            }).catch(e => console.error("TG delivery notify error:", e));

            // Send files via Telegram
            for (const item of fileItems) {
              try {
                const fileUrl = item.file_url!;
                const filePath = fileUrl.includes("/storage/v1/object/public/")
                  ? fileUrl.split("/storage/v1/object/public/delivery-files/")[1]
                  : fileUrl.split("/delivery-files/").pop();

                if (!filePath) continue;

                const { data: fileData, error: fileError } = await supabase.storage
                  .from("delivery-files")
                  .download(filePath);

                if (fileError || !fileData) {
                  console.error(`Failed to download file ${filePath}:`, fileError);
                  continue;
                }

                const fileName = decodeURIComponent(filePath.split("/").pop() || "file");
                const formData = new FormData();
                formData.append("chat_id", chatId.toString());
                formData.append("document", new File([fileData], fileName));
                formData.append("caption", `📎 Файл из выдачи: ${product.name}`);

                await fetch(`https://api.telegram.org/bot${botToken2}/sendDocument`, {
                  method: "POST",
                  body: formData,
                });

                console.log(`[AdminDeliver] Sent file ${fileName} to chat ${chatId}`);
              } catch (e) {
                console.error("TG file delivery error:", e);
              }
            }
          }
        }

        return new Response(JSON.stringify({
          success: true,
          orderId: order.id,
          claimedCount: claimedItems.length,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============ REVIEWS ============
      case path === "/reviews" && method === "GET": {
        const { data, error } = await supabase
          .from("reviews")
          .select("*, profiles!reviews_user_id_fkey(first_name, username)")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/reviews/") && path.endsWith("/moderate") && method === "POST": {
        const reviewId = path.split("/")[2];
        const { status: newStatus } = body;

        // Validate userId is a real UUID before using as moderated_by
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const moderatedBy = userId && uuidRegex.test(userId) ? userId : null;

        const { error } = await supabase
          .from("reviews")
          .update({
            status: newStatus,
            moderated_at: new Date().toISOString(),
            moderated_by: moderatedBy,
          })
          .eq("id", reviewId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============ BROADCAST ============
      case path === "/broadcast" && method === "POST": {
        const { text: broadcastText, media_url, media_type, parse_mode, buttons } = body;

        if (!broadcastText && !media_url) {
          return new Response(JSON.stringify({ error: "Нужен текст или медиа" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (!botToken) {
          return new Response(JSON.stringify({ error: "Bot token not configured" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Auto-fix HTML: close any unclosed Telegram-supported tags
        function fixHtml(text: string): string {
          if (!text) return text;
          const allowedTags = ['b', 'i', 'u', 's', 'code', 'pre', 'a', 'em', 'strong', 'del', 'ins', 'tg-spoiler'];
          const stack: string[] = [];
          let result = '';
          let i = 0;

          while (i < text.length) {
            if (text[i] !== '<') { result += text[i++]; continue; }
            const closeIdx = text.indexOf('>', i);
            if (closeIdx === -1) { result += '&lt;'; i++; continue; }
            const tagContent = text.substring(i + 1, closeIdx).trim();
            const isClosing = tagContent.startsWith('/');
            const rawName = isClosing ? tagContent.substring(1) : tagContent;
            const tagName = rawName.toLowerCase().split(/[\s\/]/)[0];

            if (allowedTags.includes(tagName)) {
              if (isClosing) {
                const idx = [...stack].reverse().findIndex(t => t === tagName);
                if (idx !== -1) {
                  const realIdx = stack.length - 1 - idx;
                  while (stack.length > realIdx + 1) result += `</${stack.pop()}>`;
                  stack.pop();
                  result += `</${tagName}>`;
                }
              } else {
                stack.push(tagName);
                result += text.substring(i, closeIdx + 1);
              }
            } else {
              result += text.substring(i, closeIdx + 1);
            }
            i = closeIdx + 1;
          }

          while (stack.length > 0) result += `</${stack.pop()}>`;
          return result;
        }

        // Sanitize text if HTML mode
        const isHtmlMode = !parse_mode || parse_mode === "HTML";
        const safeText = isHtmlMode ? fixHtml(broadcastText || '') : (broadcastText || '');

        // Get ALL user telegram_ids with pagination (bypass 1000 row limit)
        let allTelegramIds: number[] = [];
        let rangeFrom = 0;
        const PAGE_SIZE = 1000;
        while (true) {
          const { data: pageProfiles, error: profilesErr } = await supabase
            .from("profiles")
            .select("telegram_id")
            .eq("is_banned", false)
            .range(rangeFrom, rangeFrom + PAGE_SIZE - 1);

          if (profilesErr) throw profilesErr;
          if (!pageProfiles || pageProfiles.length === 0) break;

          allTelegramIds = allTelegramIds.concat(
            pageProfiles.map((p: { telegram_id: number }) => p.telegram_id).filter(Boolean)
          );

          if (pageProfiles.length < PAGE_SIZE) break;
          rangeFrom += PAGE_SIZE;
        }

        const telegramIds = allTelegramIds;
        console.log(`[Broadcast] Total users to send: ${telegramIds.length}`);

        // Build inline keyboard if buttons provided
        let reply_markup: Record<string, unknown> | undefined;
        if (buttons && Array.isArray(buttons) && buttons.length > 0) {
          reply_markup = {
            inline_keyboard: buttons.map((btn: { text: string; url: string }) => [
              { text: btn.text, url: btn.url },
            ]),
          };
        }

        // Helper: build payload for a given chatId
        function buildPayload(chatId: number): { apiMethod: string; payload: Record<string, unknown> } {
          let apiMethod = "sendMessage";
          const payload: Record<string, unknown> = {
            chat_id: chatId,
            parse_mode: parse_mode || "HTML",
          };

          if (reply_markup) payload.reply_markup = reply_markup;

          if (media_url) {
            if (media_type === "video") {
              apiMethod = "sendVideo"; payload.video = media_url;
              if (safeText) payload.caption = safeText;
            } else if (media_type === "animation" || media_type === "gif") {
              apiMethod = "sendAnimation"; payload.animation = media_url;
              if (safeText) payload.caption = safeText;
            } else {
              apiMethod = "sendPhoto"; payload.photo = media_url;
              if (safeText) payload.caption = safeText;
            }
          } else {
            payload.text = safeText;
          }

          return { apiMethod, payload };
        }

        // Helper: send one message
        async function sendOne(chatId: number): Promise<boolean> {
          const { apiMethod, payload } = buildPayload(chatId);
          const res = await fetch(`https://api.telegram.org/bot${botToken}/${apiMethod}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) { await res.text(); return true; }
          const errText = await res.text();
          console.error(`Broadcast failed for ${chatId}:`, errText);
          return false;
        }

        let sent = 0;
        let failed = 0;

        // Send in batches of 25 in parallel, ~30 msg/s Telegram limit
        const BATCH_SIZE = 25;
        for (let i = 0; i < telegramIds.length; i += BATCH_SIZE) {
          const batch = telegramIds.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(batch.map(sendOne));
          for (const ok of results) { if (ok) sent++; else failed++; }
          if (i + BATCH_SIZE < telegramIds.length) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        console.log(`[Broadcast] Sent: ${sent}, Failed: ${failed}, Total: ${telegramIds.length}`);

        return new Response(JSON.stringify({ success: true, sent, failed, total: telegramIds.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============ REQUIRED CHANNELS ============
      case path === "/required-channels" && method === "GET": {
        const { data, error } = await supabase
          .from("required_channels")
          .select("*")
          .order("sort_order");

        if (error) throw error;
        return new Response(JSON.stringify(data || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path === "/required-channels" && method === "POST": {
        const { channel_id, channel_name, channel_url } = body;
        if (!channel_id || !channel_name || !channel_url) {
          return new Response(
            JSON.stringify({ error: "Missing channel_id, channel_name, or channel_url" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase
          .from("required_channels")
          .insert({ channel_id, channel_name, channel_url })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/required-channels/") && method === "PUT": {
        const channelId = path.split("/")[2];
        const updateFields: Record<string, unknown> = {};
        if (body.is_active !== undefined) updateFields.is_active = body.is_active;
        if (body.sort_order !== undefined) updateFields.sort_order = body.sort_order;
        if (body.channel_name !== undefined) updateFields.channel_name = body.channel_name;
        if (body.channel_url !== undefined) updateFields.channel_url = body.channel_url;
        if (body.channel_id !== undefined) updateFields.channel_id = body.channel_id;

        const { data, error } = await supabase
          .from("required_channels")
          .update(updateFields)
          .eq("id", channelId)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case path.startsWith("/required-channels/") && method === "DELETE": {
        const channelId = path.split("/")[2];
        const { error } = await supabase
          .from("required_channels")
          .delete()
          .eq("id", channelId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(
          JSON.stringify({ error: "Not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    console.error("Admin API error:", err);
    // Don't expose internal error details to client
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

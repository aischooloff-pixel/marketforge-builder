import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, path: requestPath, method: requestMethod, adminPassword, ...body } = await req.json().catch(() => ({}));
    
    // Use path from body if provided (for unified routing), otherwise parse from URL
    const url = new URL(req.url);
    const path = requestPath || url.pathname.replace("/admin-api", "") || "/";
    const method = requestMethod || req.method;

    // Auth: either admin password OR user role check
    const configuredPassword = Deno.env.get("ADMIN_PASSWORD");
    const isPasswordAuth = adminPassword && configuredPassword && adminPassword === configuredPassword;

    if (!isPasswordAuth) {
      // Fallback to role-based auth (for Telegram users with admin role)
      if (!userId) {
        console.log("Admin API: Missing userId and no valid password");
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

      const isAdmin = roles?.some((r) => r.role === "admin" || r.role === "moderator");
      if (!isAdmin) {
        console.log(`Admin API: User ${userId} is not admin. Roles:`, roles);
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Admin API: ${method} ${path} (auth: ${isPasswordAuth ? "password" : "role"})`);

    // Route handling
    switch (true) {
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
        const { data, error } = await supabase
          .from("orders")
          .select("*, profiles(username, first_name, telegram_id), order_items(*)")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        return new Response(JSON.stringify(data), {
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
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ============ PROMO CODES ============
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

        const { data: promo, error: promoErr } = await supabase
          .from("promo_codes")
          .select("*")
          .eq("code", promoCode.toUpperCase())
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

        // Check if user already used
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

        // Get all user telegram_ids
        const { data: allProfiles, error: profilesErr } = await supabase
          .from("profiles")
          .select("telegram_id")
          .eq("is_banned", false);

        if (profilesErr) throw profilesErr;

        const telegramIds = allProfiles?.map(p => p.telegram_id).filter(Boolean) || [];

        // Build inline keyboard if buttons provided
        let reply_markup: Record<string, unknown> | undefined;
        if (buttons && Array.isArray(buttons) && buttons.length > 0) {
          reply_markup = {
            inline_keyboard: buttons.map((btn: { text: string; url: string }) => [
              { text: btn.text, url: btn.url },
            ]),
          };
        }

        let sent = 0;
        let failed = 0;

        for (const chatId of telegramIds) {
          try {
            let apiMethod = "sendMessage";
            const payload: Record<string, unknown> = {
              chat_id: chatId,
              parse_mode: parse_mode || "HTML",
            };

            if (reply_markup) {
              payload.reply_markup = reply_markup;
            }

            if (media_url) {
              // Determine method based on media type
              if (media_type === "video") {
                apiMethod = "sendVideo";
                payload.video = media_url;
                if (broadcastText) payload.caption = broadcastText;
              } else if (media_type === "animation" || media_type === "gif") {
                apiMethod = "sendAnimation";
                payload.animation = media_url;
                if (broadcastText) payload.caption = broadcastText;
              } else {
                // Default to photo
                apiMethod = "sendPhoto";
                payload.photo = media_url;
                if (broadcastText) payload.caption = broadcastText;
              }
            } else {
              payload.text = broadcastText;
            }

            const res = await fetch(`https://api.telegram.org/bot${botToken}/${apiMethod}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (res.ok) {
              sent++;
            } else {
              failed++;
              const errBody = await res.text();
              console.error(`Broadcast failed for ${chatId}:`, errBody);
            }

            // Rate limiting: 30 messages per second max for Telegram
            if (sent % 25 === 0) {
              await new Promise(r => setTimeout(r, 1000));
            }
          } catch (e) {
            failed++;
            console.error(`Broadcast error for ${chatId}:`, e);
          }
        }

        console.log(`[Broadcast] Sent: ${sent}, Failed: ${failed}, Total: ${telegramIds.length}`);

        return new Response(JSON.stringify({ success: true, sent, failed, total: telegramIds.length }), {
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
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

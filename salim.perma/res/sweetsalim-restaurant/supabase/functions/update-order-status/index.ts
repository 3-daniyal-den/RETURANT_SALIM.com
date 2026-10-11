// Supabase Edge Function: update-order-status
// Handles authorized status transitions, updates audit history, and notifies customer via Resend.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STATUS_TITLES: Record<string, string> = {
  received: "Order Received",
  preparing: "In Kitchen (Preparing)",
  ready_for_dispatch: "Ready for Dispatch",
  on_the_way: "On The Way (Rider Dispatched)",
  delivered: "Delivered Successfully",
  cancelled: "Order Cancelled",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const senderEmail = Deno.env.get("SENDER_EMAIL") || "Sweet Salim <onboarding@resend.dev>";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional admin authorization verification from headers
    const authHeader = req.headers.get("Authorization");
    let adminEmail = "Kitchen Admin";

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (user && !userError) {
        adminEmail = user.email || "Kitchen Admin";
      }
    }

    const body = await req.json();
    const { orderId, newStatus, note = "" } = body;

    const validStatuses = ["received", "preparing", "ready_for_dispatch", "on_the_way", "delivered", "cancelled"];
    if (!orderId || !newStatus || !validStatuses.includes(newStatus)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid parameters. Status must be one of: ${validStatuses.join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch current order
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: "Order not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Update status in orders table
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError || !updatedOrder) {
      console.error("Status update error:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Database status update failed." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Append to order_status_history
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      status: newStatus,
      note: note || `Order updated to ${STATUS_TITLES[newStatus]}`,
      updated_by: adminEmail,
    });

    // 4. Send customer email update via Resend
    if (resendApiKey && order.customer_email) {
      try {
        const friendlyTitle = STATUS_TITLES[newStatus] || newStatus;
        const emailHtml = `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #FDFBF7; padding: 30px; color: #1A1A1A;">
            <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid #EAE3D9;">
              <div style="background: #4E0D17; padding: 25px; text-align: center;">
                <h1 style="color: #D4AF37; margin: 0; font-size: 26px; letter-spacing: 2px;">SWEET SALIM</h1>
                <p style="color: #FDFBF7; margin: 5px 0 0; font-size: 13px;">ROYAL CONFECTIONS & CUISINE</p>
              </div>
              <div style="padding: 30px;">
                <h2 style="color: #4E0D17; margin-top: 0;">Order Status Update</h2>
                <p>Respected <strong>${order.customer_name}</strong>,</p>
                <p>The status of your order <strong>${order.tracking_code}</strong> has been updated to:</p>
                
                <div style="background: #4E0D17; color: #FDFBF7; padding: 18px; border-radius: 6px; text-align: center; margin: 20px 0;">
                  <span style="font-size: 20px; font-weight: bold; color: #D4AF37;">${friendlyTitle}</span>
                  ${note ? `<p style="margin: 8px 0 0; font-size: 13px; color: #F9F6F0;">${note}</p>` : ""}
                </div>

                <p style="font-size: 14px; color: #555;">
                  You can follow live real-time progress on our website using your tracking reference: 
                  <strong>${order.tracking_code}</strong>
                </p>

                <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #EEE; font-size: 13px; color: #888; text-align: center;">
                  <p>Questions? Call our concierge at +92 300 1234567 or reply to this email.</p>
                </div>
              </div>
            </div>
          </div>
        `;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: senderEmail,
            to: order.customer_email,
            subject: `Update on Order ${order.tracking_code}: ${friendlyTitle} - Sweet Salim`,
            html: emailHtml,
          }),
        });
      } catch (emailErr) {
        console.error("Resend status update email error (non-fatal):", emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        status: newStatus,
        message: `Order status successfully changed to ${STATUS_TITLES[newStatus]}.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Update-order-status unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

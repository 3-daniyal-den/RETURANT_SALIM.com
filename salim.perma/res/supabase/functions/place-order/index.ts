// Supabase Edge Function: place-order
// Handles secure validation, price recalculation against database, order storage,
// tracking code generation, and triggers email notifications via Resend.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface OrderItemInput {
  productId: string;
  quantity: number;
}

interface PlaceOrderRequest {
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city?: string;
    notes?: string;
  };
  items: OrderItemInput[];
  deliveryType?: string;
  paymentMethod?: string;
  promoCode?: string;
}

function generateTrackingCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const year = new Date().getFullYear();
  let code = `SSL-${year}-`;
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

serve(async (req: Request) => {
  // Handle CORS preflight
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
    const ownerEmail = Deno.env.get("OWNER_EMAIL") || "orders@sweetsalim.com";
    const senderEmail = Deno.env.get("SENDER_EMAIL") || "Sweet Salim <onboarding@resend.dev>";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase backend service configuration.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PlaceOrderRequest = await req.json();
    const { customer, items, deliveryType = "standard", paymentMethod = "cod", promoCode } = body;

    // 1. Validation
    if (!customer || !customer.name || !customer.phone || !customer.address) {
      return new Response(
        JSON.stringify({ success: false, error: "Customer name, phone, and delivery address are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Order must contain at least one item." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch trusted products from database to prevent price tampering
    const productIds = items.map((i) => i.productId);
    const { data: dbProducts, error: prodError } = await supabase
      .from("products")
      .select("id, name, price, in_stock")
      .in("id", productIds);

    if (prodError || !dbProducts) {
      console.error("Database product lookup error:", prodError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to verify products in catalog." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const productMap = new Map<string, { id: string; name: string; price: number; in_stock: boolean }>();
    dbProducts.forEach((p) => productMap.set(p.id, p));

    let calculatedSubtotal = 0;
    const validatedOrderItems = [];

    for (const item of items) {
      const dbProd = productMap.get(item.productId);
      if (!dbProd) {
        return new Response(
          JSON.stringify({ success: false, error: `Product ID '${item.productId}' was not found in catalog.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!dbProd.in_stock) {
        return new Response(
          JSON.stringify({ success: false, error: `Product '${dbProd.name}' is currently out of stock.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const unitPrice = Number(dbProd.price);
      const lineTotal = unitPrice * qty;
      calculatedSubtotal += lineTotal;

      validatedOrderItems.push({
        product_id: dbProd.id,
        product_name: dbProd.name,
        unit_price: unitPrice,
        quantity: qty,
        total_price: lineTotal,
      });
    }

    // 3. Calculate delivery fee & discounts
    const deliveryFee = calculatedSubtotal >= 2500 ? 0 : 200;
    let discount = 0;

    if (promoCode) {
      const cleanCode = promoCode.trim().toUpperCase();
      if (cleanCode === "SWEET10") {
        discount = Math.round(calculatedSubtotal * 0.10);
      } else if (cleanCode === "ROYAL500" && calculatedSubtotal >= 3000) {
        discount = 500;
      } else if (cleanCode === "WELCOME") {
        discount = Math.round(calculatedSubtotal * 0.15);
      }
    }

    const finalTotal = Math.max(0, calculatedSubtotal + deliveryFee - discount);
    const trackingCode = generateTrackingCode();

    // 4. Save order to database
    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        tracking_code: trackingCode,
        customer_name: customer.name.trim(),
        customer_email: (customer.email || "").trim(),
        customer_phone: customer.phone.trim(),
        delivery_address: customer.address.trim(),
        city: customer.city || "Lahore",
        notes: customer.notes || "",
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        subtotal: calculatedSubtotal,
        delivery_fee: deliveryFee,
        discount: discount,
        promo_code: promoCode || null,
        total_amount: finalTotal,
        status: "received",
      })
      .select()
      .single();

    if (orderError || !newOrder) {
      console.error("Order creation error:", orderError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to persist order in database." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Insert order line items
    const itemsToInsert = validatedOrderItems.map((item) => ({
      ...item,
      order_id: newOrder.id,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);
    if (itemsError) {
      console.error("Order items insertion error:", itemsError);
    }

    // 6. Record initial status history
    await supabase.from("order_status_history").insert({
      order_id: newOrder.id,
      status: "received",
      note: "Order created successfully by customer via website.",
      updated_by: "System",
    });

    // 7. Send confirmation email via Resend (asynchronous background notification)
    if (resendApiKey) {
      try {
        const itemRowsHtml = validatedOrderItems
          .map(
            (i) => `
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #EEE;">${i.product_name} x ${i.quantity}</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #EEE; text-align: right; font-weight: 600;">Rs. ${i.total_price.toLocaleString()}</td>
            </tr>
          `
          )
          .join("");

        const emailHtml = `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #FDFBF7; padding: 30px; color: #1A1A1A;">
            <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid #EAE3D9;">
              <div style="background: #4E0D17; padding: 25px; text-align: center;">
                <h1 style="color: #D4AF37; margin: 0; font-size: 26px; letter-spacing: 2px;">SWEET SALIM</h1>
                <p style="color: #FDFBF7; margin: 5px 0 0; font-size: 13px; letter-spacing: 1px;">ROYAL CONFECTIONS & CUISINE</p>
              </div>
              <div style="padding: 30px;">
                <h2 style="color: #4E0D17; margin-top: 0;">Royal Feast Confirmed!</h2>
                <p>Respected <strong>${customer.name}</strong>,</p>
                <p>Thank you for choosing Sweet Salim. Your order has been safely received by our royal kitchen and preparation will begin shortly.</p>
                
                <div style="background: #F8F4EE; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 13px; color: #666;">Tracking Reference:</p>
                  <p style="margin: 5px 0 0; font-size: 20px; font-weight: bold; color: #4E0D17; letter-spacing: 1.5px;">${trackingCode}</p>
                </div>

                <h3 style="border-bottom: 2px solid #4E0D17; padding-bottom: 8px; margin-top: 25px;">Order Summary</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  ${itemRowsHtml}
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Subtotal</td>
                    <td style="padding: 8px 0; text-align: right;">Rs. ${calculatedSubtotal.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Delivery Fee</td>
                    <td style="padding: 8px 0; text-align: right;">Rs. ${deliveryFee}</td>
                  </tr>
                  ${
                    discount > 0
                      ? `<tr>
                    <td style="padding: 8px 0; color: #2E7D32;">Discount (${promoCode})</td>
                    <td style="padding: 8px 0; text-align: right; color: #2E7D32;">-Rs. ${discount.toLocaleString()}</td>
                  </tr>`
                      : ""
                  }
                  <tr style="font-size: 16px; font-weight: bold; border-top: 2px solid #4E0D17;">
                    <td style="padding: 12px 0;">Total Amount</td>
                    <td style="padding: 12px 0; text-align: right; color: #4E0D17;">Rs. ${finalTotal.toLocaleString()}</td>
                  </tr>
                </table>

                <div style="margin-top: 25px; padding-top: 15px; border-top: 1px dashed #DDD; font-size: 13px; color: #555;">
                  <p style="margin: 4px 0;"><strong>Delivery Address:</strong> ${customer.address}, ${customer.city || "Lahore"}</p>
                  <p style="margin: 4px 0;"><strong>Contact Phone:</strong> ${customer.phone}</p>
                  <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>
                </div>

                <div style="text-align: center; margin-top: 35px;">
                  <p style="font-size: 13px; color: #888;">Sweet Salim Confections & Restaurant - Crafted with Royal Heritage</p>
                </div>
              </div>
            </div>
          </div>
        `;

        // Send to customer if email is provided
        if (customer.email) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: senderEmail,
              to: customer.email,
              subject: `Order Confirmed [${trackingCode}] - Sweet Salim`,
              html: emailHtml,
            }),
          });
        }

        // Send alert to store owner / kitchen
        if (ownerEmail) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: senderEmail,
              to: ownerEmail,
              subject: `NEW ORDER ALERT [${trackingCode}] - Rs. ${finalTotal.toLocaleString()}`,
              html: emailHtml,
            }),
          });
        }
      } catch (emailErr) {
        console.error("Resend notification error (non-fatal):", emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: newOrder.id,
          tracking_code: newOrder.tracking_code,
          customer_name: newOrder.customer_name,
          total_amount: newOrder.total_amount,
          subtotal: newOrder.subtotal,
          delivery_fee: newOrder.delivery_fee,
          discount: newOrder.discount,
          status: newOrder.status,
          created_at: newOrder.created_at,
        },
        message: "Order placed successfully! We have begun preparing your feast.",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Place-order unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

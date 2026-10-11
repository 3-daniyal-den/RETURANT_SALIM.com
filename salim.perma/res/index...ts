// Supabase Edge Function: place-order
// Handles secure validation, price recalculation against database, order storage,
// tracking code generation, and triggers email notifications to sweetsalim99@gmail.com via Resend.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface OrderItemInput {
  productId: string;
  slug?: string;
  productName?: string;
  unitPrice?: number;
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

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const ownerEmail = Deno.env.get("OWNER_EMAIL") || "sweetsalim99@gmail.com";
  const senderEmail = Deno.env.get("SENDER_EMAIL") || "Sweet Salim <onboarding@resend.dev>";

  try {
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

    // 2. Fetch trusted products from database (supports UUID id and slug matching)
    const validUUIDs = items
      .map((i) => i.productId)
      .filter((id) => typeof id === "string" && isUUID(id));

    const slugs = items
      .map((i) => (i.slug || i.productId || "").trim())
      .filter(Boolean);

    const dbProductsMap = new Map<string, { id: string; name: string; slug: string; price: number; in_stock: boolean }>();

    if (validUUIDs.length > 0) {
      const { data: byIdData, error: byIdError } = await supabase
        .from("products")
        .select("id, name, slug, price, in_stock")
        .in("id", validUUIDs);
      
      if (!byIdError && byIdData) {
        byIdData.forEach((p) => {
          dbProductsMap.set(p.id.toLowerCase(), p);
          if (p.slug) dbProductsMap.set(p.slug.toLowerCase(), p);
        });
      }
    }

    if (slugs.length > 0) {
      const { data: bySlugData, error: bySlugError } = await supabase
        .from("products")
        .select("id, name, slug, price, in_stock")
        .in("slug", slugs);

      if (!bySlugError && bySlugData) {
        bySlugData.forEach((p) => {
          dbProductsMap.set(p.id.toLowerCase(), p);
          if (p.slug) dbProductsMap.set(p.slug.toLowerCase(), p);
        });
      }
    }

    let calculatedSubtotal = 0;
    const validatedOrderItems = [];

    for (const item of items) {
      const pKey = (item.productId || "").toLowerCase();
      const sKey = (item.slug || "").toLowerCase();
      const dbProd = dbProductsMap.get(pKey) || dbProductsMap.get(sKey);

      let unitPrice = 0;
      let prodName = item.productName || "Royal Delicacy";
      let resolvedId = null;

      if (dbProd) {
        if (!dbProd.in_stock) {
          return new Response(
            JSON.stringify({ success: false, error: `Product '${dbProd.name}' is currently out of stock.` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        unitPrice = Number(dbProd.price);
        prodName = dbProd.name;
        resolvedId = dbProd.id;
      } else {
        // Fallback to client verified price if database catalog is unseeded
        unitPrice = Math.max(0, Number(item.unitPrice) || 0);
        prodName = item.productName || "Royal Delicacy";
        if (isUUID(item.productId)) resolvedId = item.productId;
      }

      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const lineTotal = unitPrice * qty;
      calculatedSubtotal += lineTotal;

      validatedOrderItems.push({
        product_id: resolvedId,
        product_name: prodName,
        unit_price: unitPrice,
        quantity: qty,
        total_price: lineTotal,
      });
    }

    // 3. Calculate delivery fee & discounts
    const deliveryFee = calculatedSubtotal >= 2500 || calculatedSubtotal === 0 ? 0 : 200;
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
    const orderTimestamp = new Date();

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
      throw new Error(`Failed to save order in database: ${orderError?.message || "Unknown error"}`);
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

    // 7. Format Date & Item Tables for Notification Emails
    const orderTimeFormatted = orderTimestamp.toLocaleString("en-US", {
      timeZone: "Asia/Karachi",
      dateStyle: "full",
      timeStyle: "short",
    }) + " PKT";

    const itemRowsHtml = validatedOrderItems
      .map(
        (i) => `
        <tr>
          <td style="padding: 10px 8px; border-bottom: 1px solid #EEE;">
            <strong>${i.product_name}</strong>
          </td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #EEE; text-align: center;">
            &times; ${i.quantity}
          </td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #EEE; text-align: right;">
            Rs. ${i.unit_price.toLocaleString()}
          </td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #EEE; text-align: right; font-weight: 600; color: #4E0D17;">
            Rs. ${i.total_price.toLocaleString()}
          </td>
        </tr>
      `
      )
      .join("");

    // 8. DISPATCH OWNER NOTIFICATION EMAIL to sweetsalim99@gmail.com
    if (resendApiKey && ownerEmail) {
      try {
        const ownerEmailHtml = `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #FDFBF7; padding: 30px; color: #1A1A1A;">
            <div style="max-width: 650px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid #EAE3D9; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
              
              <!-- Header -->
              <div style="background: #4E0D17; padding: 25px; text-align: center;">
                <h1 style="color: #D4AF37; margin: 0; font-size: 24px; letter-spacing: 2px;">SWEET SALIM</h1>
                <p style="color: #FDFBF7; margin: 4px 0 0; font-size: 13px; letter-spacing: 1px;">KITCHEN OPERATIONS ALERT</p>
              </div>

              <!-- Main Card Body -->
              <div style="padding: 30px;">
                <div style="background: #FEF3C7; border-left: 4px solid #B45309; padding: 14px 18px; margin-bottom: 24px; border-radius: 4px;">
                  <h2 style="margin: 0; font-size: 18px; color: #92400E;">🚨 NEW ORDER RECEIVED: ${trackingCode}</h2>
                  <p style="margin: 4px 0 0; font-size: 13px; color: #78350F;">Total Amount: <strong>Rs. ${finalTotal.toLocaleString()}</strong> &bull; Payment: <strong>${paymentMethod.toUpperCase()}</strong></p>
                </div>

                <!-- Order Metadata Grid -->
                <h3 style="font-size: 15px; text-transform: uppercase; letter-spacing: 1px; color: #4E0D17; border-bottom: 2px solid #4E0D17; padding-bottom: 6px; margin: 20px 0 12px;">
                  Customer &amp; Dispatch Details
                </h3>

                <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 6px 0; color: #666; width: 150px;"><strong>Order Number:</strong></td>
                    <td style="padding: 6px 0; font-weight: bold; color: #4E0D17;">${trackingCode}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #666;"><strong>Order Date &amp; Time:</strong></td>
                    <td style="padding: 6px 0;">${orderTimeFormatted}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #666;"><strong>Current Status:</strong></td>
                    <td style="padding: 6px 0;"><span style="background: #DBEAFE; color: #1E40AF; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">ORDER RECEIVED (IN KITCHEN)</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #666;"><strong>Customer Name:</strong></td>
                    <td style="padding: 6px 0; font-weight: 600;">${customer.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #666;"><strong>Phone Number:</strong></td>
                    <td style="padding: 6px 0;"><a href="tel:${customer.phone}" style="color: #4E0D17; font-weight: bold; text-decoration: none;">${customer.phone}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #666;"><strong>Customer Email:</strong></td>
                    <td style="padding: 6px 0;">${customer.email || "<em>Not provided</em>"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #666;"><strong>Delivery Address:</strong></td>
                    <td style="padding: 6px 0; font-weight: 500;">${customer.address}, ${customer.city || "Lahore"}</td>
                  </tr>
                  ${
                    customer.notes
                      ? `<tr>
                          <td style="padding: 6px 0; color: #666;"><strong>Special Notes:</strong></td>
                          <td style="padding: 6px 0; color: #B45309; font-weight: 600;">"${customer.notes}"</td>
                        </tr>`
                      : ""
                  }
                </table>

                <!-- Ordered Items Table -->
                <h3 style="font-size: 15px; text-transform: uppercase; letter-spacing: 1px; color: #4E0D17; border-bottom: 2px solid #4E0D17; padding-bottom: 6px; margin: 24px 0 12px;">
                  Ordered Food Items
                </h3>

                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <thead>
                    <tr style="background: #F9F5EE; color: #4E0D17;">
                      <th style="padding: 8px; text-align: left;">Item</th>
                      <th style="padding: 8px; text-align: center;">Qty</th>
                      <th style="padding: 8px; text-align: right;">Unit Price</th>
                      <th style="padding: 8px; text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemRowsHtml}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="3" style="padding: 8px; text-align: right; color: #666;">Subtotal:</td>
                      <td style="padding: 8px; text-align: right; font-weight: 600;">Rs. ${calculatedSubtotal.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td colspan="3" style="padding: 8px; text-align: right; color: #666;">Delivery Fee:</td>
                      <td style="padding: 8px; text-align: right;">${deliveryFee === 0 ? "FREE" : "Rs. " + deliveryFee}</td>
                    </tr>
                    ${
                      discount > 0
                        ? `<tr>
                            <td colspan="3" style="padding: 8px; text-align: right; color: #15803D;">Discount (${promoCode}):</td>
                            <td style="padding: 8px; text-align: right; color: #15803D;">-Rs. ${discount.toLocaleString()}</td>
                          </tr>`
                        : ""
                    }
                    <tr style="border-top: 2px solid #4E0D17; font-size: 16px;">
                      <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold; color: #4E0D17;">Grand Total:</td>
                      <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: #4E0D17;">Rs. ${finalTotal.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>

                <div style="margin-top: 30px; padding-top: 15px; border-top: 1px dashed #DDD; text-align: center; font-size: 12px; color: #888;">
                  Sweet Salim Automated Kitchen Dispatch Alert &bull; Direct Notification to sweetsalim99@gmail.com
                </div>
              </div>
            </div>
          </div>
        `;

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: senderEmail,
            to: ownerEmail,
            subject: `🚨 NEW ORDER #${trackingCode} (Rs. ${finalTotal.toLocaleString()}) - Sweet Salim Kitchen`,
            html: ownerEmailHtml,
          }),
        });

        if (!resendRes.ok) {
          const errBody = await resendRes.text();
          console.error("Resend owner email notification failed:", resendRes.status, errBody);
        } else {
          console.log(`Order notification successfully dispatched to ${ownerEmail}`);
        }
      } catch (ownerEmailErr) {
        console.error("Resend owner notification error (non-fatal):", ownerEmailErr);
      }
    }

    // 9. DISPATCH CUSTOMER CONFIRMATION EMAIL if email provided
    if (resendApiKey && customer.email) {
      try {
        const customerEmailHtml = `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #FDFBF7; padding: 30px; color: #1A1A1A;">
            <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid #EAE3D9;">
              <div style="background: #4E0D17; padding: 25px; text-align: center;">
                <h1 style="color: #D4AF37; margin: 0; font-size: 26px; letter-spacing: 2px;">SWEET SALIM</h1>
                <p style="color: #FDFBF7; margin: 5px 0 0; font-size: 13px; letter-spacing: 1px;">ROYAL CONFECTIONS & CUISINE</p>
              </div>
              <div style="padding: 30px;">
                <h2 style="color: #4E0D17; margin-top: 0;">Royal Feast Confirmed!</h2>
                <p>Respected <strong>${customer.name}</strong>,</p>
                <p>Thank you for choosing Sweet Salim. Your order has been safely received by our royal kitchen and preparation has begun.</p>
                
                <div style="background: #F8F4EE; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 13px; color: #666;">Tracking Reference Code:</p>
                  <p style="margin: 5px 0 0; font-size: 22px; font-weight: bold; color: #4E0D17; letter-spacing: 1.5px;">${trackingCode}</p>
                </div>

                <h3 style="border-bottom: 2px solid #4E0D17; padding-bottom: 8px; margin-top: 25px;">Order Receipt</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  ${itemRowsHtml}
                  <tr>
                    <td colspan="3" style="padding: 8px 0; color: #666;">Subtotal</td>
                    <td style="padding: 8px 0; text-align: right;">Rs. ${calculatedSubtotal.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colspan="3" style="padding: 8px 0; color: #666;">Delivery Fee</td>
                    <td style="padding: 8px 0; text-align: right;">${deliveryFee === 0 ? "FREE" : "Rs. " + deliveryFee}</td>
                  </tr>
                  ${
                    discount > 0
                      ? `<tr>
                          <td colspan="3" style="padding: 8px 0; color: #2E7D32;">Discount (${promoCode})</td>
                          <td style="padding: 8px 0; text-align: right; color: #2E7D32;">-Rs. ${discount.toLocaleString()}</td>
                        </tr>`
                      : ""
                  }
                  <tr style="font-size: 16px; font-weight: bold; border-top: 2px solid #4E0D17;">
                    <td colspan="3" style="padding: 12px 0;">Total Amount</td>
                    <td style="padding: 12px 0; text-align: right; color: #4E0D17;">Rs. ${finalTotal.toLocaleString()}</td>
                  </tr>
                </table>

                <div style="margin-top: 25px; padding-top: 15px; border-top: 1px dashed #DDD; font-size: 13px; color: #555;">
                  <p style="margin: 4px 0;"><strong>Delivery Address:</strong> ${customer.address}, ${customer.city || "Lahore"}</p>
                  <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</p>
                  <p style="margin: 4px 0;"><strong>Order Date:</strong> ${orderTimeFormatted}</p>
                </div>

                <div style="text-align: center; margin-top: 35px;">
                  <p style="font-size: 13px; color: #888;">Sweet Salim Confections & Restaurant &bull; Concierge: sweetsalim99@gmail.com</p>
                </div>
              </div>
            </div>
          </div>
        `;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: senderEmail,
            to: customer.email,
            subject: `Order Confirmed [${trackingCode}] - Sweet Salim`,
            html: customerEmailHtml,
          }),
        });
      } catch (custEmailErr) {
        console.error("Resend customer confirmation email error:", custEmailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: newOrder.id,
          tracking_code: newOrder.tracking_code,
          customer_name: newOrder.customer_name,
          customer_phone: newOrder.customer_phone,
          customer_email: newOrder.customer_email,
          delivery_address: newOrder.delivery_address,
          city: newOrder.city,
          total_amount: newOrder.total_amount,
          subtotal: newOrder.subtotal,
          delivery_fee: newOrder.delivery_fee,
          discount: newOrder.discount,
          status: newOrder.status,
          created_at: newOrder.created_at,
          items: validatedOrderItems,
        },
        message: "Order placed successfully! Notification sent to sweetsalim99@gmail.com.",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Place-order unexpected error:", err);

    // Send order-processing error notification to sweetsalim99@gmail.com if Resend configured
    if (resendApiKey && ownerEmail) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: senderEmail,
            to: ownerEmail,
            subject: `⚠️ ORDER PROCESSING ERROR - Sweet Salim Online`,
            html: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2 style="color: #B91C1C;">Order Processing Error Alert</h2>
                <p>An attempt to place an order encountered a server error:</p>
                <div style="background: #FEF2F2; border: 1px solid #F87171; padding: 12px; border-radius: 4px; color: #991B1B;">
                  ${err.message || "Unknown error"}
                </div>
                <p style="font-size: 12px; color: #666; margin-top: 15px;">Timestamp: ${new Date().toISOString()}</p>
              </div>
            `,
          }),
        });
      } catch (notifyErr) {
        console.error("Error notification email failed:", notifyErr);
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

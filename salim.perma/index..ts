// Supabase Edge Function: submit-feedback
// Handles customer reviews, complaints, and suggestions, saves to database,
// and notifies sweetsalim99@gmail.com via Resend.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FeedbackPayload {
  customer_name?: string;
  order_number?: string;
  rating: number;
  message: string;
  suggestions?: string;
  feedback_type?: "review" | "suggestion" | "complaint";
}

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
    const ownerEmail = Deno.env.get("OWNER_EMAIL") || "sweetsalim99@gmail.com";
    const senderEmail = Deno.env.get("SENDER_EMAIL") || "Sweet Salim <onboarding@resend.dev>";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase backend service configuration.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: FeedbackPayload = await req.json();

    const rating = Math.min(5, Math.max(1, Math.floor(Number(body.rating) || 5)));
    const message = (body.message || "").trim();
    const customerName = (body.customer_name || "").trim() || "Valued Patron";
    const orderNumber = (body.order_number || "").trim();
    const suggestions = (body.suggestions || "").trim();
    const feedbackType = body.feedback_type === "complaint" || body.feedback_type === "suggestion"
      ? body.feedback_type
      : "review";

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: "Feedback message cannot be empty." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Save to customer_feedback table
    const { data: newFeedback, error: dbError } = await supabase
      .from("customer_feedback")
      .insert({
        customer_name: customerName,
        order_number: orderNumber || null,
        rating: rating,
        message: message,
        suggestions: suggestions || null,
        feedback_type: feedbackType,
        is_approved: true,
      })
      .select()
      .single();

    if (dbError || !newFeedback) {
      console.error("Database feedback insertion error:", dbError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to record customer feedback in database." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Dispatch email notification to sweetsalim99@gmail.com
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    const timestampFormatted = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Karachi",
      dateStyle: "full",
      timeStyle: "short",
    });

    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #FDFBF7; padding: 30px; color: #1A1A1A;">
        <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid #EAE3D9;">
          <div style="background: #4E0D17; padding: 25px; text-align: center;">
            <h1 style="color: #D4AF37; margin: 0; font-size: 24px; letter-spacing: 2px;">SWEET SALIM</h1>
            <p style="color: #FDFBF7; margin: 5px 0 0; font-size: 13px;">CUSTOMER FEEDBACK NOTIFICATION</p>
          </div>
          <div style="padding: 30px;">
            <div style="background: #FDF4E6; border-left: 4px solid #D4AF37; padding: 14px 18px; margin-bottom: 24px; border-radius: 4px;">
              <span style="font-size: 18px; color: #D4AF37; font-weight: bold; letter-spacing: 2px;">${stars}</span>
              <span style="font-size: 14px; color: #4E0D17; font-weight: bold; margin-left: 10px; text-transform: uppercase;">(${rating} / 5 Stars - ${feedbackType})</span>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 140px;"><strong>Patron Name:</strong></td>
                <td style="padding: 8px 0; color: #1A1A1A;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Order Reference:</strong></td>
                <td style="padding: 8px 0; color: #4E0D17; font-weight: bold;">${orderNumber || "Not specified / Dine-in"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Submission Date:</strong></td>
                <td style="padding: 8px 0; color: #1A1A1A;">${timestampFormatted} PKT</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;"><strong>Category:</strong></td>
                <td style="padding: 8px 0; text-transform: capitalize;">${feedbackType}</td>
              </tr>
            </table>

            <div style="background: #F9F9F9; border-radius: 6px; padding: 16px; margin: 20px 0; border: 1px solid #EEE;">
              <p style="margin: 0 0 6px; font-size: 13px; color: #666; text-transform: uppercase;"><strong>Customer Message:</strong></p>
              <p style="margin: 0; font-size: 15px; color: #222; line-height: 1.6; font-style: italic;">"${message}"</p>
            </div>

            ${
              suggestions
                ? `<div style="background: #F0FDF4; border-radius: 6px; padding: 16px; margin: 20px 0; border: 1px solid #DCFCE7;">
                     <p style="margin: 0 0 6px; font-size: 13px; color: #166534; text-transform: uppercase;"><strong>Suggestions / Improvements:</strong></p>
                     <p style="margin: 0; font-size: 14px; color: #166534; line-height: 1.5;">${suggestions}</p>
                   </div>`
                : ""
            }

            <div style="margin-top: 30px; padding-top: 15px; border-top: 1px dashed #DDD; text-align: center; font-size: 12px; color: #888;">
              Sweet Salim Automated Operations Alert &bull; Notification for sweetsalim99@gmail.com
            </div>
          </div>
        </div>
      </div>
    `;

    if (resendApiKey) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: senderEmail,
            to: ownerEmail,
            subject: `🌟 New Customer ${feedbackType.toUpperCase()} (${rating}★) - Sweet Salim`,
            html: emailHtml,
          }),
        });

        if (!resendRes.ok) {
          const resendErr = await resendRes.text();
          console.error("Resend feedback email notification failed:", resendRes.status, resendErr);
        } else {
          console.log(`Feedback notification email dispatched to ${ownerEmail}`);
        }
      } catch (emailErr) {
        console.error("Resend notification error (non-fatal):", emailErr);
      }
    } else {
      console.warn("RESEND_API_KEY not configured in Supabase secrets; feedback stored in database.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        feedback: newFeedback,
        message: "Thank you for your valuable feedback! Your thoughts help us uphold royal culinary excellence.",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Submit-feedback error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Sweet Salim Restaurant & Confectionery - Contact & Feedback Controller
 * Handles contact concierge form, customer reviews/feedback with 5-star rating,
 * and dispatching notifications to sweetsalim99@gmail.com.
 */

document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contactForm');
  const contactFeedback = document.getElementById('contactFeedback');

  // 1. General Concierge Contact Form Submission
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('contactName')?.value.trim();
      const contact = document.getElementById('contactEmailPhone')?.value.trim();
      const subject = document.getElementById('contactSubject')?.value.trim();
      const message = document.getElementById('contactMessage')?.value.trim();

      if (!name || !contact || !message) {
        if (window.showToast) window.showToast('Please provide your name, contact info, and message.', 'error');
        return;
      }

      // Display friendly confirmation feedback
      if (contactFeedback) {
        contactFeedback.innerHTML = `
          <div style="background: #DCFCE7; border: 1px solid #86EFAC; color: #166534; padding: 16px; border-radius: var(--border-radius-sm); margin-top: 16px;">
            <h4 style="font-size: 1rem; margin-bottom: 4px;">✓ Royal Concierge Message Received</h4>
            <p style="font-size: 0.875rem;">Thank you, ${name}. Our hospitality manager has received your inquiry at <strong>sweetsalim99@gmail.com</strong> and will reach out to <strong>${contact}</strong> shortly.</p>
          </div>
        `;
      }

      if (window.showToast) {
        window.showToast('Message sent to Sweet Salim Concierge.', 'success');
      }

      contactForm.reset();
    });
  }

  // 2. Customer Feedback & Review System
  const feedbackForm = document.getElementById('customerFeedbackForm');
  const starContainer = document.getElementById('starRatingContainer');
  const ratingInput = document.getElementById('feedbackRatingInput');
  const ratingLabel = document.getElementById('starRatingLabel');
  const feedbackResultAlert = document.getElementById('feedbackResultAlert');
  const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');

  // Pre-fill order number from URL query parameter (e.g. contact.html?order=SSL-2026-X7K9P)
  const urlParams = new URLSearchParams(window.location.search);
  const orderFromUrl = urlParams.get('order');
  const feedbackOrderInput = document.getElementById('feedbackOrderNumber');
  if (orderFromUrl && feedbackOrderInput) {
    feedbackOrderInput.value = orderFromUrl.trim().toUpperCase();
  }

  // Interactive Star Rating Selector
  const starLabels = {
    1: '1 Star - Unsatisfactory',
    2: '2 Stars - Needs Improvement',
    3: '3 Stars - Satisfactory',
    4: '4 Stars - Very Good',
    5: '5 Stars - Royal Excellence'
  };

  if (starContainer && ratingInput) {
    const starItems = starContainer.querySelectorAll('.star-rating-item');

    function updateStarDisplay(val) {
      starItems.forEach(star => {
        const starVal = parseInt(star.getAttribute('data-value'), 10);
        if (starVal <= val) {
          star.textContent = '★';
          star.style.color = '#D4AF37';
        } else {
          star.textContent = '☆';
          star.style.color = '#A3A3A3';
        }
      });
      if (ratingLabel) {
        ratingLabel.textContent = starLabels[val] || `${val} Stars`;
      }
    }

    starItems.forEach(star => {
      star.addEventListener('click', () => {
        const selected = parseInt(star.getAttribute('data-value'), 10);
        ratingInput.value = selected;
        updateStarDisplay(selected);
      });

      star.addEventListener('mouseenter', () => {
        const hoverVal = parseInt(star.getAttribute('data-value'), 10);
        updateStarDisplay(hoverVal);
      });
    });

    starContainer.addEventListener('mouseleave', () => {
      const current = parseInt(ratingInput.value, 10) || 5;
      updateStarDisplay(current);
    });

    // Initial 5-star state
    updateStarDisplay(5);
  }

  // Handle Feedback Submission
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const rating = parseInt(ratingInput ? ratingInput.value : '5', 10) || 5;
      const customerName = document.getElementById('feedbackName')?.value.trim() || 'Valued Patron';
      const orderNumber = document.getElementById('feedbackOrderNumber')?.value.trim();
      const feedbackType = document.getElementById('feedbackCategory')?.value || 'review';
      const message = document.getElementById('feedbackMessage')?.value.trim();
      const suggestions = document.getElementById('feedbackSuggestions')?.value.trim();

      if (!message) {
        if (window.showToast) window.showToast('Please provide your feedback message.', 'error');
        return;
      }

      if (submitFeedbackBtn) {
        submitFeedbackBtn.disabled = true;
        var originalBtnHtml = submitFeedbackBtn.innerHTML;
        submitFeedbackBtn.innerHTML = 'Submitting Feedback...';
      }

      const feedbackData = {
        customer_name: customerName,
        order_number: orderNumber || null,
        rating,
        feedback_type: feedbackType,
        message,
        suggestions: suggestions || null,
        created_at: new Date().toISOString()
      };

      try {
        // If Supabase backend is configured, send via Edge Function
        if (window.CONFIG && window.CONFIG.isConfigured() && window.CONFIG.SUPABASE && window.CONFIG.SUPABASE.functionsUrl) {
          const res = await fetch(`${window.CONFIG.SUPABASE.functionsUrl}/submit-feedback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': window.CONFIG.SUPABASE.anonKey
            },
            body: JSON.stringify(feedbackData)
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Server error recording feedback.');
          }
        } else {
          // Demo / Local Mode: Store in localStorage demo feedback list
          const key = (window.CONFIG && window.CONFIG.STORAGE_KEYS && window.CONFIG.STORAGE_KEYS.customerFeedback) || 'sweetsalim_customer_feedback';
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          existing.unshift({
            ...feedbackData,
            id: 'fb-' + Date.now()
          });
          localStorage.setItem(key, JSON.stringify(existing));
        }

        // Display success confirmation
        if (feedbackResultAlert) {
          feedbackResultAlert.innerHTML = `
            <div style="background: #DCFCE7; border: 1px solid #86EFAC; color: #166534; padding: 18px; border-radius: var(--border-radius-sm);">
              <h4 style="font-size: 1.05rem; margin-bottom: 4px;">✓ Royal Patron Feedback Received!</h4>
              <p style="font-size: 0.875rem; margin: 0;">Thank you, ${customerName}. Your feedback (${rating} Stars) has been recorded and notification sent to <strong>sweetsalim99@gmail.com</strong>.</p>
            </div>
          `;
        }

        if (window.showToast) {
          window.showToast('Thank you! Your feedback was submitted successfully.', 'success');
        }

        feedbackForm.reset();
        if (ratingInput) ratingInput.value = '5';
        if (starContainer) {
          starContainer.querySelectorAll('.star-rating-item').forEach(s => {
            s.textContent = '★';
            s.style.color = '#D4AF37';
          });
        }
        if (ratingLabel) ratingLabel.textContent = starLabels[5];

      } catch (err) {
        console.error('Feedback submission error:', err);
        if (feedbackResultAlert) {
          feedbackResultAlert.innerHTML = `
            <div style="background: #FEF2F2; border: 1px solid #FCA5A5; color: #991B1B; padding: 16px; border-radius: var(--border-radius-sm);">
              <p style="margin: 0; font-size: 0.875rem;"><strong>Error:</strong> ${err.message || 'Could not record feedback. Please try again.'}</p>
            </div>
          `;
        }
        if (window.showToast) {
          window.showToast(err.message || 'Feedback submission failed.', 'error');
        }
      } finally {
        if (submitFeedbackBtn) {
          submitFeedbackBtn.disabled = false;
          submitFeedbackBtn.innerHTML = originalBtnHtml || 'Submit Feedback to Sweet Salim';
        }
      }
    });
  }

  // 3. FAQ Accordion Logic
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        faqItems.forEach(i => i.classList.remove('active'));
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });

  // 4. WhatsApp inquiry button update
  const waBtn = document.getElementById('whatsAppInquiryBtn');
  if (waBtn && window.CONFIG && window.CONFIG.BRAND) {
    const waNumber = window.CONFIG.BRAND.whatsapp;
    const msg = encodeURIComponent("Salam Sweet Salim! I would like to inquire about placing a royal feast order or custom celebration boxes.");
    waBtn.href = `https://wa.me/${waNumber}?text=${msg}`;
  }
});

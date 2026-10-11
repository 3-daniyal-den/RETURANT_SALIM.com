/**
 * Sweet Salim Restaurant & Confectionery - Contact & Concierge Controller
 * Handles contact form validation, feedback, FAQ accordion toggles, and WhatsApp inquiry links.
 */

document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contactForm');
  const contactFeedback = document.getElementById('contactFeedback');

  // 1. Contact Form Submission
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
            <p style="font-size: 0.875rem;">Thank you, ${name}. Our hospitality manager has received your inquiry and will reach back out to you at <strong>${contact}</strong> shortly.</p>
          </div>
        `;
      }

      if (window.showToast) {
        window.showToast('Message sent to Sweet Salim Concierge.', 'success');
      }

      contactForm.reset();
    });
  }

  // 2. FAQ Accordion Logic
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        // Close all
        faqItems.forEach(i => i.classList.remove('active'));
        // If not already active, open clicked one
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });

  // 3. Dynamic WhatsApp inquiry button update
  const waBtn = document.getElementById('whatsAppInquiryBtn');
  if (waBtn && window.CONFIG) {
    const waNumber = window.CONFIG.BRAND.whatsapp;
    const msg = encodeURIComponent("Salam Sweet Salim! I would like to inquire about placing a royal feast order or custom celebration boxes.");
    waBtn.href = `https://wa.me/${waNumber}?text=${msg}`;
  }
});

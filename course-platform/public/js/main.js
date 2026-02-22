async function createOrder(courseId) {
  const response = await fetch('/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId })
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Unable to start payment');
  return payload;
}

async function verifyPayment(paymentDetails) {
  const response = await fetch('/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentDetails)
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) throw new Error(payload.message || 'Verification failed');
  return payload;
}

document.querySelectorAll('.buy-btn').forEach((button) => {
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const courseId = Number(button.dataset.courseId);
      const { order, course } = await createOrder(courseId);

      const options = {
        key: window.__RAZORPAY_KEY || document.body.dataset.razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: 'CourseHub',
        description: course.title,
        order_id: order.id,
        handler: async function (response) {
          await verifyPayment(response);
          alert('Payment successful! Course unlocked.');
          window.location.href = '/dashboard';
        },
        theme: { color: '#22c55e' }
      };

      const razorpay = new Razorpay(options);
      razorpay.open();
    } catch (error) {
      alert(error.message);
    } finally {
      button.disabled = false;
    }
  });
});

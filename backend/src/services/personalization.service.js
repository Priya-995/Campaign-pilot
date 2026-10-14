export function generateCouponCode(customer, offer = {}) {
  const prefix = (offer.value || 'DEAL').replace(/[^A-Z0-9]/gi, '').toUpperCase() || 'SAVE20';
  const custSuffix = (customer.customerId || customer._id?.toString() || '1234').slice(-4).toUpperCase();
  return `${prefix}-${custSuffix}`;
}

export function renderMessage(template = '', customer = {}, offer = {}) {
  if (!template) return '';

  const firstName = customer.name ? customer.name.split(' ')[0] : 'Valued Shopper';
  const lastName = customer.name && customer.name.split(' ').length > 1 ? customer.name.split(' ').slice(1).join(' ') : '';
  const discount = offer.value || '20% OFF';
  const couponCode = generateCouponCode(customer, offer);
  const city = customer.city || 'your city';
  const preferredCategory = customer.categories && customer.categories.length > 0 ? customer.categories[0] : 'retail';

  let rendered = template
    .replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
    .replace(/\{\{\s*last_name\s*\}\}/gi, lastName)
    .replace(/\{\{\s*name\s*\}\}/gi, customer.name || 'Valued Customer')
    .replace(/\{\{\s*discount\s*\}\}/gi, discount)
    .replace(/\{\{\s*coupon_code\s*\}\}/gi, couponCode)
    .replace(/\{\{\s*city\s*\}\}/gi, city)
    .replace(/\{\{\s*category\s*\}\}/gi, preferredCategory);

  return rendered;
}

export function previewMessages(template = '', customers = [], offer = {}, count = 3) {
  const sample = customers.slice(0, count);
  return sample.map(customer => ({
    customerId: customer.customerId || customer._id,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    renderedMessage: renderMessage(template, customer, offer),
    couponCode: generateCouponCode(customer, offer)
  }));
}

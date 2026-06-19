import { Tag } from 'antd'

export function formatMoney(value) {
  return `Tk ${Number(value || 0).toLocaleString()}`
}

export function formatDateTime(value) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function normalizeText(value) {
  return String(value || '').toLowerCase()
}

export function orderSearchText(order) {
  const payment = order.payments?.[0]
  return [
    order.id,
    order.customer_name,
    order.customer_phone,
    order.account_username,
    order.account_email,
    order.status,
    order.payment_status,
    order.payment_method,
    payment?.transaction_id,
    formatDateTime(order.created_at),
    ...(order.items || []).map((item) => `${item.product_name} ${item.product_sku || ''}`),
  ].map(normalizeText).join(' ')
}

export function isRegisteredOrder(order) {
  return order.customer_type === 'registered' || Boolean(order.user)
}

export function customerTypeTag(order) {
  return isRegisteredOrder(order) ? <Tag color="green">registered</Tag> : <Tag color="default">guest</Tag>
}

export function normalizeCart(apiCart) {
  return (apiCart?.items || []).map((item) => ({
    id: item.id,
    product: item.product_detail || {
      id: item.product,
      name: item.product_name,
      price: item.unit_price,
      image_url: '',
    },
    quantity: item.quantity,
  }))
}

export function parseApiError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error?.message) return fallback
  try {
    const data = JSON.parse(error.message)
    if (typeof data === 'string') return data
    if (data.detail) return data.detail
    const firstKey = Object.keys(data)[0]
    const value = firstKey ? data[firstKey] : null
    if (Array.isArray(value)) return value.join(' ')
    if (typeof value === 'string') return value
  } catch {
    return error.message
  }
  return fallback
}

export function isAuthError(error) {
  if (error?.status === 401 || error?.status === 403) return true
  return /authentication credentials/i.test(error?.message || '')
}

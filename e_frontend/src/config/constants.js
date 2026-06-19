const API_HOST = window.location.hostname || '127.0.0.1'

export const API_URL = `http://${API_HOST}:8000/api`
export const SESSION_KEY = 'new_ecommerce_admin_password'

export const FEATURE_CATEGORIES = ['Bags', 'Watches', 'New Arrival', 'Best Selling']
export const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

export const PAYMENT_METHODS = [
  {
    value: 'cash_on_delivery',
    label: 'Cash on delivery',
    description: 'Pay when the order arrives',
    accent: '#0f766e',
  },
  {
    value: 'bkash',
    label: 'bKash',
    description: 'Enter any transaction ID for local confirmation',
    accent: '#d12053',
  },
  {
    value: 'nagad',
    label: 'Nagad',
    description: 'Enter any transaction ID for local confirmation',
    accent: '#f26522',
  },
]

export const emptyProduct = { name: '', description: '', price: '', stock: '', image_url: '' }
export const emptyCategory = { name: '', is_active: true }
export const emptyCheckout = {
  customer_name: '',
  customer_phone: '',
  shipping_address: '',
  payment_method: 'cash_on_delivery',
  transaction_id: '',
}
export const emptyReview = { customer_name: '', rating: 5, comment: '' }
export const emptyAuth = {
  username: '',
  email: '',
  password: '',
  confirm_password: '',
  first_name: '',
  phone: '',
  address: '',
}

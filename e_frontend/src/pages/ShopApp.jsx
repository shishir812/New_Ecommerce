import { useCallback, useEffect, useMemo, useState } from 'react'
import { App as AntApp, Alert } from 'antd'
import { emptyAuth } from '../config/constants'
import { isAuthError, normalizeCart, parseApiError } from '../utils/formatters'
import { apiRequest } from '../services/apiClient'
import {
  AccountPage,
  AuthPage,
  CartPage,
  CheckoutPage,
  ConfirmationPage,
  DetailsPage,
  HomePage,
  ListingPage,
  OrderHistoryPage,
  StoreNav,
} from '../components/storefront/StorefrontViews'

export default function ShopApp({ navigate }) {
  const { message } = AntApp.useApp()
  const [page, setPage] = useState('home')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [cart, setCart] = useState([])
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [confirmation, setConfirmation] = useState(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [returnToCheckout, setReturnToCheckout] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    feature: 'all',
    price: [0, 5000],
  })

  const request = useCallback((path, options) => apiRequest(path, options), [])

  function requireLoginAgain() {
    setCustomer(null)
    setReturnToCheckout(true)
    setPage('auth')
    message.warning('Please login or create an account before checkout.')
  }

  const loadStore = useCallback(async () => {
    setLoading(true)
    try {
      const [productData, categoryData] = await Promise.all([
        request('/products/'),
        request('/categories/'),
      ])
      setProducts(productData)
      setCategories(categoryData)
      setNotice('')

      try {
        const me = await request('/auth/me/')
        setCustomer(me.user)
      } catch {
        setCustomer(null)
      }
    } catch {
      setNotice('Start the Django backend on port 8000 to load store data.')
    } finally {
      setLoading(false)
    }
  }, [request])

  const loadOrderHistory = useCallback(async () => {
    if (!customer) {
      setOrders([])
      return
    }
    try {
      setOrders(await request('/customer/orders/'))
    } catch (error) {
      if (isAuthError(error)) {
        setCustomer(null)
        setOrders([])
        return
      }
      message.warning(parseApiError(error, 'Please login again to view order history.'))
    }
  }, [customer, message, request])

  const loadCustomerCart = useCallback(async () => {
    try {
      const apiCart = await request('/customer/cart/')
      const nextCart = normalizeCart(apiCart)
      setCart(nextCart)
      return nextCart
    } catch (error) {
      if (isAuthError(error)) {
        setCustomer(null)
        setCart([])
        return []
      }
      throw error
    }
  }, [request])

  async function syncCustomerCart(nextCart) {
    const apiCart = await request('/customer/cart/', {
      method: 'PATCH',
      body: JSON.stringify({
        items: nextCart.map((item) => ({
          product: item.product.id,
          quantity: item.quantity,
        })),
      }),
    })
    const syncedCart = normalizeCart(apiCart)
    setCart(syncedCart)
    return syncedCart
  }

  async function refreshCustomer() {
    const me = await request('/auth/me/')
    setCustomer(me.user)
    return me.user
  }

  useEffect(() => {
    loadStore()
    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get('payment_status')
    const orderId = params.get('order_id')
    if (paymentStatus && orderId) {
      setConfirmation({ id: orderId, payment_status: paymentStatus })
      setPage('confirmation')
      window.history.replaceState({}, '', '/')
    }
  }, [loadStore])

  useEffect(() => {
    loadOrderHistory()
    if (customer && !cart.length) loadCustomerCart()
  }, [cart.length, customer, loadCustomerCart, loadOrderHistory])

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0)
  const categoryOptions = categories.map((category) => ({ value: category.id, label: category.name }))

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const text = `${product.name} ${product.description}`.toLowerCase()
      const searchMatch = text.includes(filters.search.toLowerCase())
      const categoryMatch = filters.category === 'all' || product.category === filters.category
      const price = Number(product.price)
      const priceMatch = price >= filters.price[0] && price <= filters.price[1]
      const featureMatch =
        filters.feature === 'all' ||
        (filters.feature === 'Bags' && product.name.toLowerCase().includes('bag')) ||
        (filters.feature === 'Watches' && product.name.toLowerCase().includes('watch')) ||
        (filters.feature === 'New Arrival' && product.status === 'active') ||
        (filters.feature === 'Best Selling' && Number(product.average_rating || 0) >= 4)
      return searchMatch && categoryMatch && priceMatch && featureMatch
    })
  }, [products, filters])

  function showProduct(product) {
    setSelectedProduct(product)
    setPage('details')
  }

  async function addToCart(product, quantity = 1) {
    try {
      if (customer) {
        const apiCart = await request('/customer/cart/', {
          method: 'POST',
          body: JSON.stringify({ product: product.id, quantity }),
        })
        setCart(normalizeCart(apiCart))
        message.success('Added to cart')
        return
      }

      setCart((current) => {
        const existing = current.find((item) => item.product.id === product.id)
        if (existing) {
          return current.map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
          )
        }
        return [...current, { product, quantity }]
      })
      message.success('Added to cart')
    } catch (error) {
      if (isAuthError(error)) {
        requireLoginAgain()
        return
      }
      message.error(parseApiError(error, 'Could not add this product to cart.'))
    }
  }

  async function updateCart(productId, quantity) {
    const nextCart = quantity < 1
      ? cart.filter((item) => item.product.id !== productId)
      : cart.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    setCart(nextCart)
    if (customer) {
      try {
        await syncCustomerCart(nextCart)
      } catch (error) {
        if (isAuthError(error)) {
          requireLoginAgain()
          return
        }
        message.error(parseApiError(error, 'Could not update cart.'))
      }
    }
  }

  async function placeOrder(values) {
    if (!cart.length) return
    if (!customer) {
      setReturnToCheckout(true)
      message.warning('Please login or create an account before checkout.')
      setPage('auth')
      return
    }
    try {
      const first = cart[0]
      const order = await request('/orders/', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          product: first.product.id,
          quantity: first.quantity,
          cart_items: cart.map((item) => ({
            product: item.product.id,
            quantity: item.quantity,
          })),
        }),
      })
      setConfirmation(order)
      setCart([])
      setPage('confirmation')
      loadOrderHistory()
    } catch (error) {
      if (isAuthError(error)) {
        requireLoginAgain()
        return
      }
      message.error(parseApiError(error, 'Could not place this order.'))
    }
  }

  function startCheckout() {
    if (!cart.length) return
    if (!customer) {
      setReturnToCheckout(true)
      message.warning('Please login or create an account before checkout.')
      setPage('auth')
      return
    }
    setPage('checkout')
  }

  async function submitReview(values) {
    if (!selectedProduct) return
    try {
      const payload = {
        product: selectedProduct.id,
        rating: Number(values.rating),
        comment: values.comment,
      }
      if (!customer) payload.customer_name = values.customer_name
      const review = await request('/reviews/', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setSelectedProduct((current) => current && current.id === selectedProduct.id
        ? {
            ...current,
            reviews: [review, ...(current.reviews || [])],
            review_count: Number(current.review_count || 0) + 1,
          }
        : current)
      message.success('Review submitted')
      loadStore()
    } catch (error) {
      message.error(parseApiError(error, 'Could not submit this review.'))
    }
  }

  async function authSubmit(mode, values) {
    try {
      const preLoginCart = cart
      const user = await request(mode === 'login' ? '/auth/login/' : '/auth/register/', {
        method: 'POST',
        body: JSON.stringify(values),
      })
      setCustomer(user)
      if (preLoginCart.length) {
        let apiCart = null
        for (const item of preLoginCart) {
          apiCart = await request('/customer/cart/', {
            method: 'POST',
            body: JSON.stringify({ product: item.product.id, quantity: item.quantity }),
          })
        }
        setCart(normalizeCart(apiCart))
      } else {
        await loadCustomerCart()
      }
      message.success(mode === 'login' ? 'Welcome back' : 'Account created')
      if (returnToCheckout && preLoginCart.length) {
        setReturnToCheckout(false)
        setPage('checkout')
        return
      }
      setPage('home')
    } catch (error) {
      message.error(parseApiError(error, mode === 'login' ? 'Login failed.' : 'Registration failed.'))
    }
  }

  async function updateProfile(values) {
    try {
      await request('/customer/profile/', {
        method: 'PATCH',
        body: JSON.stringify(values),
      })
      await refreshCustomer()
      message.success('Profile updated')
    } catch (error) {
      if (isAuthError(error)) {
        setCustomer(null)
        setPage('auth')
        message.warning('Please login again to edit your profile.')
        return
      }
      message.error(parseApiError(error, 'Could not update profile.'))
    }
  }

  async function logoutCustomer() {
    await request('/auth/logout/', { method: 'POST', body: JSON.stringify({}) })
    setCustomer(null)
    setCart([])
    setOrders([])
    message.success('Logged out')
  }

  return (
    <main className="page-shell storefront-page">
      <StoreNav
        page={page}
        setPage={setPage}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        customer={customer}
            logoutCustomer={logoutCustomer}
            navigate={navigate}
          />

      {notice && <Alert className="app-alert" message={notice} type="warning" showIcon />}

      {page === 'home' && (
        <HomePage
          products={products}
          loading={loading}
          setFeature={(feature) => {
            setFilters({ ...filters, feature })
            setPage('listing')
          }}
          showProduct={showProduct}
        />
      )}

      {page === 'listing' && (
        <ListingPage
          products={filteredProducts}
          loading={loading}
          filters={filters}
          setFilters={setFilters}
          categoryOptions={categoryOptions}
          showProduct={showProduct}
          addToCart={addToCart}
        />
      )}

      {page === 'details' && (
        <DetailsPage
          product={selectedProduct}
          customer={customer}
          back={() => setPage('listing')}
          addToCart={addToCart}
          submitReview={submitReview}
        />
      )}

      {page === 'cart' && (
        <CartPage cart={cart} updateCart={updateCart} cartTotal={cartTotal} goCheckout={startCheckout} />
      )}

      {page === 'checkout' && (
        <CheckoutPage
          cart={cart}
          cartTotal={cartTotal}
          customer={customer}
          placeOrder={placeOrder}
          goLogin={() => setPage('auth')}
        />
      )}

      {page === 'confirmation' && <ConfirmationPage order={confirmation} goHome={() => setPage('home')} />}

      {page === 'auth' && <AuthPage authSubmit={authSubmit} initialValues={emptyAuth} />}

      {page === 'orders' && <OrderHistoryPage orders={orders} customer={customer} goLogin={() => setPage('auth')} />}

      {page === 'account' && (
        <AccountPage
          customer={customer}
          cart={cart}
          cartTotal={cartTotal}
          orders={orders}
          updateProfile={updateProfile}
          goLogin={() => setPage('auth')}
          goCart={() => setPage('cart')}
          goOrders={() => setPage('orders')}
        />
      )}
    </main>
  )
}

import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  List,
  Rate,
  Radio,
  Row,
  Select,
  Slider,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  HistoryOutlined,
  HomeOutlined,
  LockOutlined,
  LogoutOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  StarOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  MobileOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { FEATURE_CATEGORIES, PAYMENT_METHODS, emptyCheckout, emptyReview } from '../../config/constants'
import { formatDateTime, formatMoney } from '../../utils/formatters'

const { Text, Title } = Typography

export function StoreNav({ page, setPage, cartCount, customer, logoutCustomer, navigate }) {
  return (
    <section className="store-nav">
      <Space wrap>
        <Button type={page === 'home' ? 'primary' : 'default'} icon={<HomeOutlined />} onClick={() => setPage('home')}>
          Home
        </Button>
        <Button icon={<AppstoreOutlined />} onClick={() => setPage('listing')}>
          Products
        </Button>
        <Button icon={<ShoppingCartOutlined />} onClick={() => setPage('cart')}>
          <Badge count={cartCount} size="small">
            Cart
          </Badge>
        </Button>
        {customer && (
          <Button icon={<HistoryOutlined />} onClick={() => setPage('orders')}>
            Orders
          </Button>
        )}
      </Space>
      <Space wrap>
        {customer ? (
          <>
            <Tag icon={<UserOutlined />} color="green">
              {customer.username}
            </Tag>
            <Button icon={<UserOutlined />} onClick={() => setPage('account')}>
              Account
            </Button>
            <Button icon={<LogoutOutlined />} onClick={logoutCustomer}>
              Logout
            </Button>
          </>
        ) : (
          <Button icon={<UserOutlined />} onClick={() => setPage('auth')}>
            Login / Register
          </Button>
        )}
        <Button icon={<DashboardOutlined />} onClick={() => navigate('/admin')}>
          Admin
        </Button>
      </Space>
    </section>
  )
}

export function HomePage({ products, loading, setFeature, showProduct }) {
  const featured = products.slice(0, 4)
  return (
    <>
      <section className="store-hero">
        <div className="hero-copy">
          <Tag color="cyan" icon={<AppstoreOutlined />}>
            Online Store
          </Tag>
          <Title>Ak style house</Title>
          <Text>Shop bags, watches, new arrivals, and best selling products from one clean storefront.</Text>
        </div>
      </section>

      <Row gutter={[16, 16]} className="category-row">
        {FEATURE_CATEGORIES.map((name) => (
          <Col xs={12} md={6} key={name}>
            <Card className="category-tile" onClick={() => setFeature(name)}>
              <Text strong>{name}</Text>
              <Text type="secondary">Explore</Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="surface-card" title="Featured Products">
        <ProductGrid products={featured} loading={loading} showProduct={showProduct} />
      </Card>
    </>
  )
}

export function ListingPage({ products, loading, filters, setFilters, categoryOptions, showProduct, addToCart }) {
  return (
    <Row gutter={[20, 20]}>
      <Col xs={24} lg={7}>
        <Card className="surface-card filter-panel" title="Search & Filter">
          <Space direction="vertical" size={18}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search products"
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            />
            <Select
              value={filters.feature}
              options={['all', ...FEATURE_CATEGORIES].map((value) => ({ value, label: value }))}
              onChange={(feature) => setFilters({ ...filters, feature })}
            />
            <Select
              value={filters.category}
              options={[{ value: 'all', label: 'All categories' }, ...categoryOptions]}
              onChange={(category) => setFilters({ ...filters, category })}
            />
            <div>
              <Text strong>Price range</Text>
              <Slider
                range
                min={0}
                max={10000}
                step={100}
                value={filters.price}
                onChange={(price) => setFilters({ ...filters, price })}
              />
              <Text type="secondary">
                {formatMoney(filters.price[0])} - {formatMoney(filters.price[1])}
              </Text>
            </div>
          </Space>
        </Card>
      </Col>
      <Col xs={24} lg={17}>
        <Card className="surface-card" title="Product Listing" extra={<Tag>{products.length} items</Tag>}>
          <ProductGrid products={products} loading={loading} showProduct={showProduct} addToCart={addToCart} />
        </Card>
      </Col>
    </Row>
  )
}

export function ProductGrid({ products, loading, showProduct, addToCart }) {
  return (
    <List
      grid={{ gutter: 16, xs: 1, sm: 2, lg: 3, xl: 4 }}
      dataSource={products}
      loading={loading}
      locale={{ emptyText: <Empty description="No products found" /> }}
      renderItem={(product) => (
        <List.Item>
          <Card
            className="product-card"
            cover={<img src={product.image_url} alt={product.name} onClick={() => showProduct(product)} />}
            actions={[
              <Button type="link" onClick={() => showProduct(product)}>
                Details
              </Button>,
              addToCart && (
                <Button type="link" onClick={() => addToCart(product)}>
                  Add Cart
                </Button>
              ),
            ].filter(Boolean)}
          >
            <Space direction="vertical" size={4}>
              <Text strong>{product.name}</Text>
              <Text className="price-text">{formatMoney(product.price)}</Text>
              <Space>
                <Rate disabled allowHalf value={Number(product.average_rating || 0)} />
                <Text type="secondary">({product.review_count || 0})</Text>
              </Space>
            </Space>
          </Card>
        </List.Item>
      )}
    />
  )
}

export function DetailsPage({ product, customer, back, addToCart, submitReview }) {
  const [quantity, setQuantity] = useState(1)
  const images = useMemo(
    () => (product?.images?.length ? product.images : product ? [{ id: 'main', image_url: product.image_url }] : []),
    [product],
  )
  const [activeImage, setActiveImage] = useState(images[0]?.image_url)
  const reviewerName = customer ? (customer.first_name || customer.username) : ''

  useEffect(() => {
    setActiveImage(images[0]?.image_url)
  }, [images])

  if (!product) {
    return (
      <Card className="surface-card">
        <Empty description="No product selected" />
      </Card>
    )
  }

  return (
    <Card className="surface-card product-detail">
      <Button icon={<ArrowLeftOutlined />} onClick={back}>
        Back to products
      </Button>
      <Row gutter={[24, 24]} className="detail-grid">
        <Col xs={24} md={11}>
          <Image className="detail-image" preview={false} src={activeImage} alt={product.name} />
          <Space className="thumb-row" wrap>
            {images.map((image) => (
              <Avatar
                key={image.id}
                shape="square"
                size={72}
                src={image.image_url}
                className={activeImage === image.image_url ? 'active-thumb' : ''}
                onClick={() => setActiveImage(image.image_url)}
              />
            ))}
          </Space>
        </Col>
        <Col xs={24} md={13}>
          <Space wrap>
            <Tag color="green">Stock {product.stock}</Tag>
            <Tag color="blue">{product.review_count} reviews</Tag>
          </Space>
          <Title level={2}>{product.name}</Title>
          <Text type="secondary">{product.description}</Text>
          <Divider />
          <Title level={3}>{formatMoney(product.price)}</Title>
          <Space>
            <InputNumber min={1} value={quantity} onChange={(value) => setQuantity(value || 1)} />
            <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => addToCart(product, quantity)}>
              Add to Cart
            </Button>
          </Space>
        </Col>
      </Row>
      <Divider />
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card title="Reviews">
            <List
              dataSource={product.reviews || []}
              locale={{ emptyText: <Empty description="No reviews yet" /> }}
              renderItem={(review) => (
                <List.Item>
                  <Space direction="vertical">
                    <Space wrap>
                      <Text strong>{review.customer_name}</Text>
                      <Text type="secondary">{formatDateTime(review.created_at)}</Text>
                    </Space>
                    <Rate disabled value={review.rating} />
                    <Text type="secondary">{review.comment}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Write a Review">
            <Form
              key={`${product.id}-${customer ? customer.id : 'guest'}`}
              layout="vertical"
              initialValues={{ ...emptyReview, customer_name: reviewerName }}
              onFinish={submitReview}
            >
              {customer ? (
                <Form.Item label="Reviewing as">
                  <Input value={reviewerName} disabled />
                </Form.Item>
              ) : (
                <Form.Item name="customer_name" label="Name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              )}
              <Form.Item name="rating" label="Rating">
                <Rate />
              </Form.Item>
              <Form.Item name="comment" label="Review" rules={[{ required: true }]}>
                <Input.TextArea rows={4} />
              </Form.Item>
              <Button htmlType="submit" icon={<StarOutlined />}>
                Submit Review
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </Card>
  )
}

export function CartPage({ cart, updateCart, cartTotal, goCheckout }) {
  return (
    <Card className="surface-card" title="Cart">
      <List
        dataSource={cart}
        locale={{ emptyText: <Empty description="Your cart is empty" /> }}
        renderItem={(item) => (
          <List.Item
            actions={[
              <InputNumber
                min={0}
                value={item.quantity}
                onChange={(value) => updateCart(item.product.id, value || 0)}
              />,
            ]}
          >
            <List.Item.Meta
              avatar={<Avatar shape="square" size={72} src={item.product.image_url} />}
              title={item.product.name}
              description={`${formatMoney(item.product.price)} x ${item.quantity}`}
            />
            <Text strong>{formatMoney(Number(item.product.price) * item.quantity)}</Text>
          </List.Item>
        )}
      />
      <Divider />
      <div className="checkout-total">
        <Text>Total</Text>
        <Title level={3}>{formatMoney(cartTotal)}</Title>
      </div>
      <Button block type="primary" disabled={!cart.length} onClick={goCheckout}>
        Continue to Checkout
      </Button>
    </Card>
  )
}

export function CheckoutPage({ cart, cartTotal, customer, placeOrder, goLogin }) {
  const [form] = Form.useForm()
  const watchedPaymentMethod = Form.useWatch('payment_method', form)

  if (!cart.length) {
    return (
      <Card className="surface-card">
        <Empty description="Add products before checkout" />
      </Card>
    )
  }

  if (!customer) {
    return (
      <Card className="surface-card">
        <Empty description="Login or create an account to checkout" />
        <Button type="primary" onClick={goLogin} icon={<LockOutlined />}>
          Login / Register
        </Button>
      </Card>
    )
  }

  const profile = customer.profile || {}
  const checkoutInitialValues = {
    ...emptyCheckout,
    customer_name: customer.first_name || customer.username || '',
    customer_phone: profile.phone || '',
    shipping_address: profile.address || '',
  }
  const selectedPaymentMethod = watchedPaymentMethod || checkoutInitialValues.payment_method
  const isManualWalletPayment = ['bkash', 'nagad'].includes(selectedPaymentMethod)

  return (
    <Row gutter={[20, 20]}>
      <Col xs={24} lg={14}>
        <Card className="surface-card" title="Checkout">
          <Form form={form} layout="vertical" initialValues={checkoutInitialValues} onFinish={placeOrder}>
            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item name="customer_name" label="Full name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="customer_phone" label="Phone" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="shipping_address"
              label="Shipping address"
              rules={[{ required: true, message: 'Enter a shipping address for delivery.' }]}
            >
              <Input.TextArea rows={3} />
            </Form.Item>
            <Row gutter={12}>
              <Col span={24}>
                <Form.Item name="payment_method" label="Payment method" rules={[{ required: true }]}>
                  <Radio.Group className="payment-method-grid">
                    {PAYMENT_METHODS.map((method) => (
                      <Radio.Button key={method.value} value={method.value} className="payment-method-option">
                        <span className="payment-method-mark" style={{ background: method.accent }}>
                          {method.value === 'cash_on_delivery' ? <SafetyCertificateOutlined /> : <MobileOutlined />}
                        </span>
                        <span>
                          <Text strong>{method.label}</Text>
                          <Text type="secondary">{method.description}</Text>
                        </span>
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>
            {isManualWalletPayment && (
              <div className="manual-payment-box">
                <Form.Item
                  name="transaction_id"
                  label={`${selectedPaymentMethod === 'bkash' ? 'bKash' : 'Nagad'} transaction ID`}
                  rules={[
                    { required: true, message: 'Enter the transaction ID you received.' },
                    { min: 4, message: 'Transaction ID should be at least 4 characters.' },
                  ]}
                >
                  <Input placeholder="Example: TXN123456789" />
                </Form.Item>
                <Text type="secondary">
                  This is a local demo payment. Any transaction ID is accepted and saved with the order.
                </Text>
              </div>
            )}
            <Alert
              className="app-alert"
              type="info"
              showIcon
              message="bKash and Nagad use a manual transaction ID for this demo. No real money is charged."
            />
            <Button block type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
              Place Order
            </Button>
          </Form>
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card className="surface-card" title="Order Summary">
          <List
            dataSource={cart}
            renderItem={(item) => (
              <List.Item>
                <Text>{item.product.name} x {item.quantity}</Text>
                <Text strong>{formatMoney(Number(item.product.price) * item.quantity)}</Text>
              </List.Item>
            )}
          />
          <Divider />
          <Statistic title="Total" value={cartTotal} prefix="Tk" />
        </Card>
      </Col>
    </Row>
  )
}

export function ConfirmationPage({ order, goHome }) {
  const paymentStatus = order?.payment_status || order?.payments?.[0]?.status || 'unpaid'
  return (
    <Card className="surface-card confirmation-card">
      <CheckCircleOutlined className="confirmation-icon" />
      <Title level={2}>Order Confirmed</Title>
      <Text>Your order #{order?.id} has been created.</Text>
      <Tag color={paymentStatus === 'paid' ? 'green' : paymentStatus === 'failed' ? 'red' : 'gold'}>
        Payment: {paymentStatus}
      </Tag>
      <Title level={3}>{formatMoney(order?.total_amount)}</Title>
      <Button type="primary" onClick={goHome}>
        Continue Shopping
      </Button>
    </Card>
  )
}

export function AuthPage({ authSubmit, initialValues }) {
  return (
    <Card className="surface-card auth-card">
      <Tabs
        items={[
          {
            key: 'login',
            label: 'Login',
            children: (
              <Form layout="vertical" onFinish={(values) => authSubmit('login', values)}>
                <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                  <Input prefix={<UserOutlined />} />
                </Form.Item>
                <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                  <Input.Password prefix={<LockOutlined />} />
                </Form.Item>
                <Button block type="primary" htmlType="submit">
                  Login
                </Button>
              </Form>
            ),
          },
          {
            key: 'register',
            label: 'Register',
            children: (
              <Form layout="vertical" initialValues={initialValues} onFinish={(values) => authSubmit('register', values)}>
                <Row gutter={12}>
                  <Col xs={24} md={12}>
                    <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="email" label="Email">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
                  <Input.Password />
                </Form.Item>
                <Form.Item
                  name="confirm_password"
                  label="Confirm password"
                  dependencies={['password']}
                  rules={[
                    { required: true, min: 6 },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve()
                        }
                        return Promise.reject(new Error('Passwords do not match.'))
                      },
                    }),
                  ]}
                >
                  <Input.Password />
                </Form.Item>
                <Form.Item name="first_name" label="Full name">
                  <Input />
                </Form.Item>
                <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="address" label="Address">
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Button block type="primary" htmlType="submit">
                  Create Account
                </Button>
              </Form>
            ),
          },
        ]}
      />
    </Card>
  )
}

export function OrderHistoryPage({ orders, customer, goLogin }) {
  if (!customer) {
    return (
      <Card className="surface-card">
        <Empty description="Login to see your order history" />
        <Button type="primary" onClick={goLogin}>
          Login / Register
        </Button>
      </Card>
    )
  }

  return (
    <Card className="surface-card" title="Customer Order History">
      <Table
        rowKey="id"
        dataSource={orders}
        pagination={{ pageSize: 6 }}
        columns={[
          { title: 'Order', dataIndex: 'id', render: (id) => <Text strong>#{id}</Text> },
          { title: 'Date & Time', dataIndex: 'created_at', render: formatDateTime },
          {
            title: 'Items',
            render: (_, order) => order.items?.map((item) => `${item.product_name} x ${item.quantity}`).join(', '),
          },
          { title: 'Total', dataIndex: 'total_amount', render: formatMoney },
          { title: 'Order Status', dataIndex: 'status', render: (status) => <Tag>{status}</Tag> },
          {
            title: 'Payment',
            render: (_, order) => <Tag color={order.payment_status === 'paid' ? 'green' : 'gold'}>{order.payment_status}</Tag>,
          },
        ]}
      />
    </Card>
  )
}

export function AccountPage({ customer, cart, cartTotal, orders, updateProfile, goLogin, goCart, goOrders }) {
  if (!customer) {
    return (
      <Card className="surface-card">
        <Empty description="Login to view your account" />
        <Button type="primary" onClick={goLogin}>
          Login / Register
        </Button>
      </Card>
    )
  }

  const profile = customer.profile || {}
  const profileInitialValues = {
    email: customer.email || profile.email || '',
    phone: profile.phone || '',
    address: profile.address || '',
    city: profile.city || '',
    postal_code: profile.postal_code || '',
  }

  return (
    <Row gutter={[20, 20]}>
      <Col xs={24} lg={10}>
        <Card className="surface-card account-profile-card" title="Edit Profile">
          <Space direction="vertical" size={4}>
            <Text strong>{customer.username}</Text>
            <Text type="secondary">{customer.email || 'No email added'}</Text>
          </Space>
          <Divider />
          <Form layout="vertical" initialValues={profileInitialValues} onFinish={updateProfile}>
            <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Enter a valid email address.' }]}>
              <Input placeholder="Add your email address" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Phone"
            >
              <Input placeholder="Add a default delivery phone" />
            </Form.Item>
            <Form.Item name="address" label="Address">
              <Input.TextArea rows={3} placeholder="Add a default delivery address" />
            </Form.Item>
            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item name="city" label="City">
                  <Input placeholder="City" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="postal_code" label="Postal code">
                  <Input placeholder="Postal code" />
                </Form.Item>
              </Col>
            </Row>
            <div className="profile-action-row">
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="large">
                Save profile
              </Button>
            </div>
          </Form>
        </Card>
      </Col>
      <Col xs={24} lg={14}>
        <Row gutter={[20, 20]}>
          <Col span={24}>
            <Card
              className="surface-card"
              title="My Cart"
              extra={<Button size="small" onClick={goCart}>Open Cart</Button>}
            >
              {cart.length ? (
                <>
                  <List
                    dataSource={cart}
                    renderItem={(item) => (
                      <List.Item>
                        <Text>{item.product.name} x {item.quantity}</Text>
                        <Text strong>{formatMoney(Number(item.product.price) * item.quantity)}</Text>
                      </List.Item>
                    )}
                  />
                  <Divider />
                  <Statistic title="Cart Total" value={cartTotal} prefix="Tk" />
                </>
              ) : (
                <Empty description="Your cart is empty" />
              )}
            </Card>
          </Col>
          <Col span={24}>
            <Card
              className="surface-card"
              title="Previous Orders"
              extra={<Button size="small" onClick={goOrders}>All Orders</Button>}
            >
              <Table
                rowKey="id"
                dataSource={orders}
                pagination={{ pageSize: 4 }}
                columns={[
                  { title: 'Order', dataIndex: 'id', render: (id) => <Text strong>#{id}</Text> },
                  { title: 'Date & Time', dataIndex: 'created_at', render: formatDateTime },
                  { title: 'Amount', dataIndex: 'total_amount', render: formatMoney },
                  { title: 'Status', dataIndex: 'status', render: (status) => <Tag>{status}</Tag> },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Col>
    </Row>
  )
}

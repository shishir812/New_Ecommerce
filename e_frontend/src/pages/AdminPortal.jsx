import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  App as AntApp,
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Popconfirm,
  Rate,
  Row,
  Select,
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
  DashboardOutlined,
  LockOutlined,
  LogoutOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { ORDER_STATUSES, SESSION_KEY, emptyCategory, emptyProduct } from '../config/constants'
import { customerTypeTag, formatDateTime, formatMoney, isRegisteredOrder, normalizeText, orderSearchText } from '../utils/formatters'
import { adminApiRequest } from '../services/apiClient'

const { Text, Title } = Typography
const { RangePicker } = DatePicker

export default function AdminPortal({ navigate }) {
  const { message } = AntApp.useApp()
  const [password, setPassword] = useState(sessionStorage.getItem(SESSION_KEY) || '')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [orders, setOrders] = useState([])
  const [reviews, setReviews] = useState([])
  const [customers, setCustomers] = useState([])
  const [productForm, setProductForm] = useState(emptyProduct)
  const [productImage, setProductImage] = useState(null)
  const [editingProductId, setEditingProductId] = useState(null)
  const [activeAdminTab, setActiveAdminTab] = useState('dashboard')
  const [categoryForm, setCategoryForm] = useState(emptyCategory)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [adminOrderFilters, setAdminOrderFilters] = useState({
    search: '',
    status: 'all',
    paymentStatus: 'all',
    paymentMethod: 'all',
    dateRange: null,
  })
  const [reviewFilters, setReviewFilters] = useState({
    search: '',
    approval: 'all',
    dateRange: null,
  })
  const [customerSearch, setCustomerSearch] = useState('')
  const [notice, setNotice] = useState('')
  const isLoggedIn = Boolean(password)

  const adminRequest = useCallback(
    (path, options = {}, activePassword = password) => adminApiRequest(path, options, activePassword),
    [password],
  )

  const loadAdminData = useCallback(async (activePassword = password, throwOnError = false) => {
    if (!activePassword) return
    try {
      const [overview, categoryData, reviewData, customerData] = await Promise.all([
        adminRequest(`/admin/overview/?admin_password=${encodeURIComponent(activePassword)}`, {}, activePassword),
        adminRequest('/categories/', {}, activePassword),
        adminRequest('/reviews/', {}, activePassword),
        adminRequest('/profiles/', {}, activePassword),
      ])
      setProducts(overview.products)
      setOrders(overview.orders)
      setCategories(categoryData)
      setReviews(reviewData)
      setCustomers(customerData)
      setNotice('')
    } catch {
      if (throwOnError) throw new Error('Admin password is incorrect.')
      setPassword('')
      sessionStorage.removeItem(SESSION_KEY)
      setNotice('Admin password is incorrect.')
    }
  }, [adminRequest, password])

  useEffect(() => {
    loadAdminData()
  }, [loadAdminData])

  async function login(values) {
    try {
      await loadAdminData(values.adminPassword, true)
      sessionStorage.setItem(SESSION_KEY, values.adminPassword)
      setPassword(values.adminPassword)
    } catch {
      sessionStorage.removeItem(SESSION_KEY)
      setPassword('')
      setNotice('Admin password is incorrect.')
    }
  }

  function resetProductForm() {
    setProductForm(emptyProduct)
    setProductImage(null)
    setEditingProductId(null)
  }

  async function saveProduct() {
    const formData = new FormData()
    Object.entries({
      ...productForm,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      is_active: true,
    }).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) formData.append(key, value)
    })
    if (productImage) formData.append('uploaded_image', productImage)

    await adminRequest(editingProductId ? `/products/${editingProductId}/` : '/products/', {
      method: editingProductId ? 'PATCH' : 'POST',
      body: formData,
    })
    message.success(editingProductId ? 'Product updated' : 'Product added')
    resetProductForm()
    loadAdminData()
  }

  async function deleteProduct(productId) {
    await adminRequest(`/products/${productId}/`, { method: 'DELETE' })
    message.success('Product, images, reviews, and active cart references deleted')
    loadAdminData()
  }

  function editProduct(product) {
    setEditingProductId(product.id)
    setActiveAdminTab('products')
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category || '',
      status: product.status,
      image_url: product.image_url || '',
    })
    setProductImage(null)
  }

  async function saveCategory() {
    await adminRequest(editingCategoryId ? `/categories/${editingCategoryId}/` : '/categories/', {
      method: editingCategoryId ? 'PATCH' : 'POST',
      payload: { ...categoryForm, parent: null },
    })
    message.success(editingCategoryId ? 'Category updated' : 'Category added')
    setCategoryForm(emptyCategory)
    setEditingCategoryId(null)
    loadAdminData()
  }

  async function deleteCategory(categoryId) {
    await adminRequest(`/categories/${categoryId}/`, { method: 'DELETE' })
    message.success('Category deleted')
    loadAdminData()
  }

  async function updateOrderStatus(orderId, statusValue) {
    await adminRequest(`/orders/${orderId}/`, {
      method: 'PATCH',
      payload: { status: statusValue },
    })
    message.success('Order status updated')
    loadAdminData()
  }

  async function updateReview(reviewId, payload) {
    await adminRequest(`/reviews/${reviewId}/`, {
      method: 'PATCH',
      payload,
    })
    message.success('Review updated')
    loadAdminData()
  }

  async function deleteReview(reviewId) {
    await adminRequest(`/reviews/${reviewId}/`, { method: 'DELETE' })
    message.success('Review deleted')
    loadAdminData()
  }

  const productColumns = [
    { title: 'Product', dataIndex: 'name', render: (name, product) => <Space><Avatar shape="square" src={product.image_url} /> <Text strong>{name}</Text></Space> },
    { title: 'Category', dataIndex: 'category_name', render: (value) => value || 'Uncategorized' },
    { title: 'Price', dataIndex: 'price', render: formatMoney },
    { title: 'Stock', dataIndex: 'stock', render: (stock) => <Tag color={stock > 5 ? 'green' : 'red'}>{stock}</Tag> },
    { title: 'Status', dataIndex: 'status', render: (status) => <Tag>{status}</Tag> },
    {
      title: 'Actions',
      render: (_, product) => (
        <Space>
          <Button size="small" onClick={() => editProduct(product)}>Edit</Button>
          <Popconfirm
            title="Delete this product?"
            description="Images, reviews, and active cart references will be removed. Past order records are preserved."
            onConfirm={() => deleteProduct(product.id)}
          >
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const orderColumns = [
    { title: 'Order', dataIndex: 'id', render: (id) => <Text strong>#{id}</Text> },
    {
      title: 'Date & Time',
      dataIndex: 'created_at',
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      defaultSortOrder: 'descend',
      render: (value, order) => (
        <Space direction="vertical" size={0}>
          <Text>{formatDateTime(value)}</Text>
          <Text type="secondary">Updated {formatDateTime(order.updated_at)}</Text>
        </Space>
      ),
    },
    {
      title: 'Items',
      render: (_, order) => order.items?.map((item) => <Text key={item.id} style={{ display: 'block' }}>{item.product_name} x {item.quantity}</Text>),
    },
    {
      title: 'Customer',
      render: (_, order) => (
        <Space direction="vertical" size={0}>
          <Space size={6} wrap>
            <Text strong>{order.customer_name}</Text>
            {customerTypeTag(order)}
          </Space>
          <Text type="secondary">{order.customer_phone}</Text>
          {isRegisteredOrder(order) && (
            <Text type="secondary">
              {order.account_username || `User #${order.user}`}
              {order.account_email ? ` | ${order.account_email}` : ''}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Payment',
      render: (_, order) => {
        const payment = order.payments?.[0]
        return (
          <Space direction="vertical" size={0}>
            <Tag>{order.payment_method || payment?.method || 'cash_on_delivery'}</Tag>
            <Tag color={order.payment_status === 'paid' ? 'green' : order.payment_status === 'failed' ? 'red' : 'gold'}>
              {order.payment_status || payment?.status || 'unpaid'}
            </Tag>
            <Text type="secondary">{payment?.transaction_id || 'No transaction ID'}</Text>
          </Space>
        )
      },
    },
    { title: 'Total', dataIndex: 'total_amount', render: (value) => <Text strong>{formatMoney(value)}</Text> },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (statusValue, order) => (
        <Select
          value={statusValue}
          options={ORDER_STATUSES.map((value) => ({ value, label: value }))}
          onChange={(value) => updateOrderStatus(order.id, value)}
          style={{ width: 130 }}
        />
      ),
    },
  ]
  const filteredOrders = useMemo(() => {
    const search = normalizeText(adminOrderFilters.search)
    const [startDate, endDate] = adminOrderFilters.dateRange || []
    const startTime = startDate ? startDate.startOf('day').valueOf() : null
    const endTime = endDate ? endDate.endOf('day').valueOf() : null

    return orders.filter((order) => {
      const createdTime = order.created_at ? new Date(order.created_at).getTime() : 0
      const payment = order.payments?.[0]
      const matchesSearch = !search || orderSearchText(order).includes(search)
      const matchesStatus = adminOrderFilters.status === 'all' || order.status === adminOrderFilters.status
      const matchesPaymentStatus =
        adminOrderFilters.paymentStatus === 'all' || order.payment_status === adminOrderFilters.paymentStatus
      const method = order.payment_method || payment?.method || 'cash_on_delivery'
      const matchesMethod = adminOrderFilters.paymentMethod === 'all' || method === adminOrderFilters.paymentMethod
      const matchesStart = !startTime || createdTime >= startTime
      const matchesEnd = !endTime || createdTime <= endTime
      return matchesSearch && matchesStatus && matchesPaymentStatus && matchesMethod && matchesStart && matchesEnd
    })
  }, [orders, adminOrderFilters])
  const filteredCustomers = useMemo(() => {
    const search = normalizeText(customerSearch)
    if (!search) return customers
    return customers.filter((customerItem) => (
      [
        customerItem.username,
        customerItem.email,
        customerItem.phone,
        customerItem.city,
        customerItem.address,
        customerItem.postal_code,
        formatDateTime(customerItem.created_at),
      ].map(normalizeText).join(' ').includes(search)
    ))
  }, [customers, customerSearch])
  const filteredReviews = useMemo(() => {
    const search = normalizeText(reviewFilters.search)
    const [startDate, endDate] = reviewFilters.dateRange || []
    const startTime = startDate ? startDate.startOf('day').valueOf() : null
    const endTime = endDate ? endDate.endOf('day').valueOf() : null

    return reviews.filter((review) => {
      const createdTime = review.created_at ? new Date(review.created_at).getTime() : 0
      const matchesSearch = !search || [
        review.customer_name,
        review.product_name,
        review.comment,
        review.rating,
        review.is_approved ? 'approved' : 'hidden',
        formatDateTime(review.created_at),
      ].map(normalizeText).join(' ').includes(search)
      const matchesApproval =
        reviewFilters.approval === 'all' ||
        (reviewFilters.approval === 'approved' && review.is_approved) ||
        (reviewFilters.approval === 'hidden' && !review.is_approved)
      const matchesStart = !startTime || createdTime >= startTime
      const matchesEnd = !endTime || createdTime <= endTime
      return matchesSearch && matchesApproval && matchesStart && matchesEnd
    })
  }, [reviews, reviewFilters])
  const orderStatusCounts = ORDER_STATUSES.map((statusValue) => ({
    status: statusValue,
    count: orders.filter((order) => order.status === statusValue).length,
  }))
  const customerIdsWithOrders = new Set(orders.map((order) => order.user).filter(Boolean))
  const newestCustomer = [...customers].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
  const pendingOrders = orders.filter((order) => order.status === 'pending')
  const lowStockProducts = products.filter((product) => Number(product.stock) <= 5)

  if (!isLoggedIn) {
    return (
      <main className="login-page">
        <Card className="login-card">
          <Space direction="vertical" size={16} className="login-stack">
            <Avatar size={54} icon={<LockOutlined />} className="login-avatar" />
            <div>
              <Tag color="red">Restricted Area</Tag>
              <Title level={2}>Admin Portal</Title>
              <Text type="secondary">Sign in to manage products and view customer orders.</Text>
            </div>
            {notice && <Alert message={notice} type="error" showIcon />}
            <Form layout="vertical" onFinish={login}>
              <Form.Item label="Admin password" name="adminPassword" rules={[{ required: true }]}>
                <Input.Password autoFocus prefix={<LockOutlined />} />
              </Form.Item>
              <Button block type="primary" htmlType="submit" icon={<LockOutlined />}>
                Sign In
              </Button>
            </Form>
            <Button block icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
              Back to Store
            </Button>
          </Space>
        </Card>
      </main>
    )
  }

  return (
    <main className="page-shell admin-page">
      <section className="admin-topbar">
        <div>
          <Tag color="purple" icon={<DashboardOutlined />}>
            Private Dashboard
          </Tag>
          <Title>Admin Portal</Title>
        </div>
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
            Storefront
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => loadAdminData()}>
            Refresh
          </Button>
          <Button
            danger
            icon={<LogoutOutlined />}
            onClick={() => {
              sessionStorage.removeItem(SESSION_KEY)
              setPassword('')
              setProducts([])
              setOrders([])
            }}
          >
            Logout
          </Button>
        </Space>
      </section>

      {notice && <Alert className="app-alert" message={notice} type="warning" showIcon />}

      <Row gutter={[18, 18]} className="metrics-row">
        <Col xs={24} md={8}>
          <Card className="metric-card">
            <Statistic title="Total Orders" value={orders.length} prefix={<ShoppingCartOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="metric-card">
            <Statistic title="Products" value={products.length} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="metric-card">
            <Statistic title="Revenue" value={orders.reduce((sum, order) => sum + Number(order.total_amount), 0)} prefix="Tk" />
          </Card>
        </Col>
      </Row>

      <Tabs
        className="admin-tabs"
        activeKey={activeAdminTab}
        onChange={setActiveAdminTab}
        items={[
          {
            key: 'dashboard',
            label: 'Dashboard',
            children: (
              <Row gutter={[20, 20]}>
                <Col xs={24} lg={10}>
                  <Card className="surface-card" title="Order Status Summary">
                    <Space direction="vertical" size={12} className="admin-summary-list">
                      {orderStatusCounts.map((item) => (
                        <div className="admin-summary-row" key={item.status}>
                          <Tag color={item.status === 'cancelled' ? 'red' : item.status === 'delivered' ? 'green' : 'blue'}>
                            {item.status}
                          </Tag>
                          <Text strong>{item.count}</Text>
                        </div>
                      ))}
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} lg={14}>
                  <Card className="surface-card" title="Customer Activity">
                    <Row gutter={[12, 12]}>
                      <Col xs={24} md={12}>
                        <Statistic title="Registered Customers" value={customers.length} prefix={<UserOutlined />} />
                        <Text type="secondary">
                          {customerIdsWithOrders.size} customer{customerIdsWithOrders.size === 1 ? '' : 's'} have placed orders.
                        </Text>
                      </Col>
                      <Col xs={24} md={12}>
                        <Statistic title="Customers With Orders" value={customerIdsWithOrders.size} prefix={<ShoppingCartOutlined />} />
                        <Text type="secondary">
                          Newest: {newestCustomer ? newestCustomer.username : 'No customers yet'}
                        </Text>
                      </Col>
                    </Row>
                  </Card>
                </Col>
                <Col xs={24} lg={14}>
                  <Card
                    className="surface-card"
                    title="Pending Orders"
                    extra={<Tag color={pendingOrders.length ? 'gold' : 'green'}>{pendingOrders.length} need action</Tag>}
                  >
                    <List
                      dataSource={pendingOrders.slice(0, 5)}
                      locale={{ emptyText: <Empty description="No pending orders" /> }}
                      renderItem={(order) => (
                        <List.Item
                          actions={[
                            <Button size="small" type="primary" onClick={() => updateOrderStatus(order.id, 'confirmed')}>
                              Confirm
                            </Button>,
                            <Button size="small" danger onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                              Cancel
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            title={<Text strong>Order #{order.id} - {formatMoney(order.total_amount)}</Text>}
                            description={(
                              <Space direction="vertical" size={0}>
                                <Space size={6} wrap>
                                  <Text>{order.customer_name}</Text>
                                  {customerTypeTag(order)}
                                </Space>
                                <Text type="secondary">{order.customer_phone}</Text>
                              </Space>
                            )}
                          />
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
                <Col span={24}>
                  <Card
                    className="surface-card"
                    title="Low Stock Products"
                    extra={<Tag color={lowStockProducts.length ? 'red' : 'green'}>{lowStockProducts.length} low stock</Tag>}
                  >
                    <Table
                      rowKey="id"
                      dataSource={lowStockProducts}
                      pagination={false}
                      columns={[
                        { title: 'Product', dataIndex: 'name' },
                        { title: 'SKU', dataIndex: 'sku' },
                        { title: 'Stock', dataIndex: 'stock', render: (stock) => <Tag color="red">{stock}</Tag> },
                        { title: 'Price', dataIndex: 'price', render: formatMoney },
                        {
                          title: 'Action',
                          render: (_, product) => <Button size="small" onClick={() => editProduct(product)}>Update Stock</Button>,
                        },
                      ]}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'products',
            label: 'Products',
            children: (
              <Row gutter={[20, 20]}>
                <Col xs={24} xl={16}>
                  <Card className="surface-card" title="Manage Products">
                    <Table rowKey="id" columns={productColumns} dataSource={products} pagination={{ pageSize: 6 }} scroll={{ x: 900 }} />
                  </Card>
                </Col>
                <Col xs={24} xl={8}>
                  <Card className="surface-card" title={<Space><PlusOutlined />{editingProductId ? 'Edit Product' : 'Add Product'}</Space>}>
                    <Form layout="vertical" onFinish={saveProduct}>
                      <Form.Item label="Product name" required>
                        <Input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} />
                      </Form.Item>
                      <Form.Item label="Category">
                        <Select
                          allowClear
                          value={productForm.category || undefined}
                          options={categories.map((category) => ({ value: category.id, label: category.name }))}
                          onChange={(category) => setProductForm({ ...productForm, category: category || '' })}
                        />
                      </Form.Item>
                      <Form.Item label="Description" required>
                        <Input.TextArea rows={3} value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} />
                      </Form.Item>
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item label="Price" required>
                            <InputNumber min={1} value={productForm.price} onChange={(value) => setProductForm({ ...productForm, price: value || '' })} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="Stock" required>
                            <InputNumber min={0} value={productForm.stock} onChange={(value) => setProductForm({ ...productForm, stock: value || 0 })} style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item label="Status">
                        <Select
                          value={productForm.status || 'active'}
                          options={['draft', 'active', 'archived'].map((value) => ({ value, label: value }))}
                          onChange={(statusValue) => setProductForm({ ...productForm, status: statusValue })}
                        />
                      </Form.Item>
                      <Form.Item label="Image URL">
                        <Input value={productForm.image_url} onChange={(event) => setProductForm({ ...productForm, image_url: event.target.value })} />
                      </Form.Item>
                      <Form.Item label="Upload image">
                        <Input type="file" accept="image/*" onChange={(event) => setProductImage(event.target.files?.[0] || null)} />
                      </Form.Item>
                      <Space>
                        <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>{editingProductId ? 'Update Product' : 'Add Product'}</Button>
                        {editingProductId && <Button onClick={resetProductForm}>Cancel</Button>}
                      </Space>
                    </Form>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'categories',
            label: 'Categories',
            children: (
              <Row gutter={[20, 20]}>
                <Col xs={24} lg={14}>
                  <Card className="surface-card" title="Manage Categories">
                    <Table
                      rowKey="id"
                      dataSource={categories}
                      columns={[
                        { title: 'Name', dataIndex: 'name' },
                        { title: 'Slug', dataIndex: 'slug' },
                        { title: 'Active', dataIndex: 'is_active', render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? 'active' : 'inactive'}</Tag> },
                        {
                          title: 'Actions',
                          render: (_, category) => (
                            <Space>
                              <Button size="small" onClick={() => { setEditingCategoryId(category.id); setCategoryForm({ name: category.name, is_active: category.is_active }) }}>Edit</Button>
                              <Popconfirm title="Delete this category?" onConfirm={() => deleteCategory(category.id)}>
                                <Button size="small" danger>Delete</Button>
                              </Popconfirm>
                            </Space>
                          ),
                        },
                      ]}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={10}>
                  <Card className="surface-card" title={editingCategoryId ? 'Edit Category' : 'Add Category'}>
                    <Form layout="vertical" onFinish={saveCategory}>
                      <Form.Item label="Category name" required>
                        <Input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} />
                      </Form.Item>
                      <Form.Item label="Status">
                        <Select
                          value={categoryForm.is_active}
                          options={[{ value: true, label: 'Active' }, { value: false, label: 'Inactive' }]}
                          onChange={(isActive) => setCategoryForm({ ...categoryForm, is_active: isActive })}
                        />
                      </Form.Item>
                      <Space>
                        <Button type="primary" htmlType="submit">{editingCategoryId ? 'Update Category' : 'Add Category'}</Button>
                        {editingCategoryId && <Button onClick={() => { setEditingCategoryId(null); setCategoryForm(emptyCategory) }}>Cancel</Button>}
                      </Space>
                    </Form>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'orders',
            label: 'Orders',
            children: (
              <Card className="surface-card" title="All Orders" extra={<Text type="secondary">Guest and registered orders are both real sales.</Text>}>
                <div className="admin-filterbar">
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="Search name, phone, product, transaction ID, order ID"
                    value={adminOrderFilters.search}
                    onChange={(event) => setAdminOrderFilters({ ...adminOrderFilters, search: event.target.value })}
                  />
                  <RangePicker
                    value={adminOrderFilters.dateRange}
                    onChange={(dateRange) => setAdminOrderFilters({ ...adminOrderFilters, dateRange })}
                  />
                  <Select
                    value={adminOrderFilters.status}
                    options={[{ value: 'all', label: 'All order statuses' }, ...ORDER_STATUSES.map((value) => ({ value, label: value }))]}
                    onChange={(statusValue) => setAdminOrderFilters({ ...adminOrderFilters, status: statusValue })}
                  />
                  <Select
                    value={adminOrderFilters.paymentStatus}
                    options={[
                      { value: 'all', label: 'All payment statuses' },
                      { value: 'unpaid', label: 'unpaid' },
                      { value: 'pending', label: 'pending' },
                      { value: 'paid', label: 'paid' },
                      { value: 'failed', label: 'failed' },
                      { value: 'cancelled', label: 'cancelled' },
                    ]}
                    onChange={(paymentStatus) => setAdminOrderFilters({ ...adminOrderFilters, paymentStatus })}
                  />
                  <Select
                    value={adminOrderFilters.paymentMethod}
                    options={[
                      { value: 'all', label: 'All payment methods' },
                      { value: 'cash_on_delivery', label: 'Cash on delivery' },
                      { value: 'bkash', label: 'bKash' },
                      { value: 'nagad', label: 'Nagad' },
                    ]}
                    onChange={(paymentMethod) => setAdminOrderFilters({ ...adminOrderFilters, paymentMethod })}
                  />
                  <Button
                    onClick={() => setAdminOrderFilters({
                      search: '',
                      status: 'all',
                      paymentStatus: 'all',
                      paymentMethod: 'all',
                      dateRange: null,
                    })}
                  >
                    Reset
                  </Button>
                </div>
                <div className="admin-resultline">
                  <Text type="secondary">
                    Showing {filteredOrders.length} of {orders.length} orders
                  </Text>
                  <Text strong>Total: {formatMoney(filteredOrders.reduce((sum, order) => sum + Number(order.total_amount), 0))}</Text>
                </div>
                <Table rowKey="id" columns={orderColumns} dataSource={filteredOrders} pagination={{ pageSize: 8 }} scroll={{ x: 1100 }} />
              </Card>
            ),
          },
          {
            key: 'reviews',
            label: 'Reviews',
            children: (
              <Card className="surface-card" title="Review Moderation">
                <div className="admin-filterbar admin-filterbar-compact">
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="Search customer, product, comment, rating, date"
                    value={reviewFilters.search}
                    onChange={(event) => setReviewFilters({ ...reviewFilters, search: event.target.value })}
                  />
                  <RangePicker
                    value={reviewFilters.dateRange}
                    onChange={(dateRange) => setReviewFilters({ ...reviewFilters, dateRange })}
                  />
                  <Select
                    value={reviewFilters.approval}
                    options={[
                      { value: 'all', label: 'All reviews' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'hidden', label: 'Hidden' },
                    ]}
                    onChange={(approval) => setReviewFilters({ ...reviewFilters, approval })}
                  />
                  <Button onClick={() => setReviewFilters({ search: '', approval: 'all', dateRange: null })}>
                    Reset
                  </Button>
                </div>
                <div className="admin-resultline">
                  <Text type="secondary">
                    Showing {filteredReviews.length} of {reviews.length} reviews
                  </Text>
                </div>
                <Table
                  rowKey="id"
                  dataSource={filteredReviews}
                  columns={[
                    { title: 'Customer', dataIndex: 'customer_name' },
                    { title: 'Product', dataIndex: 'product_name', render: (value) => value || 'Unknown product' },
                    {
                      title: 'Date & Time',
                      dataIndex: 'created_at',
                      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
                      defaultSortOrder: 'descend',
                      render: (value, review) => (
                        <Space direction="vertical" size={0}>
                          <Text>{formatDateTime(value)}</Text>
                          <Text type="secondary">Updated {formatDateTime(review.updated_at)}</Text>
                        </Space>
                      ),
                    },
                    { title: 'Rating', dataIndex: 'rating', render: (rating) => <Rate disabled value={rating} /> },
                    { title: 'Comment', dataIndex: 'comment' },
                    { title: 'Approved', dataIndex: 'is_approved', render: (value) => <Tag color={value ? 'green' : 'gold'}>{value ? 'approved' : 'hidden'}</Tag> },
                    {
                      title: 'Actions',
                      render: (_, review) => (
                        <Space>
                          <Button size="small" onClick={() => updateReview(review.id, { is_approved: !review.is_approved })}>{review.is_approved ? 'Hide' : 'Approve'}</Button>
                          <Popconfirm title="Delete this review?" onConfirm={() => deleteReview(review.id)}>
                            <Button size="small" danger>Delete</Button>
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                  scroll={{ x: 1060 }}
                />
              </Card>
            ),
          },
          {
            key: 'customers',
            label: 'Customers',
            children: (
              <Card className="surface-card" title="Customers">
                <div className="admin-filterbar admin-filterbar-compact">
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="Search username, email, phone, city, address"
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                  />
                  <Text type="secondary">
                    Showing {filteredCustomers.length} of {customers.length} customers
                  </Text>
                </div>
                <Table
                  rowKey="id"
                  dataSource={filteredCustomers}
                  columns={[
                    { title: 'Username', dataIndex: 'username' },
                    { title: 'Email', dataIndex: 'email' },
                    { title: 'Phone', dataIndex: 'phone' },
                    { title: 'City', dataIndex: 'city' },
                    { title: 'Address', dataIndex: 'address' },
                    { title: 'Joined', dataIndex: 'created_at', render: formatDateTime },
                  ]}
                  scroll={{ x: 760 }}
                />
              </Card>
            ),
          },
        ]}
      />
    </main>
  )
}

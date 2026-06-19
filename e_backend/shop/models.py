from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Avg
from django.utils.text import slugify


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Profile(TimeStampedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name='profile', on_delete=models.CASCADE)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=80, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.user.get_username()


class Category(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    parent = models.ForeignKey(
        'self',
        related_name='children',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'categories'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(TimeStampedModel):
    STATUS_DRAFT = 'draft'
    STATUS_ACTIVE = 'active'
    STATUS_ARCHIVED = 'archived'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_ACTIVE, 'Active'),
        (STATUS_ARCHIVED, 'Archived'),
    ]

    category = models.ForeignKey(
        Category,
        related_name='products',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True, blank=True)
    sku = models.CharField(max_length=64, unique=True, blank=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['status', 'is_active']),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def image_url(self):
        primary = self.images.filter(is_primary=True).first()
        if primary:
            return primary.display_url
        image = self.images.first()
        return image.display_url if image else ''

    @property
    def average_rating(self):
        value = self.reviews.aggregate(avg=Avg('rating'))['avg']
        return round(value or 0, 1)

    @property
    def review_count(self):
        return self.reviews.count()


class ProductImage(TimeStampedModel):
    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    image_url = models.URLField(blank=True)
    uploaded_image = models.FileField(upload_to='products/', blank=True)
    alt_text = models.CharField(max_length=160, blank=True)
    is_primary = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return f'{self.product.name} image'

    @property
    def display_url(self):
        if self.uploaded_image:
            return self.uploaded_image.url
        return self.image_url


class Cart(TimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        related_name='cart',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    session_key = models.CharField(max_length=80, blank=True, db_index=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=['session_key', 'is_active']),
        ]

    def __str__(self):
        owner = self.user.get_username() if self.user else self.session_key or 'guest'
        return f'Cart - {owner}'

    @property
    def total_amount(self):
        return sum(item.line_total for item in self.items.select_related('product'))


class CartItem(TimeStampedModel):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name='cart_items', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])

    class Meta:
        unique_together = ['cart', 'product']

    def __str__(self):
        return f'{self.quantity} x {self.product.name}'

    @property
    def line_total(self):
        return self.product.price * self.quantity


class Order(TimeStampedModel):
    STATUS_PENDING = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_PROCESSING = 'processing'
    STATUS_SHIPPED = 'shipped'
    STATUS_DELIVERED = 'delivered'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_SHIPPED, 'Shipped'),
        (STATUS_DELIVERED, 'Delivered'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]
    PAYMENT_METHOD_COD = 'cash_on_delivery'
    PAYMENT_METHOD_BKASH = 'bkash'
    PAYMENT_METHOD_NAGAD = 'nagad'
    PAYMENT_METHOD_CHOICES = [
        (PAYMENT_METHOD_COD, 'Cash on delivery'),
        (PAYMENT_METHOD_BKASH, 'bKash'),
        (PAYMENT_METHOD_NAGAD, 'Nagad'),
    ]
    PAYMENT_STATUS_UNPAID = 'unpaid'
    PAYMENT_STATUS_PENDING = 'pending'
    PAYMENT_STATUS_PAID = 'paid'
    PAYMENT_STATUS_FAILED = 'failed'
    PAYMENT_STATUS_CANCELLED = 'cancelled'
    PAYMENT_STATUS_CHOICES = [
        (PAYMENT_STATUS_UNPAID, 'Unpaid'),
        (PAYMENT_STATUS_PENDING, 'Pending'),
        (PAYMENT_STATUS_PAID, 'Paid'),
        (PAYMENT_STATUS_FAILED, 'Failed'),
        (PAYMENT_STATUS_CANCELLED, 'Cancelled'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='orders',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    customer_name = models.CharField(max_length=120)
    customer_phone = models.CharField(max_length=20)
    shipping_address = models.TextField(blank=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    payment_method = models.CharField(max_length=30, choices=PAYMENT_METHOD_CHOICES, default=PAYMENT_METHOD_COD)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default=PAYMENT_STATUS_UNPAID)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f'Order #{self.id or "new"}'

    def recalculate_totals(self, save=True):
        subtotal = sum(item.line_total for item in self.items.all())
        self.subtotal = subtotal
        self.total_amount = subtotal + self.shipping_fee
        if save:
            self.save(update_fields=['subtotal', 'total_amount', 'updated_at'])
        return self.total_amount


class OrderItem(TimeStampedModel):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name='order_items', null=True, blank=True, on_delete=models.SET_NULL)
    product_name = models.CharField(max_length=160)
    product_sku = models.CharField(max_length=64, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.quantity} x {self.product_name}'

    @property
    def line_total(self):
        return self.unit_price * self.quantity


class Payment(TimeStampedModel):
    METHOD_COD = 'cash_on_delivery'
    METHOD_BKASH = 'bkash'
    METHOD_NAGAD = 'nagad'
    METHOD_CHOICES = [
        (METHOD_COD, 'Cash on delivery'),
        (METHOD_BKASH, 'bKash'),
        (METHOD_NAGAD, 'Nagad'),
    ]

    STATUS_UNPAID = 'unpaid'
    STATUS_PENDING = 'pending'
    STATUS_PAID = 'paid'
    STATUS_FAILED = 'failed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_UNPAID, 'Unpaid'),
        (STATUS_PENDING, 'Pending'),
        (STATUS_PAID, 'Paid'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    order = models.ForeignKey(Order, related_name='payments', on_delete=models.CASCADE)
    method = models.CharField(max_length=30, choices=METHOD_CHOICES)
    gateway_name = models.CharField(max_length=40, blank=True)
    transaction_id = models.CharField(max_length=100, blank=True, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    gateway_session_key = models.CharField(max_length=120, blank=True, db_index=True)
    gateway_response = models.TextField(blank=True)
    payment_date = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_method_display()} - {self.amount}'


class Review(TimeStampedModel):
    product = models.ForeignKey(Product, related_name='reviews', on_delete=models.CASCADE)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='reviews',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    customer_name = models.CharField(max_length=120)
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField()
    is_approved = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', 'is_approved']),
        ]

    def __str__(self):
        return f'{self.customer_name} - {self.product.name}'

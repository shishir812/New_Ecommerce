from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import serializers

from .models import (
    Cart,
    CartItem,
    Category,
    Order,
    OrderItem,
    Payment,
    Product,
    ProductImage,
    Profile,
    Review,
)


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', required=False, allow_blank=True)

    class Meta:
        model = Profile
        fields = ['id', 'user', 'username', 'email', 'phone', 'address', 'city', 'postal_code', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'username', 'created_at', 'updated_at']

    def validate_email(self, value):
        value = value.strip()
        if not value:
            return value
        user_id = self.instance.user_id if self.instance else None
        if User.objects.exclude(id=user_id).filter(email__iexact=value).exists():
            raise serializers.ValidationError('This email is already used by another account.')
        return value

    def validate_phone(self, value):
        return value.strip()

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        email = user_data.get('email')
        if email is not None:
            instance.user.email = email
            instance.user.save(update_fields=['email'])
        return super().update(instance, validated_data)


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']
        read_only_fields = ['id']


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=True, allow_blank=False)
    address = serializers.CharField(required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        phone = validated_data.pop('phone', '')
        address = validated_data.pop('address', '')
        user = User.objects.create_user(**validated_data)
        Profile.objects.create(user=user, phone=phone, address=address)
        return user


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'parent', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']


class ProductImageSerializer(serializers.ModelSerializer):
    display_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = [
            'id',
            'product',
            'image_url',
            'uploaded_image',
            'display_url',
            'alt_text',
            'is_primary',
            'sort_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'display_url', 'created_at', 'updated_at']

    def get_display_url(self, obj):
        request = self.context.get('request')
        url = obj.display_url
        if request and url and url.startswith('/'):
            return request.build_absolute_uri(url)
        return url


class ReviewSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    customer_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Review
        fields = [
            'id',
            'product',
            'product_name',
            'user',
            'customer_name',
            'rating',
            'comment',
            'is_approved',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'is_approved', 'created_at', 'updated_at']

    def validate_customer_name(self, value):
        return value.strip()

    def validate(self, attrs):
        request = self.context.get('request')
        if not (request and request.user.is_authenticated) and not attrs.get('customer_name', '').strip():
            raise serializers.ValidationError({'customer_name': 'Name is required for guest reviews.'})
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            user = request.user
            validated_data['user'] = user
            validated_data['customer_name'] = user.get_full_name() or user.username
        else:
            validated_data['customer_name'] = validated_data.get('customer_name', '').strip()
        return super().create(validated_data)


class ReviewAdminSerializer(ReviewSerializer):
    class Meta(ReviewSerializer.Meta):
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    image_url = serializers.URLField(required=False, allow_blank=True, write_only=True)
    uploaded_image = serializers.FileField(required=False, write_only=True)
    primary_image_url = serializers.CharField(source='image_url', read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    average_rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'category',
            'category_name',
            'name',
            'slug',
            'sku',
            'description',
            'price',
            'stock',
            'status',
            'is_active',
            'image_url',
            'uploaded_image',
            'primary_image_url',
            'images',
            'average_rating',
            'review_count',
            'reviews',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'slug',
            'category_name',
            'primary_image_url',
            'images',
            'average_rating',
            'review_count',
            'reviews',
            'created_at',
            'updated_at',
        ]

    def create(self, validated_data):
        image_url = validated_data.pop('image_url', '')
        uploaded_image = validated_data.pop('uploaded_image', None)
        product = super().create(validated_data)
        if image_url or uploaded_image:
            ProductImage.objects.create(
                product=product,
                image_url=image_url,
                uploaded_image=uploaded_image,
                alt_text=product.name,
                is_primary=True,
            )
        return product

    def update(self, instance, validated_data):
        image_url = validated_data.pop('image_url', '')
        uploaded_image = validated_data.pop('uploaded_image', None)
        product = super().update(instance, validated_data)
        if image_url or uploaded_image:
            defaults = {'alt_text': product.name}
            if image_url:
                defaults['image_url'] = image_url
            if uploaded_image:
                defaults['uploaded_image'] = uploaded_image
            ProductImage.objects.update_or_create(product=product, is_primary=True, defaults=defaults)
        return product

    def to_representation(self, instance):
        data = super().to_representation(instance)
        primary_image_url = data.pop('primary_image_url')
        primary = instance.images.filter(is_primary=True).first() or instance.images.first()
        if primary and primary.uploaded_image:
            request = self.context.get('request')
            data['image_url'] = request.build_absolute_uri(primary.uploaded_image.url) if request else primary.uploaded_image.url
        else:
            data['image_url'] = primary_image_url
        return data


class CartProductSerializer(serializers.ModelSerializer):
    image_url = serializers.CharField(read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'stock', 'image_url']
        read_only_fields = fields


class CartItemSerializer(serializers.ModelSerializer):
    product_detail = CartProductSerializer(source='product', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    unit_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = [
            'id',
            'cart',
            'product',
            'product_detail',
            'product_name',
            'unit_price',
            'quantity',
            'line_total',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'product_detail', 'product_name', 'unit_price', 'line_total', 'created_at', 'updated_at']


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'user', 'session_key', 'is_active', 'items', 'total_amount', 'created_at', 'updated_at']
        read_only_fields = ['id', 'items', 'total_amount', 'created_at', 'updated_at']


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'order',
            'product',
            'product_name',
            'product_sku',
            'unit_price',
            'quantity',
            'line_total',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'product_name',
            'product_sku',
            'unit_price',
            'line_total',
            'created_at',
            'updated_at',
        ]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id',
            'order',
            'method',
            'gateway_name',
            'transaction_id',
            'amount',
            'status',
            'gateway_session_key',
            'gateway_response',
            'payment_date',
            'paid_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'payment_date', 'paid_at', 'created_at', 'updated_at']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    cart_items = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), write_only=True, required=False)
    quantity = serializers.IntegerField(write_only=True, required=False, min_value=1, default=1)
    payment_method = serializers.ChoiceField(choices=Order.PAYMENT_METHOD_CHOICES, required=False)
    transaction_id = serializers.CharField(write_only=True, required=False, allow_blank=True)
    product_name = serializers.SerializerMethodField()
    order_status = serializers.CharField(source='status', read_only=True)
    customer_type = serializers.SerializerMethodField()
    account_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    account_email = serializers.EmailField(source='user.email', read_only=True, allow_null=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'user',
            'customer_type',
            'account_username',
            'account_email',
            'customer_name',
            'customer_phone',
            'shipping_address',
            'subtotal',
            'shipping_fee',
            'total_amount',
            'status',
            'order_status',
            'payment_method',
            'payment_status',
            'notes',
            'items',
            'payments',
            'cart_items',
            'product',
            'product_name',
            'quantity',
            'transaction_id',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'user',
            'customer_type',
            'account_username',
            'account_email',
            'subtotal',
            'total_amount',
            'status',
            'order_status',
            'payment_status',
            'items',
            'payments',
            'product_name',
            'created_at',
            'updated_at',
        ]

    def get_product_name(self, obj):
        first_item = obj.items.first()
        return first_item.product_name if first_item else ''

    def get_customer_type(self, obj):
        return 'registered' if obj.user_id else 'guest'

    def create(self, validated_data):
        product = validated_data.pop('product', None)
        cart_items = validated_data.pop('cart_items', [])
        quantity = validated_data.pop('quantity', 1)
        payment_method = validated_data.pop('payment_method', Payment.METHOD_COD)
        transaction_id = validated_data.pop('transaction_id', '').strip()
        wallet_methods = {Order.PAYMENT_METHOD_BKASH, Order.PAYMENT_METHOD_NAGAD}

        if payment_method in wallet_methods and not transaction_id:
            raise serializers.ValidationError({
                'transaction_id': 'Transaction ID is required for bKash or Nagad payment.'
            })

        if not cart_items and product is not None:
            cart_items = [{'product': product.id, 'quantity': quantity}]

        if not cart_items:
            raise serializers.ValidationError({'product': 'Product is required for checkout.'})

        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user

        with transaction.atomic():
            validated_data['payment_method'] = payment_method
            is_wallet_payment = payment_method in wallet_methods
            validated_data['payment_status'] = (
                Order.PAYMENT_STATUS_PAID
                if is_wallet_payment
                else Order.PAYMENT_STATUS_UNPAID
            )
            if is_wallet_payment:
                validated_data['status'] = Order.STATUS_CONFIRMED
            order = Order.objects.create(**validated_data)
            for item in cart_items:
                item_product = Product.objects.select_for_update().get(pk=item.get('product'))
                item_quantity = int(item.get('quantity') or 1)
                if item_quantity < 1:
                    raise serializers.ValidationError({'cart_items': 'Quantity must be at least 1.'})
                if item_product.stock < item_quantity:
                    raise serializers.ValidationError({
                        'stock': f'Only {item_product.stock} units available for {item_product.name}.'
                    })
                OrderItem.objects.create(
                    order=order,
                    product=item_product,
                    product_name=item_product.name,
                    product_sku=item_product.sku,
                    unit_price=item_product.price,
                    quantity=item_quantity,
                )
                Product.objects.filter(pk=item_product.pk).update(stock=F('stock') - item_quantity)
            order.recalculate_totals(save=True)

            payment_status = (
                Payment.STATUS_PAID
                if is_wallet_payment
                else Payment.STATUS_UNPAID
            )
            gateway_name = payment_method if payment_method != Order.PAYMENT_METHOD_COD else 'cash_on_delivery'
            Payment.objects.create(
                order=order,
                method=payment_method,
                gateway_name=gateway_name,
                transaction_id=transaction_id,
                amount=order.total_amount,
                status=payment_status,
                payment_date=timezone.now() if payment_status == Payment.STATUS_PAID else None,
                paid_at=timezone.now() if payment_status == Payment.STATUS_PAID else None,
            )
            if request and request.user.is_authenticated:
                CartItem.objects.filter(cart__user=request.user).delete()
        return order


class OrderAdminSerializer(OrderSerializer):
    class Meta(OrderSerializer.Meta):
        read_only_fields = [
            'id',
            'user',
            'subtotal',
            'total_amount',
            'items',
            'payments',
            'product_name',
            'created_at',
            'updated_at',
        ]

    def update(self, instance, validated_data):
        old_status = instance.status
        order = super().update(instance, validated_data)
        if old_status != Order.STATUS_CANCELLED and order.status == Order.STATUS_CANCELLED:
            for item in order.items.select_related('product'):
                if item.product_id:
                    Product.objects.filter(pk=item.product_id).update(stock=F('stock') + item.quantity)
        return order

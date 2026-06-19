from django.contrib import admin

from .models import Cart, CartItem, Category, Order, OrderItem, Payment, Product, ProductImage, Profile, Review


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ('line_total',)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('line_total',)


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone', 'city', 'created_at')
    search_fields = ('user__username', 'user__email', 'phone')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'stock', 'status', 'is_active', 'average_rating')
    list_filter = ('category', 'status', 'is_active')
    search_fields = ('name', 'sku', 'description')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductImageInline]


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('product', 'is_primary', 'sort_order')
    list_filter = ('is_primary',)
    search_fields = ('product__name', 'alt_text')


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'session_key', 'is_active', 'total_amount', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('user__username', 'session_key')
    inlines = [CartItemInline]


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('cart', 'product', 'quantity', 'line_total')
    search_fields = ('product__name',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer_name', 'customer_phone', 'total_amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('customer_name', 'customer_phone', 'items__product_name', 'payments__transaction_id')
    inlines = [OrderItemInline, PaymentInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'product_name', 'quantity', 'unit_price', 'line_total')
    search_fields = ('product_name', 'product_sku')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('order', 'method', 'amount', 'status', 'transaction_id', 'created_at')
    list_filter = ('method', 'status', 'created_at')
    search_fields = ('transaction_id', 'order__customer_name', 'order__customer_phone')


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('product', 'customer_name', 'rating', 'is_approved', 'created_at')
    list_filter = ('rating', 'is_approved', 'created_at')
    search_fields = ('customer_name', 'comment', 'product__name')

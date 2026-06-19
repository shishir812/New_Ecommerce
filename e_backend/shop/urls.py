from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminOverviewView,
    CartItemViewSet,
    CartViewSet,
    CategoryViewSet,
    CurrentUserView,
    CustomerCartView,
    CustomerProfileView,
    CustomerOrderHistoryView,
    LoginView,
    LogoutView,
    OrderItemViewSet,
    OrderViewSet,
    PaymentViewSet,
    ProductImageViewSet,
    ProductViewSet,
    ProfileViewSet,
    RegisterView,
    ReviewViewSet,
)

router = DefaultRouter()
router.register('profiles', ProfileViewSet)
router.register('categories', CategoryViewSet)
router.register('products', ProductViewSet)
router.register('product-images', ProductImageViewSet)
router.register('carts', CartViewSet)
router.register('cart-items', CartItemViewSet)
router.register('orders', OrderViewSet)
router.register('order-items', OrderItemViewSet)
router.register('payments', PaymentViewSet)
router.register('reviews', ReviewViewSet)

urlpatterns = [
    path('auth/register/', RegisterView.as_view()),
    path('auth/login/', LoginView.as_view()),
    path('auth/logout/', LogoutView.as_view()),
    path('auth/me/', CurrentUserView.as_view()),
    path('customer/cart/', CustomerCartView.as_view()),
    path('customer/profile/', CustomerProfileView.as_view()),
    path('customer/orders/', CustomerOrderHistoryView.as_view()),
    path('admin/overview/', AdminOverviewView.as_view()),
    path('', include(router.urls)),
]

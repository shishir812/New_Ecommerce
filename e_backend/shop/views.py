from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Cart, CartItem, Category, Order, OrderItem, Payment, Product, ProductImage, Profile, Review
from .permissions import IsAdminOrProductManager, IsAdminOrProductManagerOrReadOnly, has_admin_password
from .serializers import (
    CartItemSerializer,
    CartSerializer,
    CategorySerializer,
    OrderItemSerializer,
    OrderAdminSerializer,
    OrderSerializer,
    PaymentSerializer,
    ProductImageSerializer,
    ProductSerializer,
    ProfileSerializer,
    RegisterSerializer,
    ReviewAdminSerializer,
    ReviewSerializer,
    UserSerializer,
)


class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return


class AdminPasswordMixin:
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAdminOrProductManagerOrReadOnly]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    admin_actions = set()

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        user_can_manage = bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.is_staff
                or request.user.groups.filter(name='Product Managers').exists()
            )
        )
        if self.action in self.admin_actions and not has_admin_password(request) and not user_can_manage:
            raise PermissionDenied('Admin password is required.')


class ProfileViewSet(AdminPasswordMixin, viewsets.ModelViewSet):
    queryset = Profile.objects.select_related('user').all()
    serializer_class = ProfileSerializer
    admin_actions = {'list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'}
    permission_classes = [IsAdminOrProductManager]


class CategoryViewSet(AdminPasswordMixin, viewsets.ModelViewSet):
    queryset = Category.objects.select_related('parent').all()
    serializer_class = CategorySerializer
    admin_actions = {'create', 'update', 'partial_update', 'destroy'}


class ProductViewSet(AdminPasswordMixin, viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').prefetch_related('images', 'reviews').all()
    serializer_class = ProductSerializer
    admin_actions = {'create', 'update', 'partial_update', 'destroy'}

    def perform_destroy(self, instance):
        instance.cart_items.all().delete()
        instance.images.all().delete()
        instance.reviews.all().delete()
        super().perform_destroy(instance)


class ProductImageViewSet(AdminPasswordMixin, viewsets.ModelViewSet):
    queryset = ProductImage.objects.select_related('product').all()
    serializer_class = ProductImageSerializer
    admin_actions = {'create', 'update', 'partial_update', 'destroy'}


class CartViewSet(AdminPasswordMixin, viewsets.ModelViewSet):
    queryset = Cart.objects.select_related('user').prefetch_related('items__product').all()
    serializer_class = CartSerializer
    admin_actions = {'list', 'retrieve', 'update', 'partial_update', 'destroy'}
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if has_admin_password(self.request) or (user and user.is_authenticated and user.is_staff):
            return queryset
        return queryset.filter(user=user)


class CartItemViewSet(AdminPasswordMixin, viewsets.ModelViewSet):
    queryset = CartItem.objects.select_related('cart', 'product').all()
    serializer_class = CartItemSerializer
    admin_actions = {'list', 'retrieve', 'update', 'partial_update', 'destroy'}
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if has_admin_password(self.request) or (user and user.is_authenticated and user.is_staff):
            return queryset
        return queryset.filter(cart__user=user)


class OrderViewSet(AdminPasswordMixin, viewsets.ModelViewSet):
    queryset = Order.objects.select_related('user').prefetch_related('items__product', 'payments').all()
    serializer_class = OrderSerializer
    admin_actions = {'list', 'retrieve', 'update', 'partial_update', 'destroy'}

    def get_serializer_class(self):
        if self.action in {'update', 'partial_update'}:
            return OrderAdminSerializer
        return OrderSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated()]
        if self.action in self.admin_actions:
            return [IsAdminOrProductManager()]
        return super().get_permissions()


class OrderItemViewSet(AdminPasswordMixin, viewsets.ModelViewSet):
    queryset = OrderItem.objects.select_related('order', 'product').all()
    serializer_class = OrderItemSerializer
    admin_actions = {'list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'}
    permission_classes = [IsAdminOrProductManager]


class PaymentViewSet(AdminPasswordMixin, viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('order').all()
    serializer_class = PaymentSerializer
    admin_actions = {'list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'}
    permission_classes = [IsAdminOrProductManager]


class ReviewViewSet(AdminPasswordMixin, viewsets.ModelViewSet):
    queryset = Review.objects.select_related('product', 'user').all()
    serializer_class = ReviewSerializer
    admin_actions = {'update', 'partial_update', 'destroy'}
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action in {'update', 'partial_update'}:
            return ReviewAdminSerializer
        return ReviewSerializer


class RegisterView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        username = request.data.get('username', '')
        password = request.data.get('password', '')
        user = authenticate(request, username=username, password=password)
        if not user:
            raise PermissionDenied('Invalid username or password.')
        login(request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        logout(request)
        return Response({'detail': 'Logged out.'})


class CurrentUserView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'user': None})
        return Response({'user': UserSerializer(request.user).data})


class CustomerOrderHistoryView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(user=request.user).prefetch_related('items__product', 'payments')
        return Response(OrderSerializer(orders, many=True).data)


class CustomerProfileView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_profile(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return profile

    def get(self, request):
        return Response(ProfileSerializer(self.get_profile(request)).data)

    def patch(self, request):
        serializer = ProfileSerializer(self.get_profile(request), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CustomerCartView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_cart(self, request):
        cart, _ = Cart.objects.prefetch_related('items__product').get_or_create(
            user=request.user,
            defaults={'is_active': True},
        )
        return cart

    def get(self, request):
        return Response(CartSerializer(self.get_cart(request)).data)

    def post(self, request):
        cart = self.get_cart(request)
        product_id = request.data.get('product')
        quantity = int(request.data.get('quantity') or 1)
        if quantity < 1:
            raise ValidationError({'quantity': 'Quantity must be at least 1.'})
        product = get_object_or_404(Product, pk=product_id)
        item, created = CartItem.objects.get_or_create(cart=cart, product=product, defaults={'quantity': quantity})
        if not created:
            item.quantity = item.quantity + quantity
            item.save(update_fields=['quantity', 'updated_at'])
        return Response(CartSerializer(self.get_cart(request)).data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        cart = self.get_cart(request)
        items = request.data.get('items', [])
        if not isinstance(items, list):
            raise ValidationError({'items': 'Items must be a list.'})

        keep_product_ids = []
        with transaction.atomic():
            for item in items:
                product_id = item.get('product')
                quantity = int(item.get('quantity') or 0)
                if not product_id:
                    continue
                if quantity < 1:
                    CartItem.objects.filter(cart=cart, product_id=product_id).delete()
                    continue
                get_object_or_404(Product, pk=product_id)
                CartItem.objects.update_or_create(
                    cart=cart,
                    product_id=product_id,
                    defaults={'quantity': quantity},
                )
                keep_product_ids.append(product_id)
            cart.items.exclude(product_id__in=keep_product_ids).delete()

        return Response(CartSerializer(self.get_cart(request)).data)

    def delete(self, request):
        self.get_cart(request).items.all().delete()
        return Response(CartSerializer(self.get_cart(request)).data)


class AdminOverviewView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAdminOrProductManager]

    def get(self, request):
        if not has_admin_password(request):
            raise PermissionDenied('Admin password is required.')
        return self.get_payload()

    def get_payload(self):
        products = Product.objects.select_related('category').prefetch_related('images', 'reviews').all()
        orders = Order.objects.prefetch_related('items__product', 'payments').all()
        return Response({
            'products': ProductSerializer(products, many=True).data,
            'orders': OrderSerializer(orders, many=True).data,
        })

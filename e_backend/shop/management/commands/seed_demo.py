from django.core.management.base import BaseCommand

from shop.models import Category, Product, ProductImage, Review


PRODUCTS = [
    {
        'category': 'Electronics',
        'name': 'Wireless Headphones',
        'sku': 'ELEC-WH-001',
        'description': 'Comfortable Bluetooth headphones with deep bass and long battery life.',
        'price': '2450.00',
        'stock': 18,
        'image_url': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
        'reviews': [
            ('Rafi', 5, 'Sound quality is excellent for the price.'),
            ('Mim', 4, 'Comfortable and battery lasts long.'),
        ],
    },
    {
        'category': 'Electronics',
        'name': 'Smart Watch Pro',
        'sku': 'ELEC-SW-002',
        'description': 'Fitness tracking, call alerts, heart-rate monitor, and a bright display.',
        'price': '3290.00',
        'stock': 12,
        'image_url': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
        'reviews': [
            ('Tanvir', 5, 'Looks premium and tracks workouts nicely.'),
        ],
    },
    {
        'category': 'Fashion',
        'name': 'Cotton Casual T-Shirt',
        'sku': 'FASH-TS-003',
        'description': 'Soft everyday cotton t-shirt with a clean modern fit.',
        'price': '650.00',
        'stock': 40,
        'image_url': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
        'reviews': [
            ('Nadia', 4, 'Nice fabric and the size was accurate.'),
        ],
    },
    {
        'category': 'Travel',
        'name': 'Travel Backpack',
        'sku': 'TRVL-BP-004',
        'description': 'Durable 25L backpack with laptop sleeve and water-resistant fabric.',
        'price': '1850.00',
        'stock': 20,
        'image_url': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80',
        'reviews': [
            ('Sajib', 5, 'Plenty of space and feels strong.'),
        ],
    },
]


class Command(BaseCommand):
    help = 'Seed demo ecommerce products and reviews.'

    def handle(self, *args, **options):
        for item in PRODUCTS:
            item = item.copy()
            reviews = item.pop('reviews')
            image_url = item.pop('image_url')
            category_name = item.pop('category')
            category, _ = Category.objects.get_or_create(name=category_name)
            product, _ = Product.objects.update_or_create(
                name=item['name'],
                defaults={**item, 'category': category},
            )
            ProductImage.objects.update_or_create(
                product=product,
                is_primary=True,
                defaults={
                    'image_url': image_url,
                    'alt_text': product.name,
                    'sort_order': 0,
                },
            )
            for customer_name, rating, comment in reviews:
                Review.objects.get_or_create(
                    product=product,
                    customer_name=customer_name,
                    comment=comment,
                    defaults={'rating': rating},
                )
        self.stdout.write(self.style.SUCCESS('Demo ecommerce products are ready.'))

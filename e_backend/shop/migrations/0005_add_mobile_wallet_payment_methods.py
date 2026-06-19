from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0004_order_payment_method_order_payment_status_and_more'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='order',
                    name='payment_method',
                    field=models.CharField(
                        choices=[
                            ('cash_on_delivery', 'Cash on delivery'),
                            ('sslcommerz', 'Online payment - SSLCOMMERZ'),
                            ('bkash', 'bKash'),
                            ('nagad', 'Nagad'),
                        ],
                        default='cash_on_delivery',
                        max_length=30,
                    ),
                ),
                migrations.AlterField(
                    model_name='payment',
                    name='method',
                    field=models.CharField(
                        choices=[
                            ('cash_on_delivery', 'Cash on delivery'),
                            ('sslcommerz', 'SSLCOMMERZ'),
                            ('bkash', 'bKash'),
                            ('nagad', 'Nagad'),
                        ],
                        max_length=30,
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]

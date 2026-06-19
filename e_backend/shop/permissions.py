from rest_framework.permissions import SAFE_METHODS, BasePermission


def has_admin_password(request):
    from django.conf import settings

    header_password = request.headers.get('X-Admin-Password')
    body_password = getattr(request, 'data', {}).get('admin_password')
    query_password = request.query_params.get('admin_password')
    return settings.ADMIN_PORTAL_PASSWORD in {header_password, body_password, query_password}


class IsAdminOrProductManager(BasePermission):
    def has_permission(self, request, view):
        if has_admin_password(request):
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.is_staff
                or request.user.groups.filter(name='Product Managers').exists()
            )
        )


class IsAdminOrProductManagerOrReadOnly(IsAdminOrProductManager):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return super().has_permission(request, view)


class IsAdminOrSelf(BasePermission):
    def has_object_permission(self, request, view, obj):
        if has_admin_password(request):
            return True
        if request.user and request.user.is_staff:
            return True
        return getattr(obj, 'user_id', None) == getattr(request.user, 'id', None)

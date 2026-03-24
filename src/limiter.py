from slowapi import Limiter
from slowapi.util import get_remote_address
from src.config import settings


def get_rate_limit_key(request):
	if settings.TRUST_PROXY_HEADERS:
		forwarded_for = request.headers.get("x-forwarded-for")
		if forwarded_for:
			return forwarded_for.split(",")[0].strip()

		real_ip = request.headers.get("x-real-ip")
		if real_ip:
			return real_ip.strip()

	return get_remote_address(request)


limiter = Limiter(key_func=get_rate_limit_key, enabled=not settings.TESTING)

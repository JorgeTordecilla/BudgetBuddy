import ipaddress

from fastapi import Request

from app.core.config import settings


def _peer_ip(request: Request) -> str:
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _parse_forwarded_client_ip(value: str) -> str | None:
    for candidate in value.split(","):
        trimmed = candidate.strip()
        if not trimmed:
            continue
        try:
            return str(ipaddress.ip_address(trimmed))
        except ValueError:
            continue
    return None


def _is_trusted_proxy(peer_ip: str) -> bool:
    try:
        parsed_peer = ipaddress.ip_address(peer_ip)
    except ValueError:
        return False
    for rule in settings.rate_limit_trusted_proxies:
        if parsed_peer in ipaddress.ip_network(rule, strict=False):
            return True
    return False


def resolve_rate_limit_client_ip(request: Request) -> str:
    peer_ip = _peer_ip(request)
    if not settings.rate_limit_trusted_proxies:
        return peer_ip
    if not _is_trusted_proxy(peer_ip):
        return peer_ip
    forwarded = request.headers.get("x-forwarded-for", "").strip()
    forwarded_ip = _parse_forwarded_client_ip(forwarded)
    return forwarded_ip or peer_ip

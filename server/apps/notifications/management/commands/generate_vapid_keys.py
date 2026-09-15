import base64

from cryptography.hazmat.primitives import serialization
from django.core.management.base import BaseCommand
from py_vapid import Vapid


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


class Command(BaseCommand):
    help = (
        "Generates a fresh VAPID keypair for Web Push and prints the env vars "
        "to set. Never writes to .env directly -- copy the values in yourself. "
        "Run this once per environment (dev, staging, prod each get their own); "
        "changing the keys invalidates every existing push subscription."
    )

    def handle(self, *args, **options):
        vapid = Vapid()
        vapid.generate_keys()

        private_raw = vapid.private_key.private_numbers().private_value.to_bytes(32, "big")
        public_raw = vapid.public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint,
        )

        self.stdout.write(self.style.SUCCESS("Generated a new VAPID keypair.\n"))
        self.stdout.write("server/.env:")
        self.stdout.write(f"VAPID_PRIVATE_KEY={_b64url(private_raw)}")
        self.stdout.write(f"VAPID_PUBLIC_KEY={_b64url(public_raw)}")
        self.stdout.write(f"VAPID_CLAIM_EMAIL={{your admin/support email}}\n")
        self.stdout.write("client/.env (same public key, exposed to the browser):")
        self.stdout.write(f"NEXT_PUBLIC_VAPID_PUBLIC_KEY={_b64url(public_raw)}")

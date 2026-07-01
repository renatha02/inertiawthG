"""
sms.py — Africa's Talking SMS Service for RENATHA

Wraps the Africa's Talking Python SDK.
Uses sandbox by default. Switch AT_USERNAME to your real username for production.

.env variables required:
    AT_USERNAME=sandbox
    AT_API_KEY=your_api_key_here
    AT_SENDER_ID=optional_sender_id
"""

import os
import logging
import africastalking

logger = logging.getLogger("renatha.sms")

_initialized = False


def _normalize_phone(phone: str) -> str:
    """Normalize a local phone number to E.164 for Africa's Talking."""
    cleaned = phone.strip()
    if not cleaned:
        return ""
    if cleaned.startswith("+"):
        return cleaned
    if cleaned.startswith("0"):
        return "+254" + cleaned[1:]
    return cleaned


def _init_at() -> bool:
    """Lazy-initialize the Africa's Talking SDK once."""
    global _initialized
    if _initialized:
        return True

    username = os.getenv("AT_USERNAME", "sandbox").strip()
    api_key = os.getenv("AT_API_KEY", "").strip()

    if not username or not api_key:
        logger.warning("⚠️  AT_USERNAME/AT_API_KEY are not set. SMS will NOT be sent.")
        return False

    try:
        africastalking.initialize(username, api_key)
        _initialized = True
        logger.info("✅ Africa's Talking initialized with username: %s", username)
        return True
    except Exception as exc:
        logger.error("❌ Failed to initialize Africa's Talking: %s", exc)
        return False


def send_sms(phone_numbers: list[str], message: str) -> bool:
    """
    Send an SMS to one or more phone numbers using Africa's Talking.

    Args:
        phone_numbers: List of phone numbers (local or E.164 format)
        message: The SMS body text.

    Returns:
        True if sent successfully, False otherwise.
    """
    if not phone_numbers:
        logger.warning("send_sms called with empty phone list — skipping.")
        return False

    normalized_numbers = [_normalize_phone(phone) for phone in phone_numbers if phone]
    if not normalized_numbers:
        logger.warning("send_sms received only empty phone numbers — skipping.")
        return False

    if not _init_at():
        logger.error("Africa's Talking not initialized. Check AT_USERNAME and AT_API_KEY in .env")
        return False

    sender_id = os.getenv("AT_SENDER_ID", "").strip() or None

    try:
        response = africastalking.SMS.send(message, normalized_numbers, sender_id=sender_id)
        logger.info("📱 SMS sent to %s: %s", normalized_numbers, response)
        return True
    except Exception as exc:
        logger.error("❌ SMS send failed: %s", exc)
        return False

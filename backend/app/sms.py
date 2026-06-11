"""
sms.py — Africa's Talking SMS Service for RENATHA

Wraps the Africa's Talking Python SDK.
Uses sandbox by default. Switch AT_USERNAME to your real username for production.

.env variables required:
    AT_USERNAME=sandbox
    AT_API_KEY=your_api_key_here
"""

import os
import logging
import africastalking

logger = logging.getLogger("renatha.sms")

_initialized = False


def _init_at():
    """Lazy-initialize the Africa's Talking SDK once."""
    global _initialized
    if not _initialized:
        username = os.getenv("AT_USERNAME", "sandbox")
        api_key = os.getenv("AT_API_KEY", "")
        if not api_key:
            logger.warning("⚠️  AT_API_KEY is not set. SMS will NOT be sent.")
            return False
        africastalking.initialize(username, api_key)
        _initialized = True
    return True


def send_sms(phone_numbers: list[str], message: str) -> bool:
    """
    Send an SMS to one or more phone numbers.

    Args:
        phone_numbers: List of E.164 formatted numbers e.g. ['+254712345678']
        message: The SMS body text.

    Returns:
        True if sent successfully, False otherwise.
    """
    if not phone_numbers:
        logger.warning("send_sms called with empty phone list — skipping.")
        return False

    if not _init_at():
        logger.error("Africa's Talking not initialized. Check AT_API_KEY in .env")
        return False

    try:
        sms = africastalking.SMS
        response = sms.send(message, phone_numbers)
        logger.info(f"📱 SMS sent to {phone_numbers}: {response}")
        return True
    except Exception as e:
        logger.error(f"❌ SMS send failed: {e}")
        return False

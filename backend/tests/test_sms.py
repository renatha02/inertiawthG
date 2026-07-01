import os
import unittest
from unittest import mock

from app import sms


class SmsIntegrationTests(unittest.TestCase):
    def setUp(self):
        sms._initialized = False

    def test_normalize_phone_adds_ke_country_code(self):
        self.assertEqual(sms._normalize_phone("0712345678"), "+254712345678")

    def test_normalize_phone_keeps_e164_number(self):
        self.assertEqual(sms._normalize_phone("+254712345678"), "+254712345678")

    def test_init_at_uses_env_credentials(self):
        with mock.patch.dict(
            os.environ,
            {"AT_USERNAME": "sandbox", "AT_API_KEY": "test-key"},
            clear=False,
        ):
            with mock.patch("app.sms.africastalking.initialize") as initialize:
                self.assertTrue(sms._init_at())
                initialize.assert_called_once_with("sandbox", "test-key")


if __name__ == "__main__":
    unittest.main()

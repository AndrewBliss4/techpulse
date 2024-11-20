from selenium import webdriver
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.firefox.options import Options as FirefoxOptions

from webdriver_manager.firefox import GeckoDriverManager
import ssl

# SSL setup
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

class BaseScraper:
    def __init__(self):
        self.driver = None
        self.initialize_driver()

    def initialize_driver(self):
        """Initialize Firefox WebDriver with appropriate settings."""
        try:
            options = FirefoxOptions()
            options.add_argument("--headless")
            options.add_argument("--window-size=1920,1080")
            options.set_preference("javascript.enabled", True)

            self.driver = webdriver.Firefox(
                service=FirefoxService(GeckoDriverManager().install()),
                options=options
            )
            self.driver.set_page_load_timeout(30)
            print("WebDriver initialized successfully.")
        except Exception as e:
            print(f"Error initializing WebDriver: {e}")

    def close_driver(self):
        """Close the WebDriver."""
        if self.driver:
            self.driver.quit()
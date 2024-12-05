import time
from datetime import datetime
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException
import psycopg2
from psycopg2 import sql
from .scraper import BaseScraper
from .utils import extract_keywords


class ArticleScraper(BaseScraper):
    def __init__(self, db_config):
        """Initialize the scraper with database configuration."""
        super().__init__()
        self.db_config = db_config
        self.connection = None

    def connect_to_db(self):
        """Establish a connection to the PostgreSQL database."""
        try:
            self.connection = psycopg2.connect(**self.db_config)
            self.connection.autocommit = True
            print("Database connection established.")
        except Exception as e:
            print(f"Error connecting to the database: {e}")
            raise

    def close_db_connection(self):
        """Close the database connection."""
        if self.connection:
            self.connection.close()
            print("Database connection closed.")

    def get_article_urls(self, base_url):
        """Get all article URLs from the publications page."""
        try:
            print(f"\nAccessing: {base_url}")
            self.driver.get(base_url)
            time.sleep(5)  # Wait for initial load

            # Handle cookie consent banner if present
            try:
                print("Attempting to handle cookie consent banner...")
                iframe = self.driver.find_element(By.ID, "truste-consent-frame")
                self.driver.switch_to.frame(iframe)
                accept_button = self.driver.find_element(By.XPATH, "//button[@id='truste-consent-button']")
                accept_button.click()
                self.driver.switch_to.default_content()
                time.sleep(2)
            except Exception as e:
                print(f"No cookie banner found or error handling it: {e}")
                self.driver.switch_to.default_content()

            # Load all articles by clicking "View More"
            attempts, max_attempts, last_article_count = 0, 10, 0
            while attempts < max_attempts:
                try:
                    view_more_button = self.driver.find_element(
                        By.XPATH, "//span[contains(@class, 'call-to-action__button')]"
                    )
                    if not view_more_button.is_displayed():
                        print("No more 'View More' button found.")
                        break
                    self.driver.execute_script("arguments[0].scrollIntoView(true);", view_more_button)
                    time.sleep(1)
                    self.driver.execute_script("arguments[0].click();", view_more_button)
                    time.sleep(3)  # Wait for new content to load
                    current_articles = len(self.driver.find_elements(By.TAG_NAME, "article"))
                    if current_articles == last_article_count:
                        print("No new articles loaded, stopping...")
                        break
                    last_article_count = current_articles
                    attempts += 1
                except Exception as e:
                    print(f"Error clicking 'View More' button: {e}")
                    break

            # Extract article URLs
            print("\nExtracting article URLs...")
            soup = BeautifulSoup(self.driver.page_source, "html.parser")
            articles = soup.find_all("article")
            urls = []
            for article in articles:
                for link in article.find_all("a", href=True):
                    url = link["href"]
                    if url.startswith("/"):
                        url = f"https://www.bcg.com{url}"
                    if "/publications/" in url and url not in urls:
                        urls.append(url)
                        print(f"Found article: {url}")
                        break
            print(f"\nTotal articles found: {len(urls)}")
            return urls
        except Exception as e:
            print(f"Error getting article URLs: {e}")
            return []

    def insert_url(self, url, source_type, source_name):
        """Insert a URL into the URL table."""
        query = """
        INSERT INTO URL (url, source_type, source_name) 
        VALUES (%s, %s, %s) 
        RETURNING url_id;
        """
        with self.connection.cursor() as cursor:
            cursor.execute(query, (url, source_type, source_name))
            return cursor.fetchone()[0]

    def insert_scraped_data(self, field_id, source_id, title, content, scraped_at, published_date):
        """Insert scraped data into the ScrapedData table."""
        query = """
        INSERT INTO ScrapedData (
            field_id, source_id, title, content, scraped_at, published_date
        ) 
        VALUES (%s, %s, %s, %s, %s, %s) 
        RETURNING data_id;
        """
        with self.connection.cursor() as cursor:
            cursor.execute(query, (field_id, source_id, title, content, scraped_at, published_date))
            return cursor.fetchone()[0]

    def insert_keywords(self, data_id, keywords):
        """Insert keywords into the Keyword table."""
        query = """
        INSERT INTO Keyword (data_id, keyword, keyword_count) 
        VALUES (%s, %s, %s);
        """
        with self.connection.cursor() as cursor:
            for keyword, count in keywords.items():  # No change needed here since extract_keywords now returns a dict
                cursor.execute(query, (data_id, keyword, count))

    def extract_article(self, url):
        """Extract content from a single article."""
        try:
            self.driver.get(url)
            time.sleep(3)
            soup = BeautifulSoup(self.driver.page_source, "html.parser")

            title = soup.find("h1", class_=["article-header-title", "hero-content-title"])
            title_text = title.get_text(strip=True) if title else "Title not found"

            date = soup.find(["time", "span"], class_="date")
            date_text = date.get_text(strip=True) if date else None

            content = soup.find("div", class_=["rtf", "article-body"])
            content_text = "\n\n".join([p.get_text(strip=True) for p in content.find_all("p")]) if content else ""

            if not content_text:
                return None

            return {
                "title": title_text,
                "date": datetime.strptime(date_text, "%B %d, %Y") if date_text else None,
                "content": content_text,
                "keywords": extract_keywords(content_text),
                "url": url,
            }
        except Exception as e:
            print(f"Error extracting article: {e}")
            return None

    def scrape_articles(self, base_url):
        """Main function to scrape all articles."""
        try:
            self.connect_to_db()
            urls = self.get_article_urls(base_url)

            for i, url in enumerate(urls, 1):
                print(f"\nProcessing article {i}/{len(urls)}")
                article_data = self.extract_article(url)
                if not article_data:
                    continue

                # Insert URL and associated data
                url_id = self.insert_url(url=article_data["url"], source_type="Web", source_name="BCG")
                with self.connection.cursor() as cursor:
                    cursor.execute("INSERT INTO Source (url_id) VALUES (%s) RETURNING source_id;", (url_id,))
                    source_id = cursor.fetchone()[0]
                data_id = self.insert_scraped_data(
                    field_id=0,  # Assuming a default Field ID for now
                    source_id=source_id,
                    title=article_data["title"],
                    content=article_data["content"],
                    scraped_at=datetime.now(),
                    published_date=article_data["date"],
                )
                self.insert_keywords(data_id, article_data["keywords"])

                print(f"Successfully processed and inserted article: {article_data['title']}")
        except Exception as e:
            print(f"Error in scrape_articles: {e}")
        finally:
            self.close_db_connection()


# Database configuration
db_config = {
    "dbname": "techpulse",
    "user": "your_username",
    "password": "your_password",
    "host": "localhost",
    "port": 5432,
}

# Running the scraper
if __name__ == "__main__":
    base_urls = [
        "https://www.bcg.com/publications",
        "https://www.bcg.com/publications/latest",
        "https://www.bcg.com/publications?sort=date",
        "https://www.bcg.com/publications?fi2=00000177-2b73-deac-ad7f-3bf7870b0000",
    ]

    scraper = ArticleScraper(db_config=db_config)
    scraper.scrape_articles(base_urls[0])

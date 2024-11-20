import time
import pandas as pd
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By  # Add this import
from selenium.common.exceptions import NoSuchElementException
from .scraper import BaseScraper
from .utils import extract_keywords

class ArticleScraper(BaseScraper):
    def get_article_urls(self, base_url):
      """Get all article URLs from the publications page."""
      try:
          print(f"\nAccessing: {base_url}")
          self.driver.get(base_url)
          time.sleep(5)  # Wait for initial load

          # Handle cookie consent banner if present
          try:
              print("Attempting to handle cookie consent banner...")
              # Try to find the cookie banner iframe
              iframe = self.driver.find_element(By.ID, "truste-consent-frame")
              if iframe:
                  # Switch to the iframe
                  self.driver.switch_to.frame(iframe)
                  # Find and click accept button
                  accept_button = self.driver.find_element(By.XPATH, "//button[@id='truste-consent-button']")
                  accept_button.click()
                  # Switch back to default content
                  self.driver.switch_to.default_content()
                  time.sleep(2)
          except Exception as e:
              print(f"No cookie banner found or error handling it: {e}")
              # Switch back to default content just in case
              self.driver.switch_to.default_content()

          # Keep clicking "View More" button until it's no longer available
          attempts = 0
          max_attempts = 10  # Maximum number of times to click "View More"
          last_article_count = 0
          
          while attempts < max_attempts:
              try:
                  # Find the "View More" button
                  view_more_button = self.driver.find_element(
                      By.XPATH, 
                      "//span[contains(@class, 'call-to-action__button')]"
                  )

                  if not view_more_button.is_displayed():
                      print("No more 'View More' button found")
                      break

                  print(f"Clicking 'View More' button (attempt {attempts + 1})...")
                  
                  # Scroll the button into view
                  self.driver.execute_script("arguments[0].scrollIntoView(true);", view_more_button)
                  time.sleep(1)
                  
                  # Click using JavaScript
                  self.driver.execute_script("arguments[0].click();", view_more_button)
                  time.sleep(3)  # Wait for new content to load
                  
                  # Update count of loaded articles
                  current_articles = len(self.driver.find_elements(By.TAG_NAME, "article"))
                  print(f"Currently loaded articles: {current_articles}")
                  
                  # Check if we're still loading new articles
                  if current_articles == last_article_count:
                      print("No new articles loaded, breaking...")
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
      
    def extract_article(self, url):
        """Extract content from a single article."""
        try:
            self.driver.get(url)
            time.sleep(3)
            soup = BeautifulSoup(self.driver.page_source, "html.parser")

            # Extract title
            title = soup.find("h1", class_=["article-header-title", "hero-content-title"])
            title_text = title.get_text(strip=True) if title else "Title not found"

            # Extract date
            date = soup.find(["time", "span"], class_="date")
            date_text = date.get_text(strip=True) if date else "Date not found"

            # Extract content
            content = soup.find("div", class_=["rtf", "article-body"])
            content_text = "\n\n".join([p.get_text(strip=True) for p in content.find_all("p")]) if content else ""

            if not content_text:
                return None

            return {
                "title": title_text,
                "date": date_text,
                "content": content_text,
                "keywords": ", ".join([f"{k}({v})" for k, v in extract_keywords(content_text)]),
                "url": url
            }

        except Exception as e:
            print(f"Error extracting article: {e}")
            return None

    def scrape_articles(self, base_url):
        """Main function to scrape all articles."""
        try:
            articles = []
            urls = self.get_article_urls(base_url)

            for i, url in enumerate(urls, 1):
                print(f"\nProcessing article {i}/{len(urls)}")
                if article_data := self.extract_article(url):
                    articles.append(article_data)
                    print(f"Successfully extracted: {article_data['title']}")

                if i % 5 == 0:  # Save progress every 5 articles
                    pd.DataFrame(articles).to_csv("bcg_articles_progress.csv", index=False)

            # Save final results
            pd.DataFrame(articles).to_csv("bcg_articles_final.csv", index=False)
            return articles

        except Exception as e:
            print(f"Error in scrape_articles: {e}")
            return []

        finally:
            self.close_driver()
from src.article_scraper import ArticleScraper

def main():
    db_config = {
        "dbname": "techpulse",
        "user": "admin",
        "password": "admin",
        "host": "localhost",
        "port": 5432
    }
    
    base_urls = [
        "https://www.bcg.com/publications",
        "https://www.bcg.com/publications/latest",
        "https://www.bcg.com/publications?sort=date",
        "https://www.bcg.com/publications?fi2=00000177-2b73-deac-ad7f-3bf7870b0000"
    ]
    
    scraper = ArticleScraper(db_config=db_config)  # Pass db_config here
    articles = scraper.scrape_articles(base_urls[0])  # Use the first URL as an example
    print(f"\nExtracted all articles successfully!")

if __name__ == "__main__":
    main()

from src.article_scraper import ArticleScraper

def main():
    base_urls = [
    "https://www.bcg.com/publications",
    "https://www.bcg.com/publications/latest",
    "https://www.bcg.com/publications?sort=date",
    "https://www.bcg.com/publications?fi2=00000177-2b73-deac-ad7f-3bf7870b0000"
]
    scraper = ArticleScraper()
    articles = scraper.scrape_articles(
        "https://www.bcg.com/publications?fi2=00000177-2b73-deac-ad7f-3bf7870b0000"
    )
    print(f"\nExtracted {len(articles)} articles successfully!")

if __name__ == "__main__":
    main()
"""
BCG Scraper Package
This package provides functionality to scrape articles and reports from BCG's website.
"""

from .scraper import BaseScraper
from .article_scraper import ArticleScraper
from .utils import extract_keywords

__version__ = '1.0.0'
__project__ = 'TechPulse'

__all__ = [
    'BaseScraper',
    'ArticleScraper',
    'extract_keywords',
]

# Package metadata
PACKAGE_INFO = {
    'name': 'bcg_scraper',
    'version': __version__,
    'project': __project__,
    'description': 'A web scraper for BCG publications',
    'url': 'https://github.com/yourusername/bcg_scraper',
}
ARXIV_BASE_URL = "https://arxiv.org/search/?query="
ARXIV_ABS_URL = "https://arxiv.org/abs/"

ARXIV_FIELDS = {
    "quantum+computing",
    "generative+artificial+intelligence",
    "applied+artificial+intelligence",
    "cloud+and+edge+computings",
}

import requests
from bs4 import BeautifulSoup
import pandas as pd


def generate_arxiv_pages(fields):
    pages = {}

    for field in fields:
        # Generating URLs based on the field name
        category_pages = []
        page = f"{ARXIV_BASE_URL}{field}&searchtype=title&abstracts=show&order=-submitted_date&size=200"
        category_pages.append(page)
        pages[field] = category_pages

    return pages


arxiv_pages = generate_arxiv_pages(ARXIV_FIELDS)


def extract_ids(html_content):
    # Parse HTML content with BeautifulSoup
    soup = BeautifulSoup(html_content, "html.parser")

    # Find all li tags containing arXiv results
    li_tags = soup.find_all("li", class_="arxiv-result")

    # List to store extracted IDs
    extracted_ids = []

    # Iterate through li tags
    for li_tag in li_tags:
        # Find the first <a> tag within the <p> tag
        a_tag = li_tag.find("a", href=True)

        # Check if the <a> tag exists and its href contains '/abs/'
        if a_tag and "/abs/" in a_tag["href"]:
            # Extract the arXiv ID from the href
            id_value = a_tag["href"].split("/")[-1]
            extracted_ids.append(id_value)

    return extracted_ids


            # Extract Ids
            return extract_ids(response.content)

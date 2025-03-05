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

def scrape_articles_ids(page_url):
    try:
        # Send an HTTP GET request to the URL
        response = requests.get(page_url)

        # Check if the request was successful (status code 200)
        if response.status_code == 200:
            # Extract Ids
            return extract_ids(response.content)
        else:
            print(
                f"Failed to retrieve HTML content. Status code: {response.status_code}"
            )
            return None

    except Exception as e:
        print(f"An error occurred: {e}")
        return None


def get_articles_ids(pages_urls):
    articles_ids = {}
    for category, pages_urls in arxiv_pages.items():

        ids = []
        for page_url in pages_urls:
            ids += scrape_articles_ids(page_url)

        articles_ids[category] = ids
        print(f"{len(ids)} IDs for {category}")

    return articles_ids


articles_ids = get_articles_ids(arxiv_pages)


def extract_summary(html_content):
    # Parse HTML content with BeautifulSoup
    soup = BeautifulSoup(html_content, "html.parser")

    # Find all blockquote tags containing blockquote tags
    blockquote = soup.find_all("blockquote")

    content_without_span = "".join(
        blockquote[0].find_all(string=True, recursive=False)
    ).strip()

    return content_without_span


def scrape_article(id):
    article_url = ARXIV_ABS_URL + id
    try:
        # Send an HTTP GET request to the URL
        response = requests.get(article_url)

        # Check if the request was successful (status code 200)
        if response.status_code == 200:
            # Extract Ids
            return extract_summary(response.content)
        else:
            print(
                f"Failed to retrieve HTML content. Status code: {response.status_code}"
            )
            return None

    except Exception as e:
        print(f"An error occurred: {e}")
        return None

def create_dfs(articles_ids):

    list_dfs = []
    for category, ids in articles_ids.items():

        df_dicts_list = []
        for id in ids:

            content = scrape_article(id)
            df_dicts_list.append({"id": id, "content": content})
        category_df = pd.DataFrame(df_dicts_list)
        list_dfs.append(category_df)
        print(f"done for {category} category with shape: {category_df.shape}")

    return list_dfs

list_articles_dfs = create_dfs(articles_ids)

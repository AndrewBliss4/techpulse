import arxiv
import json

ARXIV_FIELDS = [
    "quantum computing",
    "generative artificial intelligence",
    "applied artificial intelligence",
    "cloud and edge computing"
]

articles = []

for field in ARXIV_FIELDS:
    search = arxiv.Search(
        query=field,
        max_results=50,
        sort_by=arxiv.SortCriterion.SubmittedDate
    )
    
    for result in search.results():
        articles.append({
            "id": result.entry_id.split("/")[-1],
            "title": result.title,
            #"summary": result.summary,
            "authors": [author.name for author in result.authors],  # Keep authors as a list
            "published": result.published.isoformat(),  # Convert datetime to string
            "field": field
        })

# Save as JSON file
with open("arxiv_papers.json", "w", encoding="utf-8") as f:
    json.dump(articles, f, indent=4, ensure_ascii=False)

print("Dataset saved as arxiv_papers.json")

import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.tag import pos_tag
from collections import Counter

# Download NLTK data
nltk.download("punkt")
nltk.download("punkt_tab")
nltk.download("averaged_perceptron_tagger")
nltk.download("averaged_perceptron_tagger_eng")
nltk.download("stopwords")

def extract_keywords(text, num_keywords=15):
    """Extract and return keywords from text."""
    try:
        tokens = word_tokenize(text.lower())
        stop_words = set(stopwords.words("english"))
        tokens = [token for token in tokens if token.isalnum() and len(token) > 2 and token not in stop_words]
        keywords = [word for word, pos in pos_tag(tokens) if pos in ["NN", "NNS", "NNP", "NNPS", "JJ"]]
        return [(word, freq) for word, freq in Counter(keywords).most_common(num_keywords) if freq > 1]
    except Exception as e:
        print(f"Error extracting keywords: {e}")
        return []
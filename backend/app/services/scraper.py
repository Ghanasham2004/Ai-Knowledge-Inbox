import httpx
from bs4 import BeautifulSoup
import trafilatura
from typing import Tuple, Optional
from app.core.logger import logger
from app.core.exceptions import ScraperException


BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


async def fetch_and_clean_url(url: str, timeout_seconds: float = 12.0) -> Tuple[str, str, str]:
    """
    Fetches remote web content, strips boilerplates/ads/scripts,
    and returns (title, cleaned_text, raw_html).
    """
    logger.info(f"Fetching URL: {url}")
    try:
        async with httpx.AsyncClient(
            headers=BROWSER_HEADERS,
            timeout=timeout_seconds,
            follow_redirects=True,
        ) as client:
            response = await client.get(url)
            if response.status_code == 403:
                raise ScraperException("Target website returned HTTP 403 Forbidden (Anti-bot / Cloudflare protection). Please copy and paste its text into the 'Paste Note' tab.")
            elif response.status_code >= 400:
                raise ScraperException(f"Target URL returned HTTP status {response.status_code}")
            raw_html = response.text
    except httpx.TimeoutException:
        logger.error(f"Timeout while fetching URL: {url}")
        raise ScraperException("Request timed out while connecting to the target website.")
    except httpx.RequestError as exc:
        logger.error(f"Network error fetching URL {url}: {exc}")
        raise ScraperException(f"Network error attempting to reach URL: {str(exc)}")

    # 1. Extract title using BeautifulSoup
    soup = BeautifulSoup(raw_html, "html.parser")
    title = ""
    # Try OpenGraph title first
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = og_title["content"].strip()
    elif soup.title and soup.title.string:
        title = soup.title.string.strip()
    
    if not title:
        title = url.split("//")[-1].split("?")[0]  # Fallback to domain/path

    # Extract metadata descriptions for fallback or enrichment
    meta_descriptions = []
    for prop in ["og:description", "twitter:description"]:
        meta_tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
        if meta_tag and meta_tag.get("content"):
            content = meta_tag["content"].strip()
            if content and content not in meta_descriptions:
                meta_descriptions.append(content)
    
    std_desc = soup.find("meta", attrs={"name": "description"})
    if std_desc and std_desc.get("content"):
        content = std_desc["content"].strip()
        if content and content not in meta_descriptions:
            meta_descriptions.append(content)

    # 2. Extract article text using trafilatura (state-of-the-art boilerplate removal)
    cleaned_text = trafilatura.extract(
        raw_html,
        include_comments=False,
        include_tables=True,
        no_fallback=False,
    )

    # 3. Fallback to BeautifulSoup tag stripping if trafilatura yields minimal text
    if not cleaned_text or len(cleaned_text.strip()) < 80:
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "svg", "noscript", "form"]):
            tag.decompose()
        
        # Get text from body
        body = soup.body if soup.body else soup
        lines = (line.strip() for line in body.get_text().splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        body_text = "\n".join(chunk for chunk in chunks if chunk)

        if len(body_text.strip()) >= 50:
            cleaned_text = body_text
        elif meta_descriptions:
            # If body has no text (e.g. client-rendered SPA), use meta description if available
            cleaned_text = f"{title}\n\n" + "\n\n".join(meta_descriptions)
            if body_text.strip():
                cleaned_text += f"\n\n{body_text}"

    if not cleaned_text or len(cleaned_text.strip()) < 25:
        # Check if this is likely a client-side JavaScript Single Page Application
        scripts = soup.find_all("script")
        if len(scripts) > 0 and len(raw_html) > 1000:
            raise ScraperException(
                "Could not extract article text because this webpage renders content dynamically via client-side JavaScript (SPA). Please switch to the 'Paste Note' tab and paste its content directly."
            )
        raise ScraperException("Could not extract meaningful readable text from this webpage.")

    logger.info(f"Successfully extracted {len(cleaned_text)} characters for '{title}'")
    return title, cleaned_text.strip(), raw_html

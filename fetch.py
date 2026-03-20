import json, re, html, datetime
import urllib.request

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))



tickers = ['005930', '009150', '034020', '035420']
stocks = {}
for t in tickers:
    try:
        stocks[t] = fetch_json(f"https://m.stock.naver.com/api/stock/{t}/basic")
    except Exception as e:
        stocks[t] = {}

def fetch_rss_url(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as r:
        content = r.read().decode('utf-8')
    items = re.findall(r'<item>(.*?)</item>', content, re.DOTALL)
    result = []
    for item in items[:5]:
        title = re.search(r'<title><!\[CDATA\[(.*?)\]\]></title>|<title>(.*?)</title>', item)
        link = re.search(r'<link>(.*?)</link>', item)
        desc = re.search(r'<description><!\[CDATA\[(.*?)\]\]></description>|<description>(.*?)</description>', item)
        pubdate = re.search(r'<pubDate>(.*?)</pubDate>', item)
        if title:
            t = html.unescape(re.sub(r'<[^>]+>', '', title.group(1) or title.group(2) or '')).strip()
            l = link.group(1).strip() if link else ''
            raw_desc = desc.group(1) or desc.group(2) if desc else ''
            d = html.unescape(re.sub(r'<[^>]+>', '', raw_desc)).strip()[:120]
            p = pubdate.group(1).strip() if pubdate else ''
            if t:
                result.append({'title': t, 'link': l, 'desc': d, 'pubDate': p})
    return result

news = {}
rss_urls = {
    'eco':   'https://feeds.feedburner.com/yonhap-news-economy',
    'world': 'https://feeds.feedburner.com/yonhap-news-world',
    'tech':  'https://feeds.feedburner.com/yonhap-news-it',
    'local': 'https://feeds.feedburner.com/yonhap-news-society',
}
for key, url in rss_urls.items():
    try:
        news[key] = fetch_rss_url(url)
    except Exception as e:
        print(f"RSS error [{key}]: {e}")
        news[key] = []

data = {
    'stocks': stocks,
    'news': news,
    'updated': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
}

with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done!")

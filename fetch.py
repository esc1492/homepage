import json, re, html, datetime
import urllib.request

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode('utf-8'))

def fetch_rss(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as r:
        raw = r.read()
        try:
            content = raw.decode('utf-8')
        except:
            content = raw.decode('euc-kr', errors='replace')
    items = re.findall(r'<item>(.*?)</item>', content, re.DOTALL)
    result = []
    for item in items[:5]:
        title = re.search(r'<title><!\[CDATA\[(.*?)\]\]></title>|<title>(.*?)</title>', item, re.DOTALL)
        link  = re.search(r'<link>(.*?)</link>', item, re.DOTALL)
        desc  = re.search(r'<description><!\[CDATA\[(.*?)\]\]></description>|<description>(.*?)</description>', item, re.DOTALL)
        pubdate = re.search(r'<pubDate>(.*?)</pubDate>', item, re.DOTALL)
        if title:
            t = html.unescape(re.sub(r'<[^>]+>', '', title.group(1) or title.group(2) or '')).strip()
            l = (link.group(1) or '').strip() if link else ''
            raw_d = desc.group(1) or desc.group(2) if desc else ''
            d = html.unescape(re.sub(r'<[^>]+>', '', raw_d)).strip()[:120]
            p = (pubdate.group(1) or '').strip() if pubdate else ''
            if t:
                result.append({'title': t, 'link': l, 'desc': d, 'pubDate': p})
    return result

# 주식 데이터
tickers = ['005930', '009150', '034020', '035420']
stocks = {}
for t in tickers:
    try:
        stocks[t] = fetch_json(f"https://m.stock.naver.com/api/stock/{t}/basic")
        print(f"Stock OK [{t}]")
    except Exception as e:
        print(f"Stock error [{t}]: {e}")
        stocks[t] = {}

# 뉴스 RSS - 한국경제 + SBS
rss_urls = {
    'eco':   'https://www.hankyung.com/feed/economy',
    'world': 'https://www.hankyung.com/feed/international',
    'tech':  'https://www.hankyung.com/feed/it',
    'local': 'https://www.hankyung.com/feed/society',
}
news = {}
for key, url in rss_urls.items():
    try:
        news[key] = fetch_rss(url)
        print(f"RSS OK [{key}]: {len(news[key])} items")
    except Exception as e:
        print(f"RSS error [{key}]: {e}")
        news[key] = []

data = {
    'stocks': stocks,
    'news': news,
    'updated': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
}

with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done!")

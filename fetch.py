import json, re, html, datetime
import urllib.request

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))

def fetch_rss(oid):
    url = f"https://news.naver.com/main/rss/index.naver?oid={oid}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as r:
        content = r.read().decode('utf-8')
    items = re.findall(r'<item>(.*?)</item>', content, re.DOTALL)
    result = []
    for item in items[:5]:
        title = re.search(r'<title>(.*?)</title>', item)
        link = re.search(r'<link>(.*?)</link>', item)
        desc = re.search(r'<description>(.*?)</description>', item)
        pubdate = re.search(r'<pubDate>(.*?)</pubDate>', item)
        if title:
            t = html.unescape(re.sub(r'<[^>]+>', '', title.group(1))).strip()
            l = link.group(1).strip() if link else ''
            d = html.unescape(re.sub(r'<[^>]+>', '', desc.group(1))).strip()[:120] if desc else ''
            p = pubdate.group(1).strip() if pubdate else ''
            result.append({'title': t, 'link': l, 'desc': d, 'pubDate': p})
    return result

tickers = ['005930', '009150', '034020', '035420']
stocks = {}
for t in tickers:
    try:
        stocks[t] = fetch_json(f"https://m.stock.naver.com/api/stock/{t}/basic")
    except Exception as e:
        stocks[t] = {}

news = {}
rss_map = {'eco': '101', 'world': '104', 'tech': '105', 'local': '102'}
for key, oid in rss_map.items():
    try:
        news[key] = fetch_rss(oid)
    except Exception as e:
        news[key] = []

data = {
    'stocks': stocks,
    'news': news,
    'updated': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
}

with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done!")

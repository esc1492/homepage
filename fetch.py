import json, re, html, datetime, time
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
        title   = re.search(r'<title><!\[CDATA\[(.*?)\]\]></title>|<title>(.*?)</title>', item, re.DOTALL)
        link    = re.search(r'<link><!\[CDATA\[(.*?)\]\]></link>|<link>(.*?)</link>', item, re.DOTALL)
        desc    = re.search(r'<description><!\[CDATA\[(.*?)\]\]></description>|<description>(.*?)</description>', item, re.DOTALL)
        pubdate = re.search(r'<pubDate>(.*?)</pubDate>', item, re.DOTALL)
        if title:
            t = html.unescape(re.sub(r'<[^>]+>', '', title.group(1) or title.group(2) or '')).strip()
            l = html.unescape((link.group(1) or link.group(2) or '').strip()) if link else ''
            raw_d = desc.group(1) or desc.group(2) if desc else ''
            d = html.unescape(re.sub(r'<[^>]+>', '', raw_d)).strip()[:120]
            p = (pubdate.group(1) or '').strip() if pubdate else ''
            if t:
                result.append({'title': t, 'link': l, 'desc': d, 'pubDate': p})
    return result

def fetch_stock_name_map(sosok, max_pages=15):
    """Scrape Naver finance market summary to build name→ticker mapping."""
    name_map = {}
    for page in range(1, max_pages + 1):
        try:
            url = f'https://finance.naver.com/sise/sise_market_sum.naver?sosok={sosok}&page={page}'
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=8) as r:
                raw = r.read()
            html_content = raw.decode('euc-kr', errors='replace')
            codes = re.findall(r'/item/main\.naver\?code=([0-9]+)', html_content)
            titles = re.findall(r'class="tltle">([^<]+)', html_content)
            for c, t in zip(codes, titles):
                name_map[t] = c
        except Exception as e:
            print(f"  Name map error page {page}: {e}")
            break
        time.sleep(0.3)
    return name_map

def build_stock_name_map():
    """Build a comprehensive stock name→ticker mapping for KOSPI + KOSDAQ."""
    print("Fetching stock name map (KOSPI)...")
    name_map = fetch_stock_name_map(0, 30)
    print(f"  {len(name_map)} KOSPI stocks")
    print("Fetching stock name map (KOSDAQ)...")
    name_map2 = fetch_stock_name_map(1, 30)
    name_map.update(name_map2)
    print(f"  {len(name_map2)} KOSDAQ stocks")
    print(f"Total: {len(name_map)} stocks in name map")
    return name_map

stock_name_map = {}
try:
    stock_name_map = build_stock_name_map()
except Exception as e:
    print(f"Stock name map error: {e}")

# 주식 데이터
tickers = ['005930', '034020', '035420', '018260', '000660', '064350']
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
    'stockNameMap': stock_name_map,
    'news': news,
    'updated': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
}

with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done!")

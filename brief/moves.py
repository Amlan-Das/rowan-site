import yfinance as yf

WATCHLIST = {
    "S&P 500": "^GSPC",
    "Nasdaq": "^IXIC",
    "10-Year Yield": "^TNX",
    "USD/JPY": "JPY=X",
    "Crude Oil": "CL=F",
    "Gold": "GC=F",
}


def get_moves():
    moves = {}
    for name, ticker in WATCHLIST.items():
        try:
            # 5d instead of 2d so a holiday or a partial session doesn't leave us short
            hist = yf.Ticker(ticker).history(period="5d")
        except Exception as e:
            print(f"Couldn't fetch {name} ({ticker}): {e}")
            continue
        if len(hist) < 2:
            continue
        prev_close = hist["Close"].iloc[-2]
        last = hist["Close"].iloc[-1]
        pct = (last - prev_close) / prev_close * 100
        moves[name] = {
            "last": round(float(last), 2),
            "change": round(float(last - prev_close), 2),
            "pct": round(float(pct), 2),
        }
    return moves


if __name__ == "__main__":
    for name, m in get_moves().items():
        sign = "+" if m["pct"] >= 0 else ""
        print(f"{name:16} {m['last']:>10}  {sign}{m['pct']}%")

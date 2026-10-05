"""The Auction House: Secret bidding on real fine art and bizarre historical oddities."""
import random
from typing import Dict, Any, Optional
from app.party.games.base import BasePartyGame
from app.party.protocol import PlayerInfo


AUCTION_ITEMS = [
    {
        "title": "Salvator Mundi by Leonardo da Vinci",
        "category": "Masterpiece Art",
        "description": "Lost portrait of Christ holding a crystal orb, discovered after centuries of obscurity and restored before a Christie's record showdown.",
        "hammer_price": 450300000,
        "fact": "Sold in 2017 for $450.3 Million, remaining the most expensive painting ever sold at public auction.",
        "icon": "🖼️"
    },
    {
        "title": "'Stan' the Tyrannosaurus Rex Skeleton",
        "category": "Prehistoric Artifact",
        "description": "One of the most complete and intact T-Rex fossil specimens ever excavated, containing 188 fossilized bones.",
        "hammer_price": 31800000,
        "fact": "Hammered down at Christie's in 2020 for $31.8 Million after an intense 20-minute bidding war.",
        "icon": "🦖"
    },
    {
        "title": "Action Comics #1 (CGC 8.5)",
        "category": "Pop Culture Relic",
        "description": "The landmark 1938 comic book featuring the very first appearance of Superman by Jerry Siegel and Joe Shuster.",
        "hammer_price": 6000000,
        "fact": "Sold in 2024 for an eye-watering $6.0 Million, becoming the most valuable comic book in human history.",
        "icon": "🦸"
    },
    {
        "title": "1963 Ferrari 250 GTO (Chassis 4153GT)",
        "category": "Automotive Legend",
        "description": "Iconic silver-and-yellow Tour de France winning supercar, one of only 36 ever manufactured in Maranello.",
        "hammer_price": 70000000,
        "fact": "Sold in private auction for approximately $70 Million to WeatherTech founder David MacNeil.",
        "icon": "🏎️"
    },
    {
        "title": "Sealed 4GB First-Generation iPhone (2007)",
        "category": "Tech Artifact",
        "description": "Factory-sealed in original plastic shrink-wrap, the ultra-rare 4GB launch edition discontinued after just two months.",
        "hammer_price": 190372,
        "fact": "Hammered at LCG Auctions for $190,372 in 2023, nearly 400x its original retail price of $499.",
        "icon": "📱"
    },
    {
        "title": "40-Year-Old Slice of Queen Elizabeth's Wedding Cake",
        "category": "Royal Oddity",
        "description": "A fruitcake slice preserved in original presentation box from the 1947 royal marriage at Westminster Abbey.",
        "hammer_price": 2800,
        "fact": "Auctioned off in Colchester for $2,800, complete with an official royal seal and warning: non-edible!",
        "icon": "🍰"
    },
    {
        "title": "A 64-Gallon Jug of McDonald's Mulan Szechuan Sauce",
        "category": "Internet Legend",
        "description": "Original 1998 promotional sauce vat saved by a car enthusiast, auctioned during the Rick and Morty viral craze.",
        "hammer_price": 15350,
        "fact": "Sold on eBay for $15,350 to music producer Deadmau5.",
        "icon": "🥫"
    },
    {
        "title": "Kurt Cobain's MTV Unplugged Acoustic Guitar",
        "category": "Music History",
        "description": "The 1959 Martin D-18E played during Nirvana's historic 1993 MTV Unplugged in New York performance.",
        "hammer_price": 6010000,
        "fact": "Sold in 2020 for $6.01 Million to RØDE Microphones founder Peter Freedman.",
        "icon": "🎸"
    },
    {
        "title": "The Codex Leicester by Leonardo da Vinci",
        "category": "Scientific Manuscript",
        "description": "A 72-page handwritten journal filled with Da Vinci's pioneering scientific musings, mirror-written in Italian.",
        "hammer_price": 30800000,
        "fact": "Purchased by Bill Gates at Christie's in 1994 for $30.8 Million.",
        "icon": "📜"
    },
    {
        "title": "Michael Jordan's 1998 NBA Finals Game 2 Jersey",
        "category": "Sports Memorabilia",
        "description": "The red Chicago Bulls away jersey worn during Game 2 of Jordan's legendary 'Last Dance' finals series.",
        "hammer_price": 10100000,
        "fact": "Hammered at Sotheby's in 2022 for $10.1 Million, setting an all-time record for sports apparel.",
        "icon": "🏀"
    },
    {
        "title": "The Pink Star Diamond (59.60 Carats)",
        "category": "Priceless Jewel",
        "description": "An internally flawless, fancy vivid pink oval-cut diamond mined in 1999 by De Beers in South Africa.",
        "hammer_price": 71200000,
        "fact": "Sold at Sotheby's Hong Kong in 2017 for $71.2 Million to Chow Tai Fook Enterprises.",
        "icon": "💎"
    },
    {
        "title": "First Ever Tweet by Jack Dorsey (NFT)",
        "category": "Digital Oddity",
        "description": "The historic first tweet reading 'just setting up my twttr' minted as a cryptographic token.",
        "hammer_price": 2900000,
        "fact": "Sold in March 2021 for $2.9 Million to crypto investor Sina Estavi (subsequent resales dropped below $1,000).",
        "icon": "🐦"
    },
    {
        "title": "Darth Vader's Screen-Used Empire Strikes Back Helmet",
        "category": "Cinema Relic",
        "description": "The iconic two-piece black mask and helmet worn by actor David Prowse in Episode V.",
        "hammer_price": 1125000,
        "fact": "Auctioned in Los Angeles in 2019 for $1.125 Million to a private sci-fi memorabilia collector.",
        "icon": "⚔️"
    },
    {
        "title": "Honus Wagner T206 Baseball Card (PSA 2)",
        "category": "Trading Card",
        "description": "The Holy Grail of sports collectibles, pulled from American Tobacco packs in 1909 before distribution was halted.",
        "hammer_price": 7250000,
        "fact": "Sold in a private Goldin Auctions deal in 2022 for a record $7.25 Million.",
        "icon": "⚾"
    },
    {
        "title": "1856 British Guiana 1-Cent Magenta Postage Stamp",
        "category": "Philately",
        "description": "The sole surviving specimen of an emergency colonial issue stamp, weighing just 0.04 grams.",
        "hammer_price": 8307000,
        "fact": "Acquired by shoe designer Stuart Weitzman for $9.48 Million in 2014, then resold in 2021 for $8.3 Million.",
        "icon": "📬"
    },
    {
        "title": "Neil Armstrong's Apollo 11 Lunar Sample Bag",
        "category": "Space Exploration",
        "description": "White collection pouch labeled 'LUNAR SAMPLE RETURN' with authentic moon dust embedded in the fabric seams.",
        "hammer_price": 1812500,
        "fact": "Sold at Sotheby's in 2017 for $1.81 Million after a protracted legal battle with NASA.",
        "icon": "🌕"
    },
    {
        "title": "Original 1968 Prototype Apple-1 Computer (Steve Jobs)",
        "category": "Tech History",
        "description": "Hand-soldered by Steve Wozniak on a 'Celebration' PCB, used by Steve Jobs to demonstrate to The Byte Shop.",
        "hammer_price": 677196,
        "fact": "Sold at RR Auction in Boston in 2022 for $677,196.",
        "icon": "💻"
    },
    {
        "title": "Napoleon Bonaparte's Bicorne Hat from Waterloo",
        "category": "Historical Relic",
        "description": "Black beaver felt hat adorned with Napoleon's signature cockade, worn during the 1815 Belgian campaign.",
        "hammer_price": 2100000,
        "fact": "Hammered at Drouot auction house in Paris in 2023 for 1.93 Million Euros ($2.1 Million).",
        "icon": "🎩"
    },
    {
        "title": "A Gold Pocket Watch from the RMS Titanic",
        "category": "Maritime Tragedy",
        "description": "Tiffany & Co. 18-carat gold watch gifted to Captain Arthur Rostron of the rescue ship RMS Carpathia.",
        "hammer_price": 1970000,
        "fact": "Sold in Wiltshire in 2024 for 1.56 Million Pounds ($1.97 Million), a Titanic record.",
        "icon": "⏱️"
    },
    {
        "title": "Maurizio Cattelan's 'Comedian' (Banana Duct-Taped to Wall)",
        "category": "Contemporary Art",
        "description": "A fresh banana affixed to a white gallery wall with silver duct tape, accompanied by certificate of authenticity.",
        "hammer_price": 6240000,
        "fact": "Hammered at Sotheby's New York in 2024 for $6.24 Million to cryptocurrency entrepreneur Justin Sun.",
        "icon": "🍌"
    },
]


class AuctionGame(BasePartyGame):
    id = "auction"
    name = "The Auction House"
    tagline = "Bid on priceless art, ancient fossils, and bizarre oddities"
    description = "Inspect the catalog, submit your secret valuation, and win the lot without exceeding the hammer price."
    icon = "🏛️"
    min_players = 2
    max_players = 16

    def __init__(self, room_code: str, players: Dict[str, PlayerInfo], **kwargs):
        super().__init__(room_code, players, **kwargs)
        self.max_rounds = 3
        self.current_item: Dict[str, Any] = {}
        self.player_bids: Dict[str, int] = {}
        self.round_results: Dict[str, Dict[str, Any]] = {}
        self.used_item_indices: list[int] = []
        self.winner: Optional[str] = None

    def start(self) -> None:
        self.round_number = 1
        self.is_over = False
        self.start_round()

    def start_round(self) -> None:
        self.player_bids.clear()
        self.round_results.clear()

        avail = [i for i in range(len(AUCTION_ITEMS)) if i not in self.used_item_indices]
        if not avail:
            self.used_item_indices.clear()
            avail = list(range(len(AUCTION_ITEMS)))

        idx = random.choice(avail)
        self.used_item_indices.append(idx)
        self.current_item = AUCTION_ITEMS[idx]

        self.phase = "CATALOG"
        self.phase_timer = 8.0

    def on_timer_expired(self) -> Optional[str]:
        if self.phase == "CATALOG":
            self.phase = "BIDDING"
            self.phase_timer = 25.0
            return self.phase
        elif self.phase == "BIDDING":
            self.resolve_round()
            self.phase = "HAMMER"
            self.phase_timer = 12.0
            return self.phase
        elif self.phase == "HAMMER":
            if self.round_number >= self.max_rounds:
                self.phase = "GAME_OVER"
                self.is_over = True
                sorted_scores = sorted(self.scores.items(), key=lambda x: x[1], reverse=True)
                if sorted_scores:
                    self.winner = self.players[sorted_scores[0][0]].nickname
                return self.phase
            else:
                self.round_number += 1
                self.start_round()
                return self.phase
        return None

    def resolve_round(self) -> None:
        actual = self.current_item["hammer_price"]

        # Valid bids: <= actual hammer price (Price Is Right rule)
        under_bids = {pid: bid for pid, bid in self.player_bids.items() if bid <= actual and bid > 0}

        best_under_pid = None
        if under_bids:
            best_under_pid = max(under_bids, key=under_bids.get)

        # Fallback: if everyone went over or didn't bid, pick closest absolute bid
        closest_pid = None
        if self.player_bids:
            closest_pid = min(self.player_bids, key=lambda pid: abs(self.player_bids[pid] - actual))

        for pid in self.players:
            bid = self.player_bids.get(pid, 0)
            went_over = bid > actual
            won_lot = (pid == best_under_pid) or (not under_bids and pid == closest_pid)

            # Points calculation
            pts = 0
            if won_lot:
                pts += 800 if not went_over else 400

            # Accuracy bonus if within 25% of actual price
            if bid > 0:
                diff_pct = abs(bid - actual) / actual
                if diff_pct <= 0.10:
                    pts += 400
                elif diff_pct <= 0.25:
                    pts += 200

            self.scores[pid] += pts
            self.round_results[pid] = {
                "bid": bid,
                "won_lot": won_lot,
                "went_over": went_over,
                "points": pts
            }

    def handle_action(self, player_id: str, action: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        data = data or {}
        if self.phase == "BIDDING" and action in ("SUBMIT_BID", "PLACE_BID"):
            raw_bid = data.get("bid", 0)
            try:
                bid = max(0, int(raw_bid))
            except (ValueError, TypeError):
                bid = 0
            self.player_bids[player_id] = bid

            connected_pids = [pid for pid in self.players if self.players[pid].is_connected]
            if len(self.player_bids) >= len(connected_pids):
                self.resolve_round()
                self.phase = "HAMMER"
                self.phase_timer = 12.0
            return {"broadcast": True}
        return {"status": "ignored"}

    def get_host_state(self) -> Dict[str, Any]:
        state = self.get_base_state()
        state.update({
            "item_title": self.current_item.get("title"),
            "item_category": self.current_item.get("category"),
            "item_description": self.current_item.get("description"),
            "item_icon": self.current_item.get("icon"),
            "hammer_price": self.current_item.get("hammer_price") if self.phase in ("HAMMER", "GAME_OVER") else None,
            "fact": self.current_item.get("fact") if self.phase in ("HAMMER", "GAME_OVER") else None,
            "submitted_pids": list(self.player_bids.keys()),
            "round_results": self.round_results if self.phase in ("HAMMER", "GAME_OVER") else {},
            "winner": self.winner,
        })
        return state

    def get_player_state(self, player_id: str) -> Dict[str, Any]:
        state = self.get_base_state()
        state.update({
            "item_title": self.current_item.get("title"),
            "item_category": self.current_item.get("category"),
            "item_description": self.current_item.get("description"),
            "item_icon": self.current_item.get("icon"),
            "hammer_price": self.current_item.get("hammer_price") if self.phase in ("HAMMER", "GAME_OVER") else None,
            "my_bid": self.player_bids.get(player_id),
            "has_bid": player_id in self.player_bids,
            "my_result": self.round_results.get(player_id) if self.phase in ("HAMMER", "GAME_OVER") else None,
            "winner": self.winner,
        })
        return state

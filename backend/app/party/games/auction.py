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
        "fact": "Sold in private auction for approximately $70 Million to weathertech founder David MacNeil.",
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
    }
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

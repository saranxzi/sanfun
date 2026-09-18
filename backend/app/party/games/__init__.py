"""Party Games Registry."""
from typing import Dict, Type, List, Any
from app.party.games.base import BasePartyGame
from app.party.games.mafia import MafiaGame
from app.party.games.imposter import ImposterGame
from app.party.games.witclash import WitClashGame
from app.party.games.trivia import TriviaGame
from app.party.games.doodledash import DoodleDashGame
from app.party.games.mostlikely import MostLikelyGame
from app.party.games.wordbomb import WordBombGame
from app.party.protocol import PlayerInfo

GAME_CLASSES: Dict[str, Type[BasePartyGame]] = {
    MafiaGame.id: MafiaGame,
    ImposterGame.id: ImposterGame,
    WitClashGame.id: WitClashGame,
    TriviaGame.id: TriviaGame,
    DoodleDashGame.id: DoodleDashGame,
    MostLikelyGame.id: MostLikelyGame,
    WordBombGame.id: WordBombGame,
}


def get_available_games() -> List[Dict[str, Any]]:
    return [
        {
            "id": cls.id,
            "name": cls.name,
            "tagline": cls.tagline,
            "description": cls.description,
            "icon": cls.icon,
            "min_players": cls.min_players,
            "max_players": cls.max_players,
        }
        for cls in GAME_CLASSES.values()
    ]


def create_game(game_id: str, room_code: str, players: Dict[str, PlayerInfo], **kwargs) -> BasePartyGame:
    cls = GAME_CLASSES.get(game_id)
    if not cls:
        raise ValueError(f"Unknown game ID: {game_id}")
    import inspect
    sig = inspect.signature(cls.__init__)
    if any(param.kind == inspect.Parameter.VAR_KEYWORD for param in sig.parameters.values()):
        return cls(room_code=room_code, players=players, **kwargs)
    filtered = {k: v for k, v in kwargs.items() if k in sig.parameters}
    return cls(room_code=room_code, players=players, **filtered)

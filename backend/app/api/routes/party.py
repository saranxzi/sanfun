"""Party REST & WebSocket API routes."""
import json
import asyncio
from typing import Optional, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query, status
from pydantic import BaseModel
from app.party.manager import room_manager
from app.party.network import get_network_info
from app.party.games import get_available_games
from app.party.protocol import ServerMessageType, ClientMessageType

router = APIRouter()


class CreateRoomResponse(BaseModel):
    room_code: str
    network_info: Dict[str, Any]
    available_games: list


class RegisterTunnelRequest(BaseModel):
    tunnel_url: str


@router.post("/tunnel")
async def register_tunnel(body: RegisterTunnelRequest):
    from app.party.network import set_tunnel_url
    set_tunnel_url(body.tunnel_url)
    for room in list(room_manager.rooms.values()):
        if room.state == "LOBBY":
            await room.broadcast_room_state()
    return {"status": "ok", "tunnel_url": body.tunnel_url}


@router.get("/host-info")
async def get_host_info():
    return get_network_info()


@router.get("/games")
async def get_games():
    return get_available_games()


@router.post("/create", response_model=CreateRoomResponse)
async def create_party_room():
    room = room_manager.create_room()
    return CreateRoomResponse(
        room_code=room.code,
        network_info=get_network_info(),
        available_games=get_available_games()
    )


@router.get("/room/{code}")
async def inspect_room(code: str):
    room = room_manager.get_room(code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {
        "exists": True,
        "room_code": room.code,
        "state": room.state,
        "player_count": len(room.players),
        "selected_game_id": room.selected_game_id,
    }


@router.websocket("/ws/{code}")
async def party_websocket(
    websocket: WebSocket,
    code: str,
    role: str = Query("player"),
    session_token: Optional[str] = Query(None),
    nickname: Optional[str] = Query(None),
    avatar: Optional[str] = Query(None),
    color: Optional[str] = Query(None)
):
    await websocket.accept()
    room = room_manager.get_room(code)
    if not room:
        await websocket.send_json({"type": "ERROR", "payload": {"message": f"Room {code} not found."}})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    player_id: Optional[str] = None

    if role == "host":
        room.host_socket = websocket
        # Send initial room state
        await room.broadcast_room_state()

    else:  # role == "player"
        # Check if reconnecting via session token
        player = None
        if session_token:
            player = room.reconnect_player(session_token)

        if not player:
            if not nickname:
                nickname = f"Player {len(room.players) + 1}"
            player, session_token = room.add_player(nickname, avatar, color)

        player_id = player.id
        room.player_sockets[player_id] = websocket

        # Send welcome payload with assigned session token & player info
        await websocket.send_json({
            "type": ServerMessageType.PLAYER_STATE.value,
            "payload": {
                "player_id": player.id,
                "session_token": session_token,
                "nickname": player.nickname,
                "avatar": player.avatar,
                "color": player.color,
                "room_code": room.code,
                "state": room.state
            }
        })

        if room.state == "LOBBY":
            await room.broadcast_room_state()
        else:
            await room.broadcast_game_state()

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == ClientMessageType.PING.value:
                await websocket.send_json({"type": ServerMessageType.PONG.value, "payload": {}})
                continue

            if role == "host":
                if msg_type == ClientMessageType.SELECT_GAME.value:
                    game_id = data.get("game_id")
                    if game_id:
                        room.selected_game_id = game_id
                        await room.broadcast_room_state()

                elif msg_type == ClientMessageType.START_GAME.value:
                    success = await room.start_game()
                    if not success:
                        await websocket.send_json({
                            "type": ServerMessageType.ERROR.value,
                            "payload": {"message": "Not enough players to start this game."}
                        })

                elif msg_type == ClientMessageType.BACK_TO_LOBBY.value:
                    await room.back_to_lobby()

                elif msg_type == ClientMessageType.KICK_PLAYER.value:
                    target_pid = data.get("target_player_id")
                    if target_pid:
                        room.kick_player(target_pid)
                        await room.broadcast_room_state()

            elif role == "player" and player_id:
                if msg_type == ClientMessageType.GAME_ACTION.value:
                    if room.state == "IN_GAME" and room.game_instance:
                        action = data.get("action")
                        action_data = data.get("data", {})
                        res = room.game_instance.handle_action(player_id, action, action_data)
                        
                        if res.get("broadcast"):
                            await room.broadcast_game_state()
                        
                        if "event" in res:
                            await room.broadcast_event(res["event"], res)

    except WebSocketDisconnect:
        if role == "host":
            room.host_socket = None
        elif role == "player" and player_id:
            room.disconnect_player(player_id)
            if room.state == "LOBBY":
                await room.broadcast_room_state()
            elif room.state == "IN_GAME":
                await room.broadcast_game_state()
    except Exception as e:
        if role == "host":
            room.host_socket = None
        elif role == "player" and player_id:
            room.disconnect_player(player_id)

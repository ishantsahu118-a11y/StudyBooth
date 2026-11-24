"""
WebSocket URL routing for StudyLimitless real-time features.
"""
from django.urls import re_path

from base.consumers import RoomChatConsumer, RoomPresenceConsumer, RoomTimerConsumer

websocket_urlpatterns = [
    # Room chat WebSocket
    re_path(r'ws/room/(?P<room_id>\d+)/chat/$', RoomChatConsumer.as_asgi()),

    # Room presence WebSocket (who's online, status)
    re_path(r'ws/room/(?P<room_id>\d+)/presence/$', RoomPresenceConsumer.as_asgi()),

    # Room Pomodoro timer WebSocket (synced timer)
    re_path(r'ws/room/(?P<room_id>\d+)/timer/$', RoomTimerConsumer.as_asgi()),
]
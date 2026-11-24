"""
WebSocket consumers for StudyLimitless real-time features.

Consumers:
- RoomChatConsumer: Real-time chat with message history, silent mode
- RoomPresenceConsumer: Live presence (who's in room, status: focusing/break/away)
- RoomTimerConsumer: Synced Pomodoro timer (server-authoritative)
"""
import json
import asyncio
from datetime import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class RoomChatConsumer(AsyncWebsocketConsumer):
    """
    Real-time chat consumer for study rooms.
    Features: message history, silent mode (host toggle), typing indicators
    """
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'room_chat_{self.room_id}'
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close()
            return

        # Check if user is participant in room
        is_participant = await self.check_participant()
        if not is_participant:
            await self.close()
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Send recent message history (last 50)
        messages = await self.get_recent_messages()
        await self.send(text_data=json.dumps({
            'type': 'history',
            'messages': messages
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type')

        if msg_type == 'message':
            await self.handle_message(data)
        elif msg_type == 'typing':
            await self.handle_typing(data)
        elif msg_type == 'silent_mode':
            await self.handle_silent_mode(data)

    async def handle_message(self, data):
        """Handle new chat message"""
        content = data.get('content', '').strip()
        if not content:
            return

        # Check silent mode
        silent = await self.get_silent_mode()
        if silent and not await self.is_host_or_mod():
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Chat is in silent mode (focus time)'
            }))
            return

        # Save message
        message = await self.save_message(content)

        # Broadcast to room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': {
                    'id': message['id'],
                    'user_id': message['user_id'],
                    'username': message['username'],
                    'content': message['content'],
                    'created_at': message['created_at'],
                    'is_own': message['user_id'] == self.user.id
                }
            }
        )

    async def handle_typing(self, data):
        """Broadcast typing indicator"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user_id': self.user.id,
                'username': self.user.username,
                'is_typing': data.get('is_typing', False)
            }
        )

    async def handle_silent_mode(self, data):
        """Toggle silent mode (host/moderator only)"""
        if not await self.is_host_or_mod():
            return

        enabled = data.get('enabled', False)
        await self.set_silent_mode(enabled)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'silent_mode_changed',
                'enabled': enabled,
                'by_user': self.user.username
            }
        )

    # Event handlers
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message']
        }))

    async def typing_indicator(self, event):
        # Don't send back to sender
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing']
            }))

    async def silent_mode_changed(self, event):
        await self.send(text_data=json.dumps({
            'type': 'silent_mode',
            'enabled': event['enabled'],
            'by_user': event['by_user']
        }))

    # Database methods
    @database_sync_to_async
    def check_participant(self):
        from base.models import RoomParticipant
        return RoomParticipant.objects.filter(
            room_id=self.room_id,
            user=self.user,
            is_active=True
        ).exists()

    @database_sync_to_async
    def get_recent_messages(self):
        from base.models import RoomChatMessage
        messages = RoomChatMessage.objects.filter(
            room_id=self.room_id
        ).select_related('user').order_by('-created_at')[:50]
        return [
            {
                'id': m.id,
                'user_id': m.user_id,
                'username': m.user.username,
                'content': m.content,
                'created_at': m.created_at.isoformat(),
                'is_own': m.user_id == self.user.id
            }
            for m in reversed(list(messages))
        ]

    @database_sync_to_async
    def save_message(self, content):
        from base.models import RoomChatMessage
        message = RoomChatMessage.objects.create(
            room_id=self.room_id,
            user=self.user,
            content=content
        )
        return {
            'id': message.id,
            'user_id': message.user_id,
            'username': message.user.username,
            'content': message.content,
            'created_at': message.created_at.isoformat()
        }

    @database_sync_to_async
    def is_host_or_mod(self):
        from base.models import RoomParticipant
        participant = RoomParticipant.objects.filter(
            room_id=self.room_id,
            user=self.user,
            is_active=True
        ).first()
        return participant and participant.role in ['host', 'moderator']

    @database_sync_to_async
    def get_silent_mode(self):
        from base.models import StudyRoom
        room = StudyRoom.objects.filter(id=self.room_id).first()
        return room.chat_silent_mode if room else False

    @database_sync_to_async
    def set_silent_mode(self, enabled):
        from base.models import StudyRoom
        StudyRoom.objects.filter(id=self.room_id).update(chat_silent_mode=enabled)


class RoomPresenceConsumer(AsyncWebsocketConsumer):
    """
    Real-time presence consumer showing who's in the room and their status.
    Status: focusing, on_break, away, idle
    """
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'room_presence_{self.room_id}'
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close()
            return

        is_participant = await self.check_participant()
        if not is_participant:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Notify others user joined
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user': await self.get_user_data(),
                'status': 'focusing'
            }
        )

        # Send current presence list
        presence_list = await self.get_presence_list()
        await self.send(text_data=json.dumps({
            'type': 'presence_list',
            'users': presence_list
        }))

    async def disconnect(self, close_code):
        # Notify others user left
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_left',
                'user_id': self.user.id
            }
        )
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type')

        if msg_type == 'status_update':
            await self.handle_status_update(data)
        elif msg_type == 'heartbeat':
            await self.handle_heartbeat()

    async def handle_status_update(self, data):
        """Handle user status change (focusing, on_break, away)"""
        status = data.get('status')
        valid_statuses = ['focusing', 'on_break', 'away', 'idle']
        if status not in valid_statuses:
            return

        await self.update_participant_status(status)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'status_changed',
                'user_id': self.user.id,
                'status': status
            }
        )

    async def handle_heartbeat(self):
        """Keep connection alive, update last_seen"""
        await self.update_last_seen()

    # Event handlers
    async def user_joined(self, event):
        if event['user']['id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'user': event['user'],
                'status': event['status']
            }))

    async def user_left(self, event):
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_left',
                'user_id': event['user_id']
            }))

    async def status_changed(self, event):
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'status_changed',
                'user_id': event['user_id'],
                'status': event['status']
            }))

    async def presence_list(self, event):
        await self.send(text_data=json.dumps({
            'type': 'presence_list',
            'users': event['users']
        }))

    # Database methods
    @database_sync_to_async
    def check_participant(self):
        from base.models import RoomParticipant
        return RoomParticipant.objects.filter(
            room_id=self.room_id,
            user=self.user,
            is_active=True
        ).exists()

    @database_sync_to_async
    def get_user_data(self):
        return {
            'id': self.user.id,
            'username': self.user.username,
            'full_name': self.user.get_full_name() or self.user.username,
            'avatar': self.user.profile.avatar.url if hasattr(self.user, 'profile') and self.user.profile.avatar else None
        }

    @database_sync_to_async
    def get_presence_list(self):
        from base.models import RoomParticipant
        participants = RoomParticipant.objects.filter(
            room_id=self.room_id,
            is_active=True
        ).select_related('user', 'user__profile')
        return [
            {
                'id': p.user.id,
                'username': p.user.username,
                'full_name': p.user.get_full_name() or p.user.username,
                'avatar': p.user.profile.avatar.url if hasattr(p.user, 'profile') and p.user.profile.avatar else None,
                'role': p.role,
                'status': p.current_status or 'focusing',
                'is_self': p.user.id == self.user.id
            }
            for p in participants
        ]

    @database_sync_to_async
    def update_participant_status(self, status):
        from base.models import RoomParticipant
        RoomParticipant.objects.filter(
            room_id=self.room_id,
            user=self.user,
            is_active=True
        ).update(current_status=status, last_seen=timezone.now())

    @database_sync_to_async
    def update_last_seen(self):
        from base.models import RoomParticipant
        RoomParticipant.objects.filter(
            room_id=self.room_id,
            user=self.user,
            is_active=True
        ).update(last_seen=timezone.now())


class RoomTimerConsumer(AsyncWebsocketConsumer):
    """
    Synced Pomodoro timer consumer.
    Server is the source of truth. Host controls timer, all members see same countdown.
    """
    # Timer state per room (in-memory, will move to Redis in production)
    room_timers = {}

    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'room_timer_{self.room_id}'
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close()
            return

        is_participant = await self.check_participant()
        if not is_participant:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Send current timer state
        timer_state = await self.get_timer_state()
        await self.send(text_data=json.dumps({
            'type': 'timer_state',
            **timer_state
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type')

        if msg_type == 'timer_control':
            await self.handle_timer_control(data)
        elif msg_type == 'timer_settings':
            await self.handle_timer_settings(data)

    async def handle_timer_control(self, data):
        """Handle timer start/pause/reset/skip (host/moderator only)"""
        action = data.get('action')
        is_host = await self.is_host_or_mod()

        if not is_host:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Only host/moderator can control timer'
            }))
            return

        if action == 'start':
            await self.start_timer()
        elif action == 'pause':
            await self.pause_timer()
        elif action == 'reset':
            await self.reset_timer()
        elif action == 'skip':
            await self.skip_phase()

    async def handle_timer_settings(self, data):
        """Update timer settings (host only)"""
        if not await self.is_host_or_mod():
            return

        settings = {
            'focus_duration': data.get('focus_duration', 25),
            'short_break': data.get('short_break', 5),
            'long_break': data.get('long_break', 15),
            'cycles': data.get('cycles', 4),
        }
        await self.update_timer_settings(settings)

        # Broadcast new settings
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'settings_updated',
                'settings': settings
            }
        )

    # Timer logic (server-authoritative)
    async def start_timer(self):
        room_key = f'room_{self.room_id}'
        if room_key not in self.room_timers:
            settings = await self.get_room_settings()
            self.room_timers[room_key] = {
                'phase': 'focus',
                'time_remaining': settings['focus_duration'] * 60,
                'total_time': settings['focus_duration'] * 60,
                'cycle': 1,
                'cycles': settings['cycles'],
                'focus_duration': settings['focus_duration'] * 60,
                'short_break': settings['short_break'] * 60,
                'long_break': settings['long_break'] * 60,
                'running': False,
                'task': None
            }

        timer = self.room_timers[room_key]
        if not timer['running']:
            timer['running'] = True
            timer['task'] = asyncio.create_task(self.run_timer(room_key))

        await self.broadcast_timer_state(room_key)

    async def pause_timer(self):
        room_key = f'room_{self.room_id}'
        if room_key in self.room_timers:
            timer = self.room_timers[room_key]
            timer['running'] = False
            if timer['task']:
                timer['task'].cancel()
                timer['task'] = None
            await self.broadcast_timer_state(room_key)

    async def reset_timer(self):
        room_key = f'room_{self.room_id}'
        if room_key in self.room_timers:
            timer = self.room_timers[room_key]
            timer['running'] = False
            if timer['task']:
                timer['task'].cancel()
            timer['phase'] = 'focus'
            timer['time_remaining'] = timer['focus_duration']
            timer['total_time'] = timer['focus_duration']
            timer['cycle'] = 1
            timer['task'] = None
            await self.broadcast_timer_state(room_key)

    async def skip_phase(self):
        room_key = f'room_{self.room_id}'
        if room_key in self.room_timers:
            timer = self.room_timers[room_key]
            await self.advance_phase(timer)
            await self.broadcast_timer_state(room_key)

    async def run_timer(self, room_key):
        """Background task that ticks the timer every second"""
        timer = self.room_timers[room_key]
        try:
            while timer['running'] and timer['time_remaining'] > 0:
                await asyncio.sleep(1)
                timer['time_remaining'] -= 1
                await self.broadcast_timer_state(room_key)

            # Phase completed
            if timer['running']:
                await self.advance_phase(timer)
                await self.broadcast_timer_state(room_key)

                # Auto-start next phase if configured
                if timer['running']:  # Still running after phase advance
                    timer['task'] = asyncio.create_task(self.run_timer(room_key))

        except asyncio.CancelledError:
            pass

    async def advance_phase(self, timer):
        """Move to next phase (focus -> break -> focus...)"""
        settings = await self.get_room_settings()

        if timer['phase'] == 'focus':
            # Completed a focus session
            timer['phase'] = 'short_break' if timer['cycle'] < timer['cycles'] else 'long_break'
            timer['time_remaining'] = timer['short_break'] if timer['phase'] == 'short_break' else timer['long_break']
            timer['total_time'] = timer['time_remaining']
            # Notify focus complete
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'phase_complete',
                    'phase': 'focus',
                    'cycle': timer['cycle']
                }
            )
        else:
            # Break completed
            if timer['phase'] == 'long_break':
                timer['cycle'] = 1
            else:
                timer['cycle'] += 1
            timer['phase'] = 'focus'
            timer['time_remaining'] = timer['focus_duration']
            timer['total_time'] = timer['focus_duration']
            # Notify break complete
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'phase_complete',
                    'phase': 'break',
                    'cycle': timer['cycle']
                }
            )

    async def broadcast_timer_state(self, room_key):
        """Send timer state to all connected clients"""
        timer = self.room_timers.get(room_key)
        if not timer:
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'timer_tick',
                'phase': timer['phase'],
                'time_remaining': timer['time_remaining'],
                'total_time': timer['total_time'],
                'cycle': timer['cycle'],
                'total_cycles': timer['cycles'],
                'running': timer['running']
            }
        )

    # Event handlers
    async def timer_tick(self, event):
        await self.send(text_data=json.dumps({
            'type': 'timer_tick',
            'phase': event['phase'],
            'time_remaining': event['time_remaining'],
            'total_time': event['total_time'],
            'cycle': event['cycle'],
            'total_cycles': event['total_cycles'],
            'running': event['running']
        }))

    async def phase_complete(self, event):
        await self.send(text_data=json.dumps({
            'type': 'phase_complete',
            'phase': event['phase'],
            'cycle': event['cycle']
        }))

    async def settings_updated(self, event):
        await self.send(text_data=json.dumps({
            'type': 'settings_updated',
            'settings': event['settings']
        }))

    # Database methods
    @database_sync_to_async
    def check_participant(self):
        from base.models import RoomParticipant
        return RoomParticipant.objects.filter(
            room_id=self.room_id,
            user=self.user,
            is_active=True
        ).exists()

    @database_sync_to_async
    def is_host_or_mod(self):
        from base.models import RoomParticipant
        participant = RoomParticipant.objects.filter(
            room_id=self.room_id,
            user=self.user,
            is_active=True
        ).first()
        return participant and participant.role in ['host', 'moderator']

    @database_sync_to_async
    def get_timer_state(self):
        """Get current timer state for room"""
        room_key = f'room_{self.room_id}'
        timer = self.room_timers.get(room_key)
        if timer:
            return {
                'phase': timer['phase'],
                'time_remaining': timer['time_remaining'],
                'total_time': timer['total_time'],
                'cycle': timer['cycle'],
                'total_cycles': timer['cycles'],
                'running': timer['running']
            }
        # Return default from room settings
        settings = await self.get_room_settings()
        return {
            'phase': 'focus',
            'time_remaining': settings['focus_duration'] * 60,
            'total_time': settings['focus_duration'] * 60,
            'cycle': 1,
            'total_cycles': settings['cycles'],
            'running': False
        }

    @database_sync_to_async
    def get_room_settings(self):
        from base.models import StudyRoom
        room = StudyRoom.objects.filter(id=self.room_id).first()
        if room:
            return {
                'focus_duration': room.focus_duration,
                'short_break': room.break_duration,
                'long_break': getattr(room, 'long_break_duration', 15),
                'cycles': room.cycles,
            }
        return {
            'focus_duration': 25,
            'short_break': 5,
            'long_break': 15,
            'cycles': 4,
        }

    @database_sync_to_async
    def update_timer_settings(self, settings):
        from base.models import StudyRoom
        StudyRoom.objects.filter(id=self.room_id).update(
            focus_duration=settings['focus_duration'],
            break_duration=settings['short_break'],
            long_break_duration=settings['long_break'],
            cycles=settings['cycles']
        )
        # Reset in-memory timer
        room_key = f'room_{self.room_id}'
        if room_key in self.room_timers:
            del self.room_timers[room_key]
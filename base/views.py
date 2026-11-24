from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
from django.db import models
from django.core.paginator import Paginator
from django.utils.crypto import get_random_string
from django.utils import timezone
from .models import StudyRoom, Topic, RoomParticipant, StudySession, UserProfile, Follow, RoomInvitation, RoomChatMessage


def home(request):
    """Landing page with stats and featured rooms"""
    # Get some stats
    total_users = UserProfile.objects.count()
    total_rooms = StudyRoom.objects.filter(status__in=['active', 'scheduled']).count()
    total_sessions = StudySession.objects.filter(is_completed=True).count()
    total_focus_hours = StudySession.objects.filter(is_completed=True).aggregate(
        total=models.Sum('actual_focus_minutes')
    )['total'] or 0
    total_focus_hours = total_focus_hours // 60

    # Get featured rooms (active ones with participants)
    featured_rooms = StudyRoom.objects.filter(
        status='active',
        current_participants__gt=0
    ).select_related('topic', 'created_by').prefetch_related('participants')[:6]

    # Get topics for filter
    topics = Topic.objects.filter(is_active=True).order_by('order', 'name')

    context = {
        'total_users': total_users,
        'total_rooms': total_rooms,
        'total_sessions': total_sessions,
        'total_focus_hours': total_focus_hours,
        'featured_rooms': featured_rooms,
        'topics': topics,
    }
    return render(request, 'home.html', context)


def room_list(request):
    """Study rooms listing page with filtering"""
    rooms = StudyRoom.objects.filter(
        status__in=['active', 'scheduled']
    ).select_related('topic', 'created_by').prefetch_related('participants')

    # Filter by topic
    topic_slug = request.GET.get('topic')
    if topic_slug:
        rooms = rooms.filter(topic__slug=topic_slug)

    # Filter by status
    status = request.GET.get('status')
    if status in ['active', 'scheduled']:
        rooms = rooms.filter(status=status)

    # Filter by room type
    room_type = request.GET.get('type')
    if room_type:
        rooms = rooms.filter(room_type=room_type)

    # Search
    query = request.GET.get('q')
    if query:
        rooms = rooms.filter(name__icontains=query) | rooms.filter(description__icontains=query)

    # Order by status (active first) then by created date
    rooms = rooms.order_by('-status', '-created_at')

    # Pagination
    paginator = Paginator(rooms, 12)  # 12 rooms per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Get topics for filter sidebar
    topics = Topic.objects.filter(is_active=True).order_by('order', 'name')

    context = {
        'rooms': page_obj,
        'page_obj': page_obj,
        'paginator': paginator,
        'is_paginated': page_obj.has_other_pages(),
        'topics': topics,
        'current_topic': topic_slug,
        'current_status': status,
        'current_type': room_type,
        'query': query,
    }
    return render(request, 'studylimitless.html', context)


def room_detail(request, room_id):
    """Individual study room detail page"""
    room = get_object_or_404(
        StudyRoom.objects.select_related('topic', 'created_by').prefetch_related('moderators'),
        id=room_id
    )

    # Check if user is in room
    is_participant = False
    participant = None
    if request.user.is_authenticated:
        participant = RoomParticipant.objects.filter(
            room=room, user=request.user, is_active=True
        ).first()
        is_participant = participant is not None

    # Get active participants
    active_participants = RoomParticipant.objects.filter(
        room=room, is_active=True
    ).select_related('user', 'user__profile')[:50]

    # Get recent sessions
    recent_sessions = StudySession.objects.filter(
        room=room, is_completed=True
    ).select_related('user')[:10]

    context = {
        'room': room,
        'is_participant': is_participant,
        'participant': participant,
        'active_participants': active_participants,
        'recent_sessions': recent_sessions,
    }
    return render(request, 'room_detail.html', context)


@login_required
@require_http_methods(["POST"])
def join_room(request, room_id):
    """Join a study room"""
    room = get_object_or_404(StudyRoom, id=room_id)

    # Check if already in room
    existing = RoomParticipant.objects.filter(room=room, user=request.user, is_active=True).first()
    if existing:
        return JsonResponse({'success': True, 'redirect': f'/room/{room.id}/'})

    # Check member limit
    if room.current_participants >= room.max_participants:
        return JsonResponse({'success': False, 'error': 'Room is full'}, status=400)

    # Check access for private rooms
    if room.is_private:
        # Check if user is host or moderator
        if room.created_by == request.user or request.user in room.moderators.all():
            pass  # Allow
        # Check if user has valid invitation
        elif RoomInvitation.objects.filter(
            room=room, invited_user=request.user, is_accepted=True
        ).exists():
            pass  # Allow
        # Check invite code from request
        elif request.POST.get('invite_code') and request.POST.get('invite_code').lower() == (room.invite_code or '').lower():
            pass  # Allow
        # Check password
        elif room.password and request.POST.get('password') == room.password:
            pass  # Allow
        else:
            return JsonResponse({'success': False, 'error': 'This room is private. You need an invite code, password, or invitation.'}, status=403)

    # Determine role
    role = 'host' if room.created_by == request.user else 'moderator' if request.user in room.moderators.all() else 'participant'

    # Create participant
    participant = RoomParticipant.objects.create(
        room=room,
        user=request.user,
        role=role,
        is_active=True,
    )

    # Update room participant count
    room.current_participants += 1
    room.save(update_fields=['current_participants'])

    return JsonResponse({'success': True, 'redirect': f'/room/{room.id}/'})


@login_required
@require_http_methods(["POST"])
def leave_room(request, room_id):
    """Leave a study room"""
    room = get_object_or_404(StudyRoom, id=room_id)

    participant = RoomParticipant.objects.filter(room=room, user=request.user, is_active=True).first()
    if participant:
        participant.leave()

    return JsonResponse({'success': True})


@login_required
def create_room(request):
    """Create a new study room (GET for form, POST for creation)"""
    # Room color options
    room_colors = [
        '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
        '#f97316', '#eab308', '#84cc16', '#22c55e',
        '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    ]

    if request.method == 'GET':
        topics = Topic.objects.filter(is_active=True).order_by('order', 'name')
        return render(request, 'create_room.html', {
            'topics': topics,
            'room_colors': room_colors,
        })

    try:
        name = request.POST.get('name')
        topic_id = request.POST.get('topic')
        description = request.POST.get('description', '')
        room_type = request.POST.get('room_type', 'pomodoro')
        max_participants = int(request.POST.get('max_participants', 15))
        focus_duration = int(request.POST.get('focus_duration', 25))
        break_duration = int(request.POST.get('break_duration', 5))
        long_break_duration = int(request.POST.get('long_break_duration', 15))
        cycles = int(request.POST.get('cycles', 4))
        topic_color = request.POST.get('topic_color', '#6366f1')

        # Features
        enable_video = request.POST.get('enable_video') == 'on'
        enable_voice = request.POST.get('enable_voice') == 'on'
        enable_chat = request.POST.get('enable_chat') == 'on'
        enable_screen_share = request.POST.get('enable_screen_share') == 'on'
        enable_whiteboard = request.POST.get('enable_whiteboard') == 'on'
        enable_resources = request.POST.get('enable_resources') == 'on'

        # Access
        is_private = request.POST.get('is_private') == 'on'
        password = request.POST.get('password', '')

        topic = None
        if topic_id:
            topic = Topic.objects.filter(id=topic_id).first()

        # Generate invite code for private rooms
        invite_code = None
        if is_private:
            invite_code = get_random_string(8, allowed_chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789').lower()

        room = StudyRoom.objects.create(
            name=name,
            topic=topic,
            description=description,
            room_type=room_type,
            max_participants=max_participants,
            focus_duration=focus_duration,
            break_duration=break_duration,
            long_break_duration=long_break_duration,
            cycles=cycles,
            enable_video=enable_video,
            enable_voice=enable_voice,
            enable_chat=enable_chat,
            enable_screen_share=enable_screen_share,
            enable_whiteboard=enable_whiteboard,
            enable_resources=enable_resources,
            is_private=is_private,
            password=password,
            invite_code=invite_code,
            topic_color=topic_color,
            created_by=request.user,
            status='scheduled',
        )

        return JsonResponse({'success': True, 'room_id': room.id, 'redirect': f'/room/{room.id}/'})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required
def profile(request, username=None):
    """User profile page"""
    if username:
        user = get_object_or_404(User, username=username)
    else:
        user = request.user

    profile = get_object_or_404(UserProfile, user=user)

    # Get user's rooms
    created_rooms = StudyRoom.objects.filter(created_by=user).select_related('topic')[:10]
    recent_sessions = StudySession.objects.filter(user=user, is_completed=True).select_related('room')[:10]

    # Get followers and following
    followers = Follow.objects.filter(followed=user).select_related('follower', 'follower__profile')[:20]
    following = Follow.objects.filter(follower=user).select_related('followed', 'followed__profile')[:20]

    # Check if current user follows this user
    is_following = False
    if request.user.is_authenticated and request.user != user:
        is_following = Follow.objects.filter(follower=request.user, followed=user).exists()

    context = {
        'profile_user': user,
        'profile': profile,
        'created_rooms': created_rooms,
        'recent_sessions': recent_sessions,
        'followers': followers,
        'following': following,
        'is_following': is_following,
        'is_own_profile': request.user == user,
    }
    return render(request, 'profile.html', context)


@login_required
@require_http_methods(["POST"])
def toggle_follow(request, username):
    """Follow/unfollow a user"""
    user_to_follow = get_object_or_404(User, username=username)

    if user_to_follow == request.user:
        return JsonResponse({'success': False, 'error': 'Cannot follow yourself'}, status=400)

    follow, created = Follow.objects.get_or_create(follower=request.user, followed=user_to_follow)

    if not created:
        follow.delete()
        return JsonResponse({'success': True, 'following': False})

    return JsonResponse({'success': True, 'following': True})


def topic_rooms(request, topic_slug):
    """Rooms filtered by topic"""
    topic = get_object_or_404(Topic, slug=topic_slug, is_active=True)
    rooms = StudyRoom.objects.filter(
        topic=topic,
        status__in=['active', 'scheduled']
    ).select_related('created_by').prefetch_related('participants')

    topics = Topic.objects.filter(is_active=True).order_by('order', 'name')

    context = {
        'rooms': rooms,
        'topics': topics,
        'current_topic': topic_slug,
        'topic': topic,
    }
    return render(request, 'studylimitless.html', context)


# ========================================
# Moderator Actions
# ========================================

@login_required
@require_http_methods(["POST"])
def mute_participant(request, room_id, participant_id):
    """Mute/unmute a participant (host/moderator only)"""
    room = get_object_or_404(StudyRoom, id=room_id)
    participant = get_object_or_404(RoomParticipant, id=participant_id, room=room)

    # Check permissions
    requester = RoomParticipant.objects.filter(room=room, user=request.user, is_active=True).first()
    if not requester or requester.role not in ['host', 'moderator']:
        return JsonResponse({'success': False, 'error': 'Permission denied'}, status=403)

    if participant.user == request.user:
        return JsonResponse({'success': False, 'error': 'Cannot mute yourself'}, status=400)

    if participant.role == 'host':
        return JsonResponse({'success': False, 'error': 'Cannot mute the host'}, status=400)

    participant.is_muted = not participant.is_muted
    participant.save(update_fields=['is_muted'])

    return JsonResponse({
        'success': True,
        'muted': participant.is_muted,
        'message': f"{participant.user.username} has been {'muted' if participant.is_muted else 'unmuted'}"
    })


@login_required
@require_http_methods(["POST"])
def remove_participant(request, room_id, participant_id):
    """Remove a participant from room (host/moderator only)"""
    room = get_object_or_404(StudyRoom, id=room_id)
    participant = get_object_or_404(RoomParticipant, id=participant_id, room=room)

    # Check permissions
    requester = RoomParticipant.objects.filter(room=room, user=request.user, is_active=True).first()
    if not requester or requester.role not in ['host', 'moderator']:
        return JsonResponse({'success': False, 'error': 'Permission denied'}, status=403)

    if participant.user == request.user:
        return JsonResponse({'success': False, 'error': 'Cannot remove yourself'}, status=400)

    if participant.role == 'host':
        return JsonResponse({'success': False, 'error': 'Cannot remove the host'}, status=400)

    if participant.role == 'moderator' and requester.role != 'host':
        return JsonResponse({'success': False, 'error': 'Only host can remove moderators'}, status=403)

    username = participant.user.username
    participant.leave()

    return JsonResponse({
        'success': True,
        'message': f"{username} has been removed from the room"
    })


@login_required
@require_http_methods(["POST"])
def ban_participant(request, room_id, participant_id):
    """Ban a participant from room (host only)"""
    room = get_object_or_404(StudyRoom, id=room_id)
    participant = get_object_or_404(RoomParticipant, id=participant_id, room=room)

    # Check permissions - only host can ban
    requester = RoomParticipant.objects.filter(room=room, user=request.user, is_active=True).first()
    if not requester or requester.role != 'host':
        return JsonResponse({'success': False, 'error': 'Only the host can ban users'}, status=403)

    if participant.user == request.user:
        return JsonResponse({'success': False, 'error': 'Cannot ban yourself'}, status=400)

    if participant.role == 'host':
        return JsonResponse({'success': False, 'error': 'Cannot ban the host'}, status=400)

    username = participant.user.username
    participant.leave()

    # TODO: Add to banned users list (could create RoomBan model)
    # For now, just remove them

    return JsonResponse({
        'success': True,
        'message': f"{username} has been banned from the room"
    })


# ========================================
# Room Invitation Views
# ========================================

@login_required
@require_http_methods(["POST"])
def send_invitation(request, room_id):
    """Send invitation to join private room"""
    room = get_object_or_404(StudyRoom, id=room_id)

    # Check permissions
    if room.created_by != request.user and request.user not in room.moderators.all():
        return JsonResponse({'success': False, 'error': 'Permission denied'}, status=403)

    if not room.is_private:
        return JsonResponse({'success': False, 'error': 'Room is not private'}, status=400)

    username = request.POST.get('username')
    message = request.POST.get('message', '')

    if not username:
        return JsonResponse({'success': False, 'error': 'Username required'}, status=400)

    invited_user = get_object_or_404(User, username=username)

    if invited_user == request.user:
        return JsonResponse({'success': False, 'error': 'Cannot invite yourself'}, status=400)

    # Check if already a participant
    if RoomParticipant.objects.filter(room=room, user=invited_user, is_active=True).exists():
        return JsonResponse({'success': False, 'error': 'User is already in the room'}, status=400)

    # Check if already invited
    existing = RoomInvitation.objects.filter(room=room, invited_user=invited_user).first()
    if existing:
        if existing.is_accepted:
            return JsonResponse({'success': False, 'error': 'User has already accepted an invitation'}, status=400)
        elif not existing.is_declined:
            return JsonResponse({'success': False, 'error': 'Invitation already sent'}, status=400)
        # If declined, allow re-invite
        existing.delete()

    invitation = RoomInvitation.objects.create(
        room=room,
        invited_by=request.user,
        invited_user=invited_user,
        message=message,
    )

    return JsonResponse({
        'success': True,
        'invitation_id': invitation.id,
        'message': f"Invitation sent to {username}"
    })


@login_required
@require_http_methods(["POST"])
def respond_invitation(request, invitation_id):
    """Accept or decline a room invitation"""
    invitation = get_object_or_404(RoomInvitation, id=invitation_id, invited_user=request.user)

    if invitation.is_accepted or invitation.is_declined:
        return JsonResponse({'success': False, 'error': 'Invitation already responded to'}, status=400)

    action = request.POST.get('action')

    if action == 'accept':
        invitation.is_accepted = True
        invitation.responded_at = timezone.now()
        invitation.save(update_fields=['is_accepted', 'responded_at'])

        # Add user to room
        participant, created = RoomParticipant.objects.get_or_create(
            room=invitation.room,
            user=request.user,
            defaults={'role': 'participant', 'is_active': True}
        )
        if not created and not participant.is_active:
            participant.is_active = True
            participant.left_at = None
            participant.save(update_fields=['is_active', 'left_at'])

        invitation.room.current_participants = RoomParticipant.objects.filter(
            room=invitation.room, is_active=True
        ).count()
        invitation.room.save(update_fields=['current_participants'])

        return JsonResponse({
            'success': True,
            'action': 'accepted',
            'redirect': f'/room/{invitation.room.id}/'
        })

    elif action == 'decline':
        invitation.is_declined = True
        invitation.responded_at = timezone.now()
        invitation.save(update_fields=['is_declined', 'responded_at'])

        return JsonResponse({
            'success': True,
            'action': 'declined',
            'message': 'Invitation declined'
        })

    return JsonResponse({'success': False, 'error': 'Invalid action'}, status=400)


@login_required
def my_invitations(request):
    """List user's received invitations"""
    invitations = RoomInvitation.objects.filter(
        invited_user=request.user
    ).select_related('room', 'room__topic', 'invited_by').order_by('-created_at')

    context = {
        'invitations': invitations,
    }
    return render(request, 'invitations.html', context)
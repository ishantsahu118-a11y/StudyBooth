from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
from django.db import models
from django.core.paginator import Paginator
from .models import StudyRoom, Topic, RoomParticipant, StudySession, UserProfile, Follow


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

    if not room.can_join(request.user):
        return JsonResponse({'success': False, 'error': 'Room is full or private'}, status=400)

    # Check if already in room
    existing = RoomParticipant.objects.filter(room=room, user=request.user, is_active=True).first()
    if existing:
        return JsonResponse({'success': True, 'redirect': f'/room/{room.id}/'})

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
        cycles = int(request.POST.get('cycles', 4))
        long_break_duration = 15  # Default, not stored in model yet

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

        room = StudyRoom.objects.create(
            name=name,
            topic=topic,
            description=description,
            room_type=room_type,
            max_participants=max_participants,
            focus_duration=focus_duration,
            break_duration=break_duration,
            cycles=cycles,
            enable_video=enable_video,
            enable_voice=enable_voice,
            enable_chat=enable_chat,
            enable_screen_share=enable_screen_share,
            enable_whiteboard=enable_whiteboard,
            enable_resources=enable_resources,
            is_private=is_private,
            password=password,
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
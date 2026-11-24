from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Topic(models.Model):
    """Study topics/categories for rooms"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon name or emoji")
    color = models.CharField(max_length=7, default="#6366f1", help_text="Hex color code")
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name_plural = "Topics"

    def __str__(self):
        return self.name


class StudyRoom(models.Model):
    """Virtual study rooms"""
    ROOM_TYPES = [
        ('pomodoro', 'Pomodoro (25/5)'),
        ('custom_timer', 'Custom Timer'),
        ('open', 'Open Session'),
        ('structured', 'Structured / Scheduled'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('scheduled', 'Scheduled'),
        ('ended', 'Ended'),
        ('archived', 'Archived'),
    ]

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    topic = models.ForeignKey(Topic, on_delete=models.SET_NULL, null=True, blank=True, related_name='rooms')
    description = models.TextField(blank=True)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPES, default='pomodoro')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')

    # Capacity & participants
    max_participants = models.PositiveIntegerField(default=15)
    current_participants = models.PositiveIntegerField(default=0)

    # Timer settings (for pomodoro/custom)
    focus_duration = models.PositiveIntegerField(default=25, help_text="Focus duration in minutes")
    break_duration = models.PositiveIntegerField(default=5, help_text="Break duration in minutes")
    cycles = models.PositiveIntegerField(default=4, help_text="Number of focus/break cycles")

    # Features
    enable_video = models.BooleanField(default=False)
    enable_voice = models.BooleanField(default=True)
    enable_chat = models.BooleanField(default=True)
    enable_screen_share = models.BooleanField(default=False)
    enable_whiteboard = models.BooleanField(default=False)
    enable_resources = models.BooleanField(default=True)

    # Access control
    is_private = models.BooleanField(default=False, help_text="Require invite or approval to join")
    password = models.CharField(max_length=100, blank=True, help_text="Optional room password")

    # Scheduling
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)

    # Ownership
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_rooms')
    moderators = models.ManyToManyField(User, blank=True, related_name='moderated_rooms')

    # Stats
    total_sessions = models.PositiveIntegerField(default=0)
    total_focus_minutes = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['topic', 'status']),
        ]

    def __str__(self):
        return self.name

    @property
    def is_active_now(self):
        return self.status == 'active' and self.current_participants > 0

    @property
    def is_full(self):
        return self.current_participants >= self.max_participants

    def can_join(self, user):
        if self.is_full:
            return False
        if self.is_private and user not in self.moderators.all() and user != self.created_by:
            return False
        return True


class RoomParticipant(models.Model):
    """Users currently in or recently in a room"""
    ROLE_CHOICES = [
        ('participant', 'Participant'),
        ('moderator', 'Moderator'),
        ('host', 'Host'),
    ]

    room = models.ForeignKey(StudyRoom, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='room_participations')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='participant')
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    # Session tracking
    focus_minutes = models.PositiveIntegerField(default=0)
    cycles_completed = models.PositiveIntegerField(default=0)

    # Connection info
    has_video = models.BooleanField(default=False)
    has_audio = models.BooleanField(default=False)
    is_muted = models.BooleanField(default=True)
    is_camera_off = models.BooleanField(default=True)

    class Meta:
        unique_together = ['room', 'user', 'joined_at']
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.user.username} in {self.room.name}"

    def leave(self):
        self.left_at = timezone.now()
        self.is_active = False
        self.save()
        self.room.current_participants = max(0, self.room.current_participants - 1)
        self.room.save(update_fields=['current_participants'])


class StudySession(models.Model):
    """Individual study sessions within a room"""
    room = models.ForeignKey(StudyRoom, on_delete=models.CASCADE, related_name='sessions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='study_sessions')
    participant = models.ForeignKey(RoomParticipant, on_delete=models.SET_NULL, null=True, blank=True, related_name='sessions')

    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    # Planned vs actual
    planned_focus_minutes = models.PositiveIntegerField(default=0)
    actual_focus_minutes = models.PositiveIntegerField(default=0)
    planned_break_minutes = models.PositiveIntegerField(default=0)
    actual_break_minutes = models.PositiveIntegerField(default=0)

    cycles_planned = models.PositiveIntegerField(default=0)
    cycles_completed = models.PositiveIntegerField(default=0)

    # Status
    is_completed = models.BooleanField(default=False)
    was_interrupted = models.BooleanField(default=False)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.user.username} - {self.room.name} - {self.started_at.strftime('%Y-%m-%d %H:%M')}"

    @property
    def duration_minutes(self):
        if self.ended_at:
            return int((self.ended_at - self.started_at).total_seconds() / 60)
        return int((timezone.now() - self.started_at).total_seconds() / 60)

    def end_session(self):
        self.ended_at = timezone.now()
        self.is_completed = True
        self.save()
        # Update room stats
        self.room.total_sessions += 1
        self.room.total_focus_minutes += self.actual_focus_minutes
        self.room.save(update_fields=['total_sessions', 'total_focus_minutes'])


class UserProfile(models.Model):
    """Extended user profile for study preferences and stats"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    # Profile
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')

    # Study preferences
    preferred_topics = models.ManyToManyField(Topic, blank=True, related_name='interested_users')
    daily_focus_goal = models.PositiveIntegerField(default=120, help_text="Daily focus goal in minutes")
    preferred_focus_duration = models.PositiveIntegerField(default=25)
    preferred_break_duration = models.PositiveIntegerField(default=5)

    # Notifications
    notify_room_invites = models.BooleanField(default=True)
    notify_room_starting = models.BooleanField(default=True)
    notify_friend_joined = models.BooleanField(default=True)
    notify_weekly_report = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=False)

    # Privacy
    profile_public = models.BooleanField(default=True)
    show_current_room = models.BooleanField(default=True)
    show_stats = models.BooleanField(default=True)

    # Stats (denormalized for performance)
    total_focus_minutes = models.PositiveIntegerField(default=0)
    total_sessions = models.PositiveIntegerField(default=0)
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_study_date = models.DateField(null=True, blank=True)

    # Preferences
    theme = models.CharField(max_length=20, choices=[('light', 'Light'), ('dark', 'Dark'), ('system', 'System')], default='system')
    focus_sound = models.CharField(max_length=50, default='none')
    keyboard_shortcuts = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

    def update_streak(self):
        """Update streak based on last study date"""
        from datetime import date, timedelta
        today = date.today()
        if self.last_study_date:
            if self.last_study_date == today - timedelta(days=1):
                self.current_streak += 1
            elif self.last_study_date < today - timedelta(days=1):
                self.current_streak = 1
            # If same day, don't change
        else:
            self.current_streak = 1

        self.last_study_date = today
        if self.current_streak > self.longest_streak:
            self.longest_streak = self.current_streak
        self.save(update_fields=['current_streak', 'longest_streak', 'last_study_date'])

    def add_focus_time(self, minutes):
        self.total_focus_minutes += minutes
        self.total_sessions += 1
        self.update_streak()
        self.save(update_fields=['total_focus_minutes', 'total_sessions'])


class Follow(models.Model):
    """User follow relationships"""
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')
    followed = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['follower', 'followed']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.follower.username} follows {self.followed.username}"


class RoomInvitation(models.Model):
    """Invitations to join private rooms"""
    room = models.ForeignKey(StudyRoom, on_delete=models.CASCADE, related_name='invitations')
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    invited_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_invitations')
    message = models.TextField(blank=True)
    is_accepted = models.BooleanField(default=False)
    is_declined = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['room', 'invited_user']
        ordering = ['-created_at']

    def __str__(self):
        return f"Invitation to {self.room.name} for {self.invited_user.username}"
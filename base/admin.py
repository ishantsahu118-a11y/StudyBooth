from django.contrib import admin
from .models import Topic, StudyRoom, RoomParticipant, StudySession, UserProfile, Follow, RoomInvitation


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'color', 'order', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ['order', 'is_active', 'color']


class RoomParticipantInline(admin.TabularInline):
    model = RoomParticipant
    extra = 0
    readonly_fields = ['joined_at', 'left_at', 'focus_minutes', 'cycles_completed']
    fields = ['user', 'role', 'is_active', 'joined_at', 'left_at', 'focus_minutes', 'cycles_completed']
    can_delete = False


class StudySessionInline(admin.TabularInline):
    model = StudySession
    extra = 0
    readonly_fields = ['started_at', 'ended_at', 'actual_focus_minutes', 'cycles_completed', 'is_completed']
    fields = ['user', 'started_at', 'ended_at', 'actual_focus_minutes', 'cycles_completed', 'is_completed']
    can_delete = False


@admin.register(StudyRoom)
class StudyRoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'topic', 'room_type', 'status', 'current_participants', 'max_participants', 'created_by', 'created_at']
    list_filter = ['status', 'room_type', 'topic', 'enable_video', 'enable_voice', 'is_private', 'created_at']
    search_fields = ['name', 'description', 'created_by__username']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['current_participants', 'total_sessions', 'total_focus_minutes', 'created_at', 'updated_at', 'ended_at']
    filter_horizontal = ['moderators']
    inlines = [RoomParticipantInline, StudySessionInline]
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'slug', 'topic', 'description', 'room_type', 'status')
        }),
        ('Capacity', {
            'fields': ('max_participants', 'current_participants')
        }),
        ('Timer Settings', {
            'fields': ('focus_duration', 'break_duration', 'cycles')
        }),
        ('Features', {
            'fields': ('enable_video', 'enable_voice', 'enable_chat', 'enable_screen_share', 'enable_whiteboard', 'enable_resources')
        }),
        ('Access Control', {
            'fields': ('is_private', 'password', 'moderators')
        }),
        ('Scheduling', {
            'fields': ('scheduled_start', 'scheduled_end')
        }),
        ('Ownership & Stats', {
            'fields': ('created_by', 'total_sessions', 'total_focus_minutes', 'created_at', 'updated_at', 'ended_at')
        }),
    )


@admin.register(RoomParticipant)
class RoomParticipantAdmin(admin.ModelAdmin):
    list_display = ['user', 'room', 'role', 'is_active', 'joined_at', 'left_at', 'focus_minutes', 'cycles_completed']
    list_filter = ['role', 'is_active', 'joined_at', 'room__topic']
    search_fields = ['user__username', 'room__name']
    readonly_fields = ['joined_at', 'left_at', 'focus_minutes', 'cycles_completed']
    date_hierarchy = 'joined_at'


@admin.register(StudySession)
class StudySessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'room', 'started_at', 'ended_at', 'actual_focus_minutes', 'cycles_completed', 'is_completed']
    list_filter = ['is_completed', 'was_interrupted', 'started_at', 'room__topic']
    search_fields = ['user__username', 'room__name']
    readonly_fields = ['started_at', 'ended_at', 'actual_focus_minutes', 'actual_break_minutes', 'cycles_completed']
    date_hierarchy = 'started_at'


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'total_focus_minutes', 'total_sessions', 'current_streak', 'longest_streak', 'last_study_date', 'theme']
    list_filter = ['theme', 'email_notifications', 'profile_public', 'created_at']
    search_fields = ['user__username', 'user__email', 'bio']
    readonly_fields = ['total_focus_minutes', 'total_sessions', 'current_streak', 'longest_streak', 'last_study_date', 'created_at', 'updated_at']
    filter_horizontal = ['preferred_topics']
    date_hierarchy = 'created_at'


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ['follower', 'followed', 'created_at']
    search_fields = ['follower__username', 'followed__username']
    date_hierarchy = 'created_at'


@admin.register(RoomInvitation)
class RoomInvitationAdmin(admin.ModelAdmin):
    list_display = ['room', 'invited_by', 'invited_user', 'is_accepted', 'is_declined', 'created_at']
    list_filter = ['is_accepted', 'is_declined', 'created_at']
    search_fields = ['room__name', 'invited_by__username', 'invited_user__username']
    readonly_fields = ['created_at', 'responded_at']
    date_hierarchy = 'created_at'
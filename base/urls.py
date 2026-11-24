from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='Home'),
    path('rooms/', views.room_list, name='Study Rooms'),
    path('room/create/', views.create_room, name='Create Room'),
    path('room/<int:room_id>/', views.room_detail, name='Room Detail'),
    path('room/<int:room_id>/join/', views.join_room, name='Join Room'),
    path('room/<int:room_id>/leave/', views.leave_room, name='Leave Room'),

    # Moderator actions
    path('room/<int:room_id>/mute/<int:participant_id>/', views.mute_participant, name='Mute Participant'),
    path('room/<int:room_id>/remove/<int:participant_id>/', views.remove_participant, name='Remove Participant'),
    path('room/<int:room_id>/ban/<int:participant_id>/', views.ban_participant, name='Ban Participant'),

    # Room invitations
    path('room/<int:room_id>/invite/', views.send_invitation, name='Send Invitation'),
    path('invitation/<int:invitation_id>/respond/', views.respond_invitation, name='Respond Invitation'),
    path('invitations/', views.my_invitations, name='My Invitations'),

    path('topic/<slug:topic_slug>/', views.topic_rooms, name='Topic Rooms'),
    path('profile/', views.profile, name='Profile'),
    path('profile/<str:username>/', views.profile, name='User Profile'),
    path('follow/<str:username>/', views.toggle_follow, name='Toggle Follow'),
]
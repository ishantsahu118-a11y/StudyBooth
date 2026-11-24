from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='Home'),
    path('rooms/', views.room_list, name='Study Rooms'),
    path('room/create/', views.create_room, name='Create Room'),
    path('room/<int:room_id>/', views.room_detail, name='Room Detail'),
    path('room/<int:room_id>/join/', views.join_room, name='Join Room'),
    path('room/<int:room_id>/leave/', views.leave_room, name='Leave Room'),
    path('topic/<slug:topic_slug>/', views.topic_rooms, name='Topic Rooms'),
    path('profile/', views.profile, name='Profile'),
    path('profile/<str:username>/', views.profile, name='User Profile'),
    path('follow/<str:username>/', views.toggle_follow, name='Toggle Follow'),
]
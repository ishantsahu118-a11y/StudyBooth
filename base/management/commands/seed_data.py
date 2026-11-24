from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from base.models import Topic, StudyRoom, UserProfile, RoomParticipant
import random


class Command(BaseCommand):
    help = 'Seed database with sample data for testing'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')

        # Create topics
        topics_data = [
            {'name': 'General / Mixed', 'slug': 'general', 'description': 'General study sessions for any subject', 'color': '#6366f1', 'order': 1},
            {'name': 'Computer Science', 'slug': 'cs', 'description': 'Programming, algorithms, data structures, software engineering', 'color': '#0ea5e9', 'order': 2},
            {'name': 'Mathematics', 'slug': 'math', 'description': 'Calculus, linear algebra, statistics, discrete math', 'color': '#f59e0b', 'order': 3},
            {'name': 'Science', 'slug': 'science', 'description': 'Physics, chemistry, biology, earth sciences', 'color': '#10b981', 'order': 4},
            {'name': 'Languages', 'slug': 'languages', 'description': 'Language learning and exchange', 'color': '#ec4899', 'order': 5},
            {'name': 'Writing', 'slug': 'writing', 'description': 'Creative writing, academic writing, journaling', 'color': '#8b5cf6', 'order': 6},
            {'name': 'Exam Prep', 'slug': 'exam-prep', 'description': 'Test preparation, practice exams, review sessions', 'color': '#ef4444', 'order': 7},
            {'name': 'Design & Arts', 'slug': 'design', 'description': 'Graphic design, UI/UX, illustration, music', 'color': '#f97316', 'order': 8},
        ]

        topics = {}
        for t_data in topics_data:
            topic, created = Topic.objects.get_or_create(
                slug=t_data['slug'],
                defaults=t_data
            )
            topics[t_data['slug']] = topic
            if created:
                self.stdout.write(f'  Created topic: {topic.name}')

        # Create test users
        users = {}
        for i in range(1, 6):
            username = f'testuser{i}'
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': f'{username}@example.com',
                    'first_name': f'Test',
                    'last_name': f'User{i}',
                }
            )
            if created:
                user.set_password('testpass123')
                user.save()
            users[username] = user

        # Create admin user profile if not exists
        admin_user = User.objects.get(username='admin')
        admin_profile, created = UserProfile.objects.get_or_create(
            user=admin_user,
            defaults={
                'bio': 'StudyLimitless founder. Building tools for focused learning.',
                'daily_focus_goal': 180,
                'preferred_focus_duration': 50,
                'preferred_break_duration': 10,
                'total_focus_minutes': 5000,
                'total_sessions': 120,
                'current_streak': 15,
                'longest_streak': 30,
            }
        )

        # Create study rooms
        rooms_data = [
            {
                'name': 'Deep Focus Session',
                'topic': topics['general'],
                'description': 'Pomodoro-based deep work sessions. 25 min focus, 5 min break. Camera optional, silent environment. Perfect for getting into flow state.',
                'room_type': 'pomodoro',
                'status': 'active',
                'max_participants': 20,
                'current_participants': 12,
                'focus_duration': 25,
                'break_duration': 5,
                'cycles': 4,
                'enable_video': False,
                'enable_voice': False,
                'enable_chat': True,
                'enable_screen_share': False,
                'enable_whiteboard': False,
                'enable_resources': True,
                'is_private': False,
            },
            {
                'name': 'CS & Programming',
                'topic': topics['cs'],
                'description': 'For developers, CS students, and coding enthusiasts. Work on algorithms, projects, debugging. Screen sharing and discussion encouraged.',
                'room_type': 'open',
                'status': 'active',
                'max_participants': 15,
                'current_participants': 8,
                'focus_duration': 50,
                'break_duration': 10,
                'cycles': 3,
                'enable_video': True,
                'enable_voice': True,
                'enable_chat': True,
                'enable_screen_share': True,
                'enable_whiteboard': True,
                'enable_resources': True,
                'is_private': False,
            },
            {
                'name': 'Language Exchange - English/Spanish',
                'topic': topics['languages'],
                'description': 'Practice speaking with native speakers. English, Spanish, Japanese, Korean, French, and more. Voice chat required.',
                'room_type': 'structured',
                'status': 'active',
                'max_participants': 10,
                'current_participants': 5,
                'focus_duration': 30,
                'break_duration': 5,
                'cycles': 4,
                'enable_video': True,
                'enable_voice': True,
                'enable_chat': True,
                'enable_screen_share': False,
                'enable_whiteboard': False,
                'enable_resources': True,
                'is_private': False,
            },
            {
                'name': 'Exam Prep Zone - Finals Week',
                'topic': topics['exam-prep'],
                'description': 'Dedicated space for exam preparation. Mock tests, review sessions, Q&A. Structured sessions with scheduled breaks.',
                'room_type': 'structured',
                'status': 'scheduled',
                'max_participants': 25,
                'current_participants': 3,
                'focus_duration': 45,
                'break_duration': 15,
                'cycles': 2,
                'enable_video': False,
                'enable_voice': True,
                'enable_chat': True,
                'enable_screen_share': True,
                'enable_whiteboard': True,
                'enable_resources': True,
                'is_private': False,
                'scheduled_start': timezone.now() + timezone.timedelta(hours=2),
            },
            {
                'name': 'Creative Writing Sprints',
                'topic': topics['writing'],
                'description': 'Writing sprints, feedback circles, and creative prompts for writers. 20 min writing, 5 min share.',
                'room_type': 'pomodoro',
                'status': 'scheduled',
                'max_participants': 12,
                'current_participants': 0,
                'focus_duration': 20,
                'break_duration': 5,
                'cycles': 6,
                'enable_video': False,
                'enable_voice': True,
                'enable_chat': True,
                'enable_screen_share': False,
                'enable_whiteboard': False,
                'enable_resources': True,
                'is_private': False,
            },
            {
                'name': 'Math & Science Study Group',
                'topic': topics['math'],
                'description': 'Problem solving, concept discussion, and study groups for STEM subjects. Whiteboard available for equations.',
                'room_type': 'open',
                'status': 'active',
                'max_participants': 15,
                'current_participants': 7,
                'focus_duration': 45,
                'break_duration': 10,
                'cycles': 3,
                'enable_video': True,
                'enable_voice': True,
                'enable_chat': True,
                'enable_screen_share': True,
                'enable_whiteboard': True,
                'enable_resources': True,
                'is_private': False,
            },
            {
                'name': 'Physics Problem Solving',
                'topic': topics['science'],
                'description': 'Work through physics problems together. Mechanics, electromagnetism, quantum. LaTeX support for equations.',
                'room_type': 'custom_timer',
                'status': 'active',
                'max_participants': 10,
                'current_participants': 4,
                'focus_duration': 60,
                'break_duration': 10,
                'cycles': 2,
                'enable_video': True,
                'enable_voice': True,
                'enable_chat': True,
                'enable_screen_share': True,
                'enable_whiteboard': True,
                'enable_resources': True,
                'is_private': False,
            },
            {
                'name': 'Morning Coffee & Code',
                'topic': topics['cs'],
                'description': 'Early morning coding sessions. LeetCode, side projects, interview prep. Friendly accountability group.',
                'room_type': 'pomodoro',
                'status': 'scheduled',
                'max_participants': 15,
                'current_participants': 2,
                'focus_duration': 25,
                'break_duration': 5,
                'cycles': 4,
                'enable_video': False,
                'enable_voice': True,
                'enable_chat': True,
                'enable_screen_share': True,
                'enable_whiteboard': False,
                'enable_resources': True,
                'is_private': False,
                'scheduled_start': timezone.now() + timezone.timedelta(days=1, hours=7),
            },
        ]

        for i, room_data in enumerate(rooms_data):
            created_by = random.choice(list(users.values()))
            room_data['created_by'] = created_by

            # Generate slug
            base_slug = room_data['name'].lower().replace(' ', '-').replace('&', '').replace('/', '')
            slug = base_slug
            counter = 1
            while StudyRoom.objects.filter(slug=slug).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            room_data['slug'] = slug

            room, created = StudyRoom.objects.get_or_create(
                slug=slug,
                defaults=room_data
            )
            if created:
                self.stdout.write(f'  Created room: {room.name}')

        # Create some room participants
        all_rooms = StudyRoom.objects.filter(status='active')
        all_users = list(users.values())

        for room in all_rooms:
            # Add 2-5 random participants
            num_participants = random.randint(2, min(5, room.max_participants))
            participants = random.sample(all_users, min(num_participants, len(all_users)))

            for user in participants:
                participant, created = RoomParticipant.objects.get_or_create(
                    room=room,
                    user=user,
                    defaults={
                        'role': 'participant',
                        'is_active': True,
                        'focus_minutes': random.randint(0, room.focus_duration * room.cycles),
                        'cycles_completed': random.randint(0, room.cycles),
                    }
                )

        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))
        self.stdout.write(f'  Topics: {Topic.objects.count()}')
        self.stdout.write(f'  Users: {User.objects.count()}')
        self.stdout.write(f'  Rooms: {StudyRoom.objects.count()}')
        self.stdout.write(f'  Participants: {RoomParticipant.objects.count()}')
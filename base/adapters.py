from allauth.account.adapter import DefaultAccountAdapter
from django.urls import reverse
from base.models import UserProfile


class CustomAccountAdapter(DefaultAccountAdapter):
    def is_open_for_signup(self, request):
        return True

    def save_user(self, request, user, form, commit=True):
        user = super().save_user(request, user, form, commit=False)
        if commit:
            user.save()
        return user

    def get_login_redirect_url(self, request):
        return reverse('Study Rooms')

    def get_signup_redirect_url(self, request):
        return reverse('Study Rooms')

    def get_email_verification_redirect_url(self, email_address):
        return reverse('Study Rooms')

    def send_confirmation_mail(self, request, emailconfirmation, signup):
        # In development, we print to console instead of sending email
        if not request.get_host().startswith('localhost') and not request.get_host().startswith('127.0.0.1'):
            super().send_confirmation_mail(request, emailconfirmation, signup)
        else:
            # For development, auto-confirm
            emailconfirmation.confirm(request)
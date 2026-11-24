// StudyLimitless - Create Room Page JavaScript
// Form validation, room type selection, color picker, modal

document.addEventListener('DOMContentLoaded', function() {
    // State
    const state = {
        selectedRoomType: 'pomodoro',
        selectedColor: '#6366f1',
        isModalOpen: false
    };

    // Elements
    const form = document.getElementById('createRoomForm');
    const modal = document.getElementById('createRoomModal');
    const openModalBtn = document.getElementById('openCreateRoomModal');
    const closeModalBtn = document.getElementById('closeCreateRoomModal');
    const cancelModalBtn = document.getElementById('cancelCreateRoomModal');
    const roomTypeInputs = document.querySelectorAll('input[name="room_type"]');
    const colorInputs = document.querySelectorAll('input[name="topic_color"]');

    // Initialize
    function init() {
        bindEvents();
        updateRoomTypeUI();
    }

    function bindEvents() {
        // Modal open/close
        openModalBtn?.addEventListener('click', openModal);
        closeModalBtn?.addEventListener('click', closeModal);
        cancelModalBtn?.addEventListener('click', closeModal);

        // Close on backdrop click
        modal?.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });

        // Close on Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && state.isModalOpen) {
                closeModal();
            }
        });

        // Room type selection
        roomTypeInputs.forEach(input => {
            input.addEventListener('change', function() {
                state.selectedRoomType = this.value;
                updateRoomTypeUI();
                updateFeatureDefaults();
            });
        });

        // Color selection
        colorInputs.forEach(input => {
            input.addEventListener('change', function() {
                state.selectedColor = this.value;
                updateColorUI();
            });
        });

        // Form submission
        form?.addEventListener('submit', handleSubmit);

        // Real-time validation
        form?.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('blur', validateField);
            input.addEventListener('input', clearFieldError);
        });

        // Password visibility toggle
        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', togglePasswordVisibility);
        });
    }

    function openModal() {
        state.isModalOpen = true;
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input, select, textarea');
            firstInput?.focus();
        }, 100);
    }

    function closeModal() {
        state.isModalOpen = false;
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }

    function updateRoomTypeUI() {
        roomTypeInputs.forEach(input => {
            const card = input.closest('.room-type-option')?.querySelector('.room-type-card');
            if (card) {
                card.classList.toggle('selected', input.checked);
            }
        });
    }

    function updateColorUI() {
        colorInputs.forEach(input => {
            const option = input.closest('.color-option');
            if (option) {
                option.classList.toggle('selected', input.checked);
            }
        });
    }

    function updateFeatureDefaults() {
        const defaults = {
            pomodoro: { video: false, voice: true, chat: true, screen: false },
            custom_timer: { video: false, voice: true, chat: true, screen: false },
            open: { video: true, voice: true, chat: true, screen: true },
            structured: { video: false, voice: false, chat: true, screen: false }
        };

        const config = defaults[state.selectedRoomType] || defaults.pomodoro;

        document.getElementById('enable_video').checked = config.video;
        document.getElementById('enable_voice').checked = config.voice;
        document.getElementById('enable_chat').checked = config.chat;
        document.getElementById('enable_screen_share').checked = config.screen;
    }

    function validateField(e) {
        const field = e.target;
        const group = field.closest('.form-group');
        if (!group) return;

        let isValid = true;
        let errorMessage = '';

        // Required field
        if (field.hasAttribute('required') && !field.value.trim()) {
            isValid = false;
            errorMessage = 'This field is required';
        }

        // Max participants
        if (field.id === 'max_participants') {
            const value = parseInt(field.value);
            if (value < 2 || value > 100) {
                isValid = false;
                errorMessage = 'Must be between 2 and 100';
            }
        }

        // Duration fields
        if (['focus_duration', 'break_duration'].includes(field.id)) {
            const value = parseInt(field.value);
            if (value < 1 || value > 180) {
                isValid = false;
                errorMessage = 'Must be between 1 and 180 minutes';
            }
        }

        // Cycles
        if (field.id === 'cycles') {
            const value = parseInt(field.value);
            if (value < 1 || value > 20) {
                isValid = false;
                errorMessage = 'Must be between 1 and 20';
            }
        }

        // Name length
        if (field.id === 'room_name' && field.value.length > 100) {
            isValid = false;
            errorMessage = 'Name must be 100 characters or less';
        }

        // Update UI
        group.classList.toggle('has-error', !isValid);
        const errorEl = group.querySelector('.form-error');
        if (errorEl) errorEl.textContent = errorMessage;

        return isValid;
    }

    function clearFieldError(e) {
        const field = e.target;
        const group = field.closest('.form-group');
        if (!group) return;
        group.classList.remove('has-error');
    }

    function togglePasswordVisibility(e) {
        const btn = e.currentTarget;
        const input = btn.parentElement.querySelector('input');
        const icon = btn.querySelector('svg');

        if (input.type === 'password') {
            input.type = 'text';
            icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
        } else {
            input.type = 'password';
            icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
        }
    }

    function validateForm() {
        let isValid = true;
        const fields = form.querySelectorAll('input[required], select[required], textarea[required]');

        fields.forEach(field => {
            if (!validateField({ target: field })) {
                isValid = false;
            }
        });

        return isValid;
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!validateForm()) {
            // Scroll to first error
            const firstError = form.querySelector('.has-error');
            firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            showToast('Please fix the errors above', 'error');
            return;
        }

        // Collect form data
        const formData = new FormData(form);

        // Add room type
        formData.set('room_type', state.selectedRoomType);

        // Disable submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Creating...';

        try {
            const response = await fetch('{% url "Create Room" %}', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await response.json();

            if (data.success) {
                showToast('Room created successfully!', 'success');
                closeModal();
                form.reset();
                state.selectedRoomType = 'pomodoro';
                state.selectedColor = '#6366f1';
                updateRoomTypeUI();
                updateColorUI();

                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 1000);
            } else {
                showToast(data.error || 'Failed to create room', 'error');
            }
        } catch (error) {
            console.error('Create room error:', error);
            showToast('An error occurred. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    // Toast notification (reuses global if available)
    function showToast(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            // Fallback
            alert(message);
        }
    }

    // Initialize
    init();
});

// Also expose for potential inline script use
window.StudyLimitless = window.StudyLimitless || {};
window.StudyLimitless.createRoom = {
    openModal: function() {
        const modal = document.getElementById('createRoomModal');
        if (modal) modal.classList.add('open');
    }
};
// StudyLimitless - Login Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('id_login');
    const passwordInput = document.getElementById('id_password');
    const rememberCheckbox = document.getElementById('id_remember');
    const submitBtn = form?.querySelector('button[type="submit"]');

    // Password visibility toggle
    function addPasswordToggle(input) {
        if (!input) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'input-wrapper';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'input-toggle';
        toggle.setAttribute('aria-label', 'Toggle password visibility');
        toggle.innerHTML = `
            <svg class="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <svg class="icon-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="display: none;">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
        `;
        wrapper.appendChild(toggle);

        toggle.addEventListener('click', function() {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            toggle.querySelector('.icon-eye').style.display = isPassword ? 'none' : 'block';
            toggle.querySelector('.icon-eye-off').style.display = isPassword ? 'block' : 'none';
        });
    }

    addPasswordToggle(passwordInput);

    // Email validation
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Field validation
    function validateField(input) {
        const formGroup = input.closest('.form-group');
        if (!formGroup) return true;

        let isValid = true;
        let errorMessage = '';

        // Remove existing error
        const existingError = formGroup.querySelector('.error-message');
        if (existingError) existingError.remove();
        input.classList.remove('error', 'valid');

        if (input.required && !input.value.trim()) {
            isValid = false;
            errorMessage = `${getFieldLabel(input)} is required`;
        } else if (input.type === 'email' && input.value && !validateEmail(input.value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }

        if (!isValid) {
            input.classList.add('error');
            const errorEl = document.createElement('div');
            errorEl.className = 'error-message';
            errorEl.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>${errorMessage}</span>
            `;
            formGroup.appendChild(errorEl);
        } else if (input.value) {
            input.classList.add('valid');
        }

        return isValid;
    }

    function getFieldLabel(input) {
        const label = input.closest('.form-group')?.querySelector('label');
        return label ? label.textContent.replace('*', '').trim() : 'This field';
    }

    // Validate on blur
    [emailInput, passwordInput].forEach(input => {
        if (input) {
            input.addEventListener('blur', function() {
                validateField(this);
            });
        }
    });

    // Clear error on input
    [emailInput, passwordInput].forEach(input => {
        if (input) {
            input.addEventListener('input', function() {
                if (this.classList.contains('error')) {
                    validateField(this);
                }
            });
        }
    });

    // Form submission
    if (form) {
        form.addEventListener('submit', function(e) {
            let isValid = true;

            // Validate all fields
            [emailInput, passwordInput].forEach(input => {
                if (input && !validateField(input)) {
                    isValid = false;
                }
            });

            if (!isValid) {
                e.preventDefault();
                // Scroll to first error
                const firstError = form.querySelector('.error');
                if (firstError) {
                    firstError.focus();
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            // Show loading state
            if (submitBtn) {
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
                const btnText = submitBtn.querySelector('.btn-text') || submitBtn.childNodes[0];
                if (btnText && btnText.nodeType === Node.TEXT_NODE) {
                    const span = document.createElement('span');
                    span.className = 'btn-text';
                    span.textContent = btnText.textContent;
                    submitBtn.insertBefore(span, btnText);
                    btnText.remove();
                }
            }
        });
    }

    // Keyboard accessibility for social buttons
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });

    // Remember me - pre-fill email if stored
    if (rememberCheckbox && emailInput) {
        const savedEmail = localStorage.getItem('studyRememberedEmail');
        if (savedEmail) {
            emailInput.value = savedEmail;
            rememberCheckbox.checked = true;
        }

        rememberCheckbox.addEventListener('change', function() {
            if (this.checked && emailInput.value) {
                localStorage.setItem('studyRememberedEmail', emailInput.value);
            } else {
                localStorage.removeItem('studyRememberedEmail');
            }
        });

        emailInput.addEventListener('input', function() {
            if (rememberCheckbox.checked) {
                localStorage.setItem('studyRememberedEmail', this.value);
            }
        });
    }
});
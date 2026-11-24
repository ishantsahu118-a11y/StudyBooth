// StudyLimitless - Signup Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('signupForm');
    const emailInput = document.getElementById('id_email');
    const passwordInput = document.getElementById('id_password1');
    const confirmInput = document.getElementById('id_password2');
    const tosCheckbox = document.getElementById('id_tos');
    const submitBtn = form?.querySelector('button[type="submit"]');
    const strengthBar = document.getElementById('passwordStrengthBar');

    // Password visibility toggles
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
    addPasswordToggle(confirmInput);

    // Password strength meter
    function updatePasswordStrength(password) {
        if (!strengthBar) return;

        let strength = 0;
        const checks = {
            length: password.length >= 8,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            symbol: /[^A-Za-z0-9]/.test(password)
        };

        if (checks.length) strength += 20;
        if (checks.upper) strength += 20;
        if (checks.lower) strength += 20;
        if (checks.number) strength += 20;
        if (checks.symbol) strength += 20;

        strengthBar.style.width = strength + '%';

        if (strength < 40) {
            strengthBar.style.backgroundColor = 'var(--color-danger)';
        } else if (strength < 70) {
            strengthBar.style.backgroundColor = 'var(--color-warning)';
        } else {
            strengthBar.style.backgroundColor = 'var(--color-success)';
        }

        // Update requirement indicators
        updateRequirementIndicators(checks);
    }

    function updateRequirementIndicators(checks) {
        const indicators = document.querySelectorAll('.requirement-item');
        const requirements = [
            { key: 'length', selector: '[data-req="length"]' },
            { key: 'upper', selector: '[data-req="upper"]' },
            { key: 'lower', selector: '[data-req="lower"]' },
            { key: 'number', selector: '[data-req="number"]' },
            { key: 'symbol', selector: '[data-req="symbol"]' }
        ];

        requirements.forEach(req => {
            const el = document.querySelector(req.selector);
            if (el) {
                el.classList.toggle('met', checks[req.key]);
                const icon = el.querySelector('svg');
                if (icon) {
                    icon.innerHTML = checks[req.key]
                        ? '<path d="M20 6L9 17l-5-5"></path>'
                        : '<circle cx="12" cy="12" r="10"></circle>';
                }
            }
        });
    }

    // Add requirement list to help text
    function addRequirementList() {
        const helpText = passwordInput?.parentNode?.querySelector('.help-text');
        if (!helpText) return;

        helpText.innerHTML = `
            <div class="password-requirements">
                <div class="requirement-item" data-req="length">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>
                    <span>At least 8 characters</span>
                </div>
                <div class="requirement-item" data-req="upper">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>
                    <span>One uppercase letter</span>
                </div>
                <div class="requirement-item" data-req="lower">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>
                    <span>One lowercase letter</span>
                </div>
                <div class="requirement-item" data-req="number">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>
                    <span>One number</span>
                </div>
                <div class="requirement-item" data-req="symbol">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>
                    <span>One special character</span>
                </div>
            </div>
        `;
    }

    addRequirementList();

    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            updatePasswordStrength(this.value);
            validateField(this);
        });
    }

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
        } else if (input.id === 'id_password1' && input.value) {
            if (input.value.length < 8) {
                isValid = false;
                errorMessage = 'Password must be at least 8 characters';
            }
        } else if (input.id === 'id_password2' && input.value) {
            if (input.value !== passwordInput?.value) {
                isValid = false;
                errorMessage = 'Passwords do not match';
            }
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
    [emailInput, passwordInput, confirmInput].forEach(input => {
        if (input) {
            input.addEventListener('blur', function() {
                validateField(this);
            });
        }
    });

    // Clear error on input
    [emailInput, passwordInput, confirmInput].forEach(input => {
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
        form.addEventListener('submit', async function(e) {
            let isValid = true;

            // Validate all fields
            [emailInput, passwordInput, confirmInput].forEach(input => {
                if (input && !validateField(input)) {
                    isValid = false;
                }
            });

            // Check TOS
            if (tosCheckbox && !tosCheckbox.checked) {
                isValid = false;
                const tosGroup = tosCheckbox.closest('.form-options');
                if (tosGroup) {
                    const existingError = tosGroup.querySelector('.error-message');
                    if (!existingError) {
                        const errorEl = document.createElement('div');
                        errorEl.className = 'error-message';
                        errorEl.style.marginTop = 'var(--space-2)';
                        errorEl.innerHTML = `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <span>You must agree to the Terms of Service</span>
                        `;
                        tosGroup.appendChild(errorEl);
                    }
                }
            }

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

    // TOS checkbox error clearing
    if (tosCheckbox) {
        tosCheckbox.addEventListener('change', function() {
            const tosGroup = this.closest('.form-options');
            const error = tosGroup?.querySelector('.error-message');
            if (error && this.checked) {
                error.remove();
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

    // Add styles for password requirements
    const style = document.createElement('style');
    style.textContent = `
        .password-requirements {
            display: flex;
            flex-direction: column;
            gap: var(--space-1);
            margin-top: var(--space-2);
        }

        .requirement-item {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            font-size: var(--text-xs);
            color: var(--color-text-muted);
            transition: all var(--transition-fast);
        }

        .requirement-item.met {
            color: var(--color-success);
        }

        .requirement-item.met svg {
            color: var(--color-success);
        }

        .requirement-item svg {
            flex-shrink: 0;
            transition: color var(--transition-fast);
        }
    `;
    document.head.appendChild(style);
});
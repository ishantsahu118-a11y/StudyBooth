// StudyLimitless - Main JavaScript
// Theme toggle, mobile menu, dropdowns, search, toasts, modals

(function() {
    'use strict';

    // ========================================
    // Theme Management
    // ========================================
    function initTheme() {
        const html = document.documentElement;
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            html.setAttribute('data-theme', savedTheme);
        }
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    // Initialize theme on load
    initTheme();

    // ========================================
    // Mobile Menu Toggle
    // ========================================
    function initMobileMenu() {
        const hamburger = document.getElementById('hamburgerBtn');
        const navbarMenu = document.querySelector('.navbar-menu');

        if (hamburger && navbarMenu) {
            hamburger.addEventListener('click', function() {
                const expanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', !expanded);
                navbarMenu.classList.toggle('open');
            });
        }
    }

    // ========================================
    // User Dropdown
    // ========================================
    function initUserDropdown() {
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');

        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', function() {
                const expanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', !expanded);
                userDropdown.setAttribute('aria-hidden', expanded);
            });

            document.addEventListener('click', function(e) {
                if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                    userMenuBtn.setAttribute('aria-expanded', 'false');
                    userDropdown.setAttribute('aria-hidden', 'true');
                }
            });
        }
    }

    // ========================================
    // Search Overlay
    // ========================================
    function initSearchOverlay() {
        const searchBtn = document.getElementById('searchBtn');
        const searchOverlay = document.getElementById('searchOverlay');
        const searchCloseBtn = document.getElementById('searchCloseBtn');
        const searchInput = document.getElementById('searchInput');

        if (searchBtn && searchOverlay) {
            searchBtn.addEventListener('click', function() {
                searchOverlay.setAttribute('aria-hidden', 'false');
                setTimeout(() => searchInput?.focus(), 100);
            });
        }

        if (searchCloseBtn && searchOverlay) {
            searchCloseBtn.addEventListener('click', function() {
                searchOverlay.setAttribute('aria-hidden', 'true');
            });
        }

        if (searchOverlay) {
            searchOverlay.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.setAttribute('aria-hidden', 'true');
                }
            });
        }
    }

    // ========================================
    // Keyboard Shortcuts
    // ========================================
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // ⌘K / Ctrl+K for search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                const searchOverlay = document.getElementById('searchOverlay');
                const searchInput = document.getElementById('searchInput');
                searchOverlay?.setAttribute('aria-hidden', 'false');
                setTimeout(() => searchInput?.focus(), 100);
            }

            // Escape to close modals/overlays
            if (e.key === 'Escape') {
                const searchOverlay = document.getElementById('searchOverlay');
                const userDropdown = document.getElementById('userDropdown');
                const userMenuBtn = document.getElementById('userMenuBtn');
                const navbarMenu = document.querySelector('.navbar-menu');
                const hamburger = document.getElementById('hamburgerBtn');

                searchOverlay?.setAttribute('aria-hidden', 'true');
                document.querySelectorAll('.modal-overlay:not([aria-hidden="true"])').forEach(modal => {
                    modal.setAttribute('aria-hidden', 'true');
                });
                userDropdown?.setAttribute('aria-hidden', 'true');
                userMenuBtn?.setAttribute('aria-expanded', 'false');
                navbarMenu?.classList.remove('open');
                hamburger?.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // ========================================
    // Toast Notifications
    // ========================================
    function createToastElement(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');

        const icons = {
            success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
            error: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
            warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
            info: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'
        };

        toast.innerHTML = `
            <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                ${icons[type] || icons.info}
            </svg>
            <span>${message}</span>
            <button class="toast-close" aria-label="Dismiss">&times;</button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            removeToast(toast);
        });

        return toast;
    }

    function removeToast(toast) {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }

    window.showToast = function(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = createToastElement(message, type);
        container.appendChild(toast);

        setTimeout(() => {
            removeToast(toast);
        }, duration);
    };

    // ========================================
    // Modal Helpers
    // ========================================
    window.openModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.setAttribute('aria-hidden', 'false');
            const focusable = modal.querySelector('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])');
            focusable?.focus();
        }
    };

    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.setAttribute('aria-hidden', 'true');
        }
    };

    // Close modals on overlay click
    function initModalOverlayClose() {
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.setAttribute('aria-hidden', 'true');
                }
            });
        });
    }

    // ========================================
    // Initialize All
    // ========================================
    document.addEventListener('DOMContentLoaded', function() {
        initMobileMenu();
        initUserDropdown();
        initSearchOverlay();
        initKeyboardShortcuts();
        initModalOverlayClose();
    });

    // Expose theme functions
    window.setTheme = setTheme;
})();
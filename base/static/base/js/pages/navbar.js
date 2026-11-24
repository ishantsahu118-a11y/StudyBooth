// StudyLimitless - Navbar & Search Modal JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Search modal elements
    const searchOverlay = document.getElementById('searchOverlay');
    const searchBtn = document.getElementById('searchBtn');
    const searchCloseBtn = document.getElementById('searchCloseBtn');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const recentSearches = document.getElementById('recentSearches');

    // State
    let recentSearchList = JSON.parse(localStorage.getItem('studyRecentSearches') || '[]');
    let isSearchOpen = false;

    // Initialize
    function init() {
        renderRecentSearches();
        bindEvents();
    }

    // Event bindings
    function bindEvents() {
        // Open search modal
        if (searchBtn) {
            searchBtn.addEventListener('click', openSearch);
        }

        // Close search modal
        if (searchCloseBtn) {
            searchCloseBtn.addEventListener('click', closeSearch);
        }

        // Close on overlay click
        if (searchOverlay) {
            searchOverlay.addEventListener('click', function(e) {
                if (e.target === searchOverlay) {
                    closeSearch();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Cmd/Ctrl + K to open search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (!isSearchOpen) {
                    openSearch();
                }
            }
            // Escape to close
            if (e.key === 'Escape' && isSearchOpen) {
                closeSearch();
            }
        });

        // Search input
        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleSearchInput, 200));
            searchInput.addEventListener('focus', function() {
                if (recentSearchList.length > 0) {
                    searchResults.style.display = 'block';
                }
            });
        }

        // Recent search items (delegated)
        if (recentSearches) {
            recentSearches.addEventListener('click', function(e) {
                const item = e.target.closest('.recent-item');
                if (item) {
                    const query = item.textContent.trim();
                    searchInput.value = query;
                    performSearch(query);
                }
            });
        }

        // Suggested tags (delegated)
        if (searchResults) {
            searchResults.addEventListener('click', function(e) {
                const tag = e.target.closest('.suggested-tag');
                if (tag) {
                    const query = tag.textContent.trim();
                    searchInput.value = query;
                    performSearch(query);
                }
            });
        }

        // Notification button
        const notifBtn = document.getElementById('notifBtn');
        if (notifBtn) {
            notifBtn.addEventListener('click', function() {
                showToast('Notifications coming soon!', 'info');
            });
        }

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const navbarNav = document.querySelector('.navbar-nav');
        if (mobileMenuBtn && navbarNav) {
            mobileMenuBtn.addEventListener('click', function() {
                navbarNav.classList.toggle('open');
                mobileMenuBtn.setAttribute('aria-expanded', navbarNav.classList.contains('open'));
            });
        }

        // User dropdown
        const userMenuBtn = document.getElementById('userMenuBtn');
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', function() {
                this.setAttribute('aria-expanded', this.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
            });

            // Close dropdown on outside click
            document.addEventListener('click', function(e) {
                if (!userMenuBtn.contains(e.target) && !e.target.closest('.navbar-dropdown')) {
                    userMenuBtn.setAttribute('aria-expanded', 'false');
                }
            });
        }

        // Create room modal
        const createRoomBtn = document.getElementById('createRoomBtn');
        const createRoomModal = document.getElementById('createRoomModal');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const cancelCreateBtn = document.getElementById('cancelCreateBtn');
        const createRoomForm = document.getElementById('createRoomForm');

        if (createRoomBtn && createRoomModal) {
            createRoomBtn.addEventListener('click', function() {
                createRoomModal.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
            });
        }

        function closeCreateModal() {
            if (createRoomModal) {
                createRoomModal.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
            }
        }

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeCreateModal);
        if (cancelCreateBtn) cancelCreateBtn.addEventListener('click', closeCreateModal);
        if (createRoomModal) {
            createRoomModal.addEventListener('click', function(e) {
                if (e.target === createRoomModal) closeCreateModal();
            });
        }

        if (createRoomForm) {
            createRoomForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const formData = new FormData(this);
                const roomData = Object.fromEntries(formData);
                roomData.features = formData.getAll('features');
                console.log('Create room:', roomData);
                showToast('Room creation coming soon!', 'success');
                closeCreateModal();
            });
        }
    }

    // Search functions
    function openSearch() {
        if (searchOverlay) {
            searchOverlay.setAttribute('aria-hidden', 'false');
            isSearchOpen = true;
            document.body.style.overflow = 'hidden';
            setTimeout(() => searchInput?.focus(), 100);
        }
    }

    function closeSearch() {
        if (searchOverlay) {
            searchOverlay.setAttribute('aria-hidden', 'true');
            isSearchOpen = false;
            document.body.style.overflow = '';
            searchInput.value = '';
            searchResults.style.display = 'none';
        }
    }

    function handleSearchInput() {
        const query = searchInput.value.trim().toLowerCase();
        if (query.length >= 2) {
            performSearch(query);
        } else if (recentSearchList.length > 0) {
            renderRecentSearches();
            searchResults.style.display = 'block';
        }
    }

    function performSearch(query) {
        if (!query) return;

        // Save to recent searches
        saveRecentSearch(query);

        // Show loading state
        searchResults.innerHTML = `
            <div class="search-section">
                <div class="search-loading">
                    <div class="animate-spin" style="width: 24px; height: 24px; border: 2px solid var(--color-border); border-top-color: var(--color-primary); border-radius: 50%; margin: var(--space-4) auto;"></div>
                    <p style="text-align: center; color: var(--color-text-muted);">Searching...</p>
                </div>
            </div>
        `;
        searchResults.style.display = 'block';

        // Simulate search API call
        setTimeout(() => {
            // In real app, this would be an API call
            const results = mockSearchResults(query);
            renderSearchResults(results, query);
        }, 500);
    }

    function mockSearchResults(query) {
        const allRooms = [
            { id: 1, name: 'Morning Focus Session', topic: 'General', participants: 12, max: 20, type: 'Pomodoro' },
            { id: 2, name: 'CS & Programming', topic: 'Computer Science', participants: 24, max: 30, type: 'Open Session' },
            { id: 3, name: 'Math & Science Study Group', topic: 'Mathematics', participants: 8, max: 15, type: 'Structured' },
            { id: 4, name: 'Language Exchange - English/Spanish', topic: 'Languages', participants: 15, max: 25, type: 'Custom Timer' },
            { id: 5, name: 'Physics Problem Solving', topic: 'Science', participants: 6, max: 10, type: 'Pomodoro' },
            { id: 6, name: 'Deep Focus Session', topic: 'General', participants: 18, max: 20, type: 'Open Session' },
            { id: 7, name: 'Creative Writing Circle', topic: 'Writing', participants: 5, max: 12, type: 'Structured' },
            { id: 8, name: 'Exam Prep - Final Review', topic: 'Exam Prep', participants: 22, max: 30, type: 'Custom Timer' },
        ];

        return allRooms.filter(room =>
            room.name.toLowerCase().includes(query) ||
            room.topic.toLowerCase().includes(query)
        );
    }

    function renderSearchResults(results, query) {
        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="search-section">
                    <div class="search-empty">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto var(--space-4); color: var(--color-text-muted);">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <p style="text-align: center; color: var(--color-text-muted);">No rooms found for "${query}"</p>
                        <a href="{% url 'Create Room' %}" class="btn btn-primary" style="display: block; width: fit-content; margin: var(--space-4) auto; text-align: center;">Create a new room</a>
                    </div>
                </div>
            `;
            return;
        }

        searchResults.innerHTML = `
            <div class="search-section">
                <h4 class="search-section-title">Rooms (${results.length})</h4>
                <div class="search-results-list">
                    ${results.map(room => `
                        <a href="/room/${room.id}/" class="search-result-item">
                            <div class="result-info">
                                <h5 class="result-name">${highlightMatch(room.name, query)}</h5>
                                <div class="result-meta">
                                    <span class="result-topic">${room.topic}</span>
                                    <span class="result-type">${room.type}</span>
                                </div>
                            </div>
                            <div class="result-participants">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                </svg>
                                <span>${room.participants}/${room.max}</span>
                            </div>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Recent searches
    function saveRecentSearch(query) {
        recentSearchList = recentSearchList.filter(s => s.toLowerCase() !== query.toLowerCase());
        recentSearchList.unshift(query);
        recentSearchList = recentSearchList.slice(0, 5);
        localStorage.setItem('studyRecentSearches', JSON.stringify(recentSearchList));
        renderRecentSearches();
    }

    function renderRecentSearches() {
        if (!recentSearches) return;

        if (recentSearchList.length === 0) {
            recentSearches.innerHTML = '<p class="search-empty-text">No recent searches</p>';
            return;
        }

        recentSearches.innerHTML = recentSearchList.map(search => `
            <li class="recent-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-9 9Z"></path>
                    <path d="M3 12v9h9"></path>
                </svg>
                <span>${escapeHtml(search)}</span>
                <button class="recent-delete" aria-label="Remove" data-search="${escapeHtml(search)}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </li>
        `).join('');

        // Bind delete buttons
        recentSearches.querySelectorAll('.recent-delete').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const search = this.dataset.search;
                recentSearchList = recentSearchList.filter(s => s !== search);
                localStorage.setItem('studyRecentSearches', JSON.stringify(recentSearchList));
                renderRecentSearches();
            });
        });
    }

    // Toast notifications
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                ${type === 'success' ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>' : ''}
                ${type === 'error' ? '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>' : ''}
                ${type === 'warning' ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>' : ''}
                ${type === 'info' ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>' : ''}
            </svg>
            <span>${escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Utility functions
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });

        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    function updateThemeIcon(theme) {
        if (themeToggle) {
            themeToggle.innerHTML = theme === 'dark'
                ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
                : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        }
    }

    // Initialize
    init();
});
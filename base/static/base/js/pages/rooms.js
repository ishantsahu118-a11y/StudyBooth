// StudyLimitless - Study Rooms Page JavaScript
// Filtering, pagination, view toggle, search

document.addEventListener('DOMContentLoaded', function() {
    // State
    const state = {
        view: localStorage.getItem('roomsView') || 'grid',
        currentPage: 1,
        roomsPerPage: 12,
    };

    // Elements
    const roomsGrid = document.getElementById('roomsGrid');
    const roomsContainer = document.querySelector('.rooms-content');
    const viewToggleBtns = document.querySelectorAll('.view-btn');
    const mobileFiltersToggle = document.getElementById('mobileFiltersToggle');
    const filtersSidebar = document.querySelector('.filters-sidebar');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const clearFiltersBtn2 = document.getElementById('clearFiltersBtn2');
    const filterForms = document.querySelectorAll('.filter-section form');
    const filterOptionInputs = document.querySelectorAll('.filter-option input[type="radio"]');

    // Initialize
    function init() {
        applyView();
        bindEvents();
        highlightActiveFilters();
    }

    // Event bindings
    function bindEvents() {
        // View toggle
        viewToggleBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const view = this.dataset.view;
                if (view && view !== state.view) {
                    setView(view);
                }
            });
        });

        // Mobile filters toggle
        if (mobileFiltersToggle && filtersSidebar) {
            mobileFiltersToggle.addEventListener('click', function() {
                filtersSidebar.classList.toggle('open');
                this.setAttribute('aria-expanded', filtersSidebar.classList.contains('open'));
            });

            // Close on outside click
            document.addEventListener('click', function(e) {
                if (!filtersSidebar.contains(e.target) && !mobileFiltersToggle.contains(e.target)) {
                    filtersSidebar.classList.remove('open');
                    mobileFiltersToggle.setAttribute('aria-expanded', 'false');
                }
            });

            // Close on escape
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && filtersSidebar.classList.contains('open')) {
                    filtersSidebar.classList.remove('open');
                    mobileFiltersToggle.setAttribute('aria-expanded', 'false');
                }
            });
        }

        // Clear filters
        function clearFilters() {
            const url = new URL(window.location.href);
            url.search = '';
            window.location.href = url.toString();
        }

        clearFiltersBtn?.addEventListener('click', clearFilters);
        clearFiltersBtn2?.addEventListener('click', clearFilters);

        // Filter option radios - submit form on change
        filterOptionInputs.forEach(input => {
            input.addEventListener('change', function() {
                const form = this.closest('form');
                if (form) {
                    form.submit();
                }
            });
        });

        // Keyboard navigation for room cards
        document.querySelectorAll('.room-card').forEach(card => {
            card.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    const link = this.querySelector('a.btn-join-room');
                    if (link) {
                        e.preventDefault();
                        link.click();
                    }
                }
            });
            card.setAttribute('tabindex', '0');
        });

        // Search form - add debounce
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            const form = searchInput.closest('form');
            let debounceTimer;

            searchInput.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    if (form) {
                        form.submit();
                    }
                }, 500);
            });
        }

        // Pagination
        document.querySelectorAll('.page-btn:not(.active):not(:disabled)').forEach(btn => {
            btn.addEventListener('click', function() {
                const page = this.dataset.page;
                if (page) {
                    navigateToPage(parseInt(page));
                }
            });
        });
    }

    // View management
    function setView(view) {
        state.view = view;
        localStorage.setItem('roomsView', view);
        applyView();

        // Update button states
        viewToggleBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
            btn.setAttribute('aria-pressed', btn.dataset.view === view);
        });
    }

    function applyView() {
        if (!roomsGrid) return;

        if (state.view === 'list') {
            roomsGrid.classList.remove('rooms-grid');
            roomsGrid.classList.add('rooms-list');
        } else {
            roomsGrid.classList.remove('rooms-list');
            roomsGrid.classList.add('rooms-grid');
        }
    }

    // Highlight active filter options
    function highlightActiveFilters() {
        filterOptionInputs.forEach(input => {
            const option = input.closest('.filter-option');
            if (option) {
                option.classList.toggle('active', input.checked);
            }
        });
    }

    // Pagination (client-side for better UX)
    function navigateToPage(page) {
        if (page < 1) return;

        const url = new URL(window.location.href);
        url.searchParams.set('page', page);
        window.location.href = url.toString();
    }

    // Initialize
    init();
});

// Utility: Debounce
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
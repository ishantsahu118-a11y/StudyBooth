// StudyLimitless - Profile Page JavaScript
// Tabs, follow button, dynamic content loading

document.addEventListener('DOMContentLoaded', function() {
    // State
    const state = {
        currentTab: 'rooms',
        isOwnProfile: false,
        followed: false,
    };

    // Elements
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const followBtn = document.getElementById('followBtn');
    const followCount = document.getElementById('followCount');
    const followerCount = document.getElementById('followerCount');

    // Initialize
    function init() {
        detectOwnProfile();
        bindTabEvents();
        bindFollowEvent();
        loadTabContent('rooms');
    }

    function detectOwnProfile() {
        // Check if we're on our own profile
        const profileUsername = document.body.dataset.profileUsername;
        const currentUsername = document.body.dataset.currentUsername;
        state.isOwnProfile = profileUsername === currentUsername;
    }

    function bindTabEvents() {
        tabButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const tab = this.dataset.tab;
                if (tab && tab !== state.currentTab) {
                    switchTab(tab);
                }
            });
        });
    }

    function switchTab(tab) {
        state.currentTab = tab;

        // Update button states
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update panel states
        tabPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `tab-${tab}`);
        });

        // Load content if not loaded
        loadTabContent(tab);
    }

    function loadTabContent(tab) {
        const panel = document.getElementById(`tab-${tab}`);
        if (!panel || panel.dataset.loaded === 'true') return;

        panel.dataset.loaded = 'true';
        panel.innerHTML = '<div class="loading-placeholder">Loading...</div>';

        // In a real app, this would fetch from an API endpoint
        // For now, the content is server-rendered
        // This function is a placeholder for future AJAX loading
    }

    function bindFollowEvent() {
        if (!followBtn || state.isOwnProfile) return;

        followBtn.addEventListener('click', handleFollow);
    }

    async function handleFollow() {
        const username = followBtn.dataset.username;
        if (!username) return;

        followBtn.disabled = true;
        const originalText = followBtn.innerHTML;

        try {
            const response = await fetch(`/follow/${username}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (data.success) {
                state.followed = data.following;
                updateFollowUI(data.following);
                updateFollowCounts(data.following ? 1 : -1);
                showToast(data.following ? 'Now following' : 'Unfollowed', 'success');
            } else {
                showToast(data.error || 'Failed to update follow', 'error');
            }
        } catch (error) {
            console.error('Follow error:', error);
            showToast('An error occurred', 'error');
        } finally {
            followBtn.disabled = false;
        }
    }

    function updateFollowUI(following) {
        if (following) {
            followBtn.classList.remove('btn-primary');
            followBtn.classList.add('btn-secondary');
            followBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                Unfollow
            `;
        } else {
            followBtn.classList.remove('btn-secondary');
            followBtn.classList.add('btn-primary');
            followBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                </svg>
                Follow
            `;
        }
    }

    function updateFollowCounts(delta) {
        if (followCount) {
            const current = parseInt(followCount.textContent.replace(/,/g, '')) || 0;
            followCount.textContent = Math.max(0, current + delta).toLocaleString();
        }
        if (followerCount) {
            const current = parseInt(followerCount.textContent.replace(/,/g, '')) || 0;
            followerCount.textContent = Math.max(0, current + delta).toLocaleString();
        }
    }

    function getCSRFToken() {
        const cookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
        return cookie ? cookie.split('=')[1] : '';
    }

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
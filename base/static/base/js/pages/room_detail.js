// StudyLimitless - Room Detail Page JavaScript
// Pomodoro Timer, Chat, Participants

document.addEventListener('DOMContentLoaded', function() {
    // State
    const state = {
        timer: {
            mode: 'work', // 'work', 'shortBreak', 'longBreak'
            timeRemaining: 25 * 60, // seconds
            totalTime: 25 * 60,
            isRunning: false,
            sessionsCompleted: 0,
            settings: {
                workDuration: 25,
                shortBreakDuration: 5,
                longBreakDuration: 15,
                sessionsBeforeLongBreak: 4,
                autoStartBreaks: false,
                autoStartWork: false,
                soundEnabled: true,
            }
        },
        chat: {
            messages: [],
            connected: false
        }
    };

    // DOM Elements
    const timerElements = {
        circle: document.querySelector('.timer-circle-progress'),
        timeValue: document.querySelector('.timer-time-value'),
        timeLabel: document.querySelector('.timer-time-label'),
        phaseIndicator: document.querySelector('.timer-phase-indicator'),
        phaseIcon: document.querySelector('.phase-icon'),
        modeBtns: document.querySelectorAll('.timer-mode-btn'),
        startBtn: document.getElementById('timerStartBtn'),
        pauseBtn: document.getElementById('timerPauseBtn'),
        resetBtn: document.getElementById('timerResetBtn'),
        settingsToggle: document.getElementById('settingsToggle'),
        settingsPanel: document.getElementById('settingsPanel'),
        sessionCount: document.getElementById('sessionCount'),
    };

    const chatElements = {
        messagesContainer: document.getElementById('chatMessages'),
        inputForm: document.getElementById('chatInputForm'),
        input: document.getElementById('chatInput'),
        sendBtn: document.getElementById('chatSendBtn'),
    };

    // Constants
    const CIRCUMFERENCE = 2 * Math.PI * 140; // 879.65
    const PHASE_LABELS = {
        work: 'Focus Time',
        shortBreak: 'Short Break',
        longBreak: 'Long Break'
    };
    const PHASE_ICONS = {
        work: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
        shortBreak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
        longBreak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>'
    };

    // Initialize
    function init() {
        loadSettings();
        bindTimerEvents();
        bindChatEvents();
        updateTimerDisplay();
        initTooltips();
    }

    // Timer Functions
    function loadSettings() {
        const saved = localStorage.getItem('pomodoroSettings');
        if (saved) {
            try {
                state.timer.settings = { ...state.timer.settings, ...JSON.parse(saved) };
                applySettingsToInputs();
                setMode('work'); // Reset to work mode with new settings
            } catch (e) {
                console.warn('Failed to parse saved settings:', e);
            }
        }
    }

    function saveSettings() {
        localStorage.setItem('pomodoroSettings', JSON.stringify(state.timer.settings));
    }

    function applySettingsToInputs() {
        document.getElementById('workDuration').value = state.timer.settings.workDuration;
        document.getElementById('shortBreakDuration').value = state.timer.settings.shortBreakDuration;
        document.getElementById('longBreakDuration').value = state.timer.settings.longBreakDuration;
        document.getElementById('sessionsBeforeLongBreak').value = state.timer.settings.sessionsBeforeLongBreak;
        document.getElementById('autoStartBreaks').checked = state.timer.settings.autoStartBreaks;
        document.getElementById('autoStartWork').checked = state.timer.settings.autoStartWork;
        document.getElementById('soundEnabled').checked = state.timer.settings.soundEnabled;
    }

    function bindTimerEvents() {
        // Mode toggle buttons
        timerElements.modeBtns.forEach(btn => {
            btn.addEventListener('click', () => setMode(btn.dataset.mode));
        });

        // Main controls
        timerElements.startBtn?.addEventListener('click', startTimer);
        timerElements.pauseBtn?.addEventListener('click', pauseTimer);
        timerElements.resetBtn?.addEventListener('click', resetTimer);

        // Settings
        timerElements.settingsToggle?.addEventListener('click', toggleSettings);
        document.querySelectorAll('.setting-input').forEach(input => {
            input.addEventListener('change', saveSettingsFromInputs);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }

    function handleKeyboardShortcuts(e) {
        // Space to start/pause
        if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
            e.preventDefault();
            if (state.timer.isRunning) {
                pauseTimer();
            } else {
                startTimer();
            }
        }
        // R to reset
        if (e.key === 'r' && !e.target.matches('input, textarea, select')) {
            resetTimer();
        }
        // 1/2/3 for modes
        if (['1', '2', '3'].includes(e.key) && !e.target.matches('input, textarea, select')) {
            const modes = ['work', 'shortBreak', 'longBreak'];
            setMode(modes[parseInt(e.key) - 1]);
        }
    }

    function setMode(mode) {
        if (state.timer.isRunning) return;

        state.timer.mode = mode;
        const durations = {
            work: state.timer.settings.workDuration,
            shortBreak: state.timer.settings.shortBreakDuration,
            longBreak: state.timer.settings.longBreakDuration
        };
        state.timer.totalTime = durations[mode] * 60;
        state.timer.timeRemaining = state.timer.totalTime;

        // Update UI
        timerElements.modeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        if (timerElements.phaseIcon) {
            timerElements.phaseIcon.innerHTML = PHASE_ICONS[mode];
            timerElements.phaseIcon.className = 'phase-icon ' + mode;
        }

        updateTimerDisplay();
    }

    function startTimer() {
        if (state.timer.isRunning) return;
        state.timer.isRunning = true;
        updateControlButtons();
        tick();
    }

    function pauseTimer() {
        if (!state.timer.isRunning) return;
        state.timer.isRunning = false;
        updateControlButtons();
    }

    function resetTimer() {
        state.timer.isRunning = false;
        state.timer.timeRemaining = state.timer.totalTime;
        updateControlButtons();
        updateTimerDisplay();
    }

    function tick() {
        if (!state.timer.isRunning) return;

        state.timer.timeRemaining--;

        if (state.timer.timeRemaining <= 0) {
            handleTimerComplete();
            return;
        }

        updateTimerDisplay();
        requestAnimationFrame(tick);
    }

    function handleTimerComplete() {
        state.timer.isRunning = false;
        playNotificationSound();

        if (state.timer.mode === 'work') {
            state.timer.sessionsCompleted++;
            updateSessionCount();

            // Determine next break
            const isLongBreak = state.timer.sessionsCompleted % state.timer.settings.sessionsBeforeLongBreak === 0;
            const nextMode = isLongBreak ? 'longBreak' : 'shortBreak';

            if (state.timer.settings.autoStartBreaks) {
                setMode(nextMode);
                startTimer();
            } else {
                setMode(nextMode);
                showNotification('Work session complete!', `Time for a ${isLongBreak ? 'long' : 'short'} break.`);
            }
        } else {
            // Break completed
            if (state.timer.settings.autoStartWork) {
                setMode('work');
                startTimer();
            } else {
                setMode('work');
                showNotification('Break complete!', 'Ready to focus?');
            }
        }

        updateControlButtons();
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(state.timer.timeRemaining / 60);
        const seconds = state.timer.timeRemaining % 60;

        if (timerElements.timeValue) {
            timerElements.timeValue.textContent =
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        if (timerElements.timeLabel) {
            timerElements.timeLabel.textContent = PHASE_LABELS[state.timer.mode];
        }

        // Update progress circle
        if (timerElements.circle) {
            const progress = 1 - (state.timer.timeRemaining / state.timer.totalTime);
            const offset = CIRCUMFERENCE * progress;
            timerElements.circle.style.strokeDashoffset = offset;

            // Color changes based on time remaining
            timerElements.circle.classList.remove('warning', 'danger');
            if (state.timer.timeRemaining <= 60) {
                timerElements.circle.classList.add('danger');
            } else if (state.timer.timeRemaining <= 300) { // 5 minutes
                timerElements.circle.classList.add('warning');
            }
        }
    }

    function updateControlButtons() {
        const isRunning = state.timer.isRunning;

        if (timerElements.startBtn) {
            timerElements.startBtn.style.display = isRunning ? 'none' : 'inline-flex';
            timerElements.startBtn.disabled = isRunning;
        }
        if (timerElements.pauseBtn) {
            timerElements.pauseBtn.style.display = isRunning ? 'inline-flex' : 'none';
        }
        if (timerElements.resetBtn) {
            timerElements.resetBtn.disabled = state.timer.timeRemaining === state.timer.totalTime;
        }

        // Disable mode buttons when running
        timerElements.modeBtns.forEach(btn => {
            btn.disabled = isRunning;
            btn.style.opacity = isRunning ? '0.5' : '1';
        });
    }

    function updateSessionCount() {
        if (timerElements.sessionCount) {
            timerElements.sessionCount.textContent = state.timer.sessionsCompleted;
        }
    }

    function toggleSettings() {
        const isOpen = timerElements.settingsPanel.classList.toggle('open');
        timerElements.settingsToggle.setAttribute('aria-expanded', isOpen);

        // Rotate icon
        const icon = timerElements.settingsToggle.querySelector('svg');
        if (icon) {
            icon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0)';
        }
    }

    function saveSettingsFromInputs() {
        state.timer.settings = {
            workDuration: parseInt(document.getElementById('workDuration').value) || 25,
            shortBreakDuration: parseInt(document.getElementById('shortBreakDuration').value) || 5,
            longBreakDuration: parseInt(document.getElementById('longBreakDuration').value) || 15,
            sessionsBeforeLongBreak: parseInt(document.getElementById('sessionsBeforeLongBreak').value) || 4,
            autoStartBreaks: document.getElementById('autoStartBreaks').checked,
            autoStartWork: document.getElementById('autoStartWork').checked,
            soundEnabled: document.getElementById('soundEnabled').checked,
        };
        saveSettings();
        setMode(state.timer.mode); // Reapply current mode with new settings
    }

    function playNotificationSound() {
        if (!state.timer.settings.soundEnabled) return;

        // Create audio context for notification sound
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.5);
        } catch (e) {
            console.warn('Could not play notification sound:', e);
        }
    }

    function showNotification(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body });
                }
            });
        }
    }

    // Chat Functions
    function bindChatEvents() {
        if (!chatElements.inputForm) return;

        chatElements.inputForm.addEventListener('submit', sendMessage);
        chatElements.input?.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
            }
        });

        // Load existing messages
        loadChatMessages();
    }

    function loadChatMessages() {
        // In a real app, this would fetch from server
        // For now, show empty state
        if (chatElements.messagesContainer) {
            chatElements.messagesContainer.innerHTML = `
                <div class="sidebar-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <p>No messages yet</p>
                    <small>Be the first to say hello!</small>
                </div>
            `;
        }
    }

    function sendMessage(e) {
        e.preventDefault();
        const text = chatElements.input.value.trim();
        if (!text) return;

        // Add message to UI (optimistic)
        appendMessage({
            sender: 'You',
            text: text,
            time: new Date(),
            own: true
        });

        chatElements.input.value = '';
        chatElements.messagesContainer.scrollTop = chatElements.messagesContainer.scrollHeight;

        // In real app: send to server via WebSocket
        // socket.emit('chat:message', { roomId, text });
    }

    function appendMessage(message) {
        if (!chatElements.messagesContainer) return;

        // Remove empty state if present
        const emptyState = chatElements.messagesContainer.querySelector('.sidebar-empty');
        if (emptyState) emptyState.remove();

        const timeStr = message.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const initials = message.sender.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

        const msgEl = document.createElement('div');
        msgEl.className = `chat-message ${message.own ? 'own' : ''}`;
        msgEl.innerHTML = `
            <div class="chat-message-avatar">${initials}</div>
            <div class="chat-message-content">
                <div class="chat-message-header">
                    <span class="chat-message-sender">${message.sender}</span>
                    <span class="chat-message-time">${timeStr}</span>
                </div>
                <div class="chat-message-text">${escapeHtml(message.text)}</div>
            </div>
        `;

        chatElements.messagesContainer.appendChild(msgEl);
        chatElements.messagesContainer.scrollTop = chatElements.messagesContainer.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Tooltips for keyboard shortcuts
    function initTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(el => {
            el.addEventListener('mouseenter', showTooltip);
            el.addEventListener('mouseleave', hideTooltip);
        });
    }

    function showTooltip(e) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = e.target.dataset.tooltip;
        document.body.appendChild(tooltip);

        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';

        e.target._tooltip = tooltip;
    }

    function hideTooltip(e) {
        if (e.target._tooltip) {
            e.target._tooltip.remove();
            e.target._tooltip = null;
        }
    }

    // Initialize
    init();
});

// Expose for potential external control
window.StudyLimitless = window.StudyLimitless || {};
window.StudyLimitless.roomDetail = {
    // Could add methods to control timer from outside
};
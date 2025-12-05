document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        currentView: 'dashboard',
        selectedDate: new Date(),
        currentMonth: new Date()
    };

    // --- Mock Data ---
    const mockData = {
        jobs: [
            { id: 1, title: 'Leaky Faucet Repair', client: 'Alice Johnson', time: '09:00', duration: '1h', type: 'job', status: 'pending', date: '2025-12-05' },
            { id: 2, title: 'Boiler Maintenance', client: 'TechCorp Offices', time: '11:00', duration: '2h', type: 'job', status: 'completed', date: '2025-12-05' },
            { id: 3, title: 'Emergency Pipe Burst', client: 'Bob Smith', time: '14:30', duration: '3h', type: 'urgent', status: 'pending', date: '2025-12-05' },
            { id: 4, title: 'Parts Delivery: Copper Pipes', client: 'Internal', time: '08:00', duration: '', type: 'delivery', status: 'arrived', date: '2025-12-05' },
            { id: 5, title: 'Invoice Due: #INV-2024-001', client: 'Sarah Connor', time: '17:00', duration: '', type: 'invoice', status: 'unpaid', date: '2025-12-05' },
            { id: 6, title: 'Bathroom Reno Quote', client: 'Mike Ross', time: '10:00', duration: '1h', type: 'quote', status: 'pending', date: '2025-12-06' }
        ],
        messages: [
            { id: 1, from: 'Alice Johnson', text: 'Is the plumber still coming at 9?', time: '08:45', date: '2025-12-05' },
            { id: 2, from: 'Supplier', text: 'Your copper fittings are on backorder.', time: '09:15', date: '2025-12-05' }
        ]
    };

    // --- DOM Elements ---
    const viewContainer = document.getElementById('view-container');
    const pageTitle = document.getElementById('page-title');
    const navItems = document.querySelectorAll('.nav-item');
    const dateDisplay = document.getElementById('current-date-display');

    // --- Navigation Logic ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = item.dataset.view;

            // Update Active State
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Switch View
            state.currentView = viewName;
            renderView(viewName);
        });
    });

    // --- View Rendering ---
    function renderView(viewName) {
        viewContainer.innerHTML = ''; // Clear container

        if (viewName === 'dashboard') {
            const template = document.getElementById('template-dashboard');
            const clone = template.content.cloneNode(true);
            viewContainer.appendChild(clone);
            pageTitle.innerText = 'Dashboard Overview';
            renderDashboardActivity();
        } else if (viewName === 'calendar') {
            const template = document.getElementById('template-calendar');
            const clone = template.content.cloneNode(true);
            viewContainer.appendChild(clone);
            pageTitle.innerText = 'Daily Schedule';
            initCalendar();
        } else {
            // Placeholder for other views
            viewContainer.innerHTML = `<div style="text-align:center; padding: 40px; color: #64748b;">
                <i data-lucide="construction" style="width: 48px; height: 48px;"></i>
                <h2>${viewName.charAt(0).toUpperCase() + viewName.slice(1)} View</h2>
                <p>This module is under construction in the test environment.</p>
            </div>`;
            pageTitle.innerText = viewName.charAt(0).toUpperCase() + viewName.slice(1);
            lucide.createIcons();
        }
    }

    // --- Calendar Logic ---
    function initCalendar() {
        renderMiniCalendar();
        renderDayTimeline();

        // Event Listeners for Month Nav
        document.getElementById('prev-month').addEventListener('click', () => {
            state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
            renderMiniCalendar();
        });
        document.getElementById('next-month').addEventListener('click', () => {
            state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
            renderMiniCalendar();
        });
    }

    function renderMiniCalendar() {
        const grid = document.getElementById('mini-calendar-grid');
        const monthYear = document.getElementById('calendar-month-year');

        // Update Header
        monthYear.innerText = state.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        grid.innerHTML = '';

        // Simple Calendar Gen
        const year = state.currentMonth.getFullYear();
        const month = state.currentMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty slots
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            grid.appendChild(empty);
        }

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.innerText = i;

            // Check if matches selected date
            const thisDate = new Date(year, month, i);
            if (isSameDate(thisDate, state.selectedDate)) {
                dayEl.classList.add('selected');
            }

            // Mock Data Check (Add dot if events exist)
            const dateStr = thisDate.toISOString().split('T')[0];
            const hasEvents = mockData.jobs.some(j => j.date === dateStr);
            if (hasEvents) dayEl.classList.add('has-event');

            dayEl.addEventListener('click', () => {
                state.selectedDate = thisDate;
                renderMiniCalendar(); // Re-render to update selected style
                renderDayTimeline();
            });

            grid.appendChild(dayEl);
        }
        lucide.createIcons();
    }

    function renderDayTimeline() {
        const timeline = document.getElementById('day-timeline');
        const title = document.getElementById('selected-date-title');

        // Update Title
        title.innerText = state.selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

        // Filter Events
        const dateStr = state.selectedDate.toISOString().split('T')[0];
        const events = mockData.jobs.filter(j => j.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));

        timeline.innerHTML = '';

        if (events.length === 0) {
            timeline.innerHTML = '<p style="color: #94a3b8; padding: 20px;">No events scheduled for this day.</p>';
            return;
        }

        events.forEach(event => {
            const el = document.createElement('div');
            el.className = 'timeline-item';

            // Icon based on type
            let iconName = 'briefcase';
            if (event.type === 'delivery') iconName = 'package';
            if (event.type === 'urgent') iconName = 'alert-circle';
            if (event.type === 'invoice') iconName = 'file-text';

            el.innerHTML = `
                <div class="timeline-card" style="border-left: 4px solid ${getTypeColor(event.type)}">
                    <div class="timeline-time">${event.time}</div>
                    <div class="timeline-content">
                        <h4>${event.title} <i data-lucide="${iconName}" size="14" style="color: #64748b"></i></h4>
                        <p>${event.client} ${event.duration ? '• ' + event.duration : ''}</p>
                    </div>
                </div>
            `;
            timeline.appendChild(el);
        });
        lucide.createIcons();
    }

    function renderDashboardActivity() {
        const list = document.getElementById('dashboard-activity-list');
        // Just showing today's events as specific "Snapshot"
        // In a real app, this might be recent log entries
        const todayStr = '2025-12-05'; // Hardcoded for demo to match mock data
        const events = mockData.jobs.filter(j => j.date === todayStr);

        events.forEach(event => {
            const item = document.createElement('div');
            item.style.padding = '12px';
            item.style.borderBottom = '1px solid #f1f5f9';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.innerHTML = `
                <span><strong>${event.time}</strong> - ${event.title}</span>
                <span class="tag" style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">${event.status}</span>
            `;
            list.appendChild(item);
        });
    }

    // --- Helpers ---
    function isSameDate(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    }

    function getTypeColor(type) {
        if (type === 'urgent') return '#ef4444';
        if (type === 'delivery') return '#f59e0b';
        if (type === 'invoice') return '#3b82f6';
        return '#0f172a'; // Default
    }

    // Initialize
    dateDisplay.innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    renderView('dashboard');
});

// --- Firebase Imports (CDN) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyDlyKtJAka3sNrgWO7gTItSRluQRmqVbYU",
    authDomain: "test-crm-plumbing.firebaseapp.com",
    projectId: "test-crm-plumbing",
    storageBucket: "test-crm-plumbing.firebasestorage.app",
    messagingSenderId: "1025444235318",
    appId: "1:1025444235318:web:fe32a9a3a29fc0a29d3097",
    measurementId: "G-LMSXPCV10Z"
};

// --- Init Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Application State ---
const state = {
    currentView: 'dashboard',
    selectedDate: new Date(),
    currentMonth: new Date(),
    // Data now comes from Firebase
    data: {
        jobs: [],
        messages: []
    }
};

// --- DOM Elements ---
const viewContainer = document.getElementById('view-container');
const pageTitle = document.getElementById('page-title');
const navItems = document.querySelectorAll('.nav-item');
const dateDisplay = document.getElementById('current-date-display');

// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Navigation
    setupNavigation();

    // 2. Set Date Header
    dateDisplay.innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // 3. Start Data Sync
    syncData();
});

// --- Firebase Data Sync ---
async function syncData() {
    console.log("Starting Firebase Sync...");

    // Check if we need to seed data (First run check)
    const jobsRef = collection(db, "jobs");
    const snapshot = await getDocs(jobsRef);

    if (snapshot.empty) {
        console.log("Database empty. Seeding initial data...");
        await seedDatabase();
    }

    // Set up Real-time Listeners
    setupListeners();
}

function setupListeners() {
    // Listen to JOBS
    const jobsQuery = query(collection(db, "jobs"));
    onSnapshot(jobsQuery, (snapshot) => {
        state.data.jobs = [];
        snapshot.forEach((doc) => {
            state.data.jobs.push({ id: doc.id, ...doc.data() });
        });
        console.log("Jobs Updated:", state.data.jobs);
        refreshCurrentView();
    });

    // Listen to MESSAGES
    const msgQuery = query(collection(db, "messages"), orderBy("time")); // Assuming simple ordering
    onSnapshot(msgQuery, (snapshot) => {
        state.data.messages = [];
        snapshot.forEach((doc) => {
            state.data.messages.push({ id: doc.id, ...doc.data() });
        });
        console.log("Messages Updated:", state.data.messages);

        // Update badge count
        const badge = document.querySelector('.nav-item[data-view="messages"] .badge');
        if (badge) badge.innerText = state.data.messages.length;
    });
}

function refreshCurrentView() {
    // Re-render the current active view with new data
    if (state.currentView === 'calendar') {
        renderMiniCalendar();
        renderDayTimeline();
    } else if (state.currentView === 'dashboard') {
        renderDashboardActivity();
        updateDashboardStats();
    }
}

// --- Seeding Logic (Run once) ---
async function seedDatabase() {
    const initialJobs = [
        { title: 'Leaky Faucet Repair', client: 'Alice Johnson', time: '09:00', duration: '1h', type: 'job', status: 'pending', date: '2025-12-05' },
        { title: 'Boiler Maintenance', client: 'TechCorp Offices', time: '11:00', duration: '2h', type: 'job', status: 'completed', date: '2025-12-05' },
        { title: 'Emergency Pipe Burst', client: 'Bob Smith', time: '14:30', duration: '3h', type: 'urgent', status: 'pending', date: '2025-12-05' },
        { title: 'Parts Delivery: Copper Pipes', client: 'Internal', time: '08:00', duration: '', type: 'delivery', status: 'arrived', date: '2025-12-05' },
        { title: 'Invoice Due: #INV-2024-001', client: 'Sarah Connor', time: '17:00', duration: '', type: 'invoice', status: 'unpaid', date: '2025-12-05' },
        { title: 'Bathroom Reno Quote', client: 'Mike Ross', time: '10:00', duration: '1h', type: 'quote', status: 'pending', date: '2025-12-06' }
    ];
    renderMiniCalendar();
});
}

function renderMiniCalendar() {
    const grid = document.getElementById('mini-calendar-grid');
    const monthYear = document.getElementById('calendar-month-year');
    if (!grid || !monthYear) return;

    monthYear.innerText = state.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    grid.innerHTML = '';

    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        grid.appendChild(document.createElement('div'));
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.innerText = i;

        const thisDate = new Date(year, month, i);
        if (isSameDate(thisDate, state.selectedDate)) {
            dayEl.classList.add('selected');
        }

        const dateStr = thisDate.toISOString().split('T')[0];
        const hasEvents = state.data.jobs.some(j => j.date === dateStr);
        if (hasEvents) dayEl.classList.add('has-event');

        dayEl.addEventListener('click', () => {
            state.selectedDate = thisDate;
            renderMiniCalendar();
            renderDayTimeline();
        });

        grid.appendChild(dayEl);
    }
}

function renderDayTimeline() {
    const timeline = document.getElementById('day-timeline');
    const title = document.getElementById('selected-date-title');
    if (!timeline) return;

    title.innerText = state.selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    const dateStr = state.selectedDate.toISOString().split('T')[0];
    const events = state.data.jobs.filter(j => j.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));

    timeline.innerHTML = '';

    if (events.length === 0) {
        timeline.innerHTML = '<p style="color: #94a3b8; padding: 20px;">No events scheduled for this day.</p>';
        return;
    }

    events.forEach(event => {
        const el = document.createElement('div');
        el.className = 'timeline-item';

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
    if (!list) return;

    list.innerHTML = ''; // Start clean

    // Mock "Today" as 2025-12-05 for the demo, otherwise use real today: new Date().toISOString().split('T')[0]
    // For specific demo consistency we check both or just show all recent
    const todayStr = '2025-12-05';
    const events = state.data.jobs.filter(j => j.date === todayStr);

    if (events.length === 0) list.innerHTML = '<p style="padding:10px; color:#94a3b8">Quiet day today.</p>';

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

function updateDashboardStats() {
    // Dynamic Stats Calculation
    const activeJobs = state.data.jobs.filter(j => j.status === 'pending' || j.type === 'job').length;
    const unpaid = state.data.jobs.filter(j => j.type === 'invoice' && j.status === 'unpaid').length;
    // ... we could calculate dollar amounts if we had value fields, for now hardcoded or count driven

    const activeVal = document.querySelector('.stat-card:nth-child(1) .stat-value');
    if (activeVal) activeVal.innerText = activeJobs;

    const unpaidVal = document.querySelector('.stat-card:nth-child(2) .stat-value');
    if (unpaidVal) unpaidVal.innerText = unpaid; // showing count for simplicity
}


// --- Utility ---
function isSameDate(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function getTypeColor(type) {
    if (type === 'urgent') return '#ef4444';
    if (type === 'delivery') return '#f59e0b';
    if (type === 'invoice') return '#3b82f6';
    return '#0f172a';
}

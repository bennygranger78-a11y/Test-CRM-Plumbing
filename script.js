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
    try {
        // 1. Setup Navigation & Modals
        setupNavigation();
        setupModalLogic();

        // 2. Set Date Header
        dateDisplay.innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // 3. Start Data Sync
        syncData().catch(err => {
            console.error("Sync Failed:", err);
            alert("Database Error: " + err.message + "\n\nCheck console for details.");
        });
    } catch (e) {
        console.error("Init Error:", e);
        alert("Initialization Error: " + e.message);
    }
});

// --- Firebase Data Sync ---
async function syncData() {
    console.log("Starting Firebase Sync...");

    try {
        // Check if we need to seed data (First run check)
        const jobsRef = collection(db, "jobs");
        const snapshot = await getDocs(jobsRef);

        if (snapshot.empty) {
            console.log("Database empty. Seeding initial data...");
            await seedDatabase();
            alert("Database was empty. I have seeded it with sample data! Refresh the console.");
        } else {
            console.log("Database found with " + snapshot.size + " documents.");
        }

        // Set up Real-time Listeners
        setupListeners();
    } catch (error) {
        console.error("Error accessing Firestore:", error);
        throw error; // Re-throw to be caught by main init
    }
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
    // If we are in a list view, we might want to re-render the whole list
    renderView(state.currentView);
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

    const initialMessages = [
        { from: 'Alice Johnson', text: 'Is the plumber still coming at 9?', time: '08:45', date: '2025-12-05' },
        { from: 'Supplier', text: 'Your copper fittings are on backorder.', time: '09:15', date: '2025-12-05' }
    ];

    for (const job of initialJobs) {
        await addDoc(collection(db, "jobs"), job);
    }
    for (const msg of initialMessages) {
        await addDoc(collection(db, "messages"), msg);
    }
    console.log("Seeding Complete!");
}

// --- Navigation & View Logic ---
function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = item.dataset.view;

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            state.currentView = viewName;
            renderView(viewName);
        });
    });

    // UI Event: New Job Button (Desktop)
    const btnNewJob = document.getElementById('btn-new-job');
    if (btnNewJob) {
        btnNewJob.addEventListener('click', () => {
            const modal = document.getElementById('modal-container');
            if (modal) modal.classList.remove('hidden');
        });
    }

    // Initial Render
    renderView('dashboard');
}

function renderView(viewName) {
    viewContainer.innerHTML = '';

    // Handle View Rendering
    if (viewName === 'dashboard') {
        const template = document.getElementById('template-dashboard');
        viewContainer.appendChild(template.content.cloneNode(true));
        pageTitle.innerText = 'Dashboard Overview';
        requestAnimationFrame(() => {
            renderDashboardActivity();
            updateDashboardStats();
        });

    } else if (viewName === 'calendar') {
        const template = document.getElementById('template-calendar');
        viewContainer.appendChild(template.content.cloneNode(true));
        pageTitle.innerText = 'Daily Schedule';
        requestAnimationFrame(() => initCalendar());

    } else if (viewName === 'jobs') {
        const template = document.getElementById('template-jobs');
        viewContainer.appendChild(template.content.cloneNode(true));
        pageTitle.innerText = 'All Jobs';
        requestAnimationFrame(() => renderJobsView());

    } else if (viewName === 'messages') {
        const template = document.getElementById('template-messages');
        viewContainer.appendChild(template.content.cloneNode(true));
        pageTitle.innerText = 'Inbox';
        requestAnimationFrame(() => renderMessagesView());

    } else if (viewName === 'invoices') {
        const template = document.getElementById('template-invoices');
        viewContainer.appendChild(template.content.cloneNode(true));
        pageTitle.innerText = 'Quotes & Invoices';
        requestAnimationFrame(() => renderInvoicesView());

    } else {
        viewContainer.innerHTML = `<div style="text-align:center; padding: 40px;">Under Construction</div>`;
    }
    lucide.createIcons();
}

// --- Specific View Renderers ---
function renderJobsView() {
    const list = document.getElementById('jobs-list');
    if (!list) return;

    // Sort by date/time
    const jobs = [...state.data.jobs].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    list.innerHTML = '';
    jobs.forEach(job => {
        const card = document.createElement('div');
        card.className = 'list-item-card';
        card.innerHTML = `
            <div class="list-info">
                <h4>${job.title}</h4>
                <p style="color:var(--text-secondary)">${job.client} • ${job.date} @ ${job.time}</p>
            </div>
            <div class="list-status">
                <span class="tag tag-${getStatusColor(job.status)}">${job.status}</span>
            </div>
        `;
        list.appendChild(card);
    });
}

function renderMessagesView() {
    const list = document.getElementById('messages-list');
    if (!list) return;

    state.data.messages.forEach(msg => {
        const card = document.createElement('div');
        card.className = 'list-item-card';
        card.innerHTML = `
            <div class="list-info">
                <h4>${msg.from}</h4>
                <p>${msg.text}</p>
            </div>
            <div class="list-meta" style="text-align:right">
                <p style="font-size:0.8rem; color:var(--text-secondary)">${msg.date} ${msg.time}</p>
            </div>
        `;
        list.appendChild(card);
    });
}

function renderInvoicesView() {
    const tbody = document.getElementById('invoices-list');
    if (!tbody) return;

    // Filter for invoices/quotes
    const invoices = state.data.jobs.filter(j => j.type === 'invoice' || j.type === 'quote');

    tbody.innerHTML = '';
    invoices.forEach(inv => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${inv.id ? inv.id.substring(0, 6) : 'PEND'}...</td>
            <td>${inv.client}</td>
            <td>${inv.date}</td>
            <td><span class="tag tag-${inv.status === 'unpaid' ? 'red' : 'green'}">${inv.status}</span></td>
            <td><strong>$150.00</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Modal Logic ---
function setupModalLogic() {
    const modal = document.getElementById('modal-container');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-modal');
    const form = document.getElementById('new-job-form');

    const closeModal = () => modal.classList.add('hidden');

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Form Submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);

            const newJob = {
                title: formData.get('title'),
                client: formData.get('client'),
                date: formData.get('date'),
                time: formData.get('time'),
                type: formData.get('type'),
                duration: formData.get('duration'),
                status: 'pending'
            };

            try {
                // Add to Firestore
                await addDoc(collection(db, "jobs"), newJob);
                console.log("Job Created!", newJob);
                closeModal();
                form.reset();
            } catch (err) {
                console.error("Error adding document: ", err);
                alert("Error saving job");
            }
        });
    }
}

// --- Calendar Logic ---
function initCalendar() {
    renderMiniCalendar();
    renderDayTimeline();

    // Re-attach listeners since they are destroyed on view switch
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    if (prevBtn) prevBtn.addEventListener('click', () => {
        state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
        renderMiniCalendar();
    });

    if (nextBtn) nextBtn.addEventListener('click', () => {
        state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
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

    list.innerHTML = '';

    const todayStr = new Date().toISOString().split('T')[0]; // Use real today
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
            <span class="tag tag-${getStatusColor(event.status)}">${event.status}</span>
        `;
        list.appendChild(item);
    });
}

function updateDashboardStats() {
    const activeJobs = state.data.jobs.filter(j => j.status === 'pending' || j.type === 'job').length;
    const unpaid = state.data.jobs.filter(j => j.type === 'invoice' && j.status === 'unpaid').length;

    const activeVal = document.querySelector('.stat-card:nth-child(1) .stat-value');
    if (activeVal) activeVal.innerText = activeJobs;

    const unpaidVal = document.querySelector('.stat-card:nth-child(2) .stat-value');
    if (unpaidVal) unpaidVal.innerText = unpaid;
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

function getStatusColor(status) {
    if (status === 'completed') return 'green';
    if (status === 'pending') return 'orange';
    if (status === 'unpaid') return 'red';
    if (status === 'arrived') return 'blue';
    return 'blue';
}

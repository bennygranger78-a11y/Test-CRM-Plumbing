// --- Firebase Imports (CDN) ---
// Force Rebuild Trigger: v4
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, onSnapshot, query, orderBy, deleteDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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
        setupActionMenuLogic();

        // 2. Set Date Header
        if (dateDisplay) {
            dateDisplay.innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }

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
        { title: 'Leaky Faucet Repair', client: 'Alice Johnson', phone: '555-0101', email: 'alice@example.com', time: '09:00', duration: '1h', type: 'job', status: 'pending', date: '2025-12-05' },
        { title: 'Boiler Maintenance', client: 'TechCorp Offices', phone: '555-0102', email: 'manager@techcorp.com', time: '11:00', duration: '2h', type: 'job', status: 'completed', date: '2025-12-05' },
        { title: 'Emergency Pipe Burst', client: 'Bob Smith', phone: '555-0103', email: 'bob@example.com', time: '14:30', duration: '3h', type: 'urgent', status: 'pending', date: '2025-12-05' },
        { title: 'Parts Delivery: Copper Pipes', client: 'Internal', phone: '', email: '', time: '08:00', duration: '', type: 'delivery', status: 'arrived', date: '2025-12-05' },
        { title: 'Invoice Due: #INV-2024-001', client: 'Sarah Connor', phone: '555-0104', email: 'sarah@example.com', time: '17:00', duration: '', type: 'invoice', status: 'unpaid', date: '2025-12-05' },
        { title: 'Bathroom Reno Quote', client: 'Mike Ross', phone: '555-0105', email: 'mike@example.com', time: '10:00', duration: '1h', type: 'quote', status: 'pending', date: '2025-12-06' }
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
            const viewName = item.getAttribute('data-view');
            if (viewName) {
                state.currentView = viewName;
                renderView(viewName);

                // Update Active Class
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });

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
            <div class="list-status" style="display:flex; align-items:center; gap:8px;">
                <span class="tag tag-${getStatusColor(job.status)}">${job.status}</span>
                <button class="action-btn" data-id="${job.id}"><i data-lucide="more-vertical"></i></button>
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
// --- Modal & Action Logic ---
let editingJobId = null; // Track if we are editing
let activeActionJobId = null; // Track which job the open menu belongs to

function setupModalLogic() {
    const modal = document.getElementById('modal-container');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-modal');
    const form = document.getElementById('new-job-form');
    const modalTitle = document.querySelector('.modal-header h2');
    const submitBtn = document.querySelector('.form-actions .btn-primary');

    const closeModal = () => {
        modal.classList.add('hidden');
        form.reset();
        editingJobId = null; // Reset edit mode
        modalTitle.innerText = "New Job";
        submitBtn.innerText = "Create Job";
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Form Submit (Create OR Update)
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);

            const jobData = {
                title: formData.get('title'),
                client: formData.get('client'),
                date: formData.get('date'),
                time: formData.get('time'),
                type: formData.get('type'),
                duration: formData.get('duration'),
                // Preserve status if editing, else default
                status: editingJobId ? state.data.jobs.find(j => j.id === editingJobId).status : 'pending'
            };

            try {
                if (editingJobId) {
                    // UPDATE existing
                    await updateDoc(doc(db, "jobs", editingJobId), jobData);
                    console.log("Job Updated!", jobData);
                } else {
                    // CREATE new
                    // Add default phone/email for new jobs (mocking)
                    jobData.phone = '555-0000';
                    jobData.email = 'client@example.com';
                    await addDoc(collection(db, "jobs"), jobData);
                    console.log("Job Created!", jobData);
                }
                closeModal();
            } catch (err) {
                console.error("Error saving job: ", err);
                alert("Error saving job");
            }
        });
    }

    // Expose open function for "Edit" action
    window.openEditModal = (job) => {
        editingJobId = job.id;
        modalTitle.innerText = "Edit Job";
        submitBtn.innerText = "Save Changes";

        // Populate fields
        form.elements['title'].value = job.title;
        form.elements['client'].value = job.client;
        form.elements['date'].value = job.date;
        form.elements['time'].value = job.time;
        form.elements['type'].value = job.type;
        form.elements['duration'].value = job.duration || '';

        modal.classList.remove('hidden');
    };
}

function setupActionMenuLogic() {
    const menu = document.getElementById('action-menu');

    // 1. GLOBAL DELEGATION for opening menu
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.action-btn');
        const menuClick = e.target.closest('.action-menu');

        // Case A: Clicked an Action Button
        if (btn) {
            console.log("Action Button Clicked:", btn.dataset.id); // DEBUG
            e.stopPropagation();
            e.preventDefault();
            const jobId = btn.dataset.id;
            activeActionJobId = jobId;

            // DEBUGGING MODE
            alert("Debug: Menu Clicked for Job " + jobId);

            // Force Center Screen
            menu.style.top = "50%";
            menu.style.left = "50%";
            menu.style.transform = "translate(-50%, -50%)"; // Center alignment
            menu.classList.remove('hidden');
            return;
        }

        // Case B: Clicked inside Menu
        if (menuClick) return;

        // Case C: Clicked outside
        if (!menu.classList.contains('hidden')) {
            menu.classList.add('hidden');
        }
    });

    // 2. Menu Actions
    const callBtn = document.getElementById('action-call');
    if (callBtn) callBtn.addEventListener('click', () => {
        const job = state.data.jobs.find(j => j.id === activeActionJobId);
        if (job && job.phone) window.location.href = `tel:${job.phone}`;
        else alert("No phone number for this client.");
        menu.classList.add('hidden');
    });

    const emailBtn = document.getElementById('action-email');
    if (emailBtn) emailBtn.addEventListener('click', () => {
        const job = state.data.jobs.find(j => j.id === activeActionJobId);
        if (job && job.email) window.location.href = `mailto:${job.email}`;
        else alert("No email for this client.");
        menu.classList.add('hidden');
    });

    const deleteBtn = document.getElementById('action-delete');
    if (deleteBtn) deleteBtn.addEventListener('click', async () => {
        if (confirm("Are you sure you want to delete this job?")) {
            try {
                await deleteDoc(doc(db, "jobs", activeActionJobId));
            } catch (e) { console.error(e); alert("Delete failed"); }
        }
        menu.classList.add('hidden');
    });

    const editBtn = document.getElementById('action-edit');
    if (editBtn) editBtn.addEventListener('click', () => {
        const job = state.data.jobs.find(j => j.id === activeActionJobId);
        if (job) window.openEditModal(job);
        menu.classList.add('hidden');
    });

    const rescheduleBtn = document.getElementById('action-reschedule');
    if (rescheduleBtn) rescheduleBtn.addEventListener('click', () => {
        const job = state.data.jobs.find(j => j.id === activeActionJobId);
        if (job) window.openEditModal(job);
        menu.classList.add('hidden');
    });
}

// --- Calendar Logic ---
function initCalendar() {
    renderMiniCalendar();
    renderDayTimeline();

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
        item.style.alignItems = 'center';
        item.innerHTML = `
            <div style="flex:1">
                <strong>${event.time}</strong> - ${event.title} <br>
                <small style="color:var(--text-secondary)">${event.client}</small>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
                <span class="tag tag-${getStatusColor(event.status)}">${event.status}</span>
                <button class="action-btn" data-id="${event.id}"><i data-lucide="more-vertical"></i></button>
            </div>
        `;
        list.appendChild(item);
    });
    lucide.createIcons();
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

// Phase 3: Data Layer & Firebase Sync
console.log("PlumbTrack CRM: System Initialized (Phase 3)");

// --- Firebase Imports (CDN) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, onSnapshot, query, orderBy, deleteDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyDlyKtJAka3sNrgWO7gTItSRluQRmqVbYU",
    authDomain: "test-crm-plumbing.firebaseapp.com",
    projectId: "test-crm-plumbing",
    storageBucket: "test-crm-plumbing.firebasestorage.app",
    messagingSenderId: "172483863456",
    appId: "1:172483863456:web:64a938c291253457019779"
};

// Initialize
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- State ---
const state = {
    currentView: 'dashboard',
    data: {
        jobs: [],
        messages: []
    }
};

// --- Elements ---
const viewContainer = document.getElementById('view-container');
const pageTitle = document.getElementById('page-title');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initDate();
    setupNavigation();

    // Start Data Sync
    syncData().catch(err => console.error("Sync Error:", err));
});

// --- Data Logic ---
async function syncData() {
    console.log("Starting Firebase Sync...");

    // 1. Check Seeding
    const jobsRef = collection(db, "jobs");
    const snapshot = await getDocs(jobsRef);
    if (snapshot.empty) {
        console.log("Database empty. Seeding...");
        await seedDatabase();
    }

    // 2. Listen for Jobs
    const jobsQuery = query(collection(db, "jobs"));
    onSnapshot(jobsQuery, (snap) => {
        state.data.jobs = [];
        snap.forEach(doc => state.data.jobs.push({ id: doc.id, ...doc.data() }));
        console.log("Jobs Updated:", state.data.jobs.length);

        // Refresh Current View if needed
        if (state.currentView === 'dashboard') {
            updateDashboardStats();
            renderDashboardActivity();
        }
    });
}

async function seedDatabase() {
    const seedJobs = [
        { title: 'Leaky Faucet Repair', client: 'Alice Johnson', phone: '555-0101', email: 'alice@example.com', time: '09:00', duration: '1h', type: 'job', status: 'pending', date: new Date().toISOString().split('T')[0] },
        { title: 'Emergency Pipe Burst', client: 'Bob Smith', phone: '555-0102', email: 'bob@example.com', time: '14:00', duration: '2h', type: 'urgent', status: 'pending', date: new Date().toISOString().split('T')[0] },
        { title: 'Bathroom Renovation Quote', client: 'Carol Williams', phone: '555-0103', email: 'carol@example.com', time: '16:00', type: 'quote', status: 'pending', date: new Date().toISOString().split('T')[0] },
        { title: 'Boiler Maintenance', client: 'TechCorp', time: '10:00', type: 'job', status: 'completed', date: new Date().toISOString().split('T')[0] }
    ];

    for (const job of seedJobs) {
        await addDoc(collection(db, "jobs"), job);
    }
    console.log("Seeding Complete.");
}

// --- Navigation Logic ---
function initDate() {
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const viewName = item.getAttribute('data-view');
            state.currentView = viewName;
            renderView(viewName);
        });
    });
    renderView('dashboard');
}

function renderView(viewName) {
    if (!viewContainer) return;
    viewContainer.innerHTML = '';

    const templateId = `template-${viewName}`;
    const template = document.getElementById(templateId);

    if (template) {
        viewContainer.appendChild(template.content.cloneNode(true));

        if (viewName === 'dashboard') {
            pageTitle.innerText = "Dashboard Overview";
            renderDashboardActivity();
            updateDashboardStats();
        }
        if (viewName === 'calendar') pageTitle.innerText = "Schedule";
        if (viewName === 'jobs') pageTitle.innerText = "Job Management";
        if (viewName === 'invoices') pageTitle.innerText = "Quotes & Invoices";

        if (window.lucide) window.lucide.createIcons();
    } else {
        viewContainer.innerHTML = `<div style="padding:40px; text-align:center">View '${viewName}' under construction.</div>`;
    }
}

// --- Dashboard Renderers ---
function updateDashboardStats() {
    const activeJobs = state.data.jobs.filter(j => j.status === 'pending').length;
    const unpaid = state.data.jobs.filter(j => j.type === 'invoice' && j.status === 'unpaid').length;

    const activeEl = document.getElementById('stat-active');
    const unpaidEl = document.getElementById('stat-unpaid');

    if (activeEl) activeEl.innerText = activeJobs;
    if (unpaidEl) unpaidEl.innerText = unpaid;
}

function renderDashboardActivity() {
    const list = document.getElementById('dashboard-activity-list');
    if (!list) return;

    list.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];
    const events = state.data.jobs.filter(j => j.date === today);

    if (events.length === 0) {
        list.innerHTML = '<p class="empty-state">No jobs scheduled for today.</p>';
        return;
    }

    events.forEach(job => {
        const item = document.createElement('div');
        item.className = 'list-item-card';
        item.innerHTML = `
            <div class="list-info">
                <h4>${job.time} - ${job.title}</h4>
                <p style="color:var(--text-muted)">${job.client}</p>
            </div>
            <div class="list-status">
                <span class="tag tag-${getStatusColor(job.status)}">${job.status}</span>
            </div>
        `;
        list.appendChild(item);
    });
}

function getStatusColor(status) {
    if (status === 'completed') return 'green';
    if (status === 'pending') return 'orange';
    if (status === 'unpaid') return 'red';
    return 'blue';
}

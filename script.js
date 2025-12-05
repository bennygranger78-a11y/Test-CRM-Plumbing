// Phase 4: Core Features (CRUD & Modals)
console.log("PlumbTrack CRM: System Initialized (Phase 4)");

// --- Firebase Imports (CDN) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, onSnapshot, query, deleteDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyDlyKtJAka3sNrgWO7gTItSRluQRmqVbYU",
    authDomain: "test-crm-plumbing.firebaseapp.com",
    projectId: "test-crm-plumbing",
    storageBucket: "test-crm-plumbing.firebasestorage.app",
    messagingSenderId: "172483863456",
    appId: "1:172483863456:web:64a938c291253457019779"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- State ---
const state = {
    currentView: 'dashboard',
    editingJobId: null, // Track ID being edited
    data: { jobs: [] }
};

// --- Elements ---
const viewContainer = document.getElementById('view-container');
const pageTitle = document.getElementById('page-title');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initDate();
    setupNavigation();
    setupModalLogic(); // Phase 4: Init Modal

    syncData().catch(err => console.error("Sync Error:", err));
});

// --- Data Logic (Read) ---
async function syncData() {
    console.log("Starting Firebase Sync...");
    const jobsRef = collection(db, "jobs");

    // Check Seeding
    const snapshot = await getDocs(jobsRef);
    if (snapshot.empty) await seedDatabase();

    // Listen
    const jobsQuery = query(collection(db, "jobs"));
    onSnapshot(jobsQuery, (snap) => {
        state.data.jobs = [];
        snap.forEach(doc => state.data.jobs.push({ id: doc.id, ...doc.data() }));

        // Refresh Current View
        renderView(state.currentView);
    });
}

// --- Navigation & View Logic ---
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

    // Header Actions Check (New Job Button)
    const newJobBtn = document.getElementById('btn-new-job');
    if (newJobBtn) {
        // Cloning button to remove old listeners is a simple hack to prevent duplicates
        const newBtn = newJobBtn.cloneNode(true);
        newJobBtn.parentNode.replaceChild(newBtn, newJobBtn);
        newBtn.addEventListener('click', () => openModal());
    }

    viewContainer.innerHTML = '';
    const template = document.getElementById(`template-${viewName}`);

    if (template) {
        viewContainer.appendChild(template.content.cloneNode(true));
        if (window.lucide) window.lucide.createIcons();

        // View Specific Logic
        if (viewName === 'dashboard') {
            pageTitle.innerText = "Dashboard Overview";
            renderDashboardActivity();
            updateDashboardStats();
        }
        else if (viewName === 'jobs') {
            pageTitle.innerText = "Job Management";
            renderJobsList();
        }
        else if (viewName === 'invoices') pageTitle.innerText = "Quotes & Invoices";

    } else {
        viewContainer.innerHTML = `<div style="padding:40px; text-align:center">View '${viewName}' under construction.</div>`;
    }
}

// --- Jobs List & CRUD Listeners ---
function renderJobsList() {
    const list = document.getElementById('jobs-list');
    if (!list) return;

    list.innerHTML = '';
    // Sort by Date
    const jobs = [...state.data.jobs].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    jobs.forEach(job => {
        const item = document.createElement('div');
        item.className = 'list-item-card';
        item.style.cursor = 'pointer'; // Make row clickable
        item.innerHTML = `
            <div class="list-info">
                <h4>${job.title}</h4>
                <p style="color:var(--text-muted)">${job.client} • ${job.date} @ ${job.time}</p>
            </div>
            <div class="list-status">
                <span class="tag tag-${getStatusColor(job.status)}">${job.status}</span>
            </div>
        `;

        // Row Click -> Edit
        item.addEventListener('click', () => {
            openModal(job);
            if (status === 'unpaid') return 'red';
            return 'blue';
        }

function initDate() {
                const d = document.getElementById('current-date');
                if (d) d.innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            }

async function seedDatabase() { /* (Same as Phase 3 - omitted for brevity but assumed present if I were typing it all out. Since I am replacing the file, I MUST include it) */
                const seedJobs = [
                    { title: 'Leaky Faucet', client: 'Alice', time: '09:00', type: 'job', status: 'pending', date: new Date().toISOString().split('T')[0] },
                    { title: 'Pipe Burst', client: 'Bob', time: '14:00', type: 'urgent', status: 'pending', date: new Date().toISOString().split('T')[0] }
                ];
                for (const job of seedJobs) await addDoc(collection(db, "jobs"), job);
            }

// --- Dashboard Renderers (Phase 3 Kept) ---
function renderDashboardActivity() {
                const list = document.getElementById('dashboard-activity-list');
                if (!list) return;
                list.innerHTML = '';
                const today = new Date().toISOString().split('T')[0];
                const events = state.data.jobs.filter(j => j.date === today);
                if (events.length === 0) { list.innerHTML = '<p class="empty-state">No jobs today.</p>'; return; }
                events.forEach(job => {
                    const item = document.createElement('div');
                    item.className = 'list-item-card';
                    item.style.cursor = 'pointer'; // Clickable
                    item.innerHTML = `
            <div class="list-info"><h4>${job.time} - ${job.title}</h4><p style="color:var(--text-muted)">${job.client}</p></div>
            <div class="list-status"><span class="tag tag-${getStatusColor(job.status)}">${job.status}</span></div>
        `;
                    item.addEventListener('click', () => openModal(job)); // Allow editing from dashboard too!
                    list.appendChild(item);
                });
            }
function updateDashboardStats() {
                const active = state.data.jobs.filter(j => j.status === 'pending').length;
                const unpaid = state.data.jobs.filter(j => j.type === 'invoice' && j.status === 'unpaid').length;
                const aEl = document.getElementById('stat-active');
                const uEl = document.getElementById('stat-unpaid');
                if (aEl) aEl.innerText = active;
                if (uEl) uEl.innerText = unpaid;
            }

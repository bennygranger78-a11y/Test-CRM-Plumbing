// Phase 5: Action Menu & Final Polish
console.log("PlumbTrack CRM: System Initialized (Phase 5)");

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
    editingJobId: null,
    data: { jobs: [] }
};

// --- Elements ---
const viewContainer = document.getElementById('view-container');
const pageTitle = document.getElementById('page-title');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initDate();
    setupNavigation();
    setupModalLogic();
    syncData().catch(err => console.error("Sync Error:", err));
});

// --- Data Logic ---
async function syncData() {
    console.log("Starting Firebase Sync...");
    const jobsRef = collection(db, "jobs");
    const snapshot = await getDocs(jobsRef);
    if (snapshot.empty) await seedDatabase();

    const jobsQuery = query(collection(db, "jobs"));
    onSnapshot(jobsQuery, (snap) => {
        state.data.jobs = [];
        snap.forEach(doc => state.data.jobs.push({ id: doc.id, ...doc.data() }));
        renderView(state.currentView);
    });
}

// --- Navigation ---
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

    // Header Actions
    const newJobBtn = document.getElementById('btn-new-job');
    if (newJobBtn) {
        const newBtn = newJobBtn.cloneNode(true);
        newJobBtn.parentNode.replaceChild(newBtn, newJobBtn);
        newBtn.addEventListener('click', () => openModal(null));
    }

    viewContainer.innerHTML = '';
    const template = document.getElementById(`template-${viewName}`);

    if (template) {
        viewContainer.appendChild(template.content.cloneNode(true));
        if (window.lucide) window.lucide.createIcons();

        if (viewName === 'dashboard') {
            pageTitle.innerText = "Dashboard Overview";
            renderDashboardActivity();
            updateDashboardStats();
        } else if (viewName === 'jobs') {
            pageTitle.innerText = "Job Management";
            renderJobsList();
        } else if (viewName === 'invoices') {
            pageTitle.innerText = "Quotes & Invoices";
        }
    } else {
        viewContainer.innerHTML = `<div style="padding:40px; text-align:center">View '${viewName}' under construction.</div>`;
    }
}

// --- List Renderers ---
function renderJobsList() {
    const list = document.getElementById('jobs-list');
    if (!list) return;

    list.innerHTML = '';
    const jobs = [...state.data.jobs].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    jobs.forEach(job => {
        const item = document.createElement('div');
        item.className = 'list-item-card';
        item.style.cursor = 'pointer';
        // Add Action Button (Three Dots) to HTML
        item.innerHTML = `
            <div class="list-info">
                <h4>${job.title}</h4>
                <p style="color:var(--text-muted)">${job.client} • ${job.date} @ ${job.time}</p>
            </div>
            <div class="list-status" style="display:flex; align-items:center; gap:12px;">
                <span class="tag tag-${getStatusColor(job.status)}">${job.status}</span>
                <button class="icon-btn action-btn" data-id="${job.id}" style="padding:4px;"><i data-lucide="more-vertical"></i></button>
            </div>
        `;

        // Row Click (Edit) - Prevent if clicking action button handled in setupActionMenu
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn')) {
                openModal(job);
            }
        });

        list.appendChild(item);
    });
    if (window.lucide) window.lucide.createIcons();
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
        item.style.cursor = 'pointer';
        // Add Action Button (Three Dots)
        item.innerHTML = `
            <div class="list-info">
                <h4>${job.time} - ${job.title}</h4>
                <p style="color:var(--text-muted)">${job.client}</p>
            </div>
            <div class="list-status" style="display:flex; align-items:center; gap:12px;">
                <span class="tag tag-${getStatusColor(job.status)}">${job.status}</span>
                <button class="icon-btn action-btn" data-id="${job.id}" style="padding:4px;"><i data-lucide="more-vertical"></i></button>
            </div>
        `;
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn')) {
                openModal(job);
            }
        });
        list.appendChild(item);
    });
    if (window.lucide) window.lucide.createIcons();
}

// --- Modal & Action Menu Logic ---
function setupModalLogic() {
    const modal = document.getElementById('modal-container');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-modal');
    const form = document.getElementById('new-job-form');

    const closeModal = () => modal.classList.add('hidden');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const jobData = {
                title: formData.get('title'),
                client: formData.get('client'),
                type: formData.get('type'),
                date: formData.get('date'),
                time: formData.get('time'),
                status: 'pending'
            };

            if (state.editingJobId) {
                const existing = state.data.jobs.find(j => j.id === state.editingJobId);
                if (existing) jobData.status = existing.status;
            }

            try {
                if (state.editingJobId) {
                    await updateDoc(doc(db, "jobs", state.editingJobId), jobData);
                } else {
                    await addDoc(collection(db, "jobs"), jobData);
                }
                closeModal();
            } catch (err) {
                console.error("Save failed", err);
                alert("Error saving job.");
            }
        });
    }

    window.openModal = (job = null) => {
        const modalTitle = document.querySelector('.modal-header h2');
        const submitBtn = document.querySelector('.form-actions .btn-primary');
        form.reset();
        modal.classList.remove('hidden');

        if (job) {
            state.editingJobId = job.id;
            modalTitle.innerText = "Edit Job";
            submitBtn.innerText = "Save Changes";
            form.elements['title'].value = job.title;
            form.elements['client'].value = job.client;
            form.elements['type'].value = job.type;
            form.elements['date'].value = job.date;
            form.elements['time'].value = job.time;
        } else {
            state.editingJobId = null;
            modalTitle.innerText = "New Job";
            submitBtn.innerText = "Create Job";
            form.elements['date'].value = new Date().toISOString().split('T')[0];
        }
    };

    setupActionMenu(); // Init Menu
}

function setupActionMenu() {
    const menu = document.getElementById('action-menu');
    let activeJobId = null;

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.action-btn');
        const menuClick = e.target.closest('.action-menu');

        // Click on Three Dots
        if (btn) {
            e.preventDefault();
            e.stopPropagation();

            activeJobId = btn.dataset.id;
            const rect = btn.getBoundingClientRect();

            // Calc Position
            const rightEdge = document.documentElement.clientWidth - rect.right;
            menu.style.top = `${rect.bottom + 5}px`;
            menu.style.right = `${rightEdge}px`;
            menu.style.left = 'auto';

            menu.classList.remove('hidden');
            return;
        }

        // Click inside menu (allow it)
        if (menuClick) return;

        // Click outside (close it)
        if (menu && !menu.classList.contains('hidden')) {
            menu.classList.add('hidden');
        }
    });

    const editBtn = document.getElementById('action-edit');
    if (editBtn) editBtn.addEventListener('click', () => {
        const job = state.data.jobs.find(j => j.id === activeJobId);
        if (job) window.openModal(job);
        menu.classList.add('hidden');
    });

    const deleteBtn = document.getElementById('action-delete');
    if (deleteBtn) deleteBtn.addEventListener('click', async () => {
        if (confirm("Are you sure?")) {
            try { await deleteDoc(doc(db, "jobs", activeJobId)); } catch (e) { console.error(e); }
        }
        menu.classList.add('hidden');
    });
}

// --- Helpers ---
function getStatusColor(status) {
    if (status === 'completed') return 'green';
    if (status === 'pending') return 'orange';
    if (status === 'unpaid') return 'red';
    return 'blue';
}

function initDate() {
    const d = document.getElementById('current-date');
    if (d) d.innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

async function seedDatabase() {
    const seedJobs = [
        { title: 'Leaky Faucet', client: 'Alice', time: '09:00', type: 'job', status: 'pending', date: new Date().toISOString().split('T')[0] },
        { title: 'Pipe Burst', client: 'Bob', time: '14:00', type: 'urgent', status: 'pending', date: new Date().toISOString().split('T')[0] }
    ];
    for (const job of seedJobs) await addDoc(collection(db, "jobs"), job);
}

function updateDashboardStats() {
    const active = state.data.jobs.filter(j => j.status === 'pending').length;
    const unpaid = state.data.jobs.filter(j => j.type === 'invoice' && j.status === 'unpaid').length;
    const aEl = document.getElementById('stat-active');
    const uEl = document.getElementById('stat-unpaid');
    if (aEl) aEl.innerText = active;
    if (uEl) uEl.innerText = unpaid;
}

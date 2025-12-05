// Phase 2: Navigation & Routing
console.log("PlumbTrack CRM: System Initialized (Phase 2)");

// State
const state = {
    currentView: 'dashboard'
};

// Elements
const viewContainer = document.getElementById('view-container');
const pageTitle = document.getElementById('page-title');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initDate();
    setupNavigation();
});

// --- Logic ---
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

            // 1. Update UI Active State
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // 2. Render View
            const viewName = item.getAttribute('data-view');
            state.currentView = viewName;
            renderView(viewName);
        });
    });

    // Initial Load
    renderView('dashboard');
}

function renderView(viewName) {
    console.log("Rendering View:", viewName);

    // 1. Clear Container
    viewContainer.innerHTML = '';

    // 2. Select Template
    const templateId = `template-${viewName}`;
    const template = document.getElementById(templateId);

    if (template) {
        // Clone and Inject
        const content = template.content.cloneNode(true);
        viewContainer.appendChild(content);

        // Update Header Title
        if (viewName === 'dashboard') pageTitle.innerText = "Dashboard Overview";
        if (viewName === 'calendar') pageTitle.innerText = "Schedule";
        if (viewName === 'jobs') pageTitle.innerText = "Job Management";
        if (viewName === 'invoices') pageTitle.innerText = "Quotes & Invoices";

        // Re-initialize Icons for new content
        if (window.lucide) window.lucide.createIcons();
    } else {
        viewContainer.innerHTML = `<div style="padding:40px; text-align:center">View '${viewName}' not found.</div>`;
    }
}

// Phase 1: Foundation Script
console.log("PlumbTrack CRM: System Initialized (Phase 1)");

document.addEventListener('DOMContentLoaded', () => {
    // 1. Set Date
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // 2. Verify Icons
    // Lucide is global, handling in inline script or here.
    if (window.lucide) {
        window.lucide.createIcons();
    }
});

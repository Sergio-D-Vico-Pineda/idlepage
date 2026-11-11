// --- Clock ---

function updateClock() {
    const now = new Date();
    let timeStr = now.toLocaleTimeString('en-GB', { hour12: true, hour: 'numeric', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' });

    timeStr = timeStr.replace('am', 'a').replace('pm', 'p');

    document.getElementById('clock-time').textContent = timeStr;
    document.getElementById('clock-date').textContent = dateStr;
    document.getElementById('year').textContent = now.getFullYear();
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);
});

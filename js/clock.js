// --- Clock ---

const pad2 = (value) => String(value).padStart(2, '0');

function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' });
    const timeStr = `${(hours % 12) || 12}:${pad2(now.getMinutes())} ${hours < 12 ? 'a' : 'p'}`;

    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');

    timeEl.textContent = timeStr;
    timeEl.dateTime = `${pad2(hours)}:${pad2(now.getMinutes())}`;

    dateEl.textContent = dateStr;
    dateEl.dateTime = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

    document.getElementById('year').textContent = now.getFullYear();
}

// The display has minute resolution, so tick exactly when the minute changes
// instead of waking up every second.
function scheduleNextMinute() {
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    setTimeout(() => {
        updateClock();
        scheduleNextMinute();
    }, msToNextMinute);
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    scheduleNextMinute();
});

// Timers are throttled while the tab is hidden, so resync on return.
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateClock();
});

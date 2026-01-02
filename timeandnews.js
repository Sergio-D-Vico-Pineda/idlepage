// --- DATA: Mock News Items ---
const NEWS_ITEMS = [
    { headline: "New Zero-Day Vulnerability Found in Legacy Kernels", source: "CyberSec Daily", tag: "SECURITY" },
    { headline: "AI Model optimizes compiler speeds by 40%", source: "TechCrunch", tag: "AI / ML" },
    { headline: "SpaceX successfully lands Starship booster", source: "SpaceNews", tag: "SPACE" },
    { headline: "React 19 release date announced for next month", source: "JS Weekly", tag: "DEV" },
    { headline: "Quantum computing breakthrough at IBM research labs", source: "Science Today", tag: "HARDWARE" },
    { headline: "Linux Mint releases new 'Edge' ISO version", source: "DistroWatch", tag: "LINUX" },
    { headline: "Global internet traffic spikes 15% amid events", source: "NetMetrics", tag: "NETWORK" },
    { headline: "Rust language adoption grows in automotive industry", source: "Rust Blog", tag: "DEV" }
];

// --- UI FUNCTIONS ---

function initIcons() {
    lucide.createIcons();
}

// Clock
function updateClock() {
    const now = new Date();
    let timeStr = now.toLocaleTimeString('en-GB', { hour12: true, hour: 'numeric', minute: '2-digit' });
    let dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' });

    timeStr = timeStr.replace('am', 'a').replace('pm', 'p')

    document.getElementById('clock-time').innerText = timeStr;
    document.getElementById('clock-date').innerText = dateStr;
    document.getElementById('year').innerText = now.getFullYear();
}

// News Logic
let currentNewsIndex = 0;
const REFRESH_INTERVAL = 1 * 60 * 1000; // 1 Minutes
let lastUpdate = Date.now();

function updateNews() {
    const headlineEl = document.getElementById('news-headline');
    const sourceEl = document.getElementById('news-source');
    const timeEl = document.getElementById('news-time');
    const tagEl = document.getElementById('news-tag');

    if (!headlineEl || !sourceEl || !timeEl || !tagEl) return;
    // Fade Out
    headlineEl.classList.add('opacity-0', 'translate-y-2');
    sourceEl.classList.add('opacity-0', 'translate-y-2');

    setTimeout(() => {
        // Update Data
        const item = NEWS_ITEMS[currentNewsIndex];
        headlineEl.innerText = item.headline;
        sourceEl.innerText = item.source;
        tagEl.innerText = item.tag;

        const now = new Date();
        timeEl.innerText = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        // Fade In
        headlineEl.classList.remove('opacity-0', 'translate-y-2');
        sourceEl.classList.remove('opacity-0', 'translate-y-2');

        // Increment Index
        currentNewsIndex = (currentNewsIndex + 1) % NEWS_ITEMS.length;
        lastUpdate = Date.now();

    }, 500);
}

function skipNews() {
    // Manually trigger the next news item
    // Note: updateNews() increments currentNewsIndex internally after displaying the *current* one?
    // Wait, let's check updateNews logic.
    // It reads NEWS_ITEMS[currentNewsIndex] THEN increments.
    // So if I call updateNews(), it shows the next one in the sequence immediately.
    // We also need to reset the progress bar.
    lastUpdate = Date.now();
    document.getElementById('news-progress').style.width = '0%';
    updateNews();
}

function updateProgressBar() {
    const now = Date.now();
    const elapsed = now - lastUpdate;
    const percentage = Math.min((elapsed / REFRESH_INTERVAL) * 100, 100);

    const progressBar = document.getElementById('news-progress');

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }

    if (elapsed >= REFRESH_INTERVAL) {
        updateNews();
    }

    requestAnimationFrame(updateProgressBar);
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    initIcons();
    updateClock();
    setInterval(updateClock, 1000);

    // Initialize News
    updateNews();
    requestAnimationFrame(updateProgressBar);

    const skipButton = document.getElementById('skip-news-button');
    if (skipButton) {
        skipButton.addEventListener('click', (event) => {
            event.preventDefault();
            skipNews();
        });
    }
});

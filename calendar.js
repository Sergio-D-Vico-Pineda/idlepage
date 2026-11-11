// --- Calendar Module ---

const DAY_MS = 1000 * 60 * 60 * 24;

// Parse a YYYY-MM-DD key as a local date (new Date('2026-11-11') would be UTC).
function parseKey(key) {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
}

class Calendar {
    constructor(options = {}) {
        this.state = {
            viewYear: options.year || new Date().getFullYear(),
            viewMonth: options.month || new Date().getMonth(),
            selected: options.selected || this.ymd(new Date())
        };

        this.elements = {
            monthEl: document.getElementById('cal-month'),
            gridEl: document.getElementById('cal-grid'),
            prevBtn: document.getElementById('cal-prev'),
            nextBtn: document.getElementById('cal-next'),
            todayBtn: document.getElementById('cal-today'),
            dayCountEl: document.getElementById('cal-day-count')
        };
    }

    // Helper: Pad number with leading zero
    pad2(n) {
        return String(n).padStart(2, '0');
    }

    // Helper: Format date as YYYY-MM-DD
    ymd(date) {
        return `${date.getFullYear()}-${this.pad2(date.getMonth() + 1)}-${this.pad2(date.getDate())}`;
    }

    // Update day counter display
    updateDayCounter() {
        const { dayCountEl } = this.elements;
        if (!dayCountEl) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selected = parseKey(this.state.selected);

        if (this.ymd(today) === this.state.selected) {
            dayCountEl.textContent = '';
            dayCountEl.title = '';
            return;
        }

        const isFuture = selected > today;
        const [start, end] = isFuture ? [today, selected] : [selected, today];

        // Total days, used for the tooltip (includes both end points)
        const totalDays = Math.round((end - start) / DAY_MS);

        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();
        let days = end.getDate() - start.getDate();

        // Borrow from the previous month when the day difference is negative
        if (days < 0) {
            months--;
            days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        const weeks = Math.floor(days / 7);
        days = days % 7;

        const parts = [];
        if (years > 0) parts.push(`${years}y`);
        if (months > 0) parts.push(`${months}m`);
        if (weeks > 0) parts.push(`${weeks}w`);
        if (days > 0) parts.push(`${days}d`);

        const text = parts.join(' ');
        dayCountEl.textContent = isFuture ? `+${text}` : `-${text}`;
        dayCountEl.title = `${isFuture ? '+' : '-'}${totalDays} days`;
    }

    // Get month label (e.g., "January 2026")
    monthLabel(year, monthIndex) {
        return new Date(year, monthIndex, 1)
            .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    }

    // Render the calendar
    render() {
        const { monthEl, gridEl } = this.elements;
        if (!monthEl || !gridEl) return;

        const { viewYear: year, viewMonth: month, selected } = this.state;

        monthEl.textContent = this.monthLabel(year, month);
        this.updateDayCounter();

        const todayKey = this.ymd(new Date());

        // Monday-first grid: firstDow is the weekday of the 1st (0 = Monday)
        const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

        gridEl.innerHTML = '';
        let hasTabStop = false;

        for (let i = 0; i < totalCells; i++) {
            const day = new Date(year, month, 1 - firstDow + i);
            const key = this.ymd(day);

            const inMonth = day.getMonth() === month;
            const isToday = key === todayKey;
            const isSelected = selected === key;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.date = key;
            btn.textContent = String(day.getDate());

            // Screen readers get the full date; the short label stays visual.
            btn.setAttribute('aria-label', day.toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            }));
            if (isToday) btn.setAttribute('aria-current', 'date');
            if (isSelected) btn.setAttribute('aria-pressed', 'true');

            // Roving tab stop: one cell is reachable with Tab, arrows move inside.
            if (isSelected) {
                btn.tabIndex = 0;
                hasTabStop = true;
            } else {
                btn.tabIndex = -1;
            }

            // Build class list - days outside the month are visible but subdued
            const base = 'w-full rounded-md text-[11px] transition-all duration-200';
            const inactive = 'text-neutral-700 hover:text-neutral-500 hover:bg-neutral-900/30';
            const active = 'text-neutral-400 hover:text-white hover:bg-neutral-900/60';
            const todayCls = 'ring-1 ring-red-900/50 text-neutral-200 bg-red-900/10';
            const selectedCls = 'bg-red-900/30 text-white ring-1 ring-red-900/60';

            btn.className = [
                base,
                inMonth ? active : inactive,
                isToday && inMonth ? todayCls : '',
                isSelected && inMonth ? selectedCls : ''
            ].filter(Boolean).join(' ');

            gridEl.appendChild(btn);
        }

        // The selected day can sit outside the visible month: keep one tab stop anyway.
        if (!hasTabStop) gridEl.firstElementChild.tabIndex = 0;
    }

    // Select a specific date and show its month
    selectDate(dateKey) {
        const date = parseKey(dateKey);
        this.state.selected = dateKey;
        this.state.viewYear = date.getFullYear();
        this.state.viewMonth = date.getMonth();
        this.render();
    }

    // Move the selection by whole days
    shiftDate(dateKey, days) {
        const date = parseKey(dateKey);
        date.setDate(date.getDate() + days);
        return this.ymd(date);
    }

    // Move the selection by whole months, keeping the day when possible
    shiftMonth(dateKey, months) {
        const date = parseKey(dateKey);
        const day = date.getDate();
        date.setDate(1);
        date.setMonth(date.getMonth() + months);
        date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
        return this.ymd(date);
    }

    // Focus a day cell after a re-render
    focusDate(dateKey) {
        const { gridEl } = this.elements;
        const cell = gridEl && gridEl.querySelector(`button[data-date="${dateKey}"]`);
        if (cell) cell.focus();
    }

    // Navigate to previous month
    prevMonth() {
        const d = new Date(this.state.viewYear, this.state.viewMonth - 1, 1);
        this.state.viewYear = d.getFullYear();
        this.state.viewMonth = d.getMonth();
        this.render();
    }

    // Navigate to next month
    nextMonth() {
        const d = new Date(this.state.viewYear, this.state.viewMonth + 1, 1);
        this.state.viewYear = d.getFullYear();
        this.state.viewMonth = d.getMonth();
        this.render();
    }

    // Jump to today
    goToToday() {
        const now = new Date();
        this.state.viewYear = now.getFullYear();
        this.state.viewMonth = now.getMonth();
        this.state.selected = this.ymd(now);
        this.render();
    }

    // One listener for the whole grid: cells are replaced on every render
    onGridClick(event) {
        const btn = event.target.closest('button[data-date]');
        if (!btn) return;

        this.selectDate(btn.dataset.date);
        this.focusDate(btn.dataset.date);
    }

    // Keyboard support: arrows move by day/week, PageUp/Down by month
    onGridKeydown(event) {
        const cell = event.target.closest('button[data-date]');
        if (!cell) return;

        const key = cell.dataset.date;
        const dayIndex = (parseKey(key).getDay() + 6) % 7; // 0 = Monday
        let target = null;

        switch (event.key) {
            case 'ArrowLeft': target = this.shiftDate(key, -1); break;
            case 'ArrowRight': target = this.shiftDate(key, 1); break;
            case 'ArrowUp': target = this.shiftDate(key, -7); break;
            case 'ArrowDown': target = this.shiftDate(key, 7); break;
            case 'Home': target = this.shiftDate(key, -dayIndex); break;
            case 'End': target = this.shiftDate(key, 6 - dayIndex); break;
            case 'PageUp': target = this.shiftMonth(key, -1); break;
            case 'PageDown': target = this.shiftMonth(key, 1); break;
            default: return;
        }

        event.preventDefault();
        this.selectDate(target);
        this.focusDate(target);
    }

    // Attach event listeners to navigation buttons
    attachEvents() {
        const { prevBtn, nextBtn, todayBtn, gridEl } = this.elements;

        if (prevBtn) prevBtn.addEventListener('click', () => this.prevMonth());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextMonth());
        if (todayBtn) todayBtn.addEventListener('click', () => this.goToToday());

        if (gridEl) {
            gridEl.addEventListener('click', (event) => this.onGridClick(event));
            gridEl.addEventListener('keydown', (event) => this.onGridKeydown(event));
        }
    }

    // Initialize the calendar
    init() {
        this.attachEvents();
        this.render();
    }
}

// Auto-initialize on DOM ready
function initCalendar() {
    window.calendar = new Calendar();
    window.calendar.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalendar);
} else {
    initCalendar();
}

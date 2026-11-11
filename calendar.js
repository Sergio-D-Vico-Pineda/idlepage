// --- Calendar Module ---

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
        const selected = new Date(this.state.selected);
        selected.setHours(0, 0, 0, 0);

        if (this.ymd(today) === this.state.selected) {
            dayCountEl.textContent = '';
            dayCountEl.title = '';
            return;
        }

        const isFuture = selected > today;
        const [start, end] = isFuture ? [today, selected] : [selected, today];

        // Calculate total days for tooltip (including both start and end dates)
        const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24));

        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();
        let days = end.getDate() - start.getDate();

        // Adjust negative values
        if (days < 0) {
            months--;
            const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
            days += prevMonth.getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        // Calculate weeks from remaining days
        const weeks = Math.floor(days / 7);
        days = days % 7;

        // Build display string
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

        const { viewYear: year, viewMonth: month } = this.state;

        monthEl.textContent = this.monthLabel(year, month);
        this.updateDayCounter();

        const todayKey = this.ymd(new Date());

        // Monday-first grid: firstDow is the weekday of the 1st (0 = Monday)
        const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

        gridEl.innerHTML = '';

        for (let i = 0; i < totalCells; i++) {
            const day = new Date(year, month, 1 - firstDow + i);
            const key = this.ymd(day);

            const inMonth = day.getMonth() === month;
            const isToday = key === todayKey;
            const isSelected = this.state.selected === key;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.date = key;
            btn.textContent = String(day.getDate());

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

            // Days outside the month navigate to their month
            btn.addEventListener('click', () => {
                if (inMonth) {
                    this.selectDate(key);
                } else {
                    this.state.viewYear = day.getFullYear();
                    this.state.viewMonth = day.getMonth();
                    this.state.selected = key;
                    this.render();
                }
            });

            gridEl.appendChild(btn);
        }
    }

    // Select a specific date
    selectDate(dateKey) {
        this.state.selected = dateKey;
        this.render();
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

    // Attach event listeners to navigation buttons
    attachEvents() {
        const { prevBtn, nextBtn, todayBtn } = this.elements;

        if (prevBtn) prevBtn.addEventListener('click', () => this.prevMonth());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextMonth());
        if (todayBtn) todayBtn.addEventListener('click', () => this.goToToday());
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

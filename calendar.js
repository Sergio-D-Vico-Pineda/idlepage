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

    // Calculate days between two dates
    daysBetween(date1Str, date2Str) {
        const d1 = new Date(date1Str);
        const d2 = new Date(date2Str);
        const diffTime = d2 - d1;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
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
        const d = new Date(year, monthIndex, 1);
        return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    }

    // Calculate the start date of the calendar grid (Monday-first)
    startOfMonthGrid(year, monthIndex) {
        const first = new Date(year, monthIndex, 1);
        const firstDow = (first.getDay() + 6) % 7; // Convert to Monday-first (0=Mon, 6=Sun)
        const gridStart = new Date(year, monthIndex, 1 - firstDow);
        return gridStart;
    }

    // Render the calendar
    render() {
        const { monthEl, gridEl } = this.elements;
        if (!monthEl || !gridEl) return;

        // Update month/year label
        monthEl.textContent = this.monthLabel(this.state.viewYear, this.state.viewMonth);

        // Update day counter
        this.updateDayCounter();

        // Get today's date for highlighting
        const today = new Date();
        const todayKey = this.ymd(today);

        // Clear existing grid
        gridEl.innerHTML = '';

        // Get the start of the calendar grid
        const start = this.startOfMonthGrid(this.state.viewYear, this.state.viewMonth);

        // Calculate how many rows we need
        const firstDay = new Date(this.state.viewYear, this.state.viewMonth, 1);
        const lastDay = new Date(this.state.viewYear, this.state.viewMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const firstDow = (firstDay.getDay() + 6) % 7; // Monday-first
        const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7;

        // Render calendar days
        for (let i = 0; i < totalCells; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            const key = this.ymd(day);

            const inMonth = day.getMonth() === this.state.viewMonth;
            const isToday = key === todayKey;
            const isSelected = this.state.selected === key;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.date = key;
            btn.textContent = String(day.getDate());

            // Build class list - days outside the month are visible but subdued
            const base = 'h-8 w-full rounded-md text-[11px] font-sf-mono transition-all duration-200';
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

            // Add click handler - days outside the month navigate to their month
            btn.addEventListener('click', () => {
                if (inMonth) {
                    this.selectDate(key);
                } else {
                    // Navigate to the month of the clicked date
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

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevMonth());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextMonth());
        }

        if (todayBtn) {
            todayBtn.addEventListener('click', () => this.goToToday());
        }
    }

    // Initialize the calendar
    init() {
        this.attachEvents();
        this.render();
    }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.calendar = new Calendar();
        window.calendar.init();
    });
} else {
    window.calendar = new Calendar();
    window.calendar.init();
}

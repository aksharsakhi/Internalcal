/**
 * InternalCalc - Content Script
 * Scrapes marks data and provides an interactive internal calculation dashboard.
 */

class AmritaInternalCalculator {
    constructor() {
        this.subjects = {}; // Grouped by courseCode
        this.widget = null;
        this.isMinimized = false;
        this.init();
    }

    init() {
        // console.log('[InternalCalc] Initializing...');
        this.waitForTable().then(() => {
            this.scrapeMarks();
            this.createWidget();
        }).catch(err => {
            // console.log('[InternalCalc] Table not found or error:', err);
        });

        // Watch for dynamic updates (e.g., when changing academic term)
        this.setupObserver();
    }

    setupObserver() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // Check if marks table was updated
                    const table = document.querySelector('table');
                    if (table && table.innerText.includes('Marks Obtained')) {
                        // Throttled scrape
                        clearTimeout(this.scrapeTimeout);
                        this.scrapeTimeout = setTimeout(() => {
                            this.scrapeMarks();
                            this.updateWidget();
                        }, 1000);
                        break;
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    async waitForTable() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 20;

            const check = () => {
                const rows = document.querySelectorAll('table tr');
                if (rows.length > 2) { // Header + at least one data row
                    resolve();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(check, 1000);
                } else {
                    reject('Timeout');
                }
            };

            check();
        });
    }

    scrapeMarks() {
        const table = document.querySelector('table');
        if (!table) return;

        const rows = table.querySelectorAll('tr');
        const newSubjects = {};

        rows.forEach((row, index) => {
            if (index === 0) return; // Skip header

            const cells = row.querySelectorAll('td, th');
            if (cells.length < 6) return;

            const courseName = cells[0].textContent.trim();
            const courseCode = cells[1].textContent.trim();
            const obtained = parseFloat(cells[2].textContent.trim()) || 0;
            const maxMarks = parseFloat(cells[3].textContent.trim()) || 0;
            const componentName = cells[4].textContent.trim();
            const examName = cells[5].textContent.trim();

            if (!newSubjects[courseCode]) {
                newSubjects[courseCode] = {
                    name: courseName,
                    code: courseCode,
                    components: []
                };
            }

            // Default weight logic
            let defaultWeight = maxMarks;
            if (examName.toLowerCase().includes('mid-term') || componentName.toLowerCase().includes('mid-term')) {
                defaultWeight = 20;
            }

            newSubjects[courseCode].components.push({
                id: `${courseCode}-${index}`,
                examName,
                componentName,
                obtained,
                maxMarks,
                weight: defaultWeight // This will be the "Converted To" value
            });
        });

        this.subjects = newSubjects;
    }

    createWidget() {
        if (this.widget) this.widget.remove();

        this.widget = document.createElement('div');
        this.widget.className = 'ic-widget ic-widget-enter';
        this.renderWidget();
        document.body.appendChild(this.widget);

        this.attachEvents();
    }

    renderWidget() {
        const sortedCodes = Object.keys(this.subjects);

        let contentHtml = '';
        if (sortedCodes.length === 0) {
            contentHtml = `
        <div class="ic-empty">
          <div class="ic-empty-icon">📊</div>
          <div>No marks found on this page.</div>
        </div>
      `;
        } else {
            sortedCodes.forEach(code => {
                const sub = this.subjects[code];
                contentHtml += this.generateSubjectCard(sub);
            });
        }

        this.widget.innerHTML = `
      <div class="ic-header">
        <div class="ic-header-title">
          <span>InternalCalc</span>
        </div>
        <div class="ic-controls">
          <button class="ic-btn" id="ic-minimize" title="Minimize">−</button>
          <button class="ic-btn" id="ic-close" title="Close">×</button>
        </div>
      </div>
      <div class="ic-content">
        ${contentHtml}
      </div>
    `;
    }

    generateSubjectCard(subject) {
        let componentsHtml = '';
        let totalWeighted = 0;

        subject.components.forEach(comp => {
            const weighted = (comp.obtained / comp.maxMarks) * comp.weight;
            totalWeighted += weighted;

            componentsHtml += `
        <tr>
          <td>
            <div style="font-weight: 600;">${comp.examName}</div>
            <div style="font-size: 10px; color: #888;">${comp.componentName}</div>
          </td>
          <td>${comp.obtained} / ${comp.maxMarks}</td>
          <td>
            <input type="number" step="0.5" class="ic-weight-input" 
                   data-sub="${subject.code}" data-comp-id="${comp.id}" 
                   value="${comp.weight}">
          </td>
          <td style="text-align: right; font-weight: bold; color: var(--ic-primary);">
            ${weighted.toFixed(2)}
          </td>
        </tr>
      `;
        });

        return `
      <div class="ic-subject-group">
        <div class="ic-subject-header">
          <div class="ic-subject-info">
            <div class="ic-course-code">${subject.code}</div>
            <div class="ic-course-name">${subject.name}</div>
          </div>
        </div>
        <table class="ic-marks-table">
          <thead>
            <tr>
              <th>Assessment</th>
              <th>Marks</th>
              <th>Weight</th>
              <th style="text-align: right;">Score</th>
            </tr>
          </thead>
          <tbody>
            ${componentsHtml}
          </tbody>
        </table>
        <div class="ic-result-container">
          <div class="ic-total-label">Estimated Internal</div>
          <div class="ic-total-value">${totalWeighted.toFixed(2)}</div>
        </div>
      </div>
    `;
    }

    updateWidget() {
        if (!this.widget) return;
        const content = this.widget.querySelector('.ic-content');
        if (!content) return;

        let contentHtml = '';
        const sortedCodes = Object.keys(this.subjects);
        if (sortedCodes.length === 0) {
            contentHtml = `<div class="ic-empty">No marks found.</div>`;
        } else {
            sortedCodes.forEach(code => {
                contentHtml += this.generateSubjectCard(this.subjects[code]);
            });
        }
        content.innerHTML = contentHtml;
        this.attachInputEvents();
    }

    attachEvents() {
        const header = this.widget.querySelector('.ic-header');
        const minBtn = this.widget.querySelector('#ic-minimize');
        const closeBtn = this.widget.querySelector('#ic-close');

        minBtn.onclick = () => {
            this.isMinimized = !this.isMinimized;
            this.widget.classList.toggle('minimized', this.isMinimized);
            minBtn.textContent = this.isMinimized ? '+' : '−';
        };

        closeBtn.onclick = () => this.widget.remove();

        this.makeDraggable(header);
        this.attachInputEvents();
    }

    attachInputEvents() {
        const inputs = this.widget.querySelectorAll('.ic-weight-input');
        inputs.forEach(input => {
            input.oninput = (e) => {
                const subCode = e.target.dataset.sub;
                const compId = e.target.dataset.compId;
                const newWeight = parseFloat(e.target.value) || 0;

                const comp = this.subjects[subCode].components.find(c => c.id === compId);
                if (comp) {
                    comp.weight = newWeight;
                    this.updateWidget(); // Refresh to show new total
                }
            };
        });
    }

    makeDraggable(header) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        header.onmousedown = (e) => {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = () => {
                document.onmouseup = null;
                document.onmousemove = null;
            };
            document.onmousemove = (e) => {
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                this.widget.style.top = (this.widget.offsetTop - pos2) + "px";
                this.widget.style.left = (this.widget.offsetLeft - pos1) + "px";
                this.widget.style.right = "auto";
            };
        };
    }
}

// Start
new AmritaInternalCalculator();

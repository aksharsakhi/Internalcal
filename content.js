/**
 * InternalCalc - Content Script
 * Scrapes marks data and provides an interactive internal calculation dashboard.
 */

class AmritaInternalCalculator {
    constructor() {
        this.subjects = {}; // Grouped by courseCode
        this.savedWeights = {}; // Persisted weights: key = "courseCode|examName|componentName"
        this.widget = null;
        this.isMinimized = false;
        this.theme = 'dark';
        this.init();
    }

    init() {
        // Load saved theme and weights first, then scrape and build
        Promise.all([this.loadTheme(), this.loadSavedWeights()]).then(() => {
            this.waitForTable().then(() => {
                this.scrapeMarks();
                this.createWidget();
            }).catch(() => { });
        });

        this.setupObserver();
    }

    setupObserver() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (this.widget && this.widget.contains(mutation.target)) continue;

                if (mutation.type === 'childList') {
                    const table = document.querySelector('table');
                    if (table && table.innerText.includes('Marks Obtained')) {
                        clearTimeout(this.scrapeTimeout);
                        this.scrapeTimeout = setTimeout(() => {
                            const activeEl = document.activeElement;
                            const isEditing = activeEl && activeEl.classList && activeEl.classList.contains('ic-weight-input');

                            this.scrapeMarks();
                            if (!isEditing) {
                                this.updateWidget();
                            }
                        }, 1000);
                        break;
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // ─── Storage Helpers ──────────────────────────────────────

    _weightKey(courseCode, examName, componentName) {
        return `${courseCode}|${examName}|${componentName}`;
    }

    async loadSavedWeights() {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['ic_weights'], (result) => {
                    this.savedWeights = result.ic_weights || {};
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    saveWeightsToStorage() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ ic_weights: this.savedWeights });
        }
    }

    clearSavedWeights() {
        this.savedWeights = {};
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.remove('ic_weights');
        }
        // Re-scrape with defaults and rebuild
        this.subjects = {};
        this.scrapeMarks();
        this.updateWidget();
    }

    async loadTheme() {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(['theme'], (result) => {
                    this.theme = result.theme || 'dark';
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    async saveTheme() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set({ theme: this.theme });
        }
    }

    // ─── Table Detection ──────────────────────────────────────

    async waitForTable() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 20;

            const check = () => {
                const rows = document.querySelectorAll('table tr');
                if (rows.length > 2) {
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

    // ─── Scraping ─────────────────────────────────────────────

    scrapeMarks() {
        const table = document.querySelector('table');
        if (!table) return;

        const rows = table.querySelectorAll('tr');
        const newSubjects = {};

        rows.forEach((row, index) => {
            if (index === 0) return;

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
            const lowerExam = examName.toLowerCase();
            const lowerComp = componentName.toLowerCase();

            if (lowerExam.includes('mid-term') || lowerComp.includes('mid-term')) {
                defaultWeight = 20;
            } else if (lowerExam.includes('quiz') || lowerComp.includes('quiz')) {
                defaultWeight = 5;
            }

            // 1st priority: SAVED weight from storage (persists across reload)
            const wKey = this._weightKey(courseCode, examName, componentName);
            if (this.savedWeights[wKey] !== undefined) {
                defaultWeight = this.savedWeights[wKey];
            }
            // 2nd priority: Weight already in memory from current session
            else {
                const existingSub = this.subjects[courseCode];
                if (existingSub) {
                    const existingComp = existingSub.components.find(c =>
                        c.examName === examName && c.componentName === componentName
                    );
                    if (existingComp && existingComp.weight !== undefined) {
                        defaultWeight = existingComp.weight;
                    }
                }
            }

            newSubjects[courseCode].components.push({
                id: `${courseCode}-${index}`,
                examName,
                componentName,
                obtained,
                maxMarks,
                weight: defaultWeight
            });
        });

        this.subjects = newSubjects;
    }

    // ─── Widget Creation ──────────────────────────────────────

    createWidget() {
        if (this.widget) this.widget.remove();

        this.widget = document.createElement('div');
        this.widget.className = `ic-widget ic-widget-enter ${this.theme === 'light' ? 'light-mode' : ''}`;
        this.renderWidget();
        document.body.appendChild(this.widget);

        this.widget.addEventListener('animationend', () => {
            this.widget.classList.remove('ic-widget-enter');
        }, { once: true });

        this.attachEvents();
    }

    renderWidget() {
        const sortedCodes = Object.keys(this.subjects);
        const hasSavedWeights = Object.keys(this.savedWeights).length > 0;

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
          <a href="https://github.com/aksharsakhi/Internalcal" target="_blank" class="ic-github-link">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            GitHub
          </a>
        </div>
        <div class="ic-controls">
          <button class="ic-btn" id="ic-theme-toggle" title="Toggle Theme">${this.theme === 'light' ? '🌙' : '☀️'}</button>
          ${hasSavedWeights ? '<button class="ic-btn ic-btn-reset" id="ic-reset-weights" title="Reset all saved weights">↺</button>' : ''}
          <button class="ic-btn" id="ic-minimize" title="Minimize">−</button>
          <button class="ic-btn" id="ic-close" title="Close">×</button>
        </div>
      </div>
      <div class="ic-content">
        ${contentHtml}
        <div class="ic-save-status" id="ic-save-status"></div>
        <div class="ic-wishes">All the best for your exams! 🍀</div>
      </div>
    `;
    }

    generateSubjectCard(subject) {
        let componentsHtml = '';
        let totalWeighted = 0;

        subject.components.forEach(comp => {
            const weighted = (comp.obtained / comp.maxMarks) * comp.weight;
            totalWeighted += weighted;

            // Check if this weight is saved (to show a subtle indicator)
            const wKey = this._weightKey(subject.code, comp.examName, comp.componentName);
            const isSaved = this.savedWeights[wKey] !== undefined;

            componentsHtml += `
        <tr>
          <td>
            <div style="font-weight: 600;">${comp.examName}</div>
            <div style="font-size: 10px; color: #888;">${comp.componentName}</div>
          </td>
          <td>${comp.obtained} / ${comp.maxMarks}</td>
          <td>
            <input type="text" inputmode="decimal" class="ic-weight-input ${isSaved ? 'ic-weight-saved' : ''}" 
                   data-sub="${subject.code}" data-comp-id="${comp.id}" 
                   data-exam="${comp.examName}" data-component="${comp.componentName}"
                   value="${comp.weight}"
                   placeholder="0">
          </td>
          <td class="ic-comp-score" data-comp-id="${comp.id}" style="text-align: right; font-weight: bold; color: var(--ic-primary);">
            ${weighted.toFixed(2)}
          </td>
        </tr>
      `;
        });

        return `
      <div class="ic-subject-group" data-sub-code="${subject.code}">
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

        const hasSavedWeights = Object.keys(this.savedWeights).length > 0;

        let contentHtml = '';
        const sortedCodes = Object.keys(this.subjects);
        if (sortedCodes.length === 0) {
            contentHtml = `<div class="ic-empty">No marks found.</div>`;
        } else {
            sortedCodes.forEach(code => {
                contentHtml += this.generateSubjectCard(this.subjects[code]);
            });
        }
        contentHtml += `<div class="ic-save-status" id="ic-save-status"></div>`;
        contentHtml += `<div class="ic-wishes">All the best for your exams! 🍀</div>`;
        content.innerHTML = contentHtml;

        // Update reset button visibility
        const resetBtn = this.widget.querySelector('#ic-reset-weights');
        if (hasSavedWeights && !resetBtn) {
            const controls = this.widget.querySelector('.ic-controls');
            const minBtn = this.widget.querySelector('#ic-minimize');
            const btn = document.createElement('button');
            btn.className = 'ic-btn ic-btn-reset';
            btn.id = 'ic-reset-weights';
            btn.title = 'Reset all saved weights';
            btn.textContent = '↺';
            btn.onclick = () => this.clearSavedWeights();
            controls.insertBefore(btn, minBtn);
        } else if (!hasSavedWeights && resetBtn) {
            resetBtn.remove();
        }

        this.attachInputEvents();
    }

    // ─── Event Handling ───────────────────────────────────────

    showSaveStatus(msg) {
        const el = this.widget.querySelector('#ic-save-status');
        if (el) {
            el.textContent = msg;
            el.style.opacity = '1';
            clearTimeout(this._saveStatusTimer);
            this._saveStatusTimer = setTimeout(() => {
                el.style.opacity = '0';
            }, 1500);
        }
    }

    attachEvents() {
        const header = this.widget.querySelector('.ic-header');
        const minBtn = this.widget.querySelector('#ic-minimize');
        const closeBtn = this.widget.querySelector('#ic-close');
        const themeBtn = this.widget.querySelector('#ic-theme-toggle');
        const resetBtn = this.widget.querySelector('#ic-reset-weights');

        themeBtn.onclick = () => {
            this.theme = this.theme === 'light' ? 'dark' : 'light';
            this.widget.classList.toggle('light-mode', this.theme === 'light');
            themeBtn.textContent = this.theme === 'light' ? '🌙' : '☀️';
            this.saveTheme();
        };

        minBtn.onclick = () => {
            this.isMinimized = !this.isMinimized;
            this.widget.classList.toggle('minimized', this.isMinimized);
            minBtn.textContent = this.isMinimized ? '+' : '−';
        };

        closeBtn.onclick = () => this.widget.remove();

        if (resetBtn) {
            resetBtn.onclick = () => this.clearSavedWeights();
        }

        this.makeDraggable(header);
        this.attachInputEvents();
    }

    attachInputEvents() {
        const inputs = this.widget.querySelectorAll('.ic-weight-input');
        inputs.forEach(input => {
            input.onclick = (e) => e.target.select();
            input.ondblclick = (e) => e.target.select();

            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.target.blur();
                    return;
                }

                const currentVal = parseFloat(e.target.value) || 0;

                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    e.target.value = currentVal + 1;
                    e.target.dispatchEvent(new Event('input'));
                    return;
                }

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    e.target.value = Math.max(0, currentVal - 1);
                    e.target.dispatchEvent(new Event('input'));
                    return;
                }

                const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', '.'];
                if (!allowed.includes(e.key) && !/^[0-9]$/.test(e.key)) {
                    e.preventDefault();
                }

                if (e.key === '.' && e.target.value.includes('.')) {
                    e.preventDefault();
                }
            };

            input.oninput = (e) => {
                const subCode = e.target.dataset.sub;
                const compId = e.target.dataset.compId;
                const examName = e.target.dataset.exam;
                const componentName = e.target.dataset.component;

                const rawValue = e.target.value;
                const newWeight = rawValue === '' ? 0 : (parseFloat(rawValue) || 0);

                const sub = this.subjects[subCode];
                if (!sub) return;

                const comp = sub.components.find(c => c.id === compId);
                if (comp) {
                    comp.weight = newWeight;

                    // Save to persistent storage (subject-specific)
                    const wKey = this._weightKey(subCode, examName, componentName);
                    this.savedWeights[wKey] = newWeight;
                    this.saveWeightsToStorage();

                    // Mark input as saved
                    e.target.classList.add('ic-weight-saved');

                    // Show save indicator
                    this.showSaveStatus('✓ Weights auto-saved');

                    // Update score display
                    const rowScore = (comp.obtained / comp.maxMarks) * newWeight;
                    const scoreElem = this.widget.querySelector(`.ic-comp-score[data-comp-id="${compId}"]`);
                    if (scoreElem) scoreElem.textContent = rowScore.toFixed(2);

                    // Update subject total
                    let newTotal = 0;
                    sub.components.forEach(c => {
                        newTotal += (c.obtained / c.maxMarks) * c.weight;
                    });

                    const subGroup = this.widget.querySelector(`.ic-subject-group[data-sub-code="${subCode}"]`);
                    if (subGroup) {
                        const totalElem = subGroup.querySelector('.ic-total-value');
                        if (totalElem) totalElem.textContent = newTotal.toFixed(2);
                    }
                }
            };
        });
    }

    // ─── Draggable ────────────────────────────────────────────

    makeDraggable(header) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        header.onmousedown = (e) => {
            if (e.target.closest('a') || e.target.closest('button') || e.target.closest('input')) return;
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

                let newTop = this.widget.offsetTop - pos2;
                let newLeft = this.widget.offsetLeft - pos1;

                const rect = this.widget.getBoundingClientRect();
                newTop = Math.max(0, Math.min(newTop, window.innerHeight - 50));
                newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - rect.width));

                this.widget.style.top = newTop + "px";
                this.widget.style.left = newLeft + "px";
                this.widget.style.right = "auto";
            };
        };
    }
}

// Start
new AmritaInternalCalculator();

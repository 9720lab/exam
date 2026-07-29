/* ============================================================
   app.js — Main Application (SPA Router + Views)
   ============================================================ */

(function () {
    'use strict';

    // ==================== Theme Management ====================
    function initTheme() {
        const saved = localStorage.getItem('theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }
    
    window._toggleTheme = function() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    };

    window._toggleQuestionDrawer = function() {
        const drawer = document.getElementById('questionGridDrawer');
        if (drawer) {
            drawer.classList.toggle('open');
        }
    };
    initTheme();

    // ==================== App State ====================
    let examStore = null;
    let progressStore = null;
    let currentView = null;
    let examState = null; // For active exam/practice sessions

    const DEV_PASSPHRASE = 'test123';
    const PASSPHRASE_KEY = 'exam_simulator_passphrase';

    // ==================== Router ====================

    function navigate(hash) {
        window.location.hash = hash;
    }

    function getRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const parts = hash.split('/').filter(Boolean);
        return { path: hash, parts };
    }

    function handleRoute() {
        const route = getRoute();
        const parts = route.parts;

        // Not unlocked yet
        if (!examStore) {
            renderUnlockScreen();
            return;
        }

        if (parts.length === 0 || parts[0] === '') {
            renderCatalog();
        } else if (parts[0] === 'exam' && parts.length === 2) {
            renderExamDashboard(parts[1]);
        } else if (parts[0] === 'practice' && parts.length >= 3) {
            renderPractice(parts[1], parts[2], parts[3]);
        } else if (parts[0] === 'exam-mode' && parts.length >= 3) {
            renderExamMode(parts[1], parts[2]);
        } else if (parts[0] === 'section' && parts.length >= 3) {
            renderSectionPractice(parts[1], parts[2]);
        } else if (parts[0] === 'review' && parts.length >= 3) {
            renderReview(parts[1], parts[2]);
        } else if (parts[0] === 'quick10') {
            renderQuick10(parts[1] || null);
        } else if (parts[0] === 'search') {
            renderSearch();
        } else if (parts[0] === 'stats') {
            renderStats();
        } else if (parts[0] === 'settings') {
            renderSettings();
        } else {
            renderCatalog();
        }
    }

    window.addEventListener('hashchange', handleRoute);

    // ==================== Init ====================

    async function init() {
        progressStore = new ExamEngine.ProgressStore();

        // Try stored passphrase
        const storedPassphrase = localStorage.getItem(PASSPHRASE_KEY);
        if (storedPassphrase) {
            try {
                await unlock(storedPassphrase);
                return;
            } catch (e) {
                localStorage.removeItem(PASSPHRASE_KEY);
            }
        }

        // No stored passphrase — show unlock
        handleRoute();
    }

    async function unlock(passphrase) {
        const data = await ExamEngine.decryptData(passphrase);
        examStore = new ExamEngine.ExamStore(data);
        localStorage.setItem(PASSPHRASE_KEY, passphrase);
        handleRoute();
    }

    // ==================== Layout Helpers ====================

    function appShell(content, activeNav = '') {
        return `
            <header class="app-header">
                <div class="app-header__inner">
                    <a href="#/" class="app-logo">
                        <div class="app-logo__icon">E</div>
                        <span>ExamSim</span>
                    </a>
                    <nav class="app-nav">
                        <a href="#/" class="nav-link ${activeNav === 'home' ? 'active' : ''}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                            <span class="nav-text" style="margin-left:4px">Exams</span>
                        </a>
                        <a href="#/search" class="nav-link ${activeNav === 'search' ? 'active' : ''}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <span class="nav-text" style="margin-left:4px">Search</span>
                        </a>
                        <a href="#/stats" class="nav-link ${activeNav === 'stats' ? 'active' : ''}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                            <span class="nav-text" style="margin-left:4px">Stats</span>
                        </a>
                        <a href="#/settings" class="nav-link ${activeNav === 'settings' ? 'active' : ''}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                            <span class="nav-text" style="margin-left:4px">Settings</span>
                        </a>
                        <button class="btn btn-ghost btn-sm" onclick="window._toggleTheme()" title="Toggle Theme" aria-label="Toggle Theme">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        </button>
                    </nav>
                </div>
            </header>
            <main>${content}</main>
        `;
    }

    function render(html) {
        document.getElementById('app').innerHTML = html;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function renderHtmlContent(text) {
        if (!text) return '';
        
        // Escape all HTML to be safe
        let escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        
        // Unescape img tags (we know the source format is <img src="images/...">)
        escaped = escaped.replace(/&lt;img\s+src=&quot;(.*?)&quot;\s*&gt;/g, '<img src="$1">');
        
        return escaped.replace(/\n/g, '<br>');
    }

    // ==================== Unlock Screen ====================

    function renderUnlockScreen() {
        render(`
            <div class="unlock-screen">
                <div class="unlock-card">
                    <div class="unlock-card__icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>
                    <h1 class="unlock-card__title">Exam Simulator</h1>
                    <p class="unlock-card__desc">Enter your passphrase to unlock the exam data and start practicing.</p>
                    <div class="unlock-input-group">
                        <input type="password" class="unlock-input" id="unlock-input" placeholder="Enter passphrase..." autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="current-password" autofocus>
                    </div>
                    <p class="unlock-error" id="unlock-error">Invalid passphrase. Please try again.</p>
                    <button class="btn btn-primary btn-block btn-lg" id="unlock-btn">Unlock</button>
                </div>
            </div>
        `);

        const input = document.getElementById('unlock-input');
        const btn = document.getElementById('unlock-btn');
        const error = document.getElementById('unlock-error');

        async function doUnlock() {
            const passphrase = input.value.trim();
            if (!passphrase) return;

            if (!window.isSecureContext) {
                error.textContent = 'Decryption requires a secure context (HTTPS or localhost). Your browser is blocking it.';
                error.classList.add('visible');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Decrypting...';
            error.classList.remove('visible');
            error.textContent = 'Invalid passphrase. Please try again.';

            try {
                await unlock(passphrase);
            } catch (e) {
                console.error(e);
                if (e.name === 'TypeError' || !window.crypto || !window.crypto.subtle) {
                    error.textContent = 'Your browser does not support or allow WebCrypto decryption here.';
                } else {
                    error.textContent = 'Invalid passphrase. Please try again.';
                }
                error.classList.add('visible');
                input.classList.add('error');
                btn.disabled = false;
                btn.textContent = 'Unlock';
                input.focus();
            }
        }

        btn.addEventListener('click', doUnlock);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doUnlock();
            input.classList.remove('error');
            error.classList.remove('visible');
        });
    }

    // ==================== Exam Catalog ====================

    function renderCatalog() {
        const exams = examStore.getExams();

        const cards = exams.map(exam => {
            const stats = progressStore.getExamStats(exam.slug);
            const progressPct = exam.total_questions > 0
                ? Math.round((stats.attempted / exam.total_questions) * 100)
                : 0;

            return `
                <div class="exam-card" data-provider="${exam.provider}" onclick="location.hash='#/exam/${exam.slug}'">
                    <span class="exam-card__provider ${exam.provider.toLowerCase()}">${exam.provider}</span>
                    <h2 class="exam-card__code">${exam.exam_code}</h2>
                    <p class="exam-card__name">${exam.exam_name}</p>
                    <div class="exam-card__stats">
                        <div class="exam-card__stat">
                            <span class="exam-card__stat-value">${exam.total_tests}</span>
                            <span class="exam-card__stat-label">Tests</span>
                        </div>
                        <div class="exam-card__stat">
                            <span class="exam-card__stat-value">${exam.total_questions}</span>
                            <span class="exam-card__stat-label">Questions</span>
                        </div>
                        <div class="exam-card__stat">
                            <span class="exam-card__stat-value">${exam.time_limit_minutes}m</span>
                            <span class="exam-card__stat-label">Time Limit</span>
                        </div>
                        <div class="exam-card__stat">
                            <span class="exam-card__stat-value">${exam.passing_score}</span>
                            <span class="exam-card__stat-label">Pass Score</span>
                        </div>
                    </div>
                    ${stats.attempted > 0 ? `
                        <div class="exam-card__progress">
                            <div class="progress-bar">
                                <div class="progress-bar__fill" style="width: ${progressPct}%"></div>
                            </div>
                            <div class="progress-bar__label">
                                <span>${stats.attempted} / ${exam.total_questions} attempted</span>
                                <span>${stats.accuracy}% accuracy</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        render(appShell(`
            <div class="page-container">
                <h1 class="page-title">Exam Catalog</h1>
                <p class="page-subtitle">Choose an exam to start practicing</p>
                <div class="exam-grid">${cards}</div>
            </div>
        `, 'home'));
    }

    // ==================== Exam Dashboard ====================

    function renderExamDashboard(slug) {
        const exam = examStore.getExam(slug);
        if (!exam) { navigate('/'); return; }

        const sections = examStore.getSections(slug);
        const examStats = progressStore.getExamStats(slug);

        const testsHtml = exam.tests.map(t => {
            const testKey = t.file_name.replace('.json', '');
            const attempts = progressStore.getExamAttempts(slug, testKey);
            const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;

            return `
                <div class="test-card">
                    <div class="test-card__info">
                        <h3>${t.test_name}</h3>
                        <p>${t.question_count} questions${lastAttempt ? ` · Last: ${lastAttempt.percentage}%` : ''}</p>
                    </div>
                    <div class="test-card__actions">
                        <button class="btn btn-sm btn-secondary" onclick="location.hash='#/practice/${slug}/${testKey}'">Practice</button>
                        <button class="btn btn-sm btn-primary" onclick="location.hash='#/exam-mode/${slug}/${testKey}'">Exam</button>
                    </div>
                </div>
            `;
        }).join('');

        const sectionsHtml = sections.map(s => {
            const sectionStats = progressStore.getSectionStats(slug, s.id, examStore);
            return `
                <div class="section-card" onclick="location.hash='#/section/${slug}/${s.id}'">
                    <div class="section-card__name">${s.name}</div>
                    <div class="section-card__count">${s.questionCount} questions${sectionStats.attempted > 0 ? ` · ${sectionStats.accuracy}% accuracy` : ''}</div>
                </div>
            `;
        }).join('');

        render(appShell(`
            <div class="page-container">
                <div class="breadcrumb">
                    <a href="#/">Exams</a>
                    <span class="breadcrumb__sep">›</span>
                    <span class="breadcrumb__current">${exam.exam_code}</span>
                </div>

                <div class="exam-header">
                    <div class="exam-header__info">
                        <h1 class="exam-header__code">${exam.exam_code}</h1>
                        <p class="exam-header__name">${exam.exam_name}</p>
                        <div class="exam-meta">
                            <span class="exam-meta__item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:text-bottom"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> <span>${exam.time_limit_minutes} min</span></span>
                            <span class="exam-meta__item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:text-bottom"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> <span>${exam.total_questions} questions</span></span>
                            <span class="exam-meta__item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:text-bottom"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg> <span>Pass: ${exam.passing_score}</span></span>
                            ${examStats.attempted > 0 ? `<span class="exam-meta__item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:text-bottom"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> <span>${examStats.accuracy}% accuracy</span></span>` : ''}
                        </div>
                    </div>
                </div>

                <div style="display: flex; gap: var(--space-sm); margin-bottom: var(--space-xl); flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="location.hash='#/quick10/${slug}'"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> Quick 10</button>
                </div>

                <h2 class="section-heading">Practice Tests</h2>
                <div class="test-grid">${testsHtml}</div>

                ${sections.length > 0 ? `
                    <h2 class="section-heading">Practice by Section</h2>
                    <div class="section-grid">${sectionsHtml}</div>
                ` : ''}
            </div>
        `, 'home'));
    }

    // ==================== Question Engine (shared by Practice, Exam, Section, Quick10) ====================

    function initQuestionSession(questions, options = {}) {
        examState = {
            questions,
            currentIndex: options.startIdx || 0,
            answers: {},        // { index: { selected: [], submitted: bool, correct: bool, confidence: null } }
            flags: new Set(),
            mode: options.mode || 'practice',  // 'practice' | 'exam' | 'review'
            slug: options.slug,
            testId: options.testId,
            timerSeconds: options.timerSeconds || null,
            timerInterval: null,
            startTime: Date.now(),
        };

        renderQuestion();

        if (examState.timerSeconds) {
            startTimer();
        }

        // Keyboard shortcuts
        document.removeEventListener('keydown', handleKeyboard);
        document.addEventListener('keydown', handleKeyboard);
    }

    function handleKeyboard(e) {
        if (!examState) return;
        // Ignore if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const q = examState.questions[examState.currentIndex];
        const answer = examState.answers[examState.currentIndex];

        switch (e.key) {
            case 'ArrowLeft':
            case 'p':
            case 'P':
                e.preventDefault();
                if (examState.currentIndex > 0) {
                    examState.currentIndex--;
                    renderQuestion();
                }
                break;
            case 'ArrowRight':
            case 'n':
            case 'N':
                e.preventDefault();
                if (examState.currentIndex < examState.questions.length - 1) {
                    examState.currentIndex++;
                    renderQuestion();
                }
                break;
            case '1': case '2': case '3': case '4': case '5':
            case '6': case '7': case '8': case '9':
                e.preventDefault();
                const optIndex = parseInt(e.key) - 1;
                if (q && optIndex < q.options.length) {
                    if (answer && answer.submitted) return;
                    toggleOption(optIndex);
                }
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                toggleFlag();
                break;
            case ' ':
                e.preventDefault();
                if (!answer || !answer.submitted) {
                    submitAnswer();
                }
                break;
        }
    }

    function toggleOption(optionIndex) {
        const q = examState.questions[examState.currentIndex];
        if (!examState.answers[examState.currentIndex]) {
            examState.answers[examState.currentIndex] = { selected: [], submitted: false, correct: false, confidence: null };
        }
        const answer = examState.answers[examState.currentIndex];
        if (answer.submitted) return;

        if (q.type === 'multi-select') {
            const idx = answer.selected.indexOf(optionIndex);
            if (idx >= 0) {
                answer.selected.splice(idx, 1);
            } else {
                answer.selected.push(optionIndex);
            }
        } else {
            answer.selected = [optionIndex];
        }
        renderQuestion();
    }

    function submitAnswer() {
        const idx = examState.currentIndex;
        const q = examState.questions[idx];
        if (!examState.answers[idx]) return;
        const answer = examState.answers[idx];
        if (answer.selected.length === 0) return;
        if (answer.submitted) return;

        // Check correctness
        const correctSet = new Set(q.correct_options);
        const selectedSet = new Set(answer.selected);
        answer.correct = correctSet.size === selectedSet.size &&
            [...correctSet].every(c => selectedSet.has(c));
        answer.submitted = true;

        // Save to progress store
        if (examState.slug && examState.testId) {
            progressStore.saveAnswer(
                examState.slug,
                examState.testId,
                q.id,
                answer.selected,
                answer.correct,
                answer.confidence
            );
        }

        renderQuestion();
    }

    function setConfidence(level) {
        const idx = examState.currentIndex;
        if (!examState.answers[idx]) {
            examState.answers[idx] = { selected: [], submitted: false, correct: false, confidence: null };
        }
        examState.answers[idx].confidence = level;
        renderQuestion();
    }

    function toggleFlag() {
        const idx = examState.currentIndex;
        if (examState.flags.has(idx)) {
            examState.flags.delete(idx);
        } else {
            examState.flags.add(idx);
        }

        // Also save to progress store
        const q = examState.questions[idx];
        if (examState.slug && examState.testId) {
            progressStore.toggleFlag(examState.slug, examState.testId, q.id);
        }

        renderQuestion();
    }

    // Timer
    function startTimer() {
        examState.timerInterval = setInterval(() => {
            examState.timerSeconds--;
            updateTimerDisplay();
            if (examState.timerSeconds <= 0) {
                clearInterval(examState.timerInterval);
                submitExam();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const el = document.getElementById('timer-display');
        if (!el) return;
        const mins = Math.floor(examState.timerSeconds / 60);
        const secs = examState.timerSeconds % 60;
        el.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        // Color warning
        const timerEl = el.closest('.timer');
        if (timerEl) {
            timerEl.classList.remove('warning', 'danger');
            if (examState.timerSeconds < 300) {
                timerEl.classList.add('danger');
            } else if (examState.timerSeconds < 600) {
                timerEl.classList.add('warning');
            }
        }
    }

    function submitExam() {
        if (examState.timerInterval) {
            clearInterval(examState.timerInterval);
        }

        // In exam mode, submit all unanswered as incorrect
        const questions = examState.questions;
        for (let i = 0; i < questions.length; i++) {
            if (!examState.answers[i]) {
                examState.answers[i] = { selected: [], submitted: true, correct: false, confidence: null };
            } else if (!examState.answers[i].submitted) {
                const q = questions[i];
                const answer = examState.answers[i];
                const correctSet = new Set(q.correct_options);
                const selectedSet = new Set(answer.selected);
                answer.correct = correctSet.size === selectedSet.size &&
                    [...correctSet].every(c => selectedSet.has(c));
                answer.submitted = true;
            }
        }

        // Calculate score
        let correct = 0;
        for (let i = 0; i < questions.length; i++) {
            if (examState.answers[i]?.correct) correct++;
        }

        const timeSpent = Math.round((Date.now() - examState.startTime) / 1000);

        // Save attempt
        if (examState.slug && examState.testId) {
            progressStore.saveExamAttempt(
                examState.slug,
                examState.testId,
                correct,
                questions.length,
                timeSpent
            );

            // Save each individual answer to progress
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                const a = examState.answers[i];
                if (a) {
                    progressStore.saveAnswer(
                        examState.slug,
                        examState.testId,
                        q.id,
                        a.selected,
                        a.correct,
                        a.confidence
                    );
                }
            }
        }

        // Switch to review mode
        examState.mode = 'review';
        renderResults(correct, questions.length, timeSpent);
    }

    // ==================== Render Question ====================

    function renderQuestion() {
        const q = examState.questions[examState.currentIndex];
        const answer = examState.answers[examState.currentIndex] || { selected: [], submitted: false };
        const isFlagged = examState.flags.has(examState.currentIndex);
        const isExamMode = examState.mode === 'exam';
        const showFeedback = answer.submitted && !isExamMode;

        const sectionName = examState.slug
            ? examStore.getSectionName(examState.slug, q.section_id)
            : `Section ${q.section_id}`;

        const isMultiSelect = q.type === 'multi-select';
        const correctCount = q.correct_options.length;

        // Options HTML
        const optionsHtml = q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i); // A, B, C, D...
            let classes = ['option-item'];
            if (isMultiSelect) classes.push('multi-select');
            if (answer.selected.includes(i)) classes.push('selected');
            if (answer.submitted && !isExamMode) classes.push('disabled');
            if (showFeedback) {
                if (q.correct_options.includes(i)) {
                    classes.push('correct-answer');
                    if (answer.selected.includes(i)) {
                        classes.push('correct');
                    }
                } else if (answer.selected.includes(i)) {
                    classes.push('incorrect');
                }
            }

            const indicatorContent = showFeedback
                ? (q.correct_options.includes(i) ? '✓' : (answer.selected.includes(i) ? '✗' : letter))
                : (answer.selected.includes(i) ? (isMultiSelect ? '✓' : '●') : letter);

            const isFocusable = (answer.submitted && !isExamMode) ? '-1' : '0';
            return `
                <li class="${classes.join(' ')}" onclick="window._toggleOption(${i})" tabindex="${isFocusable}" role="checkbox" aria-checked="${answer.selected.includes(i)}" onkeydown="if(event.key==='Enter'){event.preventDefault();window._toggleOption(${i})}">
                    <span class="option-item__indicator">${indicatorContent}</span>
                    <span class="option-item__text">${renderHtmlContent(opt)}</span>
                </li>
            `;
        }).join('');

        // Confidence bar (show after answering in practice mode)
        const confidenceHtml = (showFeedback || (answer.selected.length > 0 && !answer.submitted)) ? `
            <div class="confidence-bar" role="group" aria-label="Confidence Rating">
                <button class="confidence-btn guessed ${answer.confidence === 'guessed' ? 'selected' : ''}" onclick="window._setConfidence('guessed')" aria-pressed="${answer.confidence === 'guessed'}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> <span>Guessed</span></button>
                <button class="confidence-btn unsure ${answer.confidence === 'unsure' ? 'selected' : ''}" onclick="window._setConfidence('unsure')" aria-pressed="${answer.confidence === 'unsure'}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> <span>Unsure</span></button>
                <button class="confidence-btn confident ${answer.confidence === 'confident' ? 'selected' : ''}" onclick="window._setConfidence('confident')" aria-pressed="${answer.confidence === 'confident'}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> <span>Confident</span></button>
            </div>
        ` : '';

        // Explanation (show in practice mode after submit)
        const isExplanationVisible = answer.showExplanation || false;
        
        const explanationHtml = showFeedback && q.explanation ? `
            <div class="explanation-box">
                <div class="explanation-box__title" style="${!isExplanationVisible ? 'margin-bottom: 0;' : ''}">
                    ${answer.correct ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:text-bottom"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Correct!' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:text-bottom"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Incorrect'}
                    <span style="margin-left: auto; font-weight: normal; font-size: var(--font-size-xs);">
                        Correct answer: ${q.correct_options.map(i => String.fromCharCode(65 + i)).join(', ')}
                    </span>
                </div>
                ${!isExplanationVisible ? `
                <button class="btn btn-secondary btn-sm" style="margin-top: var(--space-md); width: 100%; display: flex; align-items: center; justify-content: center;" onclick="window._showExplanation()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Show Explanation
                </button>
                ` : `
                <div class="explanation-box__content">${renderHtmlContent(q.explanation)}</div>
                `}
            </div>
        ` : '';

        // Question grid
        const gridItems = examState.questions.map((_, i) => {
            let cls = ['question-grid__item'];
            if (i === examState.currentIndex) cls.push('current');
            if (examState.answers[i]?.submitted) {
                if (isExamMode) {
                    cls.push('answered');
                } else {
                    cls.push(examState.answers[i].correct ? 'correct' : 'incorrect');
                }
            } else if (examState.answers[i]?.selected.length > 0) {
                cls.push('answered');
            }
            if (examState.flags.has(i)) cls.push('flagged');
            return `<div class="${cls.join(' ')}" onclick="window._goToQuestion(${i})">${i + 1}</div>`;
        }).join('');

        // Timer HTML
        const timeWarning = examState.timerSeconds != null && examState.timerSeconds < 600;
        const timerHtml = examState.timerSeconds != null ? `
            <div class="timer-badge" ${timeWarning ? 'style="color:var(--color-error); border-color:var(--color-error-border); background:var(--color-error-bg)"' : ''}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> <span id="timer-display">${Math.floor(examState.timerSeconds / 60)}:${(examState.timerSeconds % 60).toString().padStart(2, '0')}</span>
            </div>
        ` : '';

        // Submit button
        let actionBtn = '';
        const answeredCount = Object.values(examState.answers).filter(a => a.selected.length > 0).length;
        const totalCount = examState.questions.length;
        const progressPercentage = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

        if (!answer.submitted && answer.selected.length > 0 && !isExamMode) {
            actionBtn = `<button class="btn btn-primary" onclick="window._submitAnswer()">Check answer</button>`;
        } else if (isExamMode && examState.currentIndex === examState.questions.length - 1) {
            actionBtn = `<button class="btn btn-danger" onclick="window._submitExam()">Finish Exam</button>`;
        }

        const content = `
            <div class="question-view">
                <div class="mobile-progress" style="width: ${progressPercentage}%"></div>
                <div class="question-panel">
                    <div class="question-grid-drawer" id="questionGridDrawer">
                        <div class="question-grid-panel">
                            <div class="question-grid-panel__title" style="display:flex; justify-content:space-between; align-items:center;">
                                <span>Questions ${isExamMode ? `(${answeredCount} / ${totalCount})` : ''}</span>
                                <button class="btn btn-ghost btn-sm close-drawer-btn" onclick="window._toggleQuestionDrawer()" aria-label="Close Grid">✕</button>
                            </div>
                            <div class="question-grid">${gridItems}</div>
                        </div>
                    </div>

                    <div class="question-content">
                        <div class="question-topbar">
                            <div class="question-counter">
                                <strong>Question ${examState.currentIndex + 1}</strong> of ${totalCount}
                            </div>
                            <div class="question-badges">
                                <span class="badge badge-section">${sectionName}</span>
                                <button class="badge badge-flag ${isFlagged ? 'flagged' : ''}" onclick="window._toggleFlag()" title="Flag Question" aria-label="Flag Question">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                                </button>
                                ${timerHtml}
                                <button class="btn btn-ghost btn-sm drawer-toggle-btn" onclick="window._toggleQuestionDrawer()" title="Toggle Grid" aria-label="Toggle Question Grid">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                </button>
                            </div>
                        </div>

                        ${isMultiSelect ? `<div class="multi-select-hint"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg> Select ${correctCount} answers</div>` : ''}

                        <div class="question-text">${renderHtmlContent(q.question)}</div>

                        <ul class="options-list">${optionsHtml}</ul>

                        ${confidenceHtml}
                        ${explanationHtml}

                        <div class="question-nav">
                            <button class="btn btn-ghost nav-prev" ${examState.currentIndex === 0 ? 'disabled' : ''} onclick="window._prevQuestion()">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                Previous
                            </button>
                            <div class="nav-action">
                                ${actionBtn}
                            </div>
                            <button class="btn btn-ghost nav-next" ${examState.currentIndex >= examState.questions.length - 1 ? 'disabled' : ''} onclick="window._nextQuestion()">
                                Next
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:2px"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Breadcrumb for header
        const examInfo = examState.slug ? examStore.getExam(examState.slug) : null;
        const modeLabel = isExamMode ? 'Exam Mode' : 'Practice';
        const headerContent = examInfo ? `
            <header class="app-header">
                <div class="app-header__inner">
                    <div style="display:flex;align-items:center;gap:var(--space-sm)">
                        <a href="#/exam/${examState.slug}" class="btn btn-ghost btn-sm">← Back</a>
                        <span style="color:var(--color-text-muted);font-size:var(--font-size-sm)">${examInfo.exam_code} · ${modeLabel}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:var(--space-sm)">
                        <button class="btn btn-ghost btn-sm" onclick="window._toggleTheme()" title="Toggle Theme" aria-label="Toggle Theme">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        </button>
                        ${isExamMode ? `<button class="btn btn-danger btn-sm" onclick="window._submitExam()">End Exam</button>` : ''}
                    </div>
                </div>
            </header>
        ` : '';

        render(`${headerContent}<main>${content}</main>`);
    }

    // ==================== Render Results ====================

    function renderResults(correct, total, timeSpent) {
        const exam = examState.slug ? examStore.getExam(examState.slug) : null;
        const percentage = Math.round((correct / total) * 1000); // Score out of 1000
        const passingScore = exam ? exam.passing_score : 700;
        const passed = percentage >= passingScore;

        const mins = Math.floor(timeSpent / 60);
        const secs = timeSpent % 60;

        // Section breakdown
        let sectionHtml = '';
        if (examState.slug) {
            const sections = examStore.getSections(examState.slug);
            const sectionScores = {};
            for (let i = 0; i < examState.questions.length; i++) {
                const q = examState.questions[i];
                const a = examState.answers[i];
                const sid = q.section_id;
                if (!sectionScores[sid]) sectionScores[sid] = { correct: 0, total: 0 };
                sectionScores[sid].total++;
                if (a?.correct) sectionScores[sid].correct++;
            }

            sectionHtml = `
                <div class="section-scores">
                    <h3 style="font-size:var(--font-size-md);font-weight:var(--font-weight-semibold);margin-bottom:var(--space-md)">Score by Section</h3>
                    ${sections.map(s => {
                        const ss = sectionScores[s.id];
                        if (!ss) return '';
                        const pct = Math.round((ss.correct / ss.total) * 100);
                        const color = pct >= 70 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-error)';
                        return `
                            <div class="section-score-row">
                                <span class="section-score-row__label">${s.name}</span>
                                <div class="section-score-row__bar">
                                    <div class="section-score-row__fill" style="width:${pct}%;background:${color}"></div>
                                </div>
                                <span class="section-score-row__value">${ss.correct}/${ss.total}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        const content = `
            <div class="page-container">
                <div class="results-card">
                    <div class="results-score ${passed ? 'pass' : 'fail'}">${percentage}</div>
                    <div class="results-label">${passed ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;vertical-align:text-bottom;color:var(--color-success)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Passed!' : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;vertical-align:text-bottom;color:var(--color-text-secondary)"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg> Keep Practicing'}</div>
                    <div class="results-detail">
                        Passing score: ${passingScore} · Time: ${mins}m ${secs}s
                    </div>
                    <div class="results-breakdown">
                        <div class="results-breakdown__item">
                            <div class="results-breakdown__value" style="color:var(--color-success)">${correct}</div>
                            <div class="results-breakdown__label">Correct</div>
                        </div>
                        <div class="results-breakdown__item">
                            <div class="results-breakdown__value" style="color:var(--color-error)">${total - correct}</div>
                            <div class="results-breakdown__label">Incorrect</div>
                        </div>
                        <div class="results-breakdown__item">
                            <div class="results-breakdown__value">${total}</div>
                            <div class="results-breakdown__label">Total</div>
                        </div>
                    </div>
                </div>

                ${sectionHtml}

                <div style="text-align:center; margin-top:var(--space-xl); display:flex; gap:var(--space-md); justify-content:center; flex-wrap:wrap;">
                    <button class="btn btn-primary" onclick="window._reviewAnswers()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg> Review Answers</button>
                    ${examState.slug ? `<button class="btn btn-secondary" onclick="location.hash='#/exam/${examState.slug}'">← Back to Exam</button>` : ''}
                    <button class="btn btn-secondary" onclick="location.hash='#/'"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> Home</button>
                </div>
            </div>
        `;

        render(appShell(content));
    }

    // ==================== Practice Mode ====================

    function renderPractice(slug, testId, startIdx) {
        const questions = examStore.getTest(slug, testId);
        if (!questions) { navigate(`/exam/${slug}`); return; }

        initQuestionSession(questions, { mode: 'practice', slug, testId, startIdx: startIdx ? parseInt(startIdx) : 0 });
    }

    // ==================== Exam Mode ====================

    function renderExamMode(slug, testId) {
        const questions = examStore.getTest(slug, testId);
        const exam = examStore.getExam(slug);
        if (!questions || !exam) { navigate(`/exam/${slug}`); return; }

        // Show confirmation modal first
        render(appShell(`
            <div class="page-container" style="display:flex;align-items:center;justify-content:center;min-height:60vh;">
                <div class="results-card" style="text-align:center">
                    <h2 style="font-size:var(--font-size-xl);margin-bottom:var(--space-md);display:flex;align-items:center;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg> Start Exam</h2>
                    <p style="color:var(--color-text-secondary);margin-bottom:var(--space-lg)">
                        <strong>${exam.exam_code}</strong> · ${questions.length} questions · ${exam.time_limit_minutes} minutes<br>
                        Passing score: ${exam.passing_score}/1000
                    </p>
                    <p style="color:var(--color-text-muted);font-size:var(--font-size-sm);margin-bottom:var(--space-xl)">
                        In exam mode, you won't see explanations until you finish. The timer will auto-submit when it expires.
                    </p>
                    <div style="display:flex;gap:var(--space-md);justify-content:center">
                        <button class="btn btn-secondary" onclick="location.hash='#/exam/${slug}'">Cancel</button>
                        <button class="btn btn-primary btn-lg" id="start-exam-btn">Start Exam</button>
                    </div>
                </div>
            </div>
        `));

        document.getElementById('start-exam-btn').addEventListener('click', () => {
            initQuestionSession(questions, {
                mode: 'exam',
                slug,
                testId,
                timerSeconds: exam.time_limit_minutes * 60,
            });
        });
    }

    // ==================== Section Practice ====================

    function renderSectionPractice(slug, sectionId) {
        const questions = examStore.getQuestionsBySection(slug, sectionId);
        if (!questions || questions.length === 0) { navigate(`/exam/${slug}`); return; }

        // For section practice, the testId is the section's source test
        // We use a synthetic testId for progress tracking
        initQuestionSession(questions, {
            mode: 'practice',
            slug,
            testId: questions[0]._testId, // use the test id from first question
        });
    }

    // ==================== Quick 10 ====================

    function renderQuick10(slug) {
        let pool;
        if (slug) {
            pool = examStore.getAllQuestions(slug);
        } else {
            pool = [];
            for (const exam of examStore.getExams()) {
                pool.push(...examStore.getAllQuestions(exam.slug));
            }
        }

        // Shuffle and pick 10
        const shuffled = pool.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 10);

        initQuestionSession(selected, {
            mode: 'practice',
            slug: slug || selected[0]?._examSlug,
            testId: selected[0]?._testId,
        });
    }

    // ==================== Review (post-results) ====================

    function renderReview(slug, testId) {
        const questions = examStore.getTest(slug, testId);
        if (!questions) { navigate(`/exam/${slug}`); return; }

        // Create a review session from saved progress
        examState = {
            questions,
            currentIndex: 0,
            answers: {},
            flags: new Set(),
            mode: 'practice', // Allow seeing explanations
            slug,
            testId,
            timerSeconds: null,
        };

        // Load saved answers
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const saved = progressStore.getAnswer(slug, testId, q.id);
            if (saved) {
                examState.answers[i] = {
                    selected: saved.selected,
                    submitted: true,
                    correct: saved.correct,
                    confidence: saved.confidence,
                };
            }
            if (progressStore.isFlagged(slug, testId, q.id)) {
                examState.flags.add(i);
            }
        }

        document.removeEventListener('keydown', handleKeyboard);
        document.addEventListener('keydown', handleKeyboard);
        renderQuestion();
    }

    // ==================== Search ====================

    function renderSearch() {
        render(appShell(`
            <div class="page-container">
                <h1 class="page-title">Search Questions</h1>
                <div class="search-container">
                    <span class="search-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span>
                    <input type="text" class="search-input" id="search-input" placeholder="Search questions, options, explanations...">
                </div>
                <div id="search-results"></div>
            </div>
        `, 'search'));

        let debounceTimer;
        document.getElementById('search-input').addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const query = e.target.value;
                const results = examStore.searchQuestions(query);
                renderSearchResults(results, query);
            }, 300);
        });

        document.getElementById('search-input').focus();
    }

    function renderSearchResults(results, query) {
        const container = document.getElementById('search-results');
        if (!query.trim()) {
            container.innerHTML = '';
            return;
        }

        if (results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></div>
                    <div class="empty-state__text">No results found for "${escapeHtml(query)}"</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <p class="search-results-count">${results.length} result${results.length !== 1 ? 's' : ''} found</p>
            ${results.map(q => `
                <a href="#/practice/${q._examSlug}/${q._testId}/${q._indexInTest}" style="text-decoration:none; color:inherit; display:block">
                    <div class="test-card" style="margin-bottom:var(--space-sm);cursor:pointer">
                        <div class="test-card__info" style="min-width:0">
                            <h3 style="font-size:var(--font-size-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                                ${escapeHtml(q.question.substring(0, 120))}${q.question.length > 120 ? '...' : ''}
                            </h3>
                            <p>${q._examSlug || ''} · ${q.type} · Section ${q.section_id}</p>
                        </div>
                    </div>
                </a>
            `).join('')}
        `;
    }

    // ==================== Stats ====================

    function renderStats() {
        const globalStats = progressStore.getStats();
        const exams = examStore.getExams();

        const examStatsHtml = exams.map(exam => {
            const stats = progressStore.getExamStats(exam.slug);
            if (stats.attempted === 0) return '';
            const pct = stats.accuracy;
            return `
                <div class="test-card" style="margin-bottom:var(--space-sm)">
                    <div class="test-card__info">
                        <h3>${exam.exam_code}</h3>
                        <p>${stats.attempted} attempted · ${stats.correct} correct · ${pct}% accuracy</p>
                    </div>
                    <div style="width:100px">
                        <div class="progress-bar">
                            <div class="progress-bar__fill" style="width:${Math.round((stats.attempted / exam.total_questions) * 100)}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        render(appShell(`
            <div class="page-container">
                <h1 class="page-title">Statistics</h1>
                <p class="page-subtitle">Your overall exam preparation progress</p>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-card__label">Total Attempted</div>
                        <div class="stat-card__value">${globalStats.totalAttempted}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card__label">Total Correct</div>
                        <div class="stat-card__value" style="color:var(--color-success)">${globalStats.totalCorrect}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card__label">Accuracy</div>
                        <div class="stat-card__value">${globalStats.totalAttempted > 0 ? Math.round((globalStats.totalCorrect / globalStats.totalAttempted) * 100) : 0}%</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card__label">Questions Remaining</div>
                        <div class="stat-card__value">${exams.reduce((sum, e) => sum + e.total_questions, 0) - globalStats.totalAttempted}</div>
                    </div>
                </div>

                <h2 class="section-heading">By Exam</h2>
                ${examStatsHtml || '<div class="empty-state"><div class="empty-state__icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></div><div class="empty-state__text">No stats yet. Start practicing!</div></div>'}
            </div>
        `, 'stats'));
    }

    // ==================== Settings ====================

    function renderSettings() {
        render(appShell(`
            <div class="page-container">
                <h1 class="page-title">Settings</h1>
                <p class="page-subtitle">Manage your data and preferences</p>

                <div style="display:flex;flex-direction:column;gap:var(--space-md);max-width:500px">
                    <div class="test-card" style="flex-direction:column;align-items:stretch;gap:var(--space-md)">
                        <h3 style="font-size:var(--font-size-base);display:flex;align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Export Progress</h3>
                        <p style="font-size:var(--font-size-sm);color:var(--color-text-muted)">Download your progress as a JSON file</p>
                        <button class="btn btn-secondary btn-sm" id="export-btn">Export</button>
                    </div>

                    <div class="test-card" style="flex-direction:column;align-items:stretch;gap:var(--space-md)">
                        <h3 style="font-size:var(--font-size-base);display:flex;align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Import Progress</h3>
                        <p style="font-size:var(--font-size-sm);color:var(--color-text-muted)">Import progress from another device</p>
                        <input type="file" accept=".json" id="import-input" style="display:none">
                        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('import-input').click()">Choose File</button>
                    </div>

                    <div class="test-card" style="flex-direction:column;align-items:stretch;gap:var(--space-md)">
                        <h3 style="font-size:var(--font-size-base);display:flex;align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Clear All Data</h3>
                        <p style="font-size:var(--font-size-sm);color:var(--color-text-muted)">Remove all progress, flags, and bookmarks</p>
                        <button class="btn btn-danger btn-sm" id="clear-btn">Clear All Data</button>
                    </div>

                    <div class="test-card" style="flex-direction:column;align-items:stretch;gap:var(--space-md)">
                        <h3 style="font-size:var(--font-size-base);display:flex;align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Change Passphrase</h3>
                        <p style="font-size:var(--font-size-sm);color:var(--color-text-muted)">Remove stored passphrase and re-enter</p>
                        <button class="btn btn-secondary btn-sm" id="reset-passphrase-btn">Reset Passphrase</button>
                    </div>

                    <div class="test-card" style="flex-direction:column;align-items:stretch;gap:var(--space-md)">
                        <h3 style="font-size:var(--font-size-base);display:flex;align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6.01" y2="8"></line><line x1="10" y1="8" x2="10.01" y2="8"></line><line x1="14" y1="8" x2="14.01" y2="8"></line><line x1="18" y1="8" x2="18.01" y2="8"></line><line x1="6" y1="12" x2="6.01" y2="12"></line><line x1="10" y1="12" x2="10.01" y2="12"></line><line x1="14" y1="12" x2="14.01" y2="12"></line><line x1="18" y1="12" x2="18.01" y2="12"></line><line x1="8" y1="16" x2="16" y2="16"></line></svg> Keyboard Shortcuts</h3>
                        <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary);line-height:2">
                            <span class="shortcut-hint">1-9</span> Select option ·
                            <span class="shortcut-hint">←</span> <span class="shortcut-hint">→</span> Navigate questions ·
                            <span class="shortcut-hint">N</span> <span class="shortcut-hint">P</span> Next / Previous ·
                            <span class="shortcut-hint">F</span> Toggle flag ·
                            <span class="shortcut-hint">Space</span> Submit answer
                        </div>
                    </div>
                </div>
            </div>
        `, 'settings'));

        // Export
        document.getElementById('export-btn').addEventListener('click', () => {
            const data = progressStore.exportData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `exam-progress-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });

        // Import
        document.getElementById('import-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const success = progressStore.importData(reader.result);
                if (success) {
                    alert('Progress imported successfully!');
                } else {
                    alert('Invalid file format.');
                }
            };
            reader.readAsText(file);
        });

        // Clear
        document.getElementById('clear-btn').addEventListener('click', () => {
            if (confirm('Are you sure? This will delete all your progress, flags, and bookmarks.')) {
                progressStore.clearAll();
                alert('All data cleared.');
            }
        });

        // Reset passphrase
        document.getElementById('reset-passphrase-btn').addEventListener('click', () => {
            localStorage.removeItem(PASSPHRASE_KEY);
            examStore = null;
            location.hash = '#/';
            location.reload();
        });
    }

    // ==================== Global function exports (for onclick handlers) ====================

    window._toggleOption = toggleOption;
    window._submitAnswer = submitAnswer;
    window._setConfidence = setConfidence;
    window._toggleFlag = toggleFlag;
    window._submitExam = submitExam;
    window._prevQuestion = () => {
        if (examState && examState.currentIndex > 0) {
            examState.currentIndex--;
            window.scrollTo(0, 0);
            renderQuestion();
        }
    };
    window._nextQuestion = () => {
        if (examState && examState.currentIndex < examState.questions.length - 1) {
            examState.currentIndex++;
            window.scrollTo(0, 0);
            renderQuestion();
        }
    };
    window._goToQuestion = (idx) => {
        if (examState) {
            examState.currentIndex = idx;
            window.scrollTo(0, 0);
            renderQuestion();
        }
    };
    window._reviewAnswers = () => {
        if (examState) {
            examState.mode = 'practice'; // Show explanations in review
            examState.currentIndex = 0;
            renderQuestion();
        }
    };
    window._showExplanation = () => {
        if (examState) {
            const answer = examState.answers[examState.currentIndex];
            if (answer) {
                answer.showExplanation = true;
                renderQuestion();
            }
        }
    };

    // ==================== Start ====================
    init();

})();

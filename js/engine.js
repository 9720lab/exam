/* ============================================================
   engine.js — Decryption & Data Access Layer
   Uses Web Crypto API for AES-256-GCM decryption
   ============================================================ */

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

// ==================== Crypto ====================

async function decryptData(passphrase) {
    if (!window.EXAM_DATA_ENCRYPTED) {
        throw new Error('No encrypted data found. Ensure data.js is loaded.');
    }

    const encryptedBytes = base64ToArrayBuffer(window.EXAM_DATA_ENCRYPTED);
    const salt = encryptedBytes.slice(0, SALT_LENGTH);
    const iv = encryptedBytes.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = encryptedBytes.slice(SALT_LENGTH + IV_LENGTH);

    // Derive key from passphrase using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        ciphertext
    );

    const jsonString = new TextDecoder().decode(decrypted);
    return JSON.parse(jsonString);
}

function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// ==================== ExamStore ====================

class ExamStore {
    constructor(data) {
        this.data = data; // { exams: { "slug": { metadata, tests } } }
    }

    /** Get all exam slugs and metadata */
    getExams() {
        return Object.entries(this.data.exams).map(([slug, exam]) => ({
            slug,
            ...exam.metadata,
        }));
    }

    /** Get single exam metadata */
    getExam(slug) {
        const exam = this.data.exams[slug];
        if (!exam) return null;
        return { slug, ...exam.metadata };
    }

    /** Get questions for a specific test */
    getTest(slug, testId) {
        const exam = this.data.exams[slug];
        if (!exam) return null;
        return exam.tests[testId] || null;
    }

    /** Get all tests for an exam */
    getTests(slug) {
        const exam = this.data.exams[slug];
        if (!exam) return {};
        return exam.tests;
    }

    /** Get all questions from all tests for an exam */
    getAllQuestions(slug) {
        const tests = this.getTests(slug);
        const allQuestions = [];
        for (const [testId, questions] of Object.entries(tests)) {
            questions.forEach((q, index) => {
                allQuestions.push({ ...q, _testId: testId, _indexInTest: index });
            });
        }
        return allQuestions;
    }

    /** Get questions filtered by section_id */
    getQuestionsBySection(slug, sectionId) {
        const allQuestions = this.getAllQuestions(slug);
        return allQuestions.filter(q => q.section_id === parseInt(sectionId));
    }

    /** Get section name from section id */
    getSectionName(slug, sectionId) {
        const exam = this.getExam(slug);
        if (!exam || !exam.sections) return `Section ${sectionId}`;
        return exam.sections[String(sectionId)] || `Section ${sectionId}`;
    }

    /** Get all sections with question counts */
    getSections(slug) {
        const exam = this.getExam(slug);
        if (!exam || !exam.sections) return [];
        const allQuestions = this.getAllQuestions(slug);

        return Object.entries(exam.sections)
            .filter(([_, name]) => name && name.trim() !== '')
            .map(([id, name]) => ({
                id: parseInt(id),
                name,
                questionCount: allQuestions.filter(q => q.section_id === parseInt(id)).length,
            }));
    }

    /** Search questions by text */
    searchQuestions(query, examSlug = null) {
        const normalizedQuery = query.toLowerCase().trim();
        if (!normalizedQuery) return [];

        const exams = examSlug ? [examSlug] : Object.keys(this.data.exams);
        const results = [];

        for (const slug of exams) {
            const allQuestions = this.getAllQuestions(slug);
            for (const q of allQuestions) {
                const searchText = [
                    q.question,
                    ...(q.options || []),
                    q.explanation || '',
                ].join(' ').toLowerCase();

                if (searchText.includes(normalizedQuery)) {
                    results.push({ ...q, _examSlug: slug });
                }

                if (results.length >= 100) return results; // cap results
            }
        }
        return results;
    }
}

// ==================== ProgressStore ====================

class ProgressStore {
    constructor() {
        this.storageKey = 'exam_simulator_progress';
        this.data = this._load();
    }

    _load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : this._defaultData();
        } catch {
            return this._defaultData();
        }
    }

    _defaultData() {
        return {
            answers: {},          // { "slug:testId:questionId": { selected: [], correct: bool, timestamp, confidence } }
            flags: {},            // { "slug:testId:questionId": true }
            bookmarks: {},        // { "slug:testId:questionId": true }
            examAttempts: {},     // { "slug:testId": [{ score, total, timestamp, timeSpent }] }
            spacedRepetition: {}, // { "questionKey": { nextReview: timestamp, interval: days, repetitions: number } }
            stats: {
                totalAttempted: 0,
                totalCorrect: 0,
            },
        };
    }

    _save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (e) {
            console.error('Failed to save progress:', e);
        }
    }

    _questionKey(slug, testId, questionId) {
        return `${slug}:${testId}:${questionId}`;
    }

    // --- Answers ---
    saveAnswer(slug, testId, questionId, selectedOptions, isCorrect, confidence = null) {
        const key = this._questionKey(slug, testId, questionId);
        const isNew = !this.data.answers[key];
        this.data.answers[key] = {
            selected: selectedOptions,
            correct: isCorrect,
            confidence,
            timestamp: Date.now(),
        };
        if (isNew) {
            this.data.stats.totalAttempted++;
            if (isCorrect) this.data.stats.totalCorrect++;
        }
        // Update spaced repetition
        this._updateSpacedRepetition(key, isCorrect);
        this._save();
    }

    getAnswer(slug, testId, questionId) {
        return this.data.answers[this._questionKey(slug, testId, questionId)] || null;
    }

    // --- Flags ---
    toggleFlag(slug, testId, questionId) {
        const key = this._questionKey(slug, testId, questionId);
        if (this.data.flags[key]) {
            delete this.data.flags[key];
        } else {
            this.data.flags[key] = true;
        }
        this._save();
        return !!this.data.flags[key];
    }

    isFlagged(slug, testId, questionId) {
        return !!this.data.flags[this._questionKey(slug, testId, questionId)];
    }

    // --- Bookmarks ---
    toggleBookmark(slug, testId, questionId) {
        const key = this._questionKey(slug, testId, questionId);
        if (this.data.bookmarks[key]) {
            delete this.data.bookmarks[key];
        } else {
            this.data.bookmarks[key] = true;
        }
        this._save();
        return !!this.data.bookmarks[key];
    }

    isBookmarked(slug, testId, questionId) {
        return !!this.data.bookmarks[this._questionKey(slug, testId, questionId)];
    }

    // --- Exam Attempts ---
    saveExamAttempt(slug, testId, score, total, timeSpent) {
        const key = `${slug}:${testId}`;
        if (!this.data.examAttempts[key]) {
            this.data.examAttempts[key] = [];
        }
        this.data.examAttempts[key].push({
            score,
            total,
            percentage: Math.round((score / total) * 100),
            timeSpent,
            timestamp: Date.now(),
        });
        this._save();
    }

    getExamAttempts(slug, testId) {
        return this.data.examAttempts[`${slug}:${testId}`] || [];
    }

    // --- Spaced Repetition ---
    _updateSpacedRepetition(key, isCorrect) {
        if (!this.data.spacedRepetition[key]) {
            this.data.spacedRepetition[key] = { interval: 1, repetitions: 0 };
        }
        const sr = this.data.spacedRepetition[key];
        if (isCorrect) {
            sr.repetitions++;
            // Increase interval: 1 day, 3 days, 7 days, 14 days, 30 days
            const intervals = [1, 3, 7, 14, 30];
            sr.interval = intervals[Math.min(sr.repetitions, intervals.length - 1)];
        } else {
            sr.repetitions = 0;
            sr.interval = 1; // Reset to 1 day
        }
        sr.nextReview = Date.now() + sr.interval * 24 * 60 * 60 * 1000;
    }

    getDueForReview(slug = null) {
        const now = Date.now();
        const due = [];
        for (const [key, sr] of Object.entries(this.data.spacedRepetition)) {
            if (sr.nextReview && sr.nextReview <= now) {
                if (slug) {
                    if (key.startsWith(slug + ':')) {
                        due.push(key);
                    }
                } else {
                    due.push(key);
                }
            }
        }
        return due;
    }

    // --- Stats ---
    getStats() {
        return { ...this.data.stats };
    }

    getExamStats(slug) {
        let attempted = 0;
        let correct = 0;
        for (const [key, answer] of Object.entries(this.data.answers)) {
            if (key.startsWith(slug + ':')) {
                attempted++;
                if (answer.correct) correct++;
            }
        }
        return { attempted, correct, accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0 };
    }

    getSectionStats(slug, sectionId, examStore) {
        const questions = examStore.getQuestionsBySection(slug, sectionId);
        let attempted = 0;
        let correct = 0;
        for (const q of questions) {
            const answer = this.getAnswer(slug, q._testId, q.id);
            if (answer) {
                attempted++;
                if (answer.correct) correct++;
            }
        }
        return { attempted, correct, total: questions.length, accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0 };
    }

    // --- Export / Import ---
    exportData() {
        return JSON.stringify(this.data, null, 2);
    }

    importData(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            // Validate basic structure
            if (imported.answers && imported.flags && imported.stats) {
                this.data = imported;
                this._save();
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }

    clearAll() {
        this.data = this._defaultData();
        this._save();
    }
}

// ==================== Export for global access ====================
window.ExamEngine = {
    decryptData,
    ExamStore,
    ProgressStore,
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Theme Toggler
    initTheme();

    // 2. Register slider value sync & live auto-update
    const sliders = [
        { id: 'cgpa', badgeId: 'val-cgpa' },
        { id: 'backlogs', badgeId: 'val-backlogs' },
        { id: 'coding_score', badgeId: 'val-coding_score' },
        { id: 'aptitude_score', badgeId: 'val-aptitude_score' },
        { id: 'soft_skills', badgeId: 'val-soft_skills' }
    ];

    sliders.forEach(({ id, badgeId }) => {
        const input = document.getElementById(id);
        const badge = document.getElementById(badgeId);
        if (input && badge) {
            input.addEventListener('input', () => {
                badge.textContent = input.value;
                updateSliderTrack(input);
            });
            updateSliderTrack(input);
        }
    });

    // Form element
    const form = document.getElementById('prediction-form');
    const btnReset = document.getElementById('btn-reset');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await runPrediction();
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            form.reset();
            sliders.forEach(({ id, badgeId }) => {
                const input = document.getElementById(id);
                const badge = document.getElementById(badgeId);
                if (input && badge) {
                    badge.textContent = input.value;
                    updateSliderTrack(input);
                }
            });
            runPrediction();
        });
    }

    // Theme toggle button
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }

    // Initialize Dataset Student Picker
    initStudentPicker();

    // Trigger initial prediction on page load
    runPrediction();
});

let datasetStudents = [];

async function initStudentPicker() {
    const picker = document.getElementById('student-picker');
    const randomBtn = document.getElementById('btn-random-student');
    const idInput = document.getElementById('student-id-input');
    const loadIdBtn = document.getElementById('btn-load-id');
    const errorDiv = document.getElementById('picker-error');

    if (!picker) return;

    try {
        const response = await fetch('/api/students?limit=250');
        const data = await response.json();

        if (data.students && data.students.length > 0) {
            datasetStudents = data.students;
            picker.innerHTML = '<option value="">-- Choose Profile from List --</option>';
            data.students.forEach(st => {
                const statusText = st.PlacementStatus === 1 ? `Placed (${st['Salary Package']} LPA)` : 'Unplaced';
                const option = document.createElement('option');
                option.value = st.StudentID;
                option.textContent = `Student #${st.StudentID} - ${st.Stream} (${st.CollegeTier}, CGPA: ${st.CGPA}) -> ${statusText}`;
                picker.appendChild(option);
            });
        } else {
            picker.innerHTML = '<option value="">-- No Records Available --</option>';
        }
    } catch (err) {
        console.error('Error fetching student list:', err);
        picker.innerHTML = '<option value="">-- Error Loading Dataset --</option>';
    }

    // Dropdown change listener
    picker.addEventListener('change', (e) => {
        const studentId = e.target.value;
        if (studentId) {
            if (idInput) idInput.value = studentId;
            loadStudentRecord(studentId);
        } else {
            hideActualOutcomeBadge();
        }
    });

    // Direct ID search listeners
    const handleIdSearch = () => {
        if (!idInput) return;
        const val = idInput.value.trim();
        if (!val || isNaN(val)) {
            showPickerError('Please enter a valid numeric Student ID.');
            return;
        }
        if (picker) picker.value = val;
        loadStudentRecord(val);
    };

    if (loadIdBtn) {
        loadIdBtn.addEventListener('click', handleIdSearch);
    }

    if (idInput) {
        idInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleIdSearch();
            }
        });
    }

    // Random Pick button listener
    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            if (datasetStudents.length === 0) return;
            const randomIndex = Math.floor(Math.random() * datasetStudents.length);
            const selected = datasetStudents[randomIndex];
            if (selected) {
                if (picker) picker.value = selected.StudentID;
                if (idInput) idInput.value = selected.StudentID;
                loadStudentRecord(selected.StudentID);
            }
        });
    }
}

function showPickerError(msg) {
    const errorDiv = document.getElementById('picker-error');
    if (errorDiv) {
        errorDiv.textContent = msg;
        errorDiv.style.display = 'flex';
        setTimeout(() => { errorDiv.style.display = 'none'; }, 4000);
    }
}

async function loadStudentRecord(studentId) {
    const errorDiv = document.getElementById('picker-error');
    if (errorDiv) errorDiv.style.display = 'none';

    try {
        const response = await fetch(`/api/student/${studentId}`);
        if (!response.ok) {
            if (response.status === 404) {
                showPickerError(`Student ID #${studentId} not found in cleaned dataset (Valid IDs: 1 to 50000).`);
                return;
            }
            throw new Error('Student record fetch failed');
        }
        const student = await response.json();

        applyStudentToForm(student);
        updateActualOutcomeBadge(student);
        runPrediction();
    } catch (err) {
        console.error('Error loading student record:', err);
        showPickerError(`Could not load student #${studentId}. Please verify backend status.`);
    }
}

function mapStreamToSelect(streamStr) {
    if (!streamStr) return 'Computer Science';
    const s = streamStr.toUpperCase();
    if (s === 'CS' || s === 'COMPUTER SCIENCE') return 'Computer Science';
    if (s === 'ECE' || s.includes('ELECTRONIC')) return 'Electronics & Communication';
    if (s === 'EE' || s.includes('ELECTRICAL')) return 'Electrical Engineering';
    if (s === 'MECHANICAL') return 'Mechanical Engineering';
    if (s === 'CIVIL') return 'Civil Engineering';
    if (s === 'IT' || s.includes('DATA')) return 'Data Science / AI';
    return 'Computer Science';
}

function applyStudentToForm(st) {
    setFieldValue('stream', mapStreamToSelect(st.Stream));
    setFieldValue('cgpa', st.CGPA);
    setFieldValue('backlogs', st.HistoryOfBacklogs === 'Yes' ? 1 : 0);
    setFieldValue('coding_score', Math.round(st.CodingTestScore));
    setFieldValue('aptitude_score', Math.round(st.AptitudeTestScore));
    
    // SoftSkillsRating (1-5 range converted to 0-100%)
    const softPct = Math.min(100, Math.round((st.SoftSkillsRating || 3.5) * 20));
    setFieldValue('soft_skills', softPct);
    
    setFieldValue('internships', st.Internships || 0);
    setFieldValue('projects', st.Projects || 0);
    setFieldValue('work_experience', 0.5);

    // Sync all slider tracks and badges
    const sliders = [
        { id: 'cgpa', badgeId: 'val-cgpa' },
        { id: 'backlogs', badgeId: 'val-backlogs' },
        { id: 'coding_score', badgeId: 'val-coding_score' },
        { id: 'aptitude_score', badgeId: 'val-aptitude_score' },
        { id: 'soft_skills', badgeId: 'val-soft_skills' }
    ];
    sliders.forEach(({ id, badgeId }) => {
        const input = document.getElementById(id);
        const badge = document.getElementById(badgeId);
        if (input && badge) {
            badge.textContent = input.value;
            updateSliderTrack(input);
        }
    });
}

function updateActualOutcomeBadge(st) {
    const card = document.getElementById('actual-outcome-card');
    const idEl = document.getElementById('actual-student-id');
    const statusEl = document.getElementById('actual-status');
    const salaryEl = document.getElementById('actual-salary');

    if (!card) return;

    card.style.display = 'block';
    if (idEl) idEl.textContent = `#${st.StudentID} (${st.Stream}, ${st.CollegeTier}, ${st.City})`;

    if (statusEl) {
        if (st.PlacementStatus === 1) {
            statusEl.textContent = 'Placed';
            statusEl.className = 'outcome-tag success';
        } else {
            statusEl.textContent = 'Unplaced';
            statusEl.className = 'outcome-tag danger';
        }
    }

    if (salaryEl) {
        salaryEl.textContent = `${st['Salary Package'].toFixed(2)} LPA`;
    }
}

function hideActualOutcomeBadge() {
    const card = document.getElementById('actual-outcome-card');
    if (card) card.style.display = 'none';
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    if (theme === 'dark') {
        btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

// Update Slider Track Color Fill
function updateSliderTrack(input) {
    if (!input) return;
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    const val = parseFloat(input.value) || 0;
    const percent = ((val - min) / (max - min)) * 100;
    input.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percent}%, var(--border-color) ${percent}%, var(--border-color) 100%)`;
}

// Preset Loader Function
function loadPreset(type) {
    const form = document.getElementById('prediction-form');
    if (!form) return;

    if (type === 'high') {
        setFieldValue('stream', 'Computer Science');
        setFieldValue('cgpa', '9.4');
        setFieldValue('backlogs', '0');
        setFieldValue('coding_score', '92');
        setFieldValue('aptitude_score', '88');
        setFieldValue('soft_skills', '90');
        setFieldValue('internships', '2');
        setFieldValue('projects', '4');
        setFieldValue('work_experience', '1');
    } else if (type === 'average') {
        setFieldValue('stream', 'Electronics & Communication');
        setFieldValue('cgpa', '7.4');
        setFieldValue('backlogs', '0');
        setFieldValue('coding_score', '65');
        setFieldValue('aptitude_score', '62');
        setFieldValue('soft_skills', '70');
        setFieldValue('internships', '1');
        setFieldValue('projects', '2');
        setFieldValue('work_experience', '0');
    } else if (type === 'atrisk') {
        setFieldValue('stream', 'Mechanical Engineering');
        setFieldValue('cgpa', '5.8');
        setFieldValue('backlogs', '2');
        setFieldValue('coding_score', '42');
        setFieldValue('aptitude_score', '50');
        setFieldValue('soft_skills', '55');
        setFieldValue('internships', '0');
        setFieldValue('projects', '1');
        setFieldValue('work_experience', '0');
    }

    runPrediction();
}

function setFieldValue(id, val) {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = val;

    // Synchronize badge text if present
    const badge = document.getElementById(`val-${id}`);
    if (badge) badge.textContent = val;
    if (input.classList.contains('slider')) {
        updateSliderTrack(input);
    }
}

// Number input step adjuster
function adjustValue(inputId, step) {
    const input = document.getElementById(inputId);
    if (!input) return;
    let min = parseFloat(input.getAttribute('min')) || 0;
    let max = parseFloat(input.getAttribute('max')) || 10;
    let val = parseFloat(input.value) || 0;
    let newVal = Math.max(min, Math.min(max, val + step));
    input.value = newVal;
}

// Prediction Request Handler
async function runPrediction() {
    const form = document.getElementById('prediction-form');
    if (!form) return;

    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => {
        payload[key] = value;
    });

    const submitBtn = document.getElementById('btn-submit');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing Metrics...';

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 400) {
                const errData = await response.json();
                alert(errData.message || 'Invalid input.');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        renderResults(data);

    } catch (err) {
        console.error('Prediction Error:', err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// Render Results Panel
function renderResults(data) {
    const probability = data.probability;
    const status = data.status;
    const badgeClass = data.badge_class;
    const summary = data.summary;
    const subScores = data.sub_scores;
    const recommendations = data.recommendations;

    // 1. Gauge Color & Animation
    let gaugeColor = '#2563eb';
    if (badgeClass === 'success') gaugeColor = '#10b981';
    else if (badgeClass === 'warning') gaugeColor = '#f59e0b';
    else if (badgeClass === 'danger') gaugeColor = '#ef4444';

    updateGauge(probability, gaugeColor);

    // 2. Animate counter text
    animateCounter('res-probability', probability, '%');

    // 3. Status Badge & Summary
    const badge = document.getElementById('res-status-badge');
    if (badge) {
        badge.textContent = status;
        badge.className = `status-badge ${badgeClass}`;
    }

    const summaryEl = document.getElementById('res-summary');
    if (summaryEl) summaryEl.textContent = summary;

    // 4. Progress Bars with dynamic color gradients
    if (subScores) {
        setBarWidth('bar-academic', 'comp-academic', subScores.academic);
        setBarWidth('bar-coding', 'comp-coding', subScores.coding);
        setBarWidth('bar-aptitude', 'comp-aptitude', subScores.aptitude);
        setBarWidth('bar-practical', 'comp-practical', subScores.practical);
        setBarWidth('bar-communication', 'comp-communication', subScores.communication);
    }

    // 5. Recommendations List
    const recList = document.getElementById('recommendation-list');
    if (recList && recommendations) {
        recList.innerHTML = '';
        recommendations.forEach(rec => {
            const li = document.createElement('li');
            const iconClass = badgeClass === 'danger' ? 'fa-triangle-exclamation text-danger' : 
                             (badgeClass === 'warning' ? 'fa-lightbulb text-warning' : 'fa-circle-check text-success');
            li.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${rec}</span>`;
            recList.appendChild(li);
        });
    }
}

// SVG Gauge Circle Offset Calculation
function updateGauge(percent, color) {
    const circle = document.getElementById('gauge-fill');
    if (!circle) return;
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = offset;
    circle.style.stroke = color;
}

// Animate Percentage Counter
function animateCounter(elementId, targetVal, suffix = '') {
    const el = document.getElementById(elementId);
    if (!el) return;
    const duration = 600;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentVal = (progress * targetVal).toFixed(1);
        el.textContent = `${currentVal}${suffix}`;
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

// Set Progress Bar Width & Dynamic Color Fill
function setBarWidth(barId, labelId, value) {
    const bar = document.getElementById(barId);
    const label = document.getElementById(labelId);
    if (bar) {
        bar.style.width = `${value}%`;
        if (value >= 75) {
            bar.style.background = 'linear-gradient(135deg, #059669 0%, #10B981 100%)';
        } else if (value >= 55) {
            bar.style.background = 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)';
        } else {
            bar.style.background = 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)';
        }
    }
    if (label) label.textContent = `${value}%`;
}




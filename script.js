// ============================================
// GITHUB GIST CONFIGURATION
// ============================================
const CONFIG = {
    GIST_ID: 'c3bbde6b0b415d146a1485af8d44b672',  // ← Paste your Gist ID here
    GITHUB_TOKEN: 'https://gist.github.com/NNPPSGBSGMA/c3bbde6b0b415d146a1485af8d44b672',  // ← Paste your token here
    FILENAME: 'attendance-data.json'
};

// ============================================
// USER CREDENTIALS
// ============================================
const USERS = {
    'AJLO': { password: 'Ajlo$2026#Gma', isAdmin: true, name: 'AJLO' },
    'NRVL': { password: 'Nrvl@2026!Pps', isAdmin: false, name: 'NRVL' },
    'NHSM': { password: 'Nhsm#2026$Gbs', isAdmin: false, name: 'NHSM' },
    'PCPH': { password: 'Pcph!2026&Aff', isAdmin: false, name: 'PCPH' },
    'SJAP': { password: 'Sjap$2026*Blr', isAdmin: false, name: 'SJAP' },
    'AUAJ': { password: 'Auaj#2026@Ind', isAdmin: false, name: 'AUAJ' },
    'NCIK': { password: 'Ncik@2026!Att', isAdmin: false, name: 'NCIK' },
    'GTAI': { password: 'Gtai$2026#Trk', isAdmin: false, name: 'GTAI' },
    'HDMP': { password: 'Hdmp!2026$Off', isAdmin: false, name: 'HDMP' },
    'TKYR': { password: 'Tkyr@2026%Gma', isAdmin: false, name: 'TKYR' },
    'SLJG': { password: 'Sljg#2026&Pps', isAdmin: false, name: 'SLJG' },
    'RTDY': { password: 'Rtdy$2026*Gbs', isAdmin: false, name: 'RTDY' },
    'KNGT': { password: 'Kngt!2026@Med', isAdmin: false, name: 'KNGT' },
    'DKDV': { password: 'Dkdv@2026#Aff', isAdmin: false, name: 'DKDV' },
    'VKBV': { password: 'Vkbv$2026!Blr', isAdmin: false, name: 'VKBV' },
    'MOZF': { password: 'Mozf#2026$Ind', isAdmin: false, name: 'MOZF' },
    'RTPH': { password: 'Rtph!2026%Att', isAdmin: false, name: 'RTPH' },
    'KIDZ': { password: 'Kidz@2026&Trk', isAdmin: false, name: 'KIDZ' },
    'NSJK': { password: 'Nsjk$2026*Off', isAdmin: false, name: 'NSJK' },
    'IPLA': { password: 'Ipla#2026@Gma', isAdmin: false, name: 'IPLA' },
    'PRET': { password: 'Pret!2026#Pps', isAdmin: false, name: 'PRET' },
    'HMDP': { password: 'Hmdp@2026$Gbs', isAdmin: false, name: 'HMDP' },
    'RDVA': { password: 'Rdva$2026%Med', isAdmin: false, name: 'RDVA' },
    'NMJP': { password: 'Nmjp#2026&Aff', isAdmin: false, name: 'NMJP' },
    'GSHV': { password: 'Gshv!2026*Blr', isAdmin: false, name: 'GSHV' },
    'HKPT': { password: 'Hkpt@2026@Ind', isAdmin: false, name: 'HKPT' },
    'IVRS': { password: 'Ivrs$2026!Att', isAdmin: false, name: 'IVRS' },
    'IOJN': { password: 'Iojn#2026#Trk', isAdmin: false, name: 'IOJN' },
    'QKRM': { password: 'Qkrm!2026$Off', isAdmin: false, name: 'QKRM' },
    'USRJ': { password: 'Usrj@2026%Gma', isAdmin: false, name: 'USRJ' },
    'SYDQ': { password: 'Sydq$2026&Pps', isAdmin: false, name: 'SYDQ' },
    'GVMR': { password: 'Gvmr#2026*Gbs', isAdmin: false, name: 'GVMR' },
    'NUMT': { password: 'Numt!2026@Med', isAdmin: false, name: 'NUMT' },
    'MGVM': { password: 'Mgvm@2026!Aff', isAdmin: false, name: 'MGVM' },
    'JVMC': { password: 'Jvmc$2026#Blr', isAdmin: false, name: 'JVMC' },
    'SIZR': { password: 'Sizr#2026$Ind', isAdmin: false, name: 'SIZR' },
    'IUHK': { password: 'Iuhk!2026%Att', isAdmin: false, name: 'IUHK' }
};

const HOLIDAYS = [
    '2026-01-15', '2026-01-26', '2026-03-19', '2026-05-01',
    '2026-05-28', '2026-09-14', '2026-10-02', '2026-10-20',
    '2026-11-10', '2026-12-25'
];

const STATUSES = [
    { value: 'wfo', label: 'WFO' },
    { value: 'planned', label: 'Planned' },
    { value: 'offsite', label: 'Offsite/Meeting' },
    { value: 'travel', label: 'Onsite/Travel' },
    { value: 'leave', label: 'Leave' }
];

let currentUser = null;
let currentMonth = 0;
let allData = {};
let unsavedChanges = false;
let refreshTimer = null;

// ============================================
// GITHUB GIST FUNCTIONS
// ============================================
async function loadFromGist() {
    showLoading(true);
    try {
        const response = await fetch(`https://api.github.com/gists/${CONFIG.GIST_ID}`, {
            headers: {
                'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            const gist = await response.json();
            const content = gist.files[CONFIG.FILENAME].content;
            allData = JSON.parse(content);
            console.log('✅ Data loaded from GitHub Gist');
            showLoading(false);
            return true;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Load error:', error);
        showLoading(false);
        alert('❌ Could not load data from GitHub Gist.\n\nPlease check:\n1. Your GIST_ID is correct\n2. Your GITHUB_TOKEN is correct\n3. You have internet connection');
        return false;
    }
}

async function saveToGist() {
    showLoading(true);
    try {
        const response = await fetch(`https://api.github.com/gists/${CONFIG.GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    [CONFIG.FILENAME]: {
                        content: JSON.stringify(allData, null, 2)
                    }
                }
            })
        });

        if (response.ok) {
            console.log('✅ Data saved to GitHub Gist');
            showLoading(false);
            showSuccess('✅ Attendance saved successfully!');
            return true;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Save error:', error);
        showLoading(false);
        alert('❌ Failed to save to GitHub Gist.\n\nPlease check your token and try again.');
        return false;
    }
}

// ============================================
// LOGIN
// ============================================
async function handleLogin(event) {
    event.preventDefault();
    
    const code = document.getElementById('loginCode').value.toUpperCase().trim();
    const password = document.getElementById('loginPassword').value;
    
    if (USERS[code] && USERS[code].password === password) {
        currentUser = { code: code, isAdmin: USERS[code].isAdmin };
        
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        document.getElementById('displayUserCode').textContent = 'User: ' + code;
        document.getElementById('securityUserCode').textContent = code;
        
        if (currentUser.isAdmin) {
            document.getElementById('adminNotice').style.display = 'block';
            document.getElementById('reportBtn').style.display = 'inline-block';
        }
        
        const loaded = await loadFromGist();
        if (loaded) {
            drawCalendar();
            startAutoRefresh();
        }
    } else {
        document.getElementById('loginError').style.display = 'block';
        setTimeout(() => {
            document.getElementById('loginError').style.display = 'none';
        }, 3000);
    }
}

function handleLogout() {
    if (confirm('Logout? Unsaved changes will be lost.')) {
        stopAutoRefresh();
        currentUser = null;
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginOverlay').style.display = 'flex';
        document.getElementById('loginCode').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('adminNotice').style.display = 'none';
        document.getElementById('reportBtn').style.display = 'none';
        document.getElementById('statsContainer').style.display = 'none';
    }
}

function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(async () => {
        if (!unsavedChanges) {
            await loadFromGist();
            drawCalendar();
        }
    }, 30000);
}

function stopAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
}

function drawCalendar() {
    const table = document.getElementById('attendanceTable');
    const year = 2026;
    const month = currentMonth;
    const days = new Date(year, month + 1, 0).getDate();
    
    table.innerHTML = '';
    
    const headerRow = table.insertRow();
    headerRow.insertCell().innerHTML = '<th class="name-header">Name</th>';
    
    for (let day = 1; day <= days; day++) {
        const date = new Date(year, month, day);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const cell = headerRow.insertCell();
        
        let className = 'th';
        if (isWeekend(date)) className += ' weekend-header';
        if (isHoliday(date)) className += ' holiday-header';
        
        cell.innerHTML = `<th class="${className}">${day}-${getMonthAbbr(month)}<br><small>${dayName}</small></th>`;
    }
    
    Object.keys(USERS).forEach(userCode => {
        const row = table.insertRow();
        
        if (currentUser && currentUser.code === userCode) {
            row.classList.add('current-user-row');
        }
        
        const nameCell = row.insertCell();
        nameCell.className = 'name-cell';
        nameCell.textContent = userCode;
        
        for (let day = 1; day <= days; day++) {
            const date = new Date(year, month, day);
            const dateKey = formatDateKey(date);
            const cell = row.insertCell();
            
            cell.className = 'date-cell';
            cell.dataset.user = userCode;
            cell.dataset.date = dateKey;
            
            if (isWeekend(date)) {
                cell.classList.add('weekend');
                cell.textContent = `${day}-${getMonthAbbr(month)}`;
            } else if (isHoliday(date)) {
                cell.classList.add('holiday');
                cell.textContent = `${day}-${getMonthAbbr(month)}`;
            } else {
                const canEdit = canUserEdit(userCode);
                const status = allData[userCode]?.[dateKey];
                
                if (status) cell.classList.add(status);
                
                if (!canEdit) {
                    cell.classList.add('locked');
                    cell.innerHTML = '<span class="lock-icon">🔒</span>' + `${day}-${getMonthAbbr(month)}`;
                } else {
                    cell.textContent = `${day}-${getMonthAbbr(month)}`;
                    cell.onclick = () => showStatusDropdown(cell, userCode, dateKey);
                }
            }
        }
    });
    
    document.getElementById('monthSelector').value = currentMonth;
}

function showStatusDropdown(cell, userCode, dateKey) {
    if (cell.querySelector('select')) return;
    
    const currentStatus = allData[userCode]?.[dateKey] || '';
    
    const select = document.createElement('select');
    select.className = 'status-select';
    
    select.add(new Option('-- Select --', ''));
    
    STATUSES.forEach(s => {
        const opt = new Option(s.label, s.value);
        if (s.value === currentStatus) opt.selected = true;
        select.add(opt);
    });
    
    select.onchange = () => {
        updateStatus(userCode, dateKey, select.value);
        cell.innerHTML = '';
        drawCalendar();
    };
    
    select.onblur = () => {
        setTimeout(() => {
            if (document.activeElement !== select) {
                cell.innerHTML = '';
                drawCalendar();
            }
        }, 200);
    };
    
    cell.innerHTML = '';
    cell.appendChild(select);
    select.focus();
}

function updateStatus(userCode, dateKey, status) {
    if (!allData[userCode]) allData[userCode] = {};
    
    if (status) {
        allData[userCode][dateKey] = status;
    } else {
        delete allData[userCode][dateKey];
    }
    
    unsavedChanges = true;
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('pendingChanges').style.display = 'inline';
    document.getElementById('pendingUserCode').textContent = currentUser.code;
}

async function submitAttendance() {
    if (!unsavedChanges) return;
    
    const success = await saveToGist();
    
    if (success) {
        unsavedChanges = false;
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('pendingChanges').style.display = 'none';
        
        await loadFromGist();
        drawCalendar();
        updateStats();
    }
}

function changeMonth() {
    const newMonth = parseInt(document.getElementById('monthSelector').value);
    
    if (unsavedChanges) {
        if (!confirm('You have unsaved changes. Discard them?')) {
            document.getElementById('monthSelector').value = currentMonth;
            return;
        }
        unsavedChanges = false;
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('pendingChanges').style.display = 'none';
    }
    
    currentMonth = newMonth;
    drawCalendar();
    checkStats();
}

function updateStats() {
    if (!currentUser) return;
    
    const userCode = currentUser.code;
    const year = 2026;
    const month = currentMonth;
    const days = new Date(year, month + 1, 0).getDate();
    
    let stats = { wfo: 0, planned: 0, offsite: 0, travel: 0, leave: 0, total: 0 };
    
    for (let day = 1; day <= days; day++) {
        const date = new Date(year, month, day);
        if (isWeekend(date) || isHoliday(date)) continue;
        
        stats.total++;
        const dateKey = formatDateKey(date);
        const status = allData[userCode]?.[dateKey];
        if (status && stats.hasOwnProperty(status)) {
            stats[status]++;
        }
    }
    
    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });
    
    document.getElementById('statsContainer').innerHTML = `
        <h3>Your Statistics for ${monthName} 2026</h3>
        <div class="stats-grid">
            <div class="stat-item wfo-stat">
                <div class="stat-color wfo-color"></div>
                <div><div class="stat-label">WFO</div><div class="stat-value">${stats.wfo} days</div></div>
            </div>
            <div class="stat-item planned-stat">
                <div class="stat-color planned-color"></div>
                <div><div class="stat-label">Planned</div><div class="stat-value">${stats.planned} days</div></div>
            </div>
            <div class="stat-item offsite-stat">
                <div class="stat-color offsite-color"></div>
                <div><div class="stat-label">Offsite/Meeting</div><div class="stat-value">${stats.offsite} days</div></div>
            </div>
            <div class="stat-item travel-stat">
                <div class="stat-color travel-color"></div>
                <div><div class="stat-label">Onsite/Travel</div><div class="stat-value">${stats.travel} days</div></div>
            </div>
            <div class="stat-item leave-stat">
                <div class="stat-color leave-color"></div>
                <div><div class="stat-label">Leave</div><div class="stat-value">${stats.leave} days</div></div>
            </div>
            <div class="stat-item total-stat">
                <div class="stat-color total-color"></div>
                <div><div class="stat-label">Working Days</div><div class="stat-value">${stats.total} days</div></div>
            </div>
        </div>
    `;
    
    document.getElementById('statsContainer').style.display = 'block';
}

function checkStats() {
    if (!currentUser) return;
    
    const userCode = currentUser.code;
    const year = 2026;
    const month = currentMonth;
    const days = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= days; day++) {
        const date = new Date(year, month, day);
        const dateKey = formatDateKey(date);
        if (allData[userCode]?.[dateKey]) {
            updateStats();
            return;
        }
    }
    
    document.getElementById('statsContainer').style.display = 'none';
}

function generateReport() {
    if (!currentUser?.isAdmin) {
        alert('Only administrators can generate reports.');
        return;
    }
    
    const year = 2026;
    const month = currentMonth;
    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });
    const days = new Date(year, month + 1, 0).getDate();
    
    let html = `<h3>Attendance Report - ${monthName} 2026</h3>`;
    html += '<div class="report-table-wrapper"><table class="report-table">';
    html += '<thead><tr><th>User</th><th>WFO</th><th>Planned</th><th>Offsite</th><th>Travel</th><th>Leave</th><th>Total Days</th></tr></thead><tbody>';
    
    Object.keys(USERS).forEach(userCode => {
        let stats = { wfo: 0, planned: 0, offsite: 0, travel: 0, leave: 0, total: 0 };
        
        for (let day = 1; day <= days; day++) {
            const date = new Date(year, month, day);
            if (isWeekend(date) || isHoliday(date)) continue;
            
            stats.total++;
            const dateKey = formatDateKey(date);
            const status = allData[userCode]?.[dateKey];
            if (status && stats.hasOwnProperty(status)) {
                stats[status]++;
            }
        }
        
        html += `<tr>
            <td><strong>${userCode}</strong></td>
            <td>${stats.wfo}</td>
            <td>${stats.planned}</td>
            <td>${stats.offsite}</td>
            <td>${stats.travel}</td>
            <td>${stats.leave}</td>
            <td><strong>${stats.total}</strong></td>
        </tr>`;
    });
    
    html += '</tbody></table></div>';
    
    document.getElementById('reportContent').innerHTML = html;
    document.getElementById('reportModal').style.display = 'block';
}

function closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
}

function exportToCSV() {
    const year = 2026;
    const month = currentMonth;
    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });
    const days = new Date(year, month + 1, 0).getDate();
    
    let csv = `Attendance Report - ${monthName} 2026\n\nUser,`;
    
    for (let day = 1; day <= days; day++) {
        csv += `${day}-${getMonthAbbr(month)},`;
    }
    csv += '\n';
    
    Object.keys(USERS).forEach(userCode => {
        csv += userCode + ',';
        
        for (let day = 1; day <= days; day++) {
            const date = new Date(year, month, day);
            const dateKey = formatDateKey(date);
            
            if (isWeekend(date)) {
                csv += 'Weekend,';
            } else if (isHoliday(date)) {
                csv += 'Holiday,';
            } else {
                const status = allData[userCode]?.[dateKey];
                csv += (status ? status.toUpperCase() : '-') + ',';
            }
        }
        csv += '\n';
    });
    
    downloadCSV(csv, `Attendance_${monthName}_2026.csv`);
}

function exportReportToCSV() {
    const year = 2026;
    const month = currentMonth;
    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });
    const days = new Date(year, month + 1, 0).getDate();
    
    let csv = `Comprehensive Attendance Report - ${monthName} 2026\n\n`;
    csv += 'User,WFO,Planned,Offsite,Travel,Leave,Total Working Days\n';
    
    Object.keys(USERS).forEach(userCode => {
        let stats = { wfo: 0, planned: 0, offsite: 0, travel: 0, leave: 0, total: 0 };
        
        for (let day = 1; day <= days; day++) {
            const date = new Date(year, month, day);
            if (isWeekend(date) || isHoliday(date)) continue;
            
            stats.total++;
            const dateKey = formatDateKey(date);
            const status = allData[userCode]?.[dateKey];
            if (status && stats.hasOwnProperty(status)) {
                stats[status]++;
            }
        }
        
        csv += `${userCode},${stats.wfo},${stats.planned},${stats.offsite},${stats.travel},${stats.leave},${stats.total}\n`;
    });
    
    downloadCSV(csv, `Report_${monthName}_2026.csv`);
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}

function isHoliday(date) {
    return HOLIDAYS.includes(formatDateKey(date));
}

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getMonthAbbr(month) {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month];
}

function canUserEdit(userCode) {
    if (!currentUser) return false;
    if (currentUser.isAdmin) return true;
    return currentUser.code === userCode;
}

function showLoading(show) {
    document.getElementById('loadingMessage').style.display = show ? 'block' : 'none';
}

function showSuccess(message) {
    const msg = document.getElementById('successMessage');
    msg.textContent = message;
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
}

window.onclick = function(event) {
    const modal = document.getElementById('reportModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

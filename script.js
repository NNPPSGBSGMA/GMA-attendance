// ========== YOUR CREDENTIALS ==========
const JSONBIN_AUTH_BIN_ID = "694b9e8dd0ea881f403d5158";
const JSONBIN_ATTENDANCE_BIN_ID = "6942d4d443b1c97be9f4cf62";
const JSONBIN_API_KEY = "$2a$10$TSxWjP8KeL2sCsGcfRtI.uxlpOLk2c2yTg3Qn8loL1z5d8OHN87fO";
// ======================================

// Global variables
let currentLoggedInUser = null;
let USERS_CACHE = {};
let currentMonth = 0;
let attendanceData = {};
let pendingChanges = {};
let hasUnsavedChanges = false;
let activePopup = null;

const HOLIDAYS_2026 = [
    '2026-01-15', '2026-01-26', '2026-03-19', '2026-05-01',
    '2026-05-28', '2026-09-14', '2026-10-02', '2026-10-20',
    '2026-11-10', '2026-12-25'
];

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_OPTIONS = [
    { value: 'wfo', label: 'WFO', color: '#90EE90' },
    { value: 'planned', label: 'Planned', color: '#FFFF99' },
    { value: 'offsite', label: 'Offsite/Meeting', color: '#DDA0DD' },
    { value: 'travel', label: 'Onsite/Travel', color: '#87CEEB' },
    { value: 'leave', label: 'Leave', color: '#FFB6C1' }
];

// ==================== AUTHENTICATION ====================

async function loadUserDatabase() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_AUTH_BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': JSONBIN_API_KEY
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            USERS_CACHE = data.record.users || {};
            console.log('✅ User database loaded:', Object.keys(USERS_CACHE).length, 'users');
            return true;
        } else {
            console.error('❌ Failed to load user database');
            return false;
        }
    } catch (error) {
        console.error('❌ Error loading user database:', error);
        return false;
    }
}

async function handleLogin() {
    const code = document.getElementById('loginCode').value.toUpperCase().trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    const submitBtn = document.querySelector('.login-submit-btn');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Authenticating...';
    
    const loaded = await loadUserDatabase();
    
    if (!loaded) {
        errorDiv.textContent = 'Server connection error. Please try again.';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login to Tracker';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
        return;
    }
    
    console.log('🔍 Checking credentials for:', code);
    
    if (USERS_CACHE[code] && USERS_CACHE[code].password === password) {
        currentLoggedInUser = {
            code: code,
            isAdmin: USERS_CACHE[code].isAdmin,
            name: USERS_CACHE[code].name
        };
        
        console.log('✅ Login successful for:', code);
        
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        document.getElementById('displayUserCode').textContent = `User: ${code}`;
        document.getElementById('securityUserCode').textContent = code;
        
        if (currentLoggedInUser.isAdmin) {
            document.getElementById('adminNotice').style.display = 'block';
            document.getElementById('reportBtn').style.display = 'inline-block';
        }
        
        console.log('📅 Initializing calendar...');
        initializeCalendar();
        
    } else {
        errorDiv.textContent = 'Invalid code or password. Please try again.';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login to Tracker';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout? Any unsaved changes will be lost.')) {
        currentLoggedInUser = null;
        USERS_CACHE = {};
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginOverlay').style.display = 'flex';
        document.getElementById('loginCode').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('adminNotice').style.display = 'none';
        document.getElementById('reportBtn').style.display = 'none';
        document.getElementById('statsContainer').style.display = 'none';
    }
}

function canEditRow(userCode) {
    if (!currentLoggedInUser) return false;
    if (currentLoggedInUser.isAdmin) return true;
    return currentLoggedInUser.code === userCode;
}

function getUserCodes() {
    return Object.keys(USERS_CACHE);
}

// ==================== CALENDAR FUNCTIONS ====================

function initializeCalendar() {
    console.log('🚀 initializeCalendar called');
    console.log('📊 Available users:', getUserCodes().length);
    loadAttendanceData();
}

async function loadAttendanceData() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ATTENDANCE_BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': JSONBIN_API_KEY
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            attendanceData = data.record || {};
            console.log('✅ Attendance data loaded');
        } else {
            console.log('⚠️ No attendance data found, starting fresh');
            attendanceData = {};
        }
    } catch (error) {
        console.error('❌ Error loading attendance data:', error);
        attendanceData = {};
    }
    
    renderCalendar();
}

async function saveAttendanceData() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_ATTENDANCE_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify(attendanceData)
        });
        
        if (response.ok) {
            console.log('✅ Data saved to server');
            return true;
        } else {
            const errorData = await response.json();
            console.error('❌ Failed to save:', errorData);
            alert('Failed to save data: ' + (errorData.message || 'Unknown error'));
            return false;
        }
    } catch (error) {
        console.error('❌ Error saving data:', error);
        alert('Error saving data. Check console for details.');
        return false;
    }
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function isWeekend(year, month, day) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
}

function isHoliday(year, month, day) {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return HOLIDAYS_2026.includes(dateString);
}

function formatDate(day, month) {
    return day + '-' + MONTH_ABBR[month];
}

function renderCalendar() {
    console.log('🎨 Rendering calendar...');
    
    const userCodes = getUserCodes();
    console.log('👥 Rendering for users:', userCodes);
    
    if (!userCodes || userCodes.length === 0) {
        console.error('❌ No users available to render calendar');
        const table = document.getElementById('attendanceTable');
        table.innerHTML = '<tr><td style="padding: 20px; text-align: center; color: red;">Error: No user data available. Please logout and login again.</td></tr>';
        return;
    }
    
    const table = document.getElementById('attendanceTable');
    const year = 2026;
    const month = currentMonth;
    const daysInMonth = getDaysInMonth(year, month);
    
    table.innerHTML = '';
    
    // Create header row
    const headerRow = document.createElement('tr');
    const nameHeader = document.createElement('th');
    nameHeader.className = 'name-header';
    nameHeader.textContent = 'Name';
    headerRow.appendChild(nameHeader);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const th = document.createElement('th');
        const date = new Date(year, month, day);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        th.innerHTML = formatDate(day, month) + '<br><small>' + dayName + '</small>';
        
        if (isWeekend(year, month, day)) {
            th.classList.add('weekend-header');
        } else if (isHoliday(year, month, day)) {
            th.classList.add('holiday-header');
        }
        
        headerRow.appendChild(th);
    }
    
    table.appendChild(headerRow);
    
    // Render user rows
    userCodes.forEach(userCode => {
        const row = document.createElement('tr');
        row.dataset.user = userCode;
        
        if (currentLoggedInUser && currentLoggedInUser.code === userCode) {
            row.classList.add('current-user-row');
        }
        
        const nameCell = document.createElement('td');
        nameCell.className = 'name-cell';
        nameCell.textContent = userCode;
        row.appendChild(nameCell);
        
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('td');
            cell.className = 'date-cell';
            cell.dataset.user = userCode;
            cell.dataset.date = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            cell.dataset.day = day;
            cell.dataset.month = month;
            
            const weekend = isWeekend(year, month, day);
            const holiday = isHoliday(year, month, day);
            
            if (weekend) {
                cell.classList.add('weekend');
                cell.textContent = formatDate(day, month);
            } else if (holiday) {
                cell.classList.add('holiday');
                cell.textContent = formatDate(day, month);
            } else {
                const canEdit = canEditRow(userCode);
                const dateKey = cell.dataset.date;
                const savedStatus = attendanceData[userCode] && attendanceData[userCode][dateKey];
                
                if (savedStatus) {
                    cell.classList.add(savedStatus);
                }
                
                const cellContent = document.createDocumentFragment();
                
                if (!canEdit) {
                    cell.classList.add('locked');
                    const lockSpan = document.createElement('span');
                    lockSpan.className = 'lock-icon';
                    lockSpan.innerHTML = '&#128274;';
                    cellContent.appendChild(lockSpan);
                }
                
                const dateText = document.createTextNode(formatDate(day, month));
                cellContent.appendChild(dateText);
                
                cell.appendChild(cellContent);
                
                if (canEdit) {
                    cell.addEventListener('click', () => handleCellClick(cell, userCode, dateKey, day, month));
                }
            }
            
            row.appendChild(cell);
        }
        
        table.appendChild(row);
    });
    
    document.getElementById('monthSelector').value = currentMonth;
    console.log('✅ Calendar rendered successfully with', userCodes.length, 'users');
}

function handleCellClick(cell, userCode, dateKey, day, month) {
    if (cell.classList.contains('weekend') || cell.classList.contains('holiday') || cell.classList.contains('locked')) {
        return;
    }
    
    // Remove any existing popup
    if (activePopup) {
        activePopup.remove();
        activePopup = null;
    }
    
    // Create popup menu
    const popup = document.createElement('div');
    popup.className = 'status-popup';
    
    // Add status options
    STATUS_OPTIONS.forEach(status => {
        const item = document.createElement('div');
        item.className = `status-popup-item ${status.value}-option`;
        
        const colorIndicator = document.createElement('div');
        colorIndicator.className = 'status-color-indicator';
        colorIndicator.style.background = status.color;
        
        const label = document.createElement('span');
        label.textContent = status.label;
        
        item.appendChild(colorIndicator);
        item.appendChild(label);
        
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            updateCellStatus(cell, userCode, dateKey, status.value, day, month);
            renderCellContent(cell, userCode, dateKey, day, month);
            popup.remove();
            activePopup = null;
        });
        
        popup.appendChild(item);
    });
    
    // Add "Clear" option if cell has status
    if (attendanceData[userCode] && attendanceData[userCode][dateKey]) {
        const clearItem = document.createElement('div');
        clearItem.className = 'status-popup-item clear-option';
        clearItem.innerHTML = '<span style="font-size: 16px;">✖</span><span>Clear Status</span>';
        
        clearItem.addEventListener('click', (e) => {
            e.stopPropagation();
            updateCellStatus(cell, userCode, dateKey, '', day, month);
            renderCellContent(cell, userCode, dateKey, day, month);
            popup.remove();
            activePopup = null;
        });
        
        popup.appendChild(clearItem);
    }
    
    // Append popup to the cell's parent container (table)
    const table = document.getElementById('attendanceTable');
    table.parentElement.style.position = 'relative';
    table.parentElement.appendChild(popup);
    
    // Position popup relative to the cell
    const cellRect = cell.getBoundingClientRect();
    const containerRect = table.parentElement.getBoundingClientRect();
    
    const left = cellRect.left - containerRect.left;
    const top = cellRect.bottom - containerRect.top + 5;
    
    popup.style.position = 'absolute';
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    popup.style.display = 'block';
    
    // Check if popup goes off-screen to the right
    const popupRect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    
    if (popupRect.right > viewportWidth) {
        // Position it to the left of the cell instead
        popup.style.left = (left - popup.offsetWidth + cell.offsetWidth) + 'px';
    }
    
    // Check if popup goes off-screen at the bottom
    const viewportHeight = window.innerHeight;
    if (popupRect.bottom > viewportHeight) {
        // Position it above the cell instead
        popup.style.top = (cellRect.top - containerRect.top - popup.offsetHeight - 5) + 'px';
    }
    
    activePopup = popup;
    
    // Close popup when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closePopup(e) {
            if (popup && !popup.contains(e.target) && e.target !== cell) {
                popup.remove();
                activePopup = null;
                document.removeEventListener('click', closePopup);
            }
        });
    }, 100);
}

function updateCellStatus(cell, userCode, dateKey, status, day, month) {
    if (!attendanceData[userCode]) {
        attendanceData[userCode] = {};
    }
    
    if (status) {
        attendanceData[userCode][dateKey] = status;
    } else {
        delete attendanceData[userCode][dateKey];
    }
    
    if (!pendingChanges[userCode]) {
        pendingChanges[userCode] = {};
    }
    pendingChanges[userCode][dateKey] = status || 'removed';
    
    hasUnsavedChanges = true;
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('pendingChanges').style.display = 'inline';
    document.getElementById('pendingUserCode').textContent = currentLoggedInUser.code;
}

function renderCellContent(cell, userCode, dateKey, day, month) {
    const canEdit = canEditRow(userCode);
    
    cell.innerHTML = '';
    cell.classList.remove('wfo', 'planned', 'offsite', 'travel', 'leave');
    
    const savedStatus = attendanceData[userCode] && attendanceData[userCode][dateKey];
    
    if (savedStatus) {
        cell.classList.add(savedStatus);
    }
    
    const cellContent = document.createDocumentFragment();
    
    if (!canEdit) {
        const lockSpan = document.createElement('span');
        lockSpan.className = 'lock-icon';
        lockSpan.innerHTML = '&#128274;';
        cellContent.appendChild(lockSpan);
    }
    
    const dateText = document.createTextNode(formatDate(day, month));
    cellContent.appendChild(dateText);
    
    cell.appendChild(cellContent);
}

async function submitAttendance() {
    if (!hasUnsavedChanges) {
        return;
    }
    
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('submitBtn').textContent = 'Saving...';
    
    const success = await saveAttendanceData();
    
    if (success) {
        pendingChanges = {};
        hasUnsavedChanges = false;
        document.getElementById('pendingChanges').style.display = 'none';
        
        const successMsg = document.getElementById('successMessage');
        successMsg.textContent = 'Data saved to server! Everyone can now see your changes.';
        successMsg.style.display = 'block';
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);
        
        updateStats();
    } else {
        document.getElementById('submitBtn').disabled = false;
    }
    
    document.getElementById('submitBtn').textContent = 'Submit My Attendance';
}

function changeMonth() {
    const newMonth = parseInt(document.getElementById('monthSelector').value);
    
    if (hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Do you want to discard them?')) {
            document.getElementById('monthSelector').value = currentMonth;
            return;
        }
        pendingChanges = {};
        hasUnsavedChanges = false;
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('pendingChanges').style.display = 'none';
    }
    
    currentMonth = newMonth;
    renderCalendar();
    checkAndDisplayStats();
}

function checkAndDisplayStats() {
    if (!currentLoggedInUser) return;
    
    const userCode = currentLoggedInUser.code;
    const year = 2026;
    const month = currentMonth;
    const daysInMonth = getDaysInMonth(year, month);
    
    let hasData = false;
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        if (attendanceData[userCode] && attendanceData[userCode][dateKey]) {
            hasData = true;
            break;
        }
    }
    
    if (hasData) {
        updateStats();
    } else {
        document.getElementById('statsContainer').style.display = 'none';
    }
}

function updateStats() {
    if (!currentLoggedInUser) return;
    
    const statsContainer = document.getElementById('statsContainer');
    const userCode = currentLoggedInUser.code;
    const year = 2026;
    const month = currentMonth;
    const daysInMonth = getDaysInMonth(year, month);
    
    let stats = {
        wfo: 0,
        planned: 0,
        offsite: 0,
        travel: 0,
        leave: 0,
        total: 0
    };
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        
        if (!isWeekend(year, month, day) && !isHoliday(year, month, day)) {
            stats.total++;
            
            if (attendanceData[userCode] && attendanceData[userCode][dateKey]) {
                const status = attendanceData[userCode][dateKey];
                if (stats.hasOwnProperty(status)) {
                    stats[status]++;
                }
            }
        }
    }
    
    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });
    
    statsContainer.innerHTML = '<h3>Your Statistics for ' + monthName + ' 2026</h3>' +
        '<div class="stats-grid">' +
            '<div class="stat-item wfo-stat"><div class="stat-color wfo-color"></div><div><div class="stat-label">WFO</div><div class="stat-value">' + stats.wfo + ' days</div></div></div>' +
            '<div class="stat-item planned-stat"><div class="stat-color planned-color"></div><div><div class="stat-label">Planned</div><div class="stat-value">' + stats.planned + ' days</div></div></div>' +
            '<div class="stat-item offsite-stat"><div class="stat-color offsite-color"></div><div><div class="stat-label">Offsite/Meeting</div><div class="stat-value">' + stats.offsite + ' days</div></div></div>' +
            '<div class="stat-item travel-stat"><div class="stat-color travel-color"></div><div><div class="stat-label">Onsite/Travel</div><div class="stat-value">' + stats.travel + ' days</div></div></div>' +
            '<div class="stat-item leave-stat"><div class="stat-color leave-color"></div><div><div class="stat-label">Leave</div><div class="stat-value">' + stats.leave + ' days</div></div></div>' +
            '<div class="stat-item total-stat"><div class="stat-color total-color"></div><div><div class="stat-label">Working Days</div><div class="stat-value">' + stats.total + ' days</div></div></div>' +
        '</div>';
    
    statsContainer.style.display = 'block';
}

function generateReport() {
    if (!currentLoggedInUser || !currentLoggedInUser.isAdmin) {
        alert('Only administrators can generate reports.');
        return;
    }
    
    const modal = document.getElementById('reportModal');
    const reportContent = document.getElementById('reportContent');
    
    const year = 2026;
    const month = currentMonth;
    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });
    const daysInMonth = getDaysInMonth(year, month);
    
    let reportHTML = '<h3>Attendance Report - ' + monthName + ' 2026</h3>';
    reportHTML += '<div class="report-table-wrapper"><table class="report-table">';
    reportHTML += '<thead><tr><th>User</th><th>WFO</th><th>Planned</th><th>Offsite</th><th>Travel</th><th>Leave</th><th>Total Days</th></tr></thead><tbody>';
    
    getUserCodes().forEach(userCode => {
        let stats = { wfo: 0, planned: 0, offsite: 0, travel: 0, leave: 0, total: 0 };
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            
            if (!isWeekend(year, month, day) && !isHoliday(year, month, day)) {
                stats.total++;
                if (attendanceData[userCode] && attendanceData[userCode][dateKey]) {
                    const status = attendanceData[userCode][dateKey];
                    if (stats.hasOwnProperty(status)) {
                        stats[status]++;
                    }
                }
            }
        }
        
        reportHTML += '<tr><td><strong>' + userCode + '</strong></td>';
        reportHTML += '<td>' + stats.wfo + '</td><td>' + stats.planned + '</td><td>' + stats.offsite + '</td>';
        reportHTML += '<td>' + stats.travel + '</td><td>' + stats.leave + '</td><td><strong>' + stats.total + '</strong></td></tr>';
    });
    
    reportHTML += '</tbody></table></div>';
    reportContent.innerHTML = reportHTML;
    modal.style.display = 'block';
}

function closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
}

function exportToCSV() {
    const year = 2026;
    const month = currentMonth;
    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });
    const daysInMonth = getDaysInMonth(year, month);
    
    let csv = 'Attendance Report - ' + monthName + ' 2026\n\nUser,';
    for (let day = 1; day <= daysInMonth; day++) {
        csv += formatDate(day, month) + ',';
    }
    csv += '\n';
    
    getUserCodes().forEach(userCode => {
        csv += userCode + ',';
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            if (isWeekend(year, month, day)) {
                csv += 'Weekend,';
            } else if (isHoliday(year, month, day)) {
                csv += 'Holiday,';
            } else if (attendanceData[userCode] && attendanceData[userCode][dateKey]) {
                csv += attendanceData[userCode][dateKey].toUpperCase() + ',';
            } else {
                csv += '-,';
            }
        }
        csv += '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Attendance_' + monthName + '_2026.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

function exportReportToCSV() {
    const year = 2026;
    const month = currentMonth;
    const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long' });
    const daysInMonth = getDaysInMonth(year, month);
    
    let csv = 'Comprehensive Attendance Report - ' + monthName + ' 2026\n\nUser,WFO,Planned,Offsite,Travel,Leave,Total Working Days\n';
    
    getUserCodes().forEach(userCode => {
        let stats = { wfo: 0, planned: 0, offsite: 0, travel: 0, leave: 0, total: 0 };
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            if (!isWeekend(year, month, day) && !isHoliday(year, month, day)) {
                stats.total++;
                if (attendanceData[userCode] && attendanceData[userCode][dateKey]) {
                    const status = attendanceData[userCode][dateKey];
                    if (stats.hasOwnProperty(status)) stats[status]++;
                }
            }
        }
        
        csv += userCode + ',' + stats.wfo + ',' + stats.planned + ',' + stats.offsite + ',' + stats.travel + ',' + stats.leave + ',' + stats.total + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Report_' + monthName + '_2026.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

window.onclick = function(event) {
    const modal = document.getElementById('reportModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}
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

const OPTIONAL_HOLIDAYS_2026 = [
    '2026-01-01', // New Year
    '2026-03-02', // Holi
    '2026-04-03', // Good Friday
    '2026-04-14', // Vishu / Ambedkar Jayanthi
    '2026-08-21', // Varamahalakshmi Vrata
    '2026-08-26', // Eid-Milad
    '2026-08-28', // Raksha Bandhan
    '2026-09-17', // Vishwakarma Jayanthi
    '2026-10-21', // Vijayadasami
    '2026-11-24'  // Guru Nanak Jayanthi
];

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_OPTIONS = [
    { value: 'wfo', label: 'WFO', color: '#90EE90' },
    { value: 'planned', label: 'Planned', color: '#FFFF99' },
    { value: 'offsite', label: 'Offsite/Meeting', color: '#DDA0DD' },
    { value: 'travel', label: 'Onsite/Travel', color: '#87CEEB' },
    { value: 'leave', label: 'Leave', color: '#FFB6C1' }
];

// User Photos - Add actual photo URLs here
const USER_PHOTOS = {
    'XXXX': 'https://via.placeholder.com/40/001965/ffffff?text=XX',
    'YYYY': 'https://via.placeholder.com/40/001965/ffffff?text=YY',
    'ZZZZ': 'https://via.placeholder.com/40/001965/ffffff?text=ZZ',
};

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
            console.log('? User database loaded:', Object.keys(USERS_CACHE).length, 'users');
            return true;
        } else {
            console.error('? Failed to load user database');
            return false;
        }
    } catch (error) {
        console.error('? Error loading user database:', error);
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
    
    console.log('? Checking credentials for:', code);
    
    if (USERS_CACHE[code] && USERS_CACHE[code].password === password) {
        currentLoggedInUser = {
            code: code,
            isAdmin: USERS_CACHE[code].isAdmin,
            name: USERS_CACHE[code].name
        };
        
        console.log('? Login successful for:', code);
        
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        document.getElementById('displayUserCode').textContent = `User: ${code}`;
        document.getElementById('securityUserCode').textContent = code;
        
        if (currentLoggedInUser.isAdmin) {
            document.getElementById('adminNotice').style.display = 'block';
            document.getElementById('reportBtn').style.display = 'inline-block';
        }
        
        console.log('? Initializing calendar...');
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
        
        const complianceBox = document.getElementById('complianceBox');
        if (complianceBox) {
            complianceBox.remove();
        }
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
    console.log('? initializeCalendar called');
    console.log('? Available users:', getUserCodes().length);
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
            console.log('? Attendance data loaded');
        } else {
            console.log('?? No attendance data found, starting fresh');
            attendanceData = {};
        }
    } catch (error) {
        console.error('? Error loading attendance data:', error);
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
            console.log('? Data saved to server');
            return true;
        } else {
            const errorData = await response.json();
            console.error('? Failed to save:', errorData);
            alert('Failed to save data: ' + (errorData.message || 'Unknown error'));
            return false;
        }
    } catch (error) {
        console.error('? Error saving data:', error);
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

function isOptionalHoliday(year, month, day) {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return OPTIONAL_HOLIDAYS_2026.includes(dateString);
}

function countOptionalHolidaysTaken(userCode) {
    let count = 0;
    if (attendanceData[userCode]) {
        Object.keys(attendanceData[userCode]).forEach(dateKey => {
            const status = attendanceData[userCode][dateKey];
            if (status === 'oh1' || status === 'oh2') {
                count++;
            }
        });
    }
    return count;
}

function formatDate(day, month) {
    return day + '-' + MONTH_ABBR[month];
}

function getUserPhotoUrl(userCode) {
    if (USER_PHOTOS[userCode]) {
        return USER_PHOTOS[userCode];
    }
    const initials = userCode.substring(0, 2);
    return `https://ui-avatars.com/api/?name=${initials}&background=001965&color=ffffff&size=40&bold=true`;
}

function renderCalendar() {
    console.log('? Rendering calendar...');
    
    const userCodes = getUserCodes();
    console.log('? Rendering for users:', userCodes);
    
    if (!userCodes || userCodes.length === 0) {
        console.error('? No users available to render calendar');
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
        } else if (isOptionalHoliday(year, month, day)) {
            th.classList.add('optional-holiday-header');
        }
        
        headerRow.appendChild(th);
    }
    
    table.appendChild(headerRow);
    
    // Render user rows
    userCodes.forEach(userCode => {
        const row = document.createElement('tr');
        row.dataset.user = userCode;
        
        const isCurrentUser = currentLoggedInUser && currentLoggedInUser.code === userCode;
        if (isCurrentUser) {
            row.classList.add('current-user-row');
        }
        
        // Create name cell with thumbnail
        const nameCell = document.createElement('td');
        nameCell.className = 'name-cell';
        
        const thumbnail = document.createElement('img');
        thumbnail.className = 'user-thumbnail';
        thumbnail.src = getUserPhotoUrl(userCode);
        thumbnail.alt = userCode;
        thumbnail.onerror = function() {
            this.src = `https://ui-avatars.com/api/?name=${userCode.substring(0,2)}&background=001965&color=ffffff&size=40&bold=true`;
        };
        
        const userName = document.createElement('span');
        userName.className = 'user-name';
        userName.textContent = userCode;
        
        nameCell.appendChild(thumbnail);
        nameCell.appendChild(userName);
        row.appendChild(nameCell);
        
        // Create date cells
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('td');
            cell.className = 'date-cell';
            cell.dataset.user = userCode;
            cell.dataset.date = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            cell.dataset.day = day;
            cell.dataset.month = month;
            
            const weekend = isWeekend(year, month, day);
            const holiday = isHoliday(year, month, day);
            const optionalHoliday = isOptionalHoliday(year, month, day);
            
            if (weekend) {
                cell.classList.add('weekend');
                cell.textContent = formatDate(day, month);
            } else if (holiday) {
                cell.classList.add('holiday');
                cell.textContent = formatDate(day, month);
            } else if (optionalHoliday) {
                cell.classList.add('optional-holiday');
                const canEdit = canEditRow(userCode);
                const dateKey = cell.dataset.date;
                const savedStatus = attendanceData[userCode] && attendanceData[userCode][dateKey];
                
                if (savedStatus) {
                    cell.classList.add(savedStatus);
                    if (savedStatus === 'oh1') {
                        cell.textContent = 'Optional Holiday 1';
                    } else if (savedStatus === 'oh2') {
                        cell.textContent = 'Optional Holiday 2';
                    } else {
                        cell.textContent = formatDate(day, month);
                    }
                } else {
                    cell.textContent = formatDate(day, month);
                }
                
                if (canEdit) {
                    cell.addEventListener('click', () => handleOptionalHolidayClick(cell, userCode, dateKey, day, month));
                } else if (!isCurrentUser) {
                    const lockSpan = document.createElement('span');
                    lockSpan.className = 'lock-icon';
                    lockSpan.innerHTML = '&#128274;';
                    cell.insertBefore(lockSpan, cell.firstChild);
                }
            } else {
                const canEdit = canEditRow(userCode);
                const dateKey = cell.dataset.date;
                const savedStatus = attendanceData[userCode] && attendanceData[userCode][dateKey];
                
                if (savedStatus) {
                    cell.classList.add(savedStatus);
                }
                
                const cellContent = document.createDocumentFragment();
                
                if (!canEdit && !isCurrentUser) {
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
    console.log('? Calendar rendered successfully with', userCodes.length, 'users');
    
    checkAndDisplayStats();
}

function handleOptionalHolidayClick(cell, userCode, dateKey, day, month) {
    if (cell.classList.contains('locked')) {
        return;
    }
    
    if (activePopup) {
        activePopup.remove();
        activePopup = null;
    }
    
    const ohCount = countOptionalHolidaysTaken(userCode);
    const currentStatus = attendanceData[userCode] && attendanceData[userCode][dateKey];
    
    // Create popup menu with ALL options
    const popup = document.createElement('div');
    popup.className = 'status-popup';
    
    // Add regular status options (WFO, Planned, etc.)
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
            cell.classList.remove('oh1', 'oh2', 'wfo', 'planned', 'offsite', 'travel', 'leave');
            cell.classList.add(status.value);
            cell.textContent = formatDate(day, month);
            popup.remove();
            activePopup = null;
            renderCalendar();
        });
        
        popup.appendChild(item);
    });
    
    // Add Optional Holiday 1 option
    const oh1Item = document.createElement('div');
    oh1Item.className = 'status-popup-item oh1-option';
    if (ohCount >= 1 && currentStatus !== 'oh1') {
        oh1Item.classList.add('disabled');
    }
    
    const oh1Indicator = document.createElement('div');
    oh1Indicator.className = 'status-color-indicator';
    oh1Indicator.style.background = '#d1c4e9';
    
    const oh1Label = document.createElement('span');
    oh1Label.textContent = 'OH 1';
    
    oh1Item.appendChild(oh1Indicator);
    oh1Item.appendChild(oh1Label);
    
    if (!oh1Item.classList.contains('disabled')) {
        oh1Item.addEventListener('click', (e) => {
            e.stopPropagation();
            updateCellStatus(cell, userCode, dateKey, 'oh1', day, month);
            cell.classList.remove('wfo', 'planned', 'offsite', 'travel', 'leave', 'oh2');
            cell.classList.add('oh1');
            cell.textContent = 'Optional Holiday 1';
            popup.remove();
            activePopup = null;
            renderCalendar();
        });
    }
    
    popup.appendChild(oh1Item);
    
    // Add Optional Holiday 2 option
    const oh2Item = document.createElement('div');
    oh2Item.className = 'status-popup-item oh2-option';
    if (ohCount >= 2 && currentStatus !== 'oh2') {
        oh2Item.classList.add('disabled');
    }
    
    const oh2Indicator = document.createElement('div');
    oh2Indicator.className = 'status-color-indicator';
    oh2Indicator.style.background = '#d1c4e9';
    
    const oh2Label = document.createElement('span');
    oh2Label.textContent = 'OH 2';
    
    oh2Item.appendChild(oh2Indicator);
    oh2Item.appendChild(oh2Label);
    
    if (!oh2Item.classList.contains('disabled')) {
        oh2Item.addEventListener('click', (e) => {
            e.stopPropagation();
            updateCellStatus(cell, userCode, dateKey, 'oh2', day, month);
            cell.classList.remove('wfo', 'planned', 'offsite', 'travel', 'leave', 'oh1');
            cell.classList.add('oh2');
            cell.textContent = 'Optional Holiday 2';
            popup.remove();
            activePopup = null;
            renderCalendar();
        });
    }
    
    popup.appendChild(oh2Item);
    
    // Add "Clear" option if cell has status
    if (currentStatus) {
        const clearItem = document.createElement('div');
        clearItem.className = 'status-popup-item clear-option';
        clearItem.innerHTML = '<span style="font-size: 16px;">\u{1f5d1}</span><span>Clear Status</span>';
        
        clearItem.addEventListener('click', (e) => {
            e.stopPropagation();
            updateCellStatus(cell, userCode, dateKey, '', day, month);
            cell.classList.remove('oh1', 'oh2', 'wfo', 'planned', 'offsite', 'travel', 'leave');
            cell.textContent = formatDate(day, month);
            popup.remove();
            activePopup = null;
            renderCalendar();
        });
        
        popup.appendChild(clearItem);
    }
    
    // Position and show popup
    showPopup(popup, cell);
}

function handleCellClick(cell, userCode, dateKey, day, month) {
    if (cell.classList.contains('weekend') || cell.classList.contains('holiday') || cell.classList.contains('optional-holiday') || cell.classList.contains('locked')) {
        return;
    }
    
    if (activePopup) {
        activePopup.remove();
        activePopup = null;
    }
    
    const popup = document.createElement('div');
    popup.className = 'status-popup';
    
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
    
    if (attendanceData[userCode] && attendanceData[userCode][dateKey]) {
        const clearItem = document.createElement('div');
        clearItem.className = 'status-popup-item clear-option';
        clearItem.innerHTML = '<span style="font-size: 16px;">\u{1f5d1}</span><span>Clear Status</span>';
        
        clearItem.addEventListener('click', (e) => {
            e.stopPropagation();
            updateCellStatus(cell, userCode, dateKey, '', day, month);
            renderCellContent(cell, userCode, dateKey, day, month);
            popup.remove();
            activePopup = null;
        });
        
        popup.appendChild(clearItem);
    }
    
    showPopup(popup, cell);
}

function showPopup(popup, cell) {
    document.body.appendChild(popup);
    popup.style.display = 'block';
    popup.style.position = 'fixed';
    
    const cellRect = cell.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    
    let left = cellRect.left;
    let top = cellRect.bottom + 5;
    
    if (left + popupRect.width > window.innerWidth) {
        left = cellRect.right - popupRect.width;
    }
    
    if (top + popupRect.height > window.innerHeight) {
        top = cellRect.top - popupRect.height - 5;
    }
    
    if (left < 0) {
        left = 5;
    }
    
    if (top < 0) {
        top = cellRect.bottom + 5;
    }
    
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    
    activePopup = popup;
    
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
    const isCurrentUser = currentLoggedInUser && currentLoggedInUser.code === userCode;
    
    cell.innerHTML = '';
    cell.classList.remove('wfo', 'planned', 'offsite', 'travel', 'leave');
    
    const savedStatus = attendanceData[userCode] && attendanceData[userCode][dateKey];
    
    if (savedStatus) {
        cell.classList.add(savedStatus);
    }
    
    const cellContent = document.createDocumentFragment();
    
    if (!canEdit && !isCurrentUser) {
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
        successMsg.textContent = '? Data saved to server! Everyone can now see your changes.';
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
        const complianceBox = document.getElementById('complianceBox');
        if (complianceBox) {
            complianceBox.remove();
        }
    }
}

function calculateCompliance() {
    if (!currentLoggedInUser) return null;
    
    const userCode = currentLoggedInUser.code;
    const year = 2026;
    const month = currentMonth;
    const daysInMonth = getDaysInMonth(year, month);
    
    let wfoDays = 0;
    let totalWorkingDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (!isWeekend(year, month, day) && !isHoliday(year, month, day)) {
            if (isOptionalHoliday(year, month, day)) {
                const status = attendanceData[userCode] && attendanceData[userCode][dateKey];
                if (status === 'oh1' || status === 'oh2') {
                    continue;
                }
            }
            
            totalWorkingDays++;
            
            if (attendanceData[userCode] && attendanceData[userCode][dateKey] === 'wfo') {
                wfoDays++;
            }
        }
    }
    
    const percentage = totalWorkingDays > 0 ? Math.round((wfoDays / totalWorkingDays) * 100) : 0;
    const required = 65;
    
    return { percentage, wfoDays, totalWorkingDays, required };
}

function renderComplianceBox() {
    const compliance = calculateCompliance();
    if (!compliance) return;
    
    const statsContainer = document.getElementById('statsContainer');
    
    let existingBox = document.getElementById('complianceBox');
    if (existingBox) {
        existingBox.remove();
    }
    
    const complianceBox = document.createElement('div');
    complianceBox.id = 'complianceBox';
    complianceBox.className = 'compliance-box';
    
    let statusClass = 'danger';
    let statusText = 'Below Target';
    if (compliance.percentage >= compliance.required) {
        statusClass = 'success';
        statusText = '\u2705 Target Achieved!';
    } else if (compliance.percentage >= 50) {
        statusClass = 'warning';
        statusText = '\u25B2 Approaching Target';
    } else {
        statusText = '\u25BC Below Target';
    }
    
    complianceBox.innerHTML = `
        <h3>Office Footprint Compliance</h3>
        <div class="compliance-content">
            <div class="compliance-text">
                <strong>${compliance.required}%</strong> of office footprint is mandatory<br>
                You have reached <strong>${compliance.percentage}%</strong> ${statusText}<br>
                <small>${compliance.wfoDays} WFO days out of ${compliance.totalWorkingDays} working days this month</small>
            </div>
            <div class="compliance-bar-container">
                <div class="compliance-target-label">Target: 65%</div>
                <div class="compliance-bar">
                    <div class="compliance-target-line"></div>
                    <div class="compliance-fill ${statusClass}" style="width: ${Math.min(compliance.percentage, 100)}%">
                        ${compliance.percentage}%
                    </div>
                </div>
            </div>
        </div>
    `;
    
    statsContainer.parentNode.insertBefore(complianceBox, statsContainer.nextSibling);
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
        oh: 0,
        total: 0
    };
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        
        if (!isWeekend(year, month, day) && !isHoliday(year, month, day)) {
            if (isOptionalHoliday(year, month, day)) {
                const status = attendanceData[userCode] && attendanceData[userCode][dateKey];
                if (status === 'oh1' || status === 'oh2') {
                    stats.oh++;
                } else {
                    stats.total++;
                    if (status && stats.hasOwnProperty(status)) {
                        stats[status]++;
                    }
                }
            } else {
                stats.total++;
                if (attendanceData[userCode] && attendanceData[userCode][dateKey]) {
                    const status = attendanceData[userCode][dateKey];
                    if (stats.hasOwnProperty(status)) {
                        stats[status]++;
                    }
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
            '<div class="stat-item oh-stat"><div class="stat-color optional-holiday-color"></div><div><div class="stat-label">Optional Holidays</div><div class="stat-value">' + stats.oh + ' days</div></div></div>' +
            '<div class="stat-item total-stat"><div class="stat-color total-color"></div><div><div class="stat-label">Working Days</div><div class="stat-value">' + stats.total + ' days</div></div></div>' +
        '</div>';
    
    statsContainer.style.display = 'block';
    renderComplianceBox();
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
    reportHTML += '<thead><tr><th>User</th><th>WFO</th><th>Planned</th><th>Offsite</th><th>Travel</th><th>Leave</th><th>Optional Holidays</th><th>Total Days</th><th>Compliance %</th></tr></thead><tbody>';
    
    getUserCodes().forEach(userCode => {
        let stats = { wfo: 0, planned: 0, offsite: 0, travel: 0, leave: 0, oh: 0, total: 0 };
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            
            if (!isWeekend(year, month, day) && !isHoliday(year, month, day)) {
                if (isOptionalHoliday(year, month, day)) {
                    const status = attendanceData[userCode] && attendanceData[userCode][dateKey];
                    if (status === 'oh1' || status === 'oh2') {
                        stats.oh++;
                    } else {
                        stats.total++;
                        if (status && stats.hasOwnProperty(status)) {
                            stats[status]++;
                        }
                    }
                } else {
                    stats.total++;
                    if (attendanceData[userCode] && attendanceData[userCode][dateKey]) {
                        const status = attendanceData[userCode][dateKey];
                        if (stats.hasOwnProperty(status)) {
                            stats[status]++;
                        }
                    }
                }
            }
        }
        
        const compliancePercent = stats.total > 0 ? Math.round((stats.wfo / stats.total) * 100) : 0;
        const complianceColor = compliancePercent >= 65 ? '#4caf50' : compliancePercent >= 50 ? '#ff9800' : '#f44336';
        
        reportHTML += '<tr><td><strong>' + userCode + '</strong></td>';
        reportHTML += '<td>' + stats.wfo + '</td><td>' + stats.planned + '</td><td>' + stats.offsite + '</td>';
        reportHTML += '<td>' + stats.travel + '</td><td>' + stats.leave + '</td><td>' + stats.oh + '</td><td><strong>' + stats.total + '</strong></td>';
        reportHTML += '<td style="color: ' + complianceColor + '; font-weight: 700;"><strong>' + compliancePercent + '%</strong></td></tr>';
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
            } else if (isOptionalHoliday(year, month, day)) {
                const status = attendanceData[userCode] && attendanceData[userCode][dateKey];
                if (status === 'oh1' || status === 'oh2') {
                    csv += status.toUpperCase() + ',';
                } else if (status) {
                    csv += status.toUpperCase() + ',';
                } else {
                    csv += 'Optional Holiday,';
                }
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
    
    let csv = 'Comprehensive Attendance Report - ' + monthName + ' 2026\n\nUser,WFO,Planned,Offsite,Travel,Leave,Optional Holidays,Total Working Days,Compliance %\n';
    
    getUserCodes().forEach(userCode => {
        let stats = { wfo: 0, planned: 0, offsite: 0, travel: 0, leave: 0, oh: 0, total: 0 };
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            if (!isWeekend(year, month, day) && !isHoliday(year, month, day)) {
                if (isOptionalHoliday(year, month, day)) {
                    const status = attendanceData[userCode] && attendanceData[userCode][dateKey];
                    if (status === 'oh1' || status === 'oh2') {
                        stats.oh++;
                    } else {
                        stats.total++;
                        if (status && stats.hasOwnProperty(status)) stats[status]++;
                    }
                } else {
                    stats.total++;
                    if (attendanceData[userCode] && attendanceData[userCode][dateKey]) {
                        const status = attendanceData[userCode][dateKey];
                        if (stats.hasOwnProperty(status)) stats[status]++;
                    }
                }
            }
        }
        
        const compliancePercent = stats.total > 0 ? Math.round((stats.wfo / stats.total) * 100) : 0;
        
        csv += userCode + ',' + stats.wfo + ',' + stats.planned + ',' + stats.offsite + ',' + stats.travel + ',' + stats.leave + ',' + stats.oh + ',' + stats.total + ',' + compliancePercent + '%\n';
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

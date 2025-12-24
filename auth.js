// ========== YOUR CREDENTIALS ==========
const JSONBIN_AUTH_BIN_ID = "694b9e8dd0ea881f403d5158"; // Replace with your auth bin ID
const JSONBIN_API_KEY = "$2a$10$TSxWjP8KeL2sCsGcfRtI.uxlpOLk2c2yTg3Qn8loL1z5d8OHN87fO";
// ======================================

let currentLoggedInUser = null;
let USERS_CACHE = {}; // Cache to avoid multiple API calls

// Load user database from server
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
            console.log('User database loaded from server');
            return true;
        } else {
            console.error('Failed to load user database');
            return false;
        }
    } catch (error) {
        console.error('Error loading user database:', error);
        return false;
    }
}

// Handle Login with Server-Side Authentication
async function handleLogin(event) {
    event.preventDefault();
    
    const code = document.getElementById('loginCode').value.toUpperCase().trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Authenticating...';
    
    // Load user database from server
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
    
    // Validate credentials from server data
    if (USERS_CACHE[code] && USERS_CACHE[code].password === password) {
        currentLoggedInUser = {
            code: code,
            isAdmin: USERS_CACHE[code].isAdmin,
            name: USERS_CACHE[code].name
        };
        
        // Hide login, show main app
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        // Update user display
        document.getElementById('displayUserCode').textContent = `User: ${code}`;
        document.getElementById('securityUserCode').textContent = code;
        
        // Show admin notice and report button if admin
        if (currentLoggedInUser.isAdmin) {
            document.getElementById('adminNotice').style.display = 'block';
            document.getElementById('reportBtn').style.display = 'inline-block';
        }
        
        // Initialize the calendar
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

// Handle Logout
function handleLogout() {
    if (confirm('Are you sure you want to logout? Any unsaved changes will be lost.')) {
        currentLoggedInUser = null;
        USERS_CACHE = {}; // Clear cache on logout
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginOverlay').style.display = 'flex';
        document.getElementById('loginCode').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('adminNotice').style.display = 'none';
        document.getElementById('reportBtn').style.display = 'none';
        document.getElementById('statsContainer').style.display = 'none';
    }
}

// Check if user can edit a specific row
function canEditRow(userCode) {
    if (!currentLoggedInUser) return false;
    if (currentLoggedInUser.isAdmin) return true;
    return currentLoggedInUser.code === userCode;
}

// Get list of all user codes for rendering
function getUserCodes() {
    return Object.keys(USERS_CACHE);
}
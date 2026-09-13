// Import necessary modules for the backend
require('dotenv').config(); // Loads environment variables from .env file
const express = require('express'); // Framework to create web server
const cors = require('cors'); // Allows our React frontend to communicate with this backend
const axios = require('axios'); // Used to make HTTP requests (to our Django API)
const mongoose = require('mongoose'); // Library to interact with MongoDB database
const fs = require('fs'); // File system module to read/write JSON files (fallback DB)
const path = require('path');
const jwt = require('jsonwebtoken'); // Used to create secure login tokens
const bcrypt = require('bcryptjs'); // Used to encrypt/hash passwords securely
const nodemailer = require('nodemailer'); // Used to send emails

const app = express();
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Allow the server to read JSON data from requests

const PORT = 5000; // Node.js server port
const DJANGO_API_URL = 'http://localhost:8000/api/predict-server-health/'; // URL of our ML API

// Paths for fallback JSON databases if MongoDB is not installed
const FALLBACK_DB_PATH = path.join(__dirname, 'database.json');
const FALLBACK_USERS_PATH = path.join(__dirname, 'users.json');

// Secret key used to sign JWT tokens (Keep this secure in production)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const otps = {}; // In-memory object to temporarily store OTP codes for password resets

// Setup Nodemailer Gmail Account for sending automated emails
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail address from .env
        pass: process.env.EMAIL_PASS  // Your Gmail App Password from .env
    }
});

async function sendPasswordResetEmail(userEmail, resetCode) {
    if (!transporter) return;
    try {
        await transporter.sendMail({
            from: `"DevOps Alert" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: '🔐 Password Reset Code',
            text: `Hello,\n\nWe received a request to reset your password.\n\nYour 6-digit Reset Code is: ${resetCode}\n\nPlease enter this code on the dashboard to choose a new password.`,
        });
        console.log(`Password reset code sent to ${userEmail}`);
    } catch (err) {
        console.error('Error sending reset email:', err);
    }
}

// ==========================================
// DATABASE CONNECTION SETUP
// ==========================================
let useMongo = false; // Flag to track if MongoDB is available

// Try to connect to MongoDB running locally
mongoose.connect('mongodb://127.0.0.1:27017/server-health', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 2000 // Only wait 2 seconds before giving up
}).then(() => {
    console.log('✅ Connected to MongoDB successfully.');
    useMongo = true;
}).catch(err => {
    console.log('⚠️ MongoDB not running or unreachable. Falling back to local JSON database (database.json).');
    useMongo = false;
    // If MongoDB fails, create local JSON files to store data instead
    if (!fs.existsSync(FALLBACK_DB_PATH)) {
        fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify([]));
    }
    if (!fs.existsSync(FALLBACK_USERS_PATH)) {
        fs.writeFileSync(FALLBACK_USERS_PATH, JSON.stringify([]));
    }
});

// Helper functions for JSON database fallback
function loadUsers() {
    if (fs.existsSync(FALLBACK_USERS_PATH)) {
        return JSON.parse(fs.readFileSync(FALLBACK_USERS_PATH));
    }
    return [];
}

// ==========================================
// DATABASE SCHEMAS (STRUCTURES)
// ==========================================

// Schema for storing Server Health Logs
const logSchema = new mongoose.Schema({
    username: String, // Which user ran this diagnostic
    cpu_usage: Number,
    ram_usage: Number,
    disk_usage: Number,
    temperature: Number,
    network_latency: Number,
    active_connections: Number,
    api_response_time: Number,
    error_rate: Number,
    status: String, // E.g., 'Critical', 'Warning', 'Healthy'
    health_score: Number, // 0 to 100
    time_to_crash: String, // ETA string
    reasons: [String], // Array of root causes
    suggestions: [String], // Array of actionable suggestions
    timestamp: { type: Date, default: Date.now } // When it happened
});
const Log = mongoose.model('Log', logSchema);

// Schema for storing User Accounts
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true } // Stored as an encrypted hash, never plain text
});
const User = mongoose.model('User', userSchema);

// Helper function to save a log to either MongoDB or the JSON file
async function saveLog(logData) {
    if (useMongo) {
        // Save to MongoDB
        const log = new Log(logData);
        await log.save();
    } else {
        // Save to local JSON file
        let logs = [];
        if (fs.existsSync(FALLBACK_DB_PATH)) {
            const raw = fs.readFileSync(FALLBACK_DB_PATH);
            logs = JSON.parse(raw);
        }
        logData.timestamp = new Date().toISOString();
        logs.unshift(logData); // Add to top of the array
        fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(logs, null, 2));
    }
}

// Helper function to send an email alert to the user if their server is crashing
async function sendAlertEmail(user, status, logData) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log("Email credentials not configured. Skipping email alert.");
        return;
    }

    try {
        // Configure nodemailer with Gmail SMTP
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        let rcaText = "";
        if (logData && logData.reasons && logData.reasons.length > 0) {
            rcaText = `Reason:\n${logData.reasons.map(r => "✓ " + r).join("\n")}\n\nAI Recommendation:\n\n${logData.suggestions.map(s => "• " + s).join("\n")}\n`;
        }

        let crashProb = logData.health_score !== undefined ? (100 - logData.health_score) : 95;

        // The email content
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `🚨 ALERT: Server Health Report`,
            text: `Hello ${user.username},\n\nYour server check-up is completed.\n\nYour report is given below:\n\n======================================\nAI SERVER HEALTH REPORT\n======================================\n\nHealth Score : ${logData.health_score !== undefined ? logData.health_score : 35}/100\n\nStatus : ${status.split(' - ')[0]}\n\nCrash Probability : ${crashProb}%\n\n${rcaText}\nEstimated Time Before Crash:\n≈ ${logData.time_to_crash || "10 Minutes"}\n======================================`
        };
        await transporter.sendMail(mailOptions);
        console.log(`Alert Email successfully sent via Gmail to ${user.email}`);
        console.log('-----------------------------------------');
    } catch (err) {
        console.error('Error sending email:', err);
    }
}

// ==========================================
// API ENDPOINTS
// ==========================================

// Signup endpoint: Registers a new user
app.post('/api/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }
        
        // Check if username or email already exists in the database
        let userExists = false;
        if (useMongo) {
            const existingUser = await User.findOne({ $or: [{ username }, { email }] });
            if (existingUser) userExists = true;
        } else {
            const users = loadUsers();
            if (users.find(u => u.username === username || u.email === email)) userExists = true;
        }

        if (userExists) {
            return res.status(400).json({ success: false, error: 'Username or Email already exists' });
        }

        // Hash the password for security before saving
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Save the new user to the database
        if (useMongo) {
            const newUser = new User({ username, email, password: hashedPassword });
            await newUser.save();
        } else {
            const users = loadUsers();
            users.push({ username, email, password: hashedPassword });
            fs.writeFileSync(FALLBACK_USERS_PATH, JSON.stringify(users, null, 2));
        }

        // Generate a token so the user is immediately logged in
        const token = jwt.sign({ username, email }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to register user' });
    }
});

// Login endpoint: Authenticates an existing user
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        let user = null;
        
        // Find the user by username
        if (useMongo) {
            user = await User.findOne({ username });
        } else {
            const users = loadUsers();
            user = users.find(u => u.username === username);
        }

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }

        // Compare the provided password with the hashed password in the DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }

        // Generate a new token valid for 2 hours
        const token = jwt.sign({ username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to log in' });
    }
});

// Forgot Password endpoint (Step 1: Send OTP to email)
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

        // Check if a user with this email actually exists
        let user = null;
        if (useMongo) {
            user = await User.findOne({ email });
        } else {
            const users = loadUsers();
            user = users.find(u => u.email === email);
        }

        if (!user) {
            return res.status(404).json({ success: false, error: 'No account found with this email' });
        }

        // Generate a random 6-digit number (OTP)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otps[email] = otp; // Save it temporarily in memory

        // Email the OTP to the user
        await sendPasswordResetEmail(email, otp);
        res.json({ success: true, message: 'Reset code sent to your email' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Failed to send reset code' });
    }
});

// Reset Password endpoint (Step 2: Verify OTP and save new password)
app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) return res.status(400).json({ success: false, error: 'Missing fields' });

        // Verify if the OTP provided by the user matches the one we generated
        if (otps[email] !== otp) {
            return res.status(400).json({ success: false, error: 'Invalid or expired OTP code' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password in the database
        if (useMongo) {
            const user = await User.findOne({ email });
            user.password = hashedPassword;
            await user.save();
        } else {
            const users = loadUsers();
            const userIndex = users.findIndex(u => u.email === email);
            users[userIndex].password = hashedPassword;
            fs.writeFileSync(FALLBACK_USERS_PATH, JSON.stringify(users, null, 2));
        }

        delete otps[email]; // Clear the OTP from memory so it can't be reused
        res.json({ success: true, message: 'Password has been changed successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Failed to save new password' });
    }
});

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================
// This function protects API routes to ensure only logged-in users can access them
const verifyToken = (req, res, next) => {
    // Get token from the 'Authorization' header sent by React
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ error: 'No token provided' });
    
    // Header format is "Bearer <token>", so we extract the token part
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(403).json({ error: 'No token provided' });
    
    // Verify the token using our JWT_SECRET
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        // Attach the decoded user info (username, email) to the request object
        req.user = decoded;
        next(); // Proceed to the actual API endpoint
    });
};

// POST endpoint to analyze data (Protected by verifyToken)
app.post('/api/analyze', verifyToken, async (req, res) => {
    try {
        const { 
            cpu_usage, ram_usage, disk_usage, temperature, 
            network_latency, active_connections, api_response_time, error_rate 
        } = req.body;
        
        // 1. Send the metric data to our Python (Django) Machine Learning API
        const djangoRes = await axios.post(DJANGO_API_URL, {
            cpu_usage,
            ram_usage,
            disk_usage,
            temperature,
            network_latency,
            active_connections,
            api_response_time,
            error_rate
        });
        
        const predictionData = djangoRes.data;
        
        // 2. Save the prediction result into our database
        const logData = {
            username: req.user.username,
            cpu_usage, ram_usage, disk_usage, temperature,
            network_latency, active_connections, api_response_time, error_rate,
            status: predictionData.status,
            health_score: predictionData.health_score !== undefined ? predictionData.health_score : 100,
            time_to_crash: predictionData.time_to_crash || "Safe for 2+ hours",
            reasons: predictionData.reasons || [],
            suggestions: predictionData.suggestions || []
        };
        await saveLog(logData);

        // 3. Check if we need to alert the user via email
        let emailSent = false;
        if (predictionData.status !== 'Healthy - Server Safe') {
            // Find the user's email address from the database
            let user;
            if (useMongo) {
                user = await User.findOne({ username: req.user.username });
            } else {
                user = loadUsers().find(u => u.username === req.user.username);
            }

            if (user && user.email) {
                await sendAlertEmail(user, predictionData.status, logData);
                emailSent = true;
            }
        }
        // Return the final result to the React frontend
        res.json({ 
            success: true, 
            status: predictionData.status, 
            health_score: predictionData.health_score !== undefined ? predictionData.health_score : 100,
            time_to_crash: predictionData.time_to_crash || "Safe for 2+ hours",
            emailSent,
            reasons: predictionData.reasons || [],
            suggestions: predictionData.suggestions || []
        });
    } catch (error) {
        console.error("Error communicating with Django API:", error.message);
        res.status(500).json({ error: "Failed to analyze server health. Ensure Django backend is running." });
    }
});

// GET endpoint to fetch past logs for the dashboard table (Protected)
app.get('/api/logs', verifyToken, async (req, res) => {
    try {
        if (useMongo) {
            // Get the last 50 logs belonging to the currently logged-in user
            const logs = await Log.find({ username: req.user.username }).sort({ timestamp: -1 }).limit(50);
            res.json(logs);
        } else {
            let logs = [];
            if (fs.existsSync(FALLBACK_DB_PATH)) {
                logs = JSON.parse(fs.readFileSync(FALLBACK_DB_PATH));
            }
            // Filter logs to only return those belonging to the currently logged-in user
            const userLogs = logs.filter(l => l.username === req.user.username);
            res.json(userLogs.slice(0, 50));
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch logs" });
    }
});

// POST endpoint to clear (delete) past logs (Protected)
app.post('/api/clear', verifyToken, async (req, res) => {
    try {
        if (useMongo) {
            // Delete all logs belonging to this user
            await Log.deleteMany({ username: req.user.username });
        } else {
            if (fs.existsSync(FALLBACK_DB_PATH)) {
                let logs = JSON.parse(fs.readFileSync(FALLBACK_DB_PATH));
                // Remove all logs belonging to this user from the JSON array
                logs = logs.filter(l => l.username !== req.user.username);
                fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(logs, null, 2));
            }
        }
        res.json({ success: true, message: "User logs cleared" });
    } catch (error) {
        res.status(500).json({ error: "Failed to clear logs" });
    }
});

// Start the backend server on the specified port
app.listen(PORT, () => {
    console.log(`🚀 Node.js Express Server running on port ${PORT}`);
});

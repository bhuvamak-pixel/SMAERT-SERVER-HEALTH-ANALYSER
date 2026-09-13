import { useState } from 'react';
import axios from 'axios';
import { Lock, User, LogIn, AlertCircle, Mail, CheckCircle } from 'lucide-react';

function Login({ onLogin }) {
  // --- STATE VARIABLES ---
  // Store user inputs for the forms
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Store UI messages and loading states
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Toggles for different screens (Sign In, Sign Up, Forgot Password)
  const [isSignup, setIsSignup] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false); // Tracks if OTP was emailed
  const [otp, setOtp] = useState(''); // Stores the 6-digit code the user types

  // --- HANDLER FUNCTIONS ---

  // Handles both standard Login and Signup
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Choose which backend URL to call based on the current mode (Sign In or Sign Up)
      const endpoint = isSignup ? 'http://localhost:5000/api/signup' : 'http://localhost:5000/api/login';
      
      const payload = { username, password };
      if (isSignup) payload.email = email; // Only send email if signing up

      // Send the request to the Node.js backend
      const res = await axios.post(endpoint, payload);

      if (res.data.success) {
        // If login/signup works, save the JWT token (this function usually saves it to localStorage)
        onLogin(res.data.token);
      }
    } catch (err) {
      // If error (e.g. wrong password), show the error message from the backend
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Failed to connect to the server.");
      }
    } finally {
      setLoading(false); // Stop the loading animation
    }
  };

  // Handles Step 1 of Forgot Password (Requesting the OTP via email)
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      // Call the forgot-password API to generate and email the 6-digit code
      const res = await axios.post('http://localhost:5000/api/forgot-password', { email });
      if (res.data.success) {
        setSuccessMsg(res.data.message);
        setOtpSent(true); // Switch UI to Step 2 (Enter OTP)
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Failed to connect to the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handles Step 2 of Forgot Password (Verifying OTP and setting new password)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      // Send email, the OTP they typed, and their chosen new password
      const res = await axios.post('http://localhost:5000/api/reset-password', { email, otp, newPassword: password });
      if (res.data.success) {
        setSuccessMsg(res.data.message);
        setTimeout(() => {
          // After success, switch the UI back to the normal Login screen
          setIsForgotPassword(false);
          setOtpSent(false);
          setOtp('');
          setPassword('');
          setSuccessMsg('');
        }, 2000);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Failed to connect to the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 20 }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: 400, padding: '40px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', marginBottom: 16 }}>
            <Lock size={32} color="var(--primary-accent)" />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: 8 }}>{isForgotPassword ? (otpSent ? 'Enter New Password' : 'Reset Password') : (isSignup ? 'Create Account' : 'Secure Access')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{isForgotPassword ? (otpSent ? 'Enter the 6-digit code and choose a new password.' : 'Enter your email to receive a 6-digit reset code.') : (isSignup ? 'Register to access the DevOps dashboard.' : 'Enter your credentials to access the DevOps dashboard.')}</p>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, color: 'var(--color-critical)', marginBottom: 24, fontSize: '0.9rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        
        {successMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 8, color: '#4ade80', marginBottom: 24, fontSize: '0.9rem' }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={isForgotPassword ? (otpSent ? handleResetPassword : handleSendOtp) : handleSubmit}>
          {!isForgotPassword && (
            <div className="input-group">
              <label className="input-label">Username</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="number-input" 
                  style={{ paddingLeft: 42, fontFamily: 'Outfit' }}
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="admin"
                  required={!isForgotPassword} 
                />
              </div>
            </div>
          )}
          
          {(isSignup || isForgotPassword) && (
            <div className="input-group" style={isForgotPassword && !otpSent ? { marginBottom: 32 } : {}}>
              <label className="input-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  className="number-input" 
                  style={{ paddingLeft: 42, fontFamily: 'Outfit' }}
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="admin@example.com"
                  required={(isSignup || isForgotPassword)}
                  disabled={otpSent}
                />
              </div>
            </div>
          )}

          {isForgotPassword && otpSent && (
            <div className="input-group">
              <label className="input-label">6-Digit Reset Code</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="number-input" 
                  style={{ paddingLeft: 42, fontFamily: 'Outfit', letterSpacing: '0.2em' }}
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  placeholder="123456"
                  required 
                  maxLength={6}
                />
              </div>
            </div>
          )}
          
          {(!isForgotPassword || otpSent) && (
            <div className="input-group" style={{ marginBottom: 16 }}>
              <label className="input-label">{otpSent ? 'New Password' : 'Password'}</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  className="number-input" 
                  style={{ paddingLeft: 42, fontFamily: 'Outfit' }}
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  required={!isForgotPassword || otpSent} 
                />
              </div>
            </div>
          )}

          {!isSignup && !isForgotPassword && (
            <div style={{ textAlign: 'right', marginBottom: 24 }}>
              <button 
                type="button"
                onClick={() => { setIsForgotPassword(true); setOtpSent(false); setError(''); setSuccessMsg(''); }} 
                style={{ background: 'transparent', border: 'none', color: 'var(--primary-accent)', cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.85rem', padding: 0 }}
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button type="submit" className="btn" disabled={loading}>
            <LogIn size={18} />
            {loading ? 'Processing...' : (isForgotPassword ? (otpSent ? 'Set New Password' : 'Send Code') : (isSignup ? 'Sign Up' : 'Sign In'))}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {isForgotPassword ? (
            <button 
              onClick={() => { setIsForgotPassword(false); setOtpSent(false); setError(''); setSuccessMsg(''); }} 
              style={{ background: 'transparent', border: 'none', color: 'var(--primary-accent)', cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.9rem', padding: 0 }}
            >
              Back to Login
            </button>
          ) : (
            <>
              {isSignup ? "Already have an account? " : "Don't have an account? "}
              <button 
                onClick={() => { setIsSignup(!isSignup); setError(''); setSuccessMsg(''); }} 
                style={{ background: 'transparent', border: 'none', color: 'var(--primary-accent)', cursor: 'pointer', fontFamily: 'Outfit', fontSize: '0.9rem', padding: 0 }}
              >
                {isSignup ? 'Sign In' : 'Sign Up'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;

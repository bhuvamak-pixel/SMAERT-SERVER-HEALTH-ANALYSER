import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Cpu, HardDrive, Thermometer, Users, AlertTriangle, CheckCircle, Server, RefreshCw, LogOut, Mail, Zap, Menu, Home } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, ComposedChart
} from 'recharts';
import Login from './Login';

function App() {
  // --- STATE VARIABLES ---
  // Store the current server metrics shown on the dashboard sliders
  const [metrics, setMetrics] = useState({
    cpu_usage: 45,
    ram_usage: 55,
    disk_usage: 40,
    temperature: 60,
    network_latency: 50,
    active_connections: 5000,
    api_response_time: 150,
    error_rate: 0
  });

  // UI state for loading spinners, AI prediction results, and table logs
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // Stores the full object: { status, reasons, suggestions }
  const [logs, setLogs] = useState([]); // Stores the history of diagnostics
  const [emailAlert, setEmailAlert] = useState(false); // Controls the "Email Sent!" badge
  
  // Authentication State: Stores the JWT token. If null, user is not logged in.
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'overview', 'diagnostics', 'logs'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Sidebar toggle state

  // --- LIFECYCLE & AUTHENTICATION ---

  // Fetches the user's past diagnostic logs from the backend database
  const fetchLogs = async () => {
    if (!token) return; // Don't fetch if not logged in
    try {
      const res = await axios.get('http://localhost:5000/api/logs', {
        headers: { Authorization: `Bearer ${token}` } // Send token to prove identity
      });
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
      // Auto logout if the backend says our token is invalid (e.g. expired)
      if (err.response && err.response.status === 401) {
        handleLogout();
      }
    }
  };

  // Run fetchLogs automatically whenever the token changes (e.g. when logging in)
  useEffect(() => {
    if (token) {
      fetchLogs();
    }
  }, [token]);

  // Saves the token to localStorage and state so the user stays logged in after refresh
  const handleLogin = (jwtToken) => {
    localStorage.setItem('token', jwtToken);
    setToken(jwtToken);
  };

  // Clears all user data from memory and logs them out
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setLogs([]);
    setResult(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMetrics(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleSimulate = (preset) => {
    if (preset === 'normal') setMetrics({ cpu_usage: 45, ram_usage: 50, disk_usage: 40, temperature: 60, network_latency: 50, active_connections: 5000, api_response_time: 150, error_rate: 0 });
    if (preset === 'heavy') setMetrics({ cpu_usage: 82, ram_usage: 85, disk_usage: 80, temperature: 78, network_latency: 350, active_connections: 30000, api_response_time: 800, error_rate: 2 });
    if (preset === 'critical') setMetrics({ cpu_usage: 95, ram_usage: 98, disk_usage: 96, temperature: 95, network_latency: 900, active_connections: 48000, api_response_time: 2500, error_rate: 12 });
  };

  // --- MAIN LOGIC ---

  // Sends the current slider values to the backend to get an AI prediction
  const handleAnalyze = async () => {
    setLoading(true); // Start loading spinner
    try {
      // POST request to our Node.js server, which then calls Django
      const res = await axios.post('http://localhost:5000/api/analyze', metrics, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(res.data); // e.g. { status: "Critical...", reasons: [...], suggestions: [...] }
      
      // If the backend sent an email alert, show a small badge for 5 seconds
      if (res.data.emailSent) {
        setEmailAlert(true);
        setTimeout(() => setEmailAlert(false), 5000); // hide after 5 seconds
      }
      
      // Refresh the table to show the new diagnostic run
      await fetchLogs();
      setActiveTab('diagnostics'); // Redirect to Diagnostics tab
    } catch (err) {
      console.error(err);
      setResult("Error communicating with server");
    } finally {
      setLoading(false); // Stop loading spinner
    }
  };

  // Prepare chart data from logs (reverse to show chronological order)
  const chartData = [...logs].reverse().map(log => ({
    time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    CPU: log.cpu_usage || 0,
    RAM: log.ram_usage || 0,
    Disk: log.disk_usage || 0,
    Temp: log.temperature || 0,
    Errors: log.error_rate !== undefined ? log.error_rate : 0,
    Connections: log.active_connections !== undefined ? log.active_connections : 0,
    API_Res: log.api_response_time !== undefined ? log.api_response_time : 0
  }));

  const getStatusComponent = () => {
    if (!result) return null;
    
    // Result can be a string (from old cache) or an object (new RCA logic)
    const status = typeof result === 'string' ? result : result.status;
    const isCritical = status.includes("Critical");
    const isWarning = status.includes("Warning");

    let statusColor = "var(--color-healthy)";
    let StatusIcon = CheckCircle;
    
    if (isCritical) {
      statusColor = "var(--color-critical)";
      StatusIcon = AlertTriangle;
    } else if (isWarning) {
      statusColor = "var(--color-warning)";
      StatusIcon = Activity;
    }

    return (
      <div style={{ marginTop: 16, padding: '20px 24px', borderRadius: 12, background: `color-mix(in srgb, ${statusColor} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${statusColor} 30%, transparent)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StatusIcon size={28} color={statusColor} />
            <h3 style={{ fontSize: '1.25rem', color: statusColor, margin: 0 }}>{status}</h3>
          </div>
          {result.health_score !== undefined && (
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: statusColor, textAlign: 'right' }}>
              <div>{result.health_score} / 100</div>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Health Score</div>
            </div>
          )}
        </div>
        
        {/* Render ETA if present */}
        {result.time_to_crash && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, borderLeft: `4px solid ${statusColor}` }}>
            <span style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>Time Before Crash (ETA):</span> <span style={{ color: 'var(--text-muted)' }}>{result.time_to_crash}</span>
          </div>
        )}
        
        {/* Render Root Cause Analysis if present */}
        {result.reasons && result.reasons.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ color: 'var(--text-color)', marginBottom: 8, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={16} color="var(--color-warning)"/> Root Cause:</h4>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', paddingLeft: 20, margin: 0 }}>
              {result.reasons.map((r, idx) => <li key={idx} style={{ marginBottom: 4 }}>{r}</li>)}
            </ul>
          </div>
        )}

        {result.suggestions && result.suggestions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ color: 'var(--text-color)', marginBottom: 8, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={16} color="var(--color-healthy)"/> Suggestions:</h4>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', paddingLeft: 20, margin: 0 }}>
              {result.suggestions.map((s, idx) => <li key={idx} style={{ marginBottom: 4 }}>{s}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const getBadgeClass = (status) => {
    if (!status) return 'badge-safe';
    if (status.includes("Critical")) return 'badge-critical';
    if (status.includes("Warning")) return 'badge-warning';
    return 'badge-safe';
  };

  const renderLogsTable = (logData) => (
    <div style={{ overflowX: 'auto' }}>
      <table className="log-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>CPU (%)</th>
            <th>RAM (%)</th>
            <th>Disk (%)</th>
            <th>Temp (°C)</th>
            <th>Latency (ms)</th>
            <th>API Res (ms)</th>
            <th>Errors (%)</th>
            <th>Connections</th>
            <th>Health Score</th>
            <th>ETA</th>
            <th>Predicted Status</th>
          </tr>
        </thead>
        <tbody>
          {logData.length === 0 ? (
            <tr><td colSpan="12" style={{ textAlign: 'center', padding: '24px' }}>No logs available</td></tr>
          ) : logData.map((log, i) => (
            <tr key={i}>
              <td className="mono">{new Date(log.timestamp).toLocaleString()}</td>
              <td className="mono">{log.cpu_usage !== undefined ? log.cpu_usage.toFixed(1) : '-'}</td>
              <td className="mono">{log.ram_usage !== undefined ? log.ram_usage.toFixed(1) : '-'}</td>
              <td className="mono">{log.disk_usage !== undefined ? log.disk_usage.toFixed(1) : '-'}</td>
              <td className="mono">{log.temperature !== undefined ? log.temperature.toFixed(1) : '-'}</td>
              <td className="mono">{log.network_latency !== undefined ? log.network_latency.toFixed(1) : '-'}</td>
              <td className="mono">{log.api_response_time !== undefined ? log.api_response_time.toFixed(1) : '-'}</td>
              <td className="mono">{log.error_rate !== undefined ? log.error_rate.toFixed(1) : '-'}</td>
              <td className="mono">{log.active_connections !== undefined ? log.active_connections : '-'}</td>
              <td className="mono" style={{ fontWeight: 'bold', color: log.health_score <= 59 ? 'var(--color-critical)' : (log.health_score <= 79 ? 'var(--color-warning)' : 'var(--color-healthy)') }}>
                {log.health_score !== undefined ? `${log.health_score}/100` : '-'}
              </td>
              <td className="mono" style={{ fontSize: '0.85rem' }}>{log.time_to_crash || '-'}</td>
              <td>
                <span className={`badge ${getBadgeClass(log.status)}`}>
                  {log.status.split(' - ')[0]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      
      {/* Left Sidebar Navigation */}
      {isSidebarOpen && activeTab !== 'home' && (
      <div className="sidebar">
        <div className="sidebar-brand" onClick={() => setIsSidebarOpen(false)} style={{ cursor: 'pointer' }} title="Click to collapse sidebar">
          <Server size={28} />
          <span>Health Analyzer</span>
        </div>
        
        <div className="sidebar-nav">
          <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
            <Home size={18} />
            <span>Home</span>
          </div>
          
          {/* Prediction Flow: Show Overview and Diagnostics */}
          {(activeTab === 'overview' || activeTab === 'diagnostics') && (
            <>
              <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                <Activity size={18} />
                <span>Overview Dashboard</span>
              </div>
              <div className={`nav-item ${activeTab === 'diagnostics' ? 'active' : ''}`} onClick={() => setActiveTab('diagnostics')}>
                <AlertTriangle size={18} />
                <span>AI Diagnostics</span>
              </div>
            </>
          )}

          {/* Logs Flow: Show only Access Logs */}
          {activeTab === 'logs' && (
            <div className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
              <Users size={18} />
              <span>Access Logs</span>
            </div>
          )}
        </div>
        
        <div style={{ marginTop: 'auto', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 12 }}>
            Logged in as <strong style={{color: 'white'}}>Admin</strong>
          </p>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%' }}>
            <LogOut size={18} />
            Logout
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="main-content" style={activeTab === 'home' ? {
        backgroundImage: 'url(/home-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      } : {}}>
        
        {activeTab !== 'home' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="btn-secondary" style={{ padding: '8px', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer' }} title="Expand Sidebar">
                <Menu size={24} />
              </button>
            )}
            <div>
              <h1 className="header-icon" style={{ fontSize: '2.5rem', margin: 0 }}>
                {activeTab === 'overview' && "System Overview"}
                {activeTab === 'diagnostics' && "AI Diagnostics"}
                {activeTab === 'logs' && "Access Logs"}
              </h1>
              <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
                {activeTab === 'overview' && `Adjust server telemetry parameters for simulation | Last check: ${logs.length > 0 ? new Date(logs[0].timestamp).toLocaleTimeString() : 'Never'}`}
                {activeTab === 'diagnostics' && `Real-time AI health predictions and metrics | Last check: ${logs.length > 0 ? new Date(logs[0].timestamp).toLocaleTimeString() : 'Never'}`}
                {activeTab === 'logs' && "Historical diagnostic logs and alerts"}
              </p>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'home' && (
        <div style={{ paddingBottom: 60, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

          {/* Welcome Box */}
          <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: 800, margin: '60px auto 40px auto', background: 'rgba(242,242,242,0.95)', border: '2px solid #000', boxShadow: '8px 8px 0px rgba(0,0,0,1)' }}>
            <Server size={64} style={{ marginBottom: 24, color: 'var(--primary-accent)' }} />
            <h1 style={{ fontSize: '3.5rem', margin: '0 0 16px 0', color: 'var(--text-main)' }}>Welcome to SSCP</h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: 48 }}>Smart Server Control Panel - Select an option to continue</p>
            
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setActiveTab('overview')} className="btn" style={{ maxWidth: 300, padding: '16px', fontSize: '1.1rem' }}>
                <Zap size={24} /> Check New Prediction
              </button>
              <button onClick={() => setActiveTab('logs')} className="btn btn-secondary" style={{ maxWidth: 300, padding: '16px', fontSize: '1.1rem', background: '#fff' }}>
                <Users size={24} /> View Old Record
              </button>
            </div>
          </div>

          {/* How to Use Section (No Box) */}
          <div style={{ maxWidth: 800, margin: '0 auto 40px auto', flex: 1, color: '#fff', textShadow: '2px 2px 8px rgba(0,0,0,0.9), 0px 0px 4px rgba(0,0,0,1)' }}>
            <h2 style={{ marginBottom: 24, textAlign: 'center', fontSize: '2rem', letterSpacing: '2px' }}>HOW TO USE</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ paddingLeft: 20, borderLeft: '4px solid #fff', fontSize: '1.1rem', fontWeight: 500 }}>
                <strong>Step 1:</strong> Go to the Overview Dashboard and adjust the server telemetry inputs to simulate conditions.
              </div>
              <div style={{ paddingLeft: 20, borderLeft: '4px solid #fff', fontSize: '1.1rem', fontWeight: 500 }}>
                <strong>Step 2:</strong> Click the "Run Diagnostics" button to send the data to our AI model.
              </div>
              <div style={{ paddingLeft: 20, borderLeft: '4px solid #fff', fontSize: '1.1rem', fontWeight: 500 }}>
                <strong>Step 3:</strong> Review the AI's prediction, ETA to crash, and suggested actions in the AI Diagnostics tab.
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer style={{ textAlign: 'center', padding: '24px', color: '#fff', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', marginTop: 'auto', borderRadius: '8px', border: '1px solid #333' }}>
            <p style={{ margin: 0, fontWeight: 500 }}>&copy; 2026 Smart Server Health Analyzer. All rights reserved.</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', opacity: 0.7 }}>Version 2.0.0 | Built with React & Django ML</p>
          </footer>
        </div>
        )}

        {activeTab === 'overview' && (
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'minmax(350px, 700px)', justifyContent: 'center' }}>
        
        {/* Left Column: Controls */}
        <div className="glass-panel">
          <div className="header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Server size={28} className="header-icon" />
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Cloud Control</h2>
            </div>
            <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
          
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
            Adjust server telemetry to predict stability using the ML model.
          </p>
          
          <div className="input-group">
            <label className="input-label"><Cpu size={14} style={{display:'inline', marginRight:6}}/> CPU Usage (%)</label>
            <input type="range" className="range-slider" name="cpu_usage" min="0" max="100" value={metrics.cpu_usage} onChange={handleChange} />
            <input type="number" className="number-input" name="cpu_usage" value={metrics.cpu_usage} onChange={handleChange} />
          </div>
          
          <div className="input-group">
            <label className="input-label"><HardDrive size={14} style={{display:'inline', marginRight:6}}/> RAM Usage (%)</label>
            <input type="range" className="range-slider" name="ram_usage" min="0" max="100" value={metrics.ram_usage} onChange={handleChange} />
            <input type="number" className="number-input" name="ram_usage" value={metrics.ram_usage} onChange={handleChange} />
          </div>
          
          <div className="input-group">
            <label className="input-label"><Thermometer size={14} style={{display:'inline', marginRight:6}}/> Temperature (°C)</label>
            <input type="range" className="range-slider" name="temperature" min="20" max="120" value={metrics.temperature} onChange={handleChange} />
            <input type="number" className="number-input" name="temperature" value={metrics.temperature} onChange={handleChange} />
          </div>
          
          <div className="input-group">
            <label className="input-label"><HardDrive size={14} style={{display:'inline', marginRight:6}}/> Disk Usage (%)</label>
            <input type="range" className="range-slider" name="disk_usage" min="0" max="100" value={metrics.disk_usage} onChange={handleChange} />
            <input type="number" className="number-input" name="disk_usage" value={metrics.disk_usage} onChange={handleChange} />
          </div>

          <div className="input-group">
            <label className="input-label"><Activity size={14} style={{display:'inline', marginRight:6}}/> Network Latency (ms)</label>
            <input type="range" className="range-slider" name="network_latency" min="0" max="1000" value={metrics.network_latency} onChange={handleChange} />
            <input type="number" className="number-input" name="network_latency" value={metrics.network_latency} onChange={handleChange} />
          </div>

          <div className="input-group">
            <label className="input-label"><Activity size={14} style={{display:'inline', marginRight:6}}/> API Response Time (ms)</label>
            <input type="range" className="range-slider" name="api_response_time" min="0" max="3000" step="50" value={metrics.api_response_time} onChange={handleChange} />
            <input type="number" className="number-input" name="api_response_time" value={metrics.api_response_time} onChange={handleChange} />
          </div>

          <div className="input-group">
            <label className="input-label"><AlertTriangle size={14} style={{display:'inline', marginRight:6}}/> Error Rate (%)</label>
            <input type="range" className="range-slider" name="error_rate" min="0" max="20" step="0.5" value={metrics.error_rate} onChange={handleChange} />
            <input type="number" className="number-input" name="error_rate" value={metrics.error_rate} onChange={handleChange} />
          </div>
          
          <div className="input-group">
            <label className="input-label"><Users size={14} style={{display:'inline', marginRight:6}}/> Active Connections</label>
            <input type="range" className="range-slider" name="active_connections" min="0" max="100000" step="500" value={metrics.active_connections} onChange={handleChange} />
            <input type="number" className="number-input" name="active_connections" value={metrics.active_connections} onChange={handleChange} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button className="btn btn-secondary" onClick={() => handleSimulate('normal')} style={{flex: 1, fontSize:'0.8rem', padding:'8px'}}>Normal</button>
            <button className="btn btn-secondary" onClick={() => handleSimulate('heavy')} style={{flex: 1, fontSize:'0.8rem', padding:'8px'}}>Heavy</button>
            <button className="btn btn-secondary" onClick={() => handleSimulate('critical')} style={{flex: 1, fontSize:'0.8rem', padding:'8px'}}>Critical</button>
          </div>
          
          <button className="btn" onClick={handleAnalyze} disabled={loading}>
            {loading ? <RefreshCw className="animate-pulse" /> : <Activity />}
            {loading ? 'Analyzing...' : 'Run Diagnostics'}
          </button>
        </div>
        </div>
        )}

        {activeTab === 'diagnostics' && (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
        {/* Right Column: Visualization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {!result && (
            <div className="glass-panel" style={{textAlign: 'center', padding: '60px 20px', maxWidth: 800, margin: '0 auto'}}>
              <AlertTriangle size={48} color="var(--color-warning)" style={{marginBottom: 16, opacity: 0.8}} />
              <h2 style={{color: 'var(--text-main)', marginBottom: 12}}>No Diagnostics Run</h2>
              <p style={{color: 'var(--text-muted)', marginBottom: 24}}>Please run a diagnostic scan from the Overview Dashboard to see AI predictions.</p>
              <button onClick={() => setActiveTab('overview')} className="btn" style={{maxWidth: 200, margin: '0 auto'}}>Go to Overview</button>
            </div>
          )}
          
          {/* Status Result */}
          <div className="glass-panel" style={{ padding: '32px 24px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.9rem' }}>AI Prediction Status</h3>
            {result ? getStatusComponent() : (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Server size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                <p>Run diagnostics to generate ML prediction.</p>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="glass-panel" style={{ flex: 1, minHeight: 350 }}>
            <h3 style={{ margin: '0 0 24px 0', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.9rem' }}>Telemetry History</h3>
            {chartData.length > 0 ? (
              <>
              {/* Unified Master Telemetry Chart */}
              <div className="card">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={18} /> Unified Master Telemetry Chart</h3>
                <div style={{ width: '100%', height: 450, marginTop: 16 }}>
                  <ResponsiveContainer>
                    <ComposedChart data={chartData}>
                      <defs>
                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3182ce" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3182ce" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#805ad5" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#805ad5" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorConn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4299e1" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#4299e1" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="time" stroke="rgba(255,255,255,0.5)" />
                      
                      {/* Left Axis: 0-100 values */}
                      <YAxis yAxisId="left" stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
                      
                      {/* Right Axis: Large numbers */}
                      <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.5)" />
                      
                      <Tooltip contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3748', borderRadius: 8 }} />
                      <Legend />
                      
                      {/* Large Values (Right Axis) */}
                      <Area yAxisId="right" type="monotone" dataKey="Connections" name="Connections" stroke="#4299e1" fill="url(#colorConn)" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="API_Res" name="API Res (ms)" stroke="#d69e2e" strokeWidth={3} dot={{r: 2}} />
                      
                      {/* Percentage Values (Left Axis) */}
                      <Area yAxisId="left" type="monotone" dataKey="CPU" name="CPU (%)" stroke="#3182ce" fill="url(#colorCpu)" />
                      <Area yAxisId="left" type="monotone" dataKey="RAM" name="RAM (%)" stroke="#805ad5" fill="url(#colorRam)" />
                      <Line yAxisId="left" type="monotone" dataKey="Disk" name="Disk (%)" stroke="#38a169" strokeWidth={2} dot={{r: 2}} />
                      <Line yAxisId="left" type="monotone" dataKey="Temp" name="Temp (°C)" stroke="#e53e3e" strokeWidth={2} dot={{r: 2}} />
                      <Line yAxisId="left" type="monotone" dataKey="Errors" name="Error Rate (%)" stroke="#f56565" strokeWidth={2} strokeDasharray="5 5" dot={{r: 2}} />
                      
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
              </>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 100 }}>No history recorded yet.</p>
            )}
          </div>
          
          {/* Latest Logs under Graph */}
          <div className="glass-panel">
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.9rem' }}>Current Run Details</h3>
            {renderLogsTable(logs.slice(0, 1))}
          </div>

        </div>
        </div>
        )}
      
      {/* Logs Table spanning full width at bottom */}
      {activeTab === 'logs' && (
      <div className="dashboard-grid" style={{ paddingTop: 0 }}>
        <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.9rem' }}>Recent Diagnostics Logs</h3>
          </div>
          
          {renderLogsTable(logs)}
        </div>
      </div>
      )}
      
      </div>
    </div>
  );
}

export default App;

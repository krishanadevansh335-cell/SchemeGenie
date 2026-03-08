import { Bell, Moon, Save, Settings, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import './AdminDashboard.css';

const AdminSettingsPage = () => {
    return (
        <div className="admin-dashboard-premium">
            <div className="container">
                <div className="page-header">
                    <div>
                        <h1>⚙️ System Settings</h1>
                        <p>Manage system configurations and preferences</p>
                    </div>
                    <div className="header-actions">
                        <Link to="/admin/dashboard" className="btn-refresh">
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>

                <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

                    {/* General Settings */}
                    <div className="chart-card">
                        <h3><Settings size={20} /> General Settings</h3>
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>System Name</label>
                            <input type="text" defaultValue="SchemeSeva Admin" style={{ width: '100%', padding: '10px', background: '#2d2d2d', border: '1px solid #444', borderRadius: '6px', color: '#fff' }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Support Email</label>
                            <input type="email" defaultValue="support@schemeseva.gov.in" style={{ width: '100%', padding: '10px', background: '#2d2d2d', border: '1px solid #444', borderRadius: '6px', color: '#fff' }} />
                        </div>
                        <button className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                            <Save size={16} /> Save Changes
                        </button>
                    </div>

                    {/* Security Settings */}
                    <div className="chart-card">
                        <h3><Shield size={20} /> Security</h3>
                        <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #333' }}>
                            <div>
                                <strong style={{ display: 'block', color: '#e0e0e0' }}>Two-Factor Auth</strong>
                                <span style={{ fontSize: '0.8rem', color: '#888' }}>Require 2FA for admins</span>
                            </div>
                            <label className="switch">
                                <input type="checkbox" defaultChecked />
                                <span className="slider round"></span>
                            </label>
                        </div>
                        <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #333' }}>
                            <div>
                                <strong style={{ display: 'block', color: '#e0e0e0' }}>Session Timeout</strong>
                                <span style={{ fontSize: '0.8rem', color: '#888' }}>Auto-logout after 30 mins</span>
                            </div>
                            <label className="switch">
                                <input type="checkbox" defaultChecked />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="chart-card">
                        <h3><Bell size={20} /> Notifications</h3>
                        <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #333' }}>
                            <div>
                                <strong style={{ display: 'block', color: '#e0e0e0' }}>Email Alerts</strong>
                                <span style={{ fontSize: '0.8rem', color: '#888' }}>New application alerts</span>
                            </div>
                            <label className="switch">
                                <input type="checkbox" defaultChecked />
                                <span className="slider round"></span>
                            </label>
                        </div>
                        <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #333' }}>
                            <div>
                                <strong style={{ display: 'block', color: '#e0e0e0' }}>System Updates</strong>
                                <span style={{ fontSize: '0.8rem', color: '#888' }}>Notify on system updates</span>
                            </div>
                            <label className="switch">
                                <input type="checkbox" />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    </div>

                    {/* Appearance */}
                    <div className="chart-card">
                        <h3><Moon size={20} /> Appearance</h3>
                        <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                            <div>
                                <strong style={{ display: 'block', color: '#e0e0e0' }}>Dark Mode</strong>
                                <span style={{ fontSize: '0.8rem', color: '#888' }}>Enable dark theme</span>
                            </div>
                            <label className="switch">
                                <input type="checkbox" defaultChecked disabled />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminSettingsPage;

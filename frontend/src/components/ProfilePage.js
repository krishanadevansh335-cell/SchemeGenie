import axios from 'axios';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import './ProfilePage.css';

const ProfilePage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        age: '',
        gender: '',
        state: '',
        income: '',
        caste: '',
        education: '',
        employmentStatus: '',
        disabilityStatus: false
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5002/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Merge response data with default state to handle missing fields
            setFormData(prev => ({
                ...prev,
                ...response.data
            }));
        } catch (error) {
            console.error('Error fetching profile:', error);
            setMessage({ type: 'error', text: 'Failed to load profile data.' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5002/profile', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage({ type: 'success', text: 'Profile updated successfully!' });

            // Clear success message after 3 seconds
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loader"></div>
                <p>Loading profile...</p>
            </div>
        );
    }

    return (
        <motion.div
            className="profile-page-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="profile-header">
                <h1>My Profile</h1>
                <p>Update your information to get better scheme recommendations</p>
            </div>

            {message.text && (
                <div className={`status-message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="profile-form">
                {/* Basic Info */}
                <div className="form-group">
                    <label>Full Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        disabled
                        title="Email cannot be changed"
                    />
                </div>

                <div className="form-group">
                    <label>Phone Number</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone || ''}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                    />
                </div>

                <div className="form-group">
                    <label>Age</label>
                    <input
                        type="number"
                        name="age"
                        value={formData.age || ''}
                        onChange={handleChange}
                        placeholder="Enter your age"
                        min="0"
                        max="120"
                    />
                </div>

                <div className="form-group">
                    <label>Gender</label>
                    <select name="gender" value={formData.gender || ''} onChange={handleChange}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>State</label>
                    <input
                        type="text"
                        name="state"
                        value={formData.state || ''}
                        onChange={handleChange}
                        placeholder="e.g. Maharashtra"
                    />
                </div>

                <div className="form-group">
                    <label>Annual Income (₹)</label>
                    <input
                        type="number"
                        name="income"
                        value={formData.income || ''}
                        onChange={handleChange}
                        placeholder="e.g. 250000"
                    />
                </div>

                <div className="form-group">
                    <label>Category / Caste</label>
                    <select name="caste" value={formData.caste || ''} onChange={handleChange}>
                        <option value="">Select Category</option>
                        <option value="General">General</option>
                        <option value="OBC">OBC</option>
                        <option value="SC">SC</option>
                        <option value="ST">ST</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Education Level</label>
                    <select name="education" value={formData.education || ''} onChange={handleChange}>
                        <option value="">Select Education</option>
                        <option value="Below 10th">Below 10th</option>
                        <option value="10th Pass">10th Pass</option>
                        <option value="12th Pass">12th Pass</option>
                        <option value="Graduate">Graduate</option>
                        <option value="Post Graduate">Post Graduate</option>
                        <option value="PhD">PhD</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Employment Status</label>
                    <select name="employmentStatus" value={formData.employmentStatus || ''} onChange={handleChange}>
                        <option value="">Select Status</option>
                        <option value="Unemployed">Unemployed</option>
                        <option value="Student">Student</option>
                        <option value="Employed">Employed</option>
                        <option value="Self-employed">Self-employed</option>
                        <option value="Retired">Retired</option>
                    </select>
                </div>

                <div className="form-group full-width checkbox-group">
                    <input
                        type="checkbox"
                        name="disabilityStatus"
                        checked={formData.disabilityStatus || false}
                        onChange={handleChange}
                        id="disabilityStatus"
                    />
                    <label htmlFor="disabilityStatus">I have a disability</label>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn-save" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default ProfilePage;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { completeOnboarding } from '@/lib/api';

export default function Onboarding() {
    const { login, token } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        age: '',
        gender: '',
        height_cm: '',
        weight_kg: '',
        activity_level: 'Moderate',
        fitness_goal: 'Weight Loss',
        target_weight: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = {
                ...formData,
                age: parseInt(formData.age),
                height_cm: parseFloat(formData.height_cm),
                weight_kg: parseFloat(formData.weight_kg),
                target_weight: formData.target_weight ? parseFloat(formData.target_weight) : undefined
            };

            const res = await completeOnboarding(data);
            if (res.data.success && token) {
                login(res.data.data, token);
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0B0F] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-extrabold text-[#E6EDF3]">Welcome to HealthyFi</h2>
                    <p className="mt-2 text-sm text-[#8B949E]">Let's personalize your experience</p>
                </div>

                <div className="glass-card p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && <div className="p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded shadow-sm">{error}</div>}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="performance-header mb-1 block">Age</label>
                                <input
                                    type="number"
                                    name="age"
                                    required
                                    value={formData.age}
                                    onChange={handleChange}
                                    className="glass-input w-full"
                                    placeholder="25"
                                />
                            </div>
                            <div>
                                <label className="performance-header mb-1 block">Gender</label>
                                <select
                                    name="gender"
                                    required
                                    value={formData.gender}
                                    onChange={handleChange}
                                    className="glass-input w-full"
                                >
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="performance-header mb-1 block">Height (cm)</label>
                                <input
                                    type="number"
                                    name="height_cm"
                                    required
                                    step="0.1"
                                    value={formData.height_cm}
                                    onChange={handleChange}
                                    className="glass-input w-full"
                                    placeholder="175"
                                />
                            </div>
                            <div>
                                <label className="performance-header mb-1 block">Weight (kg)</label>
                                <input
                                    type="number"
                                    name="weight_kg"
                                    required
                                    step="0.1"
                                    value={formData.weight_kg}
                                    onChange={handleChange}
                                    className="glass-input w-full"
                                    placeholder="70"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="performance-header mb-1 block">Activity Level</label>
                            <select
                                name="activity_level"
                                required
                                value={formData.activity_level}
                                onChange={handleChange}
                                className="glass-input w-full"
                            >
                                <option value="Sedentary">Sedentary (Little/no exercise)</option>
                                <option value="Light">Light (1-3 days/week)</option>
                                <option value="Moderate">Moderate (3-5 days/week)</option>
                                <option value="Active">Active (6-7 days/week)</option>
                                <option value="Very Active">Very Active (Heavy training)</option>
                            </select>
                        </div>

                        <div>
                            <label className="performance-header mb-1 block">Fitness Goal</label>
                            <select
                                name="fitness_goal"
                                required
                                value={formData.fitness_goal}
                                onChange={handleChange}
                                className="glass-input w-full"
                            >
                                <option value="Weight Loss">Weight Loss</option>
                                <option value="Muscle Gain">Muscle Gain</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Endurance">Endurance</option>
                            </select>
                        </div>

                        <div>
                            <label className="performance-header mb-1 block">Target Weight (kg, optional)</label>
                            <input
                                type="number"
                                name="target_weight"
                                step="0.1"
                                value={formData.target_weight}
                                onChange={handleChange}
                                className="glass-input w-full"
                                placeholder="65"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="glass-button-primary w-full py-3 mt-4"
                        >
                            {loading ? 'Saving Profile...' : 'Complete Onboarding'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

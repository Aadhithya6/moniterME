/**
 * API client for HealthyFi backend
 */
import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('healthyfi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: string }>) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('healthyfi_token');
      localStorage.removeItem('healthyfi_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const register = (data: { name: string; email: string; password: string }) =>
  api.post('/auth/register', data);

export const login = (data: { email: string; password: string }) =>
  api.post('/auth/login', data);

export const logFood = (data: { food_text: string; date?: string }) =>
  api.post('/food', data);

export const getFoodLogs = (date?: string) =>
  api.get('/food', { params: date ? { date } : {} });

export const logWater = (data: { amount_ml: number; date?: string }) =>
  api.post('/water', data);

export const getTodayWater = () => api.get('/water/today');

export const createWorkoutSession = (date?: string) =>
  api.post('/workout/session', date ? { date } : {});

export const addExercise = (data: {
  session_id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight?: number;
}) => api.post('/workout/exercise', data);

export const getWorkoutHistory = (limit?: number) =>
  api.get('/workout/history', { params: limit ? { limit } : {} });

export const upsertGoals = (data: {
  calorie_goal?: number;
  protein_goal?: number;
  water_goal?: number;
  target_weight?: number;
}) => api.post('/goals', data);

export const getGoals = () => api.get('/goals');

export const getTodayDashboard = () => api.get('/dashboard/today');

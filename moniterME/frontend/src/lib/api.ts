/**
 * API client for HealthyFi backend
 */
import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

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

// Workout V2
export const searchExercises = (params: {
  q?: string;
  type?: string;
  bodyPart?: string;
  equipment?: string;
  level?: string;
  page?: number;
  limit?: number;
} = {}) => api.get('/workout/exercises', { params });

export const createWorkout = (data: { name?: string; date?: string }) =>
  api.post('/workout/sessions', data);

export const getWorkout = (id: string) => api.get(`/workout/sessions/${id}`);

export const addExerciseToWorkout = (data: {
  workout_id: string;
  exercise_id: string;
  order_index: number;
  notes?: string;
  sets: { set_number: number; weight: number; reps: number; rest_seconds?: number }[];
}) => api.post('/workout/exercises', data);

export const getWorkoutHistory = (limit?: number) =>
  api.get('/workout/history', { params: limit ? { limit } : {} });

export const getWorkoutStats = () => api.get('/workout/stats');

export const upsertGoals = (data: {
  calorie_goal?: number;
  protein_goal?: number;
  water_goal?: number;
  target_weight?: number;
}) => api.post('/goals', data);

export const getGoals = () => api.get('/goals');

export const getTodayDashboard = () => api.get('/dashboard/today');

export const completeOnboarding = (data: any) =>
  api.post('/user/onboarding', data);

export const completeWorkoutSession = (id: string) =>
  api.post(`/workout/sessions/${id}/complete`);

export const retryWorkoutCalories = (id: string) =>
  api.post(`/workout/sessions/${id}/retry-calories`);

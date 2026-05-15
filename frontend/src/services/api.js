import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  googleLogin: (payload) => api.post('/auth/google', payload),
  verifyOtp: (payload) => api.post('/auth/verify-otp', payload),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
};

export const eventService = {
  getAll: (page = 0, size = 10) => api.get(`/events?page=${page}&size=${size}`),
  getById: (id) => api.get(`/events/${id}`),
  create: (eventData) => api.post('/events', eventData),
  update: (id, eventData) => api.patch(`/events/${id}`, eventData),
  delete: (id) => api.delete(`/events/${id}`),
  getRecommendations: (id) => api.get(`/events/${id}/recommendations`),
};

export const reviewService = {
  getEventReviews: (eventId) => api.get(`/events/${eventId}/reviews`),
  addReview: (eventId, reviewData) => api.post(`/events/${eventId}/reviews`, reviewData),
};

export const bookingService = {
  book: (bookingData) => api.post('/bookings', bookingData),
  getMyBookings: (page = 0, size = 10) => api.get(`/bookings?page=${page}&size=${size}`),
  getBookedSeats: (eventId) => api.get(`/bookings/event/${eventId}/seats`),
  getStatus: (id) => api.get(`/bookings/status/${id}`),
  downloadTicket: (id) => api.get(`/bookings/${id}/ticket`, { responseType: 'blob' }),
  getRevenue: () => api.get('/admin/analytics/revenue'),
};

export const seatLockService = {
  lock: (eventId, seatId) => api.post(`/seats/${eventId}/lock`, { seatId }),
  unlock: (eventId, seatId) => api.post(`/seats/${eventId}/unlock`, { seatId }),
  unlockMultiple: (eventId, seatIds) => api.post(`/seats/${eventId}/unlock-multiple`, { seatIds }),
  getLocked: (eventId) => api.get(`/seats/${eventId}/locked`),
  getMyLocks: (eventId) => api.get(`/seats/${eventId}/my-locks`),
};

export default api;

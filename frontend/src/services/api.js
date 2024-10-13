// src/services/api.js
import axios from 'axios';

const API_URL = 'http://localhost:8000'; // Replace with your API URL

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const login = async (email, password) => {
  try {
    const response = await api.post('/login', { email, password });
    return { data: response.data, status: response.status };
  } catch (error) {
    if (error.response && error.response.status === 403) {
      return { status: 403, message: error.response.data.detail };
    }
    throw error.response ? error.response.data : error;
  }
};

export const register = async (email, password) => {
  try {
    const response = await api.post('/register', { email, password });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

export const forgotPassword = async (email) => {
  try {
    const response = await api.post('/forgot-password', { email });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

export const getCurrentUser = async (token) => {
  try {
    const response = await api.get('/user-data', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

export const verifyEmail = async (email, code) => {
  try {
    const response = await api.post('/verify-email', { email, code });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

export const resendVerification = async (email) => {
  try {
    const response = await api.post('/resend-verification', { email });
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

export const checkVerification = async (email) => {
  try {
    const response = await api.get(`/check-verification/${email}`);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};
/**
 * Authentication service - handles user registration and login
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const config = require('../config');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 10;

/**
 * Register a new user
 */
async function register(name, email, password) {
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existingUser.rows.length > 0) {
    throw new AppError('Email already registered', 400);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash) 
     VALUES ($1, $2, $3) 
     RETURNING id, name, email, onboarding_completed, created_at`,
    [name, email.toLowerCase(), passwordHash]
  );

  const user = result.rows[0];
  const token = jwt.sign(
    { userId: user.id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      onboardingCompleted: user.onboarding_completed,
      createdAt: user.created_at,
    },
    token,
  };
}

/**
 * Login user
 */
async function login(email, password) {
  const result = await pool.query(
    'SELECT id, name, email, password_hash, onboarding_completed FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid email or password', 401);
  }

  const user = result.rows[0];
  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = jwt.sign(
    { userId: user.id },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      onboardingCompleted: user.onboarding_completed,
    },
    token,
  };
}

module.exports = {
  register,
  login,
};

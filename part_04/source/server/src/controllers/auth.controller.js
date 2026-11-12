import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { config } from '../config/env.js';
import { isEmail, isNonEmptyString } from '../utils/validation.js';

const PUBLIC_ROLES = ['STUDENT', 'FACULTY'];
const MIN_PASSWORD_LENGTH = 8;
// Compared against when the email does not exist so both failure paths cost
// roughly the same amount of time.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('not-a-real-password', 10);

const SAFE_USER_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  rollNumber: true,
  avatarUrl: true,
  createdAt: true,
};

function issueToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

/**
 * Register a student or faculty member.
 * Admin accounts can only be created when ADMIN_SIGNUP_ENABLED=true, so a
 * public registration form can never grant institution-wide privileges.
 */
export async function register(req, res, next) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const requestedRole = typeof req.body.role === 'string' ? req.body.role.toUpperCase() : 'STUDENT';
    const department = isNonEmptyString(req.body.department, 100)
      ? req.body.department.trim()
      : null;
    let rollNumber = isNonEmptyString(req.body.rollNumber, 40)
      ? req.body.rollNumber.trim().toUpperCase()
      : null;

    if (!isNonEmptyString(name, 120)) {
      return res.status(400).json({ success: false, message: 'A valid full name is required' });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required' });
    }
    if (password.length < MIN_PASSWORD_LENGTH || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: `Password must be between ${MIN_PASSWORD_LENGTH} and 128 characters`,
      });
    }

    let role = 'STUDENT';
    if (requestedRole === 'ADMIN') {
      if (!config.adminSignupEnabled) {
        return res.status(403).json({
          success: false,
          message: 'Admin accounts cannot be self-registered. Contact your institution administrator.',
        });
      }
      role = 'ADMIN';
      rollNumber = null;
    } else if (PUBLIC_ROLES.includes(requestedRole)) {
      role = requestedRole;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid account role' });
    }

    if (role !== 'STUDENT') rollNumber = null;

    const [existingUser, existingRoll] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      rollNumber
        ? prisma.user.findUnique({ where: { rollNumber }, select: { id: true } })
        : Promise.resolve(null),
    ]);

    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' });
    }
    if (existingRoll) {
      return res.status(409).json({ success: false, message: 'Roll number is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        department,
        rollNumber,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      },
      select: SAFE_USER_FIELDS,
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token: issueToken(user),
      user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Sign in with email and password.
 */
export async function login(req, res, next) {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!isEmail(email) || password.length === 0) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always compare against a hash to keep the response timing consistent.
    const isMatch = await bcrypt.compare(password, user?.passwordHash || DUMMY_PASSWORD_HASH);

    if (!user || !isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    return res.json({
      success: true,
      message: 'Login successful',
      token: issueToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        rollNumber: user.rollNumber,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Return the authenticated user's current profile.
 */
export async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: SAFE_USER_FIELDS,
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Account no longer exists' });
    }

    return res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

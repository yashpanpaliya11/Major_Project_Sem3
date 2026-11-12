import { Router } from 'express';
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollStudent,
  getAllStudents,
  getAllFaculty,
} from '../controllers/course.controller.js';
import authenticate from '../middleware/auth.js';
import authorize from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);

// List courses (all authenticated users)
router.get('/', getCourses);
router.get('/students', authorize('ADMIN', 'FACULTY'), getAllStudents);
router.get('/faculty', authorize('ADMIN'), getAllFaculty);
router.get('/:id', getCourseById);

// Admin-only course management
router.post('/', authorize('ADMIN'), createCourse);
router.put('/:id', authorize('ADMIN'), updateCourse);
router.delete('/:id', authorize('ADMIN'), deleteCourse);
router.post('/enroll', authorize('ADMIN', 'FACULTY'), enrollStudent);

export default router;


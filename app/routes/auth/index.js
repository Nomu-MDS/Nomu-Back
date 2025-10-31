import express from 'express';
import auth from './auth.js';

const router = express.Router();

// Utiliser directement les routes définies dans auth.js
router.use('/', auth);

export default router;
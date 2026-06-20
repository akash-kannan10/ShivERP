import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 5000;
export const JWT_SECRET = process.env.JWT_SECRET || 'shiverp_secret_key_987654321_deepmind';
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

export const prisma = new PrismaClient();

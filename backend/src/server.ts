import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PORT } from './config';

// Import routers
import authRouter from './routes/auth';
import productsRouter from './routes/products';
import vendorsRouter from './routes/vendors';
import customersRouter from './routes/customers';
import bomsRouter from './routes/boms';
import salesRouter from './routes/sales';
import purchasesRouter from './routes/purchases';
import manufacturingRouter from './routes/manufacturing';
import inventoryRouter from './routes/inventory';
import usersRouter from './routes/users';
import copilotRouter from './routes/copilot';
import reportsRouter from './routes/reports';

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for the hackathon demo simplicity
  credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Register API Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/boms', bomsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/manufacturing', manufacturingRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/users', usersRouter);
app.use('/api/copilot', copilotRouter);
app.use('/api/reports', reportsRouter);

// Base route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'ShivERP Core Express API Server is Active.' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` ShivERP Backend listening on port ${PORT} `);
  console.log(` REST URL: http://localhost:${PORT}      `);
  console.log(`=========================================`);
});

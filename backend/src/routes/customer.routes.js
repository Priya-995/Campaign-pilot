import express from 'express';
import { listCustomers, getCustomer, getCustomerOrders } from '../controllers/customer.controller.js';

const router = express.Router();

router.get('/', listCustomers);
router.get('/:id', getCustomer);
router.get('/:id/orders', getCustomerOrders);

export default router;

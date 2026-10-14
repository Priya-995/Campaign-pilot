import * as customerService from '../services/customer.service.js';

export async function listCustomers(req, res) {
  try {
    const result = await customerService.getCustomers(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getCustomer(req, res) {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    return res.status(200).json(customer);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getCustomerOrders(req, res) {
  try {
    const orders = await customerService.getCustomerOrders(req.params.id);
    if (orders === null) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    return res.status(200).json({ orders });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

const timestamp = Date.now();

export const getAdminUser = () => {
  return {
    email: `admin-${timestamp}@example.com`,
    password: 'TestPass123!',
    name: `Admin ${timestamp}`,
    role: 'admin',
  };
};

export const getNormalUser = () => {
  return {
    email: `user-${timestamp}@example.com`,
    password: 'User123!',
    name: `User ${timestamp}`,
    role: 'user',
  };
};

export const getUserToken = async (
  app: INestApplication<App>,
  email: string,
  password: string,
) => {
  try {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    expect(response.body.access_token).toBeDefined();
    return response.body.access_token;
  } catch (error) {
    console.error('Login failed:', error.message);
    throw error;
  }
};

const getProductTemplate = () => {
  return {
    name: `Product ${timestamp}`,
    description: `Product ${timestamp} description`,
    price: 100,
    stock: 100,
    image: `Product ${timestamp} image`,
  };
};

export const addProduct = async (app: INestApplication<App>, token: string) => {
  const product = getProductTemplate();
  const response = await request(app.getHttpServer())
    .post('/products')
    .set('Authorization', `Bearer ${token}`)
    .send(product);
  return response.body;
};

export const addToCart = async (
  app: INestApplication<App>,
  token: string,
  productId: string,
) => {
  const response = await request(app.getHttpServer())
    .post('/cart/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ productId, quantity: 3 });
  return response.body;
};

export const createOrder = async (
  app: INestApplication<App>,
  token: string,
) => {
  const response = await request(app.getHttpServer())
    .post('/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      shippingAddress: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'United States',
        additionalInfo: 'Additional info',
      },
    })
    .expect(201);
  return response.body;
};

// Additional helper functions for comprehensive testing

export const createUserAndGetToken = async (
  app: INestApplication<App>,
  userData: any,
) => {
  // Create user
  const userResponse = await request(app.getHttpServer())
    .post('/users')
    .send(userData)
    .expect(201);

  // Get token
  const token = await getUserToken(app, userData.email, userData.password);

  return { user: userResponse.body, token };
};

export const getCart = async (app: INestApplication<App>, token: string) => {
  const response = await request(app.getHttpServer())
    .get('/cart')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return response.body;
};

export const getProduct = async (
  app: INestApplication<App>,
  productId: string,
) => {
  const response = await request(app.getHttpServer())
    .get(`/products/${productId}`)
    .expect(200);
  return response.body;
};

export const clearCart = async (app: INestApplication<App>, token: string) => {
  // Get current cart
  const cart = await getCart(app, token);

  // Remove all items
  for (const item of cart.items || []) {
    await request(app.getHttpServer())
      .delete(`/cart/items/${item.productId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  }
};

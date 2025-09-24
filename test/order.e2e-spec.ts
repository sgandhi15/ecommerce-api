// E2E Order Flow Tests
// Testing the critical e-commerce workflow: Product creation → Cart management → Order processing
// Ensures data consistency across Products, Carts, and Orders modules

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { App } from 'supertest/types';
import request from 'supertest';
import {
  getAdminUser,
  getNormalUser,
  getUserToken,
  addProduct,
  addToCart,
  createOrder,
} from './helpers/auth-helper';

describe('Order E2E Flow', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  let testProduct: any;
  let adminUser: any;
  let normalUser: any;
  let createdUserIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    // Setup test users
    adminUser = getAdminUser();
    normalUser = getNormalUser();

    // Create admin user
    const adminResponse = await request(app.getHttpServer())
      .post('/users')
      .send(adminUser);
    expect(adminResponse.status).toBe(201);
    createdUserIds.push(adminResponse.body._id);

    // Create normal user
    const userResponse = await request(app.getHttpServer())
      .post('/users')
      .send(normalUser);
    expect(userResponse.status).toBe(201);
    createdUserIds.push(userResponse.body._id);

    // Get authentication tokens
    adminToken = await getUserToken(app, adminUser.email, adminUser.password);
    userToken = await getUserToken(app, normalUser.email, normalUser.password);

    // Create test product with known stock
    testProduct = await addProduct(app, adminToken);
    expect(testProduct).toBeDefined();
    expect(testProduct.stock).toBe(100); // Initial stock from helper
  });

  afterAll(async () => {
    // Cleanup created users
    for (const userId of createdUserIds) {
      try {
        await request(app.getHttpServer()).delete(`/users/${userId}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    await app.close();
  });

  describe('Happy Path - Order Creation Flow', () => {
    it('should create product, add to cart, and create order successfully', async () => {
      // Add product to cart
      const cartResponse = await addToCart(app, userToken, testProduct._id);
      expect(cartResponse).toBeDefined();

      // Create order
      const orderResponse = await createOrder(app, userToken);
      expect(orderResponse).toBeDefined();
      expect(orderResponse._id).toBeDefined();
      expect(orderResponse.status).toBe('pending');
    });

    it('should decrease product stock after order creation', async () => {
      // Get initial stock
      const initialProductResponse = await request(app.getHttpServer())
        .get(`/products/${testProduct._id}`)
        .expect(200);

      const initialStock = initialProductResponse.body.stock;

      // Add to cart (quantity: 3 from helper)
      await addToCart(app, userToken, testProduct._id);

      // Create order
      await createOrder(app, userToken);

      // Verify stock decreased
      const updatedProductResponse = await request(app.getHttpServer())
        .get(`/products/${testProduct._id}`)
        .expect(200);

      expect(updatedProductResponse.body.stock).toBe(initialStock - 3);
    });

    it('should clear user cart after order creation', async () => {
      // Add product to cart
      await addToCart(app, userToken, testProduct._id);

      // Verify cart has items
      const cartBeforeOrder = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(cartBeforeOrder.body.items).toHaveLength(1);

      // Create order
      await createOrder(app, userToken);

      // Verify cart is empty
      const cartAfterOrder = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(cartAfterOrder.body.items).toHaveLength(0);
    });

    it('should create order with correct product details and pricing', async () => {
      // Add product to cart
      await addToCart(app, userToken, testProduct._id);

      // Create order
      const order = await createOrder(app, userToken);

      expect(order.items).toHaveLength(1);
      expect(order.items[0].productId).toBe(testProduct._id);
      expect(order.items[0].quantity).toBe(3);
      expect(order.items[0].unitPrice).toBe(testProduct.price);
      expect(order.totalAmount).toBe(testProduct.price * 3);
    });
  });

  describe('Error Scenarios', () => {
    it('should reject order creation without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .send({
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            country: 'Test Country',
          },
        })
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });

    it('should reject order creation with empty cart', async () => {
      // Ensure cart is empty
      await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Try to create order with empty cart
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            country: 'Test Country',
          },
        })
        .expect(400);

      expect(response.body.message).toContain('Cart is empty');
    });

    it('should reject order if insufficient product stock', async () => {
      // Create a product with low stock
      const lowStockProduct = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Low Stock Product',
          description: 'Product with only 1 item in stock',
          price: 50,
          stock: 1,
          image: 'low-stock.jpg',
        })
        .expect(201);

      // Try to add more than available stock to cart
      const response = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: lowStockProduct.body._id,
          quantity: 5, // More than stock of 1
        })
        .expect(400);

      expect(response.body.message).toContain('Insufficient stock');
    });
  });

  describe('Authorization Tests', () => {
    it('should allow only admin to create products', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${userToken}`) // Regular user token
        .send({
          name: 'Unauthorized Product',
          description: 'This should fail',
          price: 100,
          stock: 10,
          image: 'test.jpg',
        })
        .expect(401);
    });

    it('should allow any authenticated user to create orders', async () => {
      // Add product to cart first
      await addToCart(app, userToken, testProduct._id);

      // Create order as regular user
      const order = await createOrder(app, userToken);
      expect(order).toBeDefined();
      expect(order._id).toBeDefined();
    });
  });
});

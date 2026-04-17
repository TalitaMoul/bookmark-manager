import request from 'supertest';
import app from './index.js';

describe('Health Check', () => {
  it('should return status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('Bookmarks API', () => {
  it('should create a new bookmark with valid data', async () => {
    const newBookmark = {
      title: 'Ghost Official Site',
      url: 'https://www.ghost-official.com'
    };
    
    const res = await request(app)
      .post('/bookmarks')
      .send(newBookmark);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Ghost Official Site');
  });

  it('should return 400 for invalid URL', async () => {
    const res = await request(app)
      .post('/bookmarks')
      .send({ title: 'Error', url: 'invalid-link' });

    expect(res.status).toBe(400);
  });
});
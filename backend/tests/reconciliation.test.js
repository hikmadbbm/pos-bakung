import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { mockDeep } from 'jest-mock-extended';

const prisma = mockDeep();
const app = createApp(prisma, 'test-secret');

describe('Reconciliation API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new reconciliation report if none exists', async () => {
    prisma.cashierReconciliation.findFirst.mockResolvedValue(null);
    prisma.cashierReconciliation.create.mockResolvedValue({
      id: 1,
      date: new Date('2023-10-27T00:00:00Z'),
      status: 'SUBMITTED',
      details: { CASH: { system: 100, actual: 100 } },
      total_system: 100,
      total_actual: 100,
      discrepancy: 0
    });

    const res = await request(app)
      .post('/api/analytics/reconciliation')
      .send({
        date: '2023-10-27',
        details: { CASH: { system: 100, actual: 100 } },
        notes: 'Test',
        submitted_by: 'TestUser'
      });

    expect(res.status).toBe(200);
    expect(prisma.cashierReconciliation.findFirst).toHaveBeenCalled();
    expect(prisma.cashierReconciliation.create).toHaveBeenCalled();
  });

  it('should update existing reconciliation report if one exists', async () => {
    prisma.cashierReconciliation.findFirst.mockResolvedValue({
      id: 1,
      date: new Date('2023-10-27T00:00:00Z')
    });
    prisma.cashierReconciliation.update.mockResolvedValue({
      id: 1,
      date: new Date('2023-10-27T00:00:00Z'),
      status: 'SUBMITTED',
      details: { CASH: { system: 100, actual: 120 } },
      total_system: 100,
      total_actual: 120,
      discrepancy: 20
    });

    const res = await request(app)
      .post('/api/analytics/reconciliation')
      .send({
        date: '2023-10-27',
        details: { CASH: { system: 100, actual: 120 } },
        notes: 'Test',
        submitted_by: 'TestUser'
      });

    expect(res.status).toBe(200);
    expect(prisma.cashierReconciliation.findFirst).toHaveBeenCalled();
    expect(prisma.cashierReconciliation.update).toHaveBeenCalled();
  });

  it('should handle validation errors', async () => {
    const res = await request(app)
      .post('/api/analytics/reconciliation')
      .send({
        // Missing date and details
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Date and details required");
  });

  it('should handle database errors gracefully', async () => {
    prisma.cashierReconciliation.findFirst.mockRejectedValue(new Error('DB Error'));

    const res = await request(app)
      .post('/api/analytics/reconciliation')
      .send({
        date: '2023-10-27',
        details: { CASH: { system: 100, actual: 100 } }
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Failed to submit reconciliation');
  });

  it('should handle race condition (P2002) by retrying update', async () => {
    prisma.cashierReconciliation.findFirst
      .mockResolvedValueOnce(null) // First check: not found
      .mockResolvedValueOnce({ id: 1 }); // Retry check: found

    const p2002Error = new Error('Unique constraint failed');
    p2002Error.code = 'P2002';
    prisma.cashierReconciliation.create.mockRejectedValue(p2002Error);
    
    prisma.cashierReconciliation.update.mockResolvedValue({
      id: 1,
      status: 'SUBMITTED'
    });

    const res = await request(app)
      .post('/api/analytics/reconciliation')
      .send({
        date: '2023-10-27',
        details: { CASH: { system: 100, actual: 100 } }
      });

    expect(res.status).toBe(200);
    expect(prisma.cashierReconciliation.create).toHaveBeenCalled();
    expect(prisma.cashierReconciliation.update).toHaveBeenCalled();
  });
});

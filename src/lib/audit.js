import { prisma } from './prisma';

/**
 * Log a user activity for audit purposes
 * @param {Object} params
 * @param {number} params.userId - ID of the user performing the action
 * @param {string} params.action - Action name (e.g., 'CREATE', 'UPDATE', 'DELETE')
 * @param {string} params.entity - Entity name (e.g., 'PRODUCT', 'RECIPE', 'ORDER')
 * @param {string} params.entityId - ID of the record being modified
 * @param {Object} params.details - JSON object with details of the change (before/after)
 * @param {string} params.ipAddress - IP address of the requester
 */
export async function logActivity({ userId, action, entity, entityId, details, ipAddress }) {
  try {
    await prisma.userActivityLog.create({
      data: {
        user_id: userId,
        action,
        entity,
        entity_id: entityId?.toString(),
        details: details || {},
        ip_address: ipAddress || null
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

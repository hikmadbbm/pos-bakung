/**
 * Role levels for hierarchy protection
 * OWNER > ADMIN > MANAGER > CASHIER > WAITER > KITCHEN > STAFF
 */
export const ROLE_LEVELS = {
  OWNER: 100,
  ADMIN: 80,
  MANAGER: 60,
  CASHIER: 40,
  WAITER: 30,
  KITCHEN: 20,
  STAFF: 10
};

/**
 * Permission mapping (module:action)
 */
export const PERMISSIONS = {
  OWNER: ['*'],
  ADMIN: [
    'dashboard:view',
    'orders:view', 'orders:manage',
    'kitchen:view', 'kitchen:manage',
    'products:view', 'products:manage',
    'stock:view', 'stock:manage',
    'expenses:view', 'expenses:manage',
    'reports:view',
    'promotions:view', 'promotions:manage',
    'finance:view',
    'recipes:view'
  ],
  MANAGER: [
    'dashboard:view',
    'orders:view', 'orders:manage',
    'kitchen:view', 'kitchen:manage',
    'products:view', 'products:manage',
    'stock:view', 'stock:adjust',
    'expenses:view', 'expenses:manage',
    'reports:view',
    'promotions:view', 'promotions:manage',
    'finance:view', 'finance:confirm',
    'recipes:view',
    'daily-shift:view', 'daily-shift:manage',
    'cashier-logs:view'
  ],
  CASHIER: [
    'orders:create', 'orders:view', 'orders:own',
    'daily-shift:view', 'daily-shift:manage',
    'cashier-logs:own'
  ],
  WAITER: [
    'orders:create', 'orders:view'
  ],
  KITCHEN: [
    'kitchen:view', 'kitchen:manage',
    'products:view'
  ],
  STAFF: [
    'dashboard:view-limited',
    'orders:view-only'
  ]
};

/**
 * Checks if a user has a specific permission
 * @param {object} user - User object with role
 * @param {string} permission - Permission string (module:action)
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user || !user.role) return false;
  
  const userPermissions = PERMISSIONS[user.role] || [];
  
  if (userPermissions.includes('*')) return true;
  if (userPermissions.includes(permission)) return true;
  
  // Generic module access (if permission is 'module:*')
  const [module] = permission.split(':');
  if (userPermissions.includes(`${module}:*`)) return true;
  
  return false;
}

/**
 * Checks if actor can modify target based on hierarchy
 */
export function canModifyRole(actorRole, targetRole) {
  return (ROLE_LEVELS[actorRole] || 0) > (ROLE_LEVELS[targetRole] || 0);
}

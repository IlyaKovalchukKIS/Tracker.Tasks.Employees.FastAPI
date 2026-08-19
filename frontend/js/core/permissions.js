/**
 * Role rules mirrored from the API service layer.
 *
 * These helpers decide which controls are worth showing. They are a usability
 * aid only: the server re-checks every rule, so a stale or tampered client
 * cannot gain access it should not have.
 */

const isAdmin = (user) => user?.role === 'ADMIN';
const isManager = (user) => user?.role === 'MANAGER';

export const isEmployee = (user) => user?.role === 'EMPLOYEE';

/** Administrators and managers may create work and browse the directory. */
export const canManageWork = (user) => isAdmin(user) || isManager(user);

export const canCreateTask = (user) => canManageWork(user);

/** Employees cannot edit task fields, only the status of their own work. */
export const canEditTask = (user) => canManageWork(user);

/** Administrators delete any task; managers only the ones they created. */
export const canDeleteTask = (user, task) =>
  isAdmin(user) || (isManager(user) && Boolean(task) && task.owner_id === user.id);

export const canChangeTaskStatus = (user, task) =>
  canManageWork(user) || (Boolean(task) && Boolean(user) && task.executor_id === user.id);

export const canManageUsers = (user) => isAdmin(user);

export const canViewDirectory = (user) => canManageWork(user);

/**
 * Translations, locale persistence, and locale-aware formatting.
 *
 * Every user-facing string lives here so the UI can switch between English and
 * Russian on any page without a reload.
 */

const STORAGE_KEY = 'tracker.locale';
const DEFAULT_LOCALE = 'en';

export const LOCALES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ru', label: 'RU', name: 'Русский' },
];

const dictionaries = {
  en: {
    'app.name': 'Task Tracker',
    'app.tagline': 'Assign, track, and update team work',

    'nav.primary': 'Main navigation',
    'nav.tasks': 'Tasks',
    'nav.employees': 'Employees',
    'nav.users': 'Users',
    'nav.profile': 'Profile',
    'nav.toggle': 'Toggle navigation',
    'nav.apiDocs': 'API docs',

    'a11y.skipToContent': 'Skip to main content',
    'a11y.language': 'Interface language',
    'a11y.closeDialog': 'Close dialog',
    'a11y.dismiss': 'Dismiss notification',
    'a11y.loading': 'Loading',

    'theme.switchToDark': 'Switch to dark theme',
    'theme.switchToLight': 'Switch to light theme',

    'action.save': 'Save',
    'action.saveChanges': 'Save changes',
    'action.cancel': 'Cancel',
    'action.create': 'Create',
    'action.edit': 'Edit',
    'action.delete': 'Delete',
    'action.retry': 'Try again',
    'action.reset': 'Reset',
    'action.close': 'Close',
    'action.logout': 'Log out',
    'action.previous': 'Previous',
    'action.next': 'Next',
    'action.backToTasks': 'Back to tasks',
    'action.backToEmployees': 'Back to employees',
    'action.openDocs': 'Open API documentation',

    'auth.login.title': 'Welcome back',
    'auth.login.subtitle': 'Sign in to manage your team’s work.',
    'auth.login.submit': 'Sign in',
    'auth.login.noAccount': 'No account yet?',
    'auth.login.registerLink': 'Create one',
    'auth.register.title': 'Create an account',
    'auth.register.subtitle': 'Register with your work email to get started.',
    'auth.register.submit': 'Create account',
    'auth.register.haveAccount': 'Already registered?',
    'auth.register.loginLink': 'Sign in',
    'auth.register.firstUserHint':
      'The first account created in a fresh installation becomes the administrator. Everyone who registers later starts as an employee.',
    'auth.field.email': 'Email',
    'auth.field.password': 'Password',
    'auth.field.passwordConfirm': 'Confirm password',
    'auth.password.hint': 'At least 8 characters.',
    'auth.registered': 'Account created. Welcome, {email}.',
    'auth.loggedIn': 'Signed in as {email}.',
    'auth.loggedOut': 'You have been signed out.',
    'auth.sessionExpired': 'Your session expired. Please sign in again.',
    'auth.logout.title': 'Sign out?',
    'auth.logout.message': 'You will need to enter your email and password again.',

    'tasks.title': 'Tasks',
    'tasks.subtitle.manager': 'Create work, assign it, and follow progress across the team.',
    'tasks.subtitle.employee': 'Everything assigned to you, newest first.',
    'tasks.new': 'New task',
    'tasks.filters': 'Filters',
    'tasks.filter.search': 'Search',
    'tasks.filter.searchPlaceholder': 'Search title and description…',
    'tasks.filter.status': 'Status',
    'tasks.filter.priority': 'Priority',
    'tasks.filter.assignee': 'Assignee',
    'tasks.filter.sort': 'Sort by',
    'tasks.filter.anyStatus': 'Any status',
    'tasks.filter.anyPriority': 'Any priority',
    'tasks.filter.anyAssignee': 'Anyone',
    'tasks.filter.unassignedOnly': 'Unassigned only',
    'tasks.filter.clear': 'Clear filters',
    'tasks.sort.newest': 'Newest first',
    'tasks.sort.oldest': 'Oldest first',
    'tasks.sort.deadline': 'Deadline first',
    'tasks.sort.updated': 'Recently updated',
    'tasks.sort.title': 'Title A–Z',
    'tasks.stat.all': 'All',
    'tasks.showing': 'Showing {from}–{to} of {total}',
    'tasks.showingNone': 'No matching tasks',
    'tasks.empty.title': 'No tasks yet',
    'tasks.empty.description.manager': 'Create the first task and assign it to someone on your team.',
    'tasks.empty.description.employee': 'Nothing is assigned to you right now. Enjoy the quiet.',
    'tasks.emptyFiltered.title': 'Nothing matches these filters',
    'tasks.emptyFiltered.description': 'Try a different status, priority, or search term.',

    'task.field.title': 'Title',
    'task.field.description': 'Description',
    'task.field.status': 'Status',
    'task.field.priority': 'Priority',
    'task.field.deadline': 'Deadline',
    'task.field.assignee': 'Assignee',
    'task.field.owner': 'Created by',
    'task.field.parent': 'Parent task',
    'task.field.created': 'Created',
    'task.field.updated': 'Last updated',
    'task.titlePlaceholder': 'Short, action-oriented summary',
    'task.descriptionPlaceholder': 'What needs to be done, and what does “done” look like?',
    'task.parentPlaceholder': 'Task ID, optional',
    'task.unassigned': 'Unassigned',
    'task.noDeadline': 'No deadline',
    'task.noParent': 'None',
    'task.overdue': 'Overdue',
    'task.dueToday': 'Due today',
    'task.statusChangeLabel': 'Change status of “{title}”',
    'task.detail.title': 'Task details',
    'task.form.create': 'New task',
    'task.form.edit': 'Edit task',
    'task.created': 'Task “{title}” created.',
    'task.updated': 'Task “{title}” updated.',
    'task.statusUpdated': 'Status changed to {status}.',
    'task.deleted': 'Task deleted.',
    'task.delete.title': 'Delete this task?',
    'task.delete.message': '“{title}” will be permanently deleted. This cannot be undone.',
    'task.subtaskHint': 'Subtask of #{id}',

    'task.status.TODO': 'To do',
    'task.status.IN_PROGRESS': 'In progress',
    'task.status.DONE': 'Done',
    'task.status.CANCELLED': 'Cancelled',
    'task.priority.LOW': 'Low',
    'task.priority.MEDIUM': 'Medium',
    'task.priority.HIGH': 'High',
    'task.priority.CRITICAL': 'Critical',

    'role.ADMIN': 'Administrator',
    'role.MANAGER': 'Manager',
    'role.EMPLOYEE': 'Employee',

    'employees.title': 'Employees',
    'employees.subtitle': 'People you can assign work to, with their current role.',
    'employees.empty.title': 'No employees found',
    'employees.empty.description': 'Once teammates register, they appear here and can be assigned tasks.',
    'employees.count': '{count} people',
    'employee.detail.title': 'Employee',
    'employee.assignedTasks': 'Assigned tasks',
    'employee.tasksEmpty': 'No tasks are assigned to this person.',
    'employee.field.email': 'Email',
    'employee.field.role': 'Role',
    'employee.field.manager': 'Manager',
    'employee.field.status': 'Account',
    'employee.noManager': 'Not assigned',
    'employee.viewProfile': 'View {email}',

    'users.title': 'Users',
    'users.subtitle': 'Change roles, reassign managers, and deactivate accounts.',
    'users.table.user': 'User',
    'users.table.role': 'Role',
    'users.table.manager': 'Manager',
    'users.table.status': 'Account',
    'users.table.created': 'Registered',
    'users.table.actions': 'Actions',
    'users.you': 'You',
    'users.edit.title': 'Edit {email}',
    'users.field.role': 'Role',
    'users.field.manager': 'Manager',
    'users.field.active': 'Account is active',
    'users.field.managerNone': 'No manager',
    'users.field.managerHint': 'Only employees report to a manager.',
    'users.field.managerEmpty': 'No manager accounts exist yet. Promote someone to manager first.',
    'users.field.activeHint': 'Inactive accounts cannot sign in.',
    'users.field.activeSelfHint': 'You cannot deactivate your own account.',
    'users.updated': 'User updated.',
    'users.deleted': 'User deleted.',
    'users.delete.title': 'Delete this user?',
    'users.delete.message': '{email} will lose access immediately. This cannot be undone.',
    'users.empty.title': 'No users',
    'users.empty.description': 'Nobody has registered yet.',

    'profile.title': 'Your profile',
    'profile.subtitle': 'Account details and sign-in credentials.',
    'profile.account': 'Account',
    'profile.field.id': 'User ID',
    'profile.field.email': 'Email',
    'profile.field.role': 'Role',
    'profile.field.manager': 'Manager',
    'profile.field.status': 'Status',
    'profile.field.created': 'Registered',
    'profile.changeEmail': 'Change email',
    'profile.changePassword': 'Change password',
    'profile.field.newEmail': 'New email',
    'profile.field.newPassword': 'New password',
    'profile.emailUpdated': 'Email updated.',
    'profile.passwordUpdated': 'Password updated.',
    'profile.session': 'Session',
    'profile.sessionHint': 'Signing out revokes the refresh token stored in this browser.',

    'status.active': 'Active',
    'status.inactive': 'Inactive',

    'pagination.page': 'Page {page} of {pages}',

    'validation.required': 'This field is required.',
    'validation.email': 'Enter a valid email address.',
    'validation.passwordShort': 'Use at least 8 characters.',
    'validation.passwordMismatch': 'Passwords do not match.',
    'validation.tooLong': 'Use at most {max} characters.',
    'validation.notANumber': 'Enter a number.',

    'error.title': 'Something went wrong',
    'error.loadFailed': 'The data could not be loaded.',
    'error.network': 'Cannot reach the server. Check your connection and try again.',
    'error.generic': 'Unexpected error. Please try again.',
    'error.accessDenied.title': 'Access denied',
    'error.accessDenied.description': 'Your role does not allow you to open this page.',
    'error.notFound.title': 'Page not found',
    'error.notFound.description': 'The page you requested does not exist.',
    'error.taskMissing': 'This task no longer exists or is not visible to you.',
    'error.employeeMissing': 'This employee no longer exists or is not visible to you.',

    'server.Email is already registered': 'This email is already registered.',
    'server.Invalid email or password': 'Invalid email or password.',
    'server.Invalid or expired refresh token': 'Your session expired. Please sign in again.',
    'server.Insufficient permissions': 'You do not have permission to do that.',
    'server.Not authenticated': 'Please sign in to continue.',
    'server.Task not found': 'Task not found.',
    'server.User not found': 'User not found.',
    'server.Employee not found': 'Employee not found.',
    'server.Assignee not found': 'The selected assignee does not exist.',
    'server.Cannot delete a user who still owns tasks': 'This user still owns tasks and cannot be deleted.',
    'server.Manager not found': 'The selected manager does not exist.',
    'server.manager_id must refer to a user with the MANAGER role':
      'A manager must be an account with the manager role.',
    'server.A user cannot be their own manager': 'A user cannot be their own manager.',
    'server.You cannot deactivate your own account': 'You cannot deactivate your own account.',
    'server.You cannot delete your own account': 'You cannot delete your own account.',
    'server.Only administrators can manage roles': 'Only administrators can change roles.',
    'server.Only administrators can delete users': 'Only administrators can delete users.',
    'server.Resource not found': 'Not found.',
    'server.Not Found': 'Not found.',
    'server.Resource conflict': 'This change conflicts with existing data.',
    'server.Internal server error': 'Server error. Please try again later.',
    'server.Bad request': 'The request was rejected.',
  },

  ru: {
    'app.name': 'Трекер задач',
    'app.tagline': 'Постановка, контроль и обновление работы команды',

    'nav.primary': 'Основная навигация',
    'nav.tasks': 'Задачи',
    'nav.employees': 'Сотрудники',
    'nav.users': 'Пользователи',
    'nav.profile': 'Профиль',
    'nav.toggle': 'Открыть меню',
    'nav.apiDocs': 'Документация API',

    'a11y.skipToContent': 'Перейти к основному содержимому',
    'a11y.language': 'Язык интерфейса',
    'a11y.closeDialog': 'Закрыть диалог',
    'a11y.dismiss': 'Скрыть уведомление',
    'a11y.loading': 'Загрузка',

    'theme.switchToDark': 'Включить тёмную тему',
    'theme.switchToLight': 'Включить светлую тему',

    'action.save': 'Сохранить',
    'action.saveChanges': 'Сохранить изменения',
    'action.cancel': 'Отмена',
    'action.create': 'Создать',
    'action.edit': 'Изменить',
    'action.delete': 'Удалить',
    'action.retry': 'Повторить',
    'action.reset': 'Сбросить',
    'action.close': 'Закрыть',
    'action.logout': 'Выйти',
    'action.previous': 'Назад',
    'action.next': 'Вперёд',
    'action.backToTasks': 'К списку задач',
    'action.backToEmployees': 'К списку сотрудников',
    'action.openDocs': 'Открыть документацию API',

    'auth.login.title': 'С возвращением',
    'auth.login.subtitle': 'Войдите, чтобы управлять работой команды.',
    'auth.login.submit': 'Войти',
    'auth.login.noAccount': 'Ещё нет аккаунта?',
    'auth.login.registerLink': 'Создать',
    'auth.register.title': 'Регистрация',
    'auth.register.subtitle': 'Зарегистрируйтесь по рабочему email, чтобы начать.',
    'auth.register.submit': 'Создать аккаунт',
    'auth.register.haveAccount': 'Уже зарегистрированы?',
    'auth.register.loginLink': 'Войти',
    'auth.register.firstUserHint':
      'Первый аккаунт в новой установке становится администратором. Все, кто регистрируется позже, получают роль сотрудника.',
    'auth.field.email': 'Email',
    'auth.field.password': 'Пароль',
    'auth.field.passwordConfirm': 'Подтверждение пароля',
    'auth.password.hint': 'Минимум 8 символов.',
    'auth.registered': 'Аккаунт создан. Добро пожаловать, {email}.',
    'auth.loggedIn': 'Вы вошли как {email}.',
    'auth.loggedOut': 'Вы вышли из системы.',
    'auth.sessionExpired': 'Сессия истекла. Войдите снова.',
    'auth.logout.title': 'Выйти из аккаунта?',
    'auth.logout.message': 'Потребуется снова ввести email и пароль.',

    'tasks.title': 'Задачи',
    'tasks.subtitle.manager': 'Создавайте работу, назначайте исполнителей и следите за прогрессом команды.',
    'tasks.subtitle.employee': 'Всё, что назначено вам, — новые задачи сверху.',
    'tasks.new': 'Новая задача',
    'tasks.filters': 'Фильтры',
    'tasks.filter.search': 'Поиск',
    'tasks.filter.searchPlaceholder': 'Поиск по названию и описанию…',
    'tasks.filter.status': 'Статус',
    'tasks.filter.priority': 'Приоритет',
    'tasks.filter.assignee': 'Исполнитель',
    'tasks.filter.sort': 'Сортировка',
    'tasks.filter.anyStatus': 'Любой статус',
    'tasks.filter.anyPriority': 'Любой приоритет',
    'tasks.filter.anyAssignee': 'Любой исполнитель',
    'tasks.filter.unassignedOnly': 'Только без исполнителя',
    'tasks.filter.clear': 'Сбросить фильтры',
    'tasks.sort.newest': 'Сначала новые',
    'tasks.sort.oldest': 'Сначала старые',
    'tasks.sort.deadline': 'По сроку',
    'tasks.sort.updated': 'Недавно обновлённые',
    'tasks.sort.title': 'По названию А–Я',
    'tasks.stat.all': 'Все',
    'tasks.showing': 'Показаны {from}–{to} из {total}',
    'tasks.showingNone': 'Подходящих задач нет',
    'tasks.empty.title': 'Задач пока нет',
    'tasks.empty.description.manager': 'Создайте первую задачу и назначьте исполнителя из своей команды.',
    'tasks.empty.description.employee': 'Сейчас вам ничего не назначено.',
    'tasks.emptyFiltered.title': 'Ничего не найдено',
    'tasks.emptyFiltered.description': 'Попробуйте другой статус, приоритет или поисковый запрос.',

    'task.field.title': 'Название',
    'task.field.description': 'Описание',
    'task.field.status': 'Статус',
    'task.field.priority': 'Приоритет',
    'task.field.deadline': 'Срок',
    'task.field.assignee': 'Исполнитель',
    'task.field.owner': 'Автор',
    'task.field.parent': 'Родительская задача',
    'task.field.created': 'Создана',
    'task.field.updated': 'Обновлена',
    'task.titlePlaceholder': 'Короткая формулировка с действием',
    'task.descriptionPlaceholder': 'Что нужно сделать и что считается результатом?',
    'task.parentPlaceholder': 'ID задачи, необязательно',
    'task.unassigned': 'Без исполнителя',
    'task.noDeadline': 'Без срока',
    'task.noParent': 'Нет',
    'task.overdue': 'Просрочена',
    'task.dueToday': 'Срок сегодня',
    'task.statusChangeLabel': 'Изменить статус задачи «{title}»',
    'task.detail.title': 'Карточка задачи',
    'task.form.create': 'Новая задача',
    'task.form.edit': 'Редактирование задачи',
    'task.created': 'Задача «{title}» создана.',
    'task.updated': 'Задача «{title}» обновлена.',
    'task.statusUpdated': 'Статус изменён на «{status}».',
    'task.deleted': 'Задача удалена.',
    'task.delete.title': 'Удалить задачу?',
    'task.delete.message': 'Задача «{title}» будет удалена безвозвратно. Отменить это нельзя.',
    'task.subtaskHint': 'Подзадача #{id}',

    'task.status.TODO': 'К выполнению',
    'task.status.IN_PROGRESS': 'В работе',
    'task.status.DONE': 'Выполнена',
    'task.status.CANCELLED': 'Отменена',
    'task.priority.LOW': 'Низкий',
    'task.priority.MEDIUM': 'Средний',
    'task.priority.HIGH': 'Высокий',
    'task.priority.CRITICAL': 'Критический',

    'role.ADMIN': 'Администратор',
    'role.MANAGER': 'Менеджер',
    'role.EMPLOYEE': 'Сотрудник',

    'employees.title': 'Сотрудники',
    'employees.subtitle': 'Люди, которым можно назначать работу, и их текущие роли.',
    'employees.empty.title': 'Сотрудники не найдены',
    'employees.empty.description': 'Как только коллеги зарегистрируются, они появятся здесь.',
    'employees.count': 'Всего: {count}',
    'employee.detail.title': 'Сотрудник',
    'employee.assignedTasks': 'Назначенные задачи',
    'employee.tasksEmpty': 'На этого сотрудника не назначено ни одной задачи.',
    'employee.field.email': 'Email',
    'employee.field.role': 'Роль',
    'employee.field.manager': 'Руководитель',
    'employee.field.status': 'Аккаунт',
    'employee.noManager': 'Не назначен',
    'employee.viewProfile': 'Открыть {email}',

    'users.title': 'Пользователи',
    'users.subtitle': 'Меняйте роли, назначайте руководителей и отключайте аккаунты.',
    'users.table.user': 'Пользователь',
    'users.table.role': 'Роль',
    'users.table.manager': 'Руководитель',
    'users.table.status': 'Аккаунт',
    'users.table.created': 'Регистрация',
    'users.table.actions': 'Действия',
    'users.you': 'Вы',
    'users.edit.title': 'Изменить {email}',
    'users.field.role': 'Роль',
    'users.field.manager': 'Руководитель',
    'users.field.active': 'Аккаунт активен',
    'users.field.managerNone': 'Без руководителя',
    'users.field.managerHint': 'Руководитель назначается только сотрудникам.',
    'users.field.managerEmpty': 'Пока нет ни одного менеджера. Сначала назначьте кого-нибудь менеджером.',
    'users.field.activeHint': 'Неактивные аккаунты не могут войти.',
    'users.field.activeSelfHint': 'Нельзя отключить собственный аккаунт.',
    'users.updated': 'Пользователь обновлён.',
    'users.deleted': 'Пользователь удалён.',
    'users.delete.title': 'Удалить пользователя?',
    'users.delete.message': '{email} сразу потеряет доступ. Отменить это нельзя.',
    'users.empty.title': 'Пользователей нет',
    'users.empty.description': 'Пока никто не зарегистрировался.',

    'profile.title': 'Ваш профиль',
    'profile.subtitle': 'Данные аккаунта и учётные данные для входа.',
    'profile.account': 'Аккаунт',
    'profile.field.id': 'ID пользователя',
    'profile.field.email': 'Email',
    'profile.field.role': 'Роль',
    'profile.field.manager': 'Руководитель',
    'profile.field.status': 'Статус',
    'profile.field.created': 'Регистрация',
    'profile.changeEmail': 'Изменить email',
    'profile.changePassword': 'Изменить пароль',
    'profile.field.newEmail': 'Новый email',
    'profile.field.newPassword': 'Новый пароль',
    'profile.emailUpdated': 'Email обновлён.',
    'profile.passwordUpdated': 'Пароль обновлён.',
    'profile.session': 'Сессия',
    'profile.sessionHint': 'При выходе refresh-токен, сохранённый в этом браузере, будет отозван.',

    'status.active': 'Активен',
    'status.inactive': 'Отключён',

    'pagination.page': 'Страница {page} из {pages}',

    'validation.required': 'Обязательное поле.',
    'validation.email': 'Введите корректный email.',
    'validation.passwordShort': 'Минимум 8 символов.',
    'validation.passwordMismatch': 'Пароли не совпадают.',
    'validation.tooLong': 'Не более {max} символов.',
    'validation.notANumber': 'Введите число.',

    'error.title': 'Что-то пошло не так',
    'error.loadFailed': 'Не удалось загрузить данные.',
    'error.network': 'Сервер недоступен. Проверьте соединение и повторите попытку.',
    'error.generic': 'Непредвиденная ошибка. Попробуйте снова.',
    'error.accessDenied.title': 'Доступ запрещён',
    'error.accessDenied.description': 'Ваша роль не позволяет открыть эту страницу.',
    'error.notFound.title': 'Страница не найдена',
    'error.notFound.description': 'Запрошенная страница не существует.',
    'error.taskMissing': 'Такой задачи больше нет или она вам недоступна.',
    'error.employeeMissing': 'Такого сотрудника больше нет или он вам недоступен.',

    'server.Email is already registered': 'Этот email уже зарегистрирован.',
    'server.Invalid email or password': 'Неверный email или пароль.',
    'server.Invalid or expired refresh token': 'Сессия истекла. Войдите снова.',
    'server.Insufficient permissions': 'У вас нет прав на это действие.',
    'server.Not authenticated': 'Войдите, чтобы продолжить.',
    'server.Task not found': 'Задача не найдена.',
    'server.User not found': 'Пользователь не найден.',
    'server.Employee not found': 'Сотрудник не найден.',
    'server.Assignee not found': 'Выбранный исполнитель не существует.',
    'server.Cannot delete a user who still owns tasks': 'У пользователя есть созданные задачи, удалить его нельзя.',
    'server.Manager not found': 'Выбранный руководитель не существует.',
    'server.manager_id must refer to a user with the MANAGER role':
      'Руководителем можно назначить только аккаунт с ролью менеджера.',
    'server.A user cannot be their own manager': 'Пользователь не может быть своим руководителем.',
    'server.You cannot deactivate your own account': 'Нельзя отключить собственный аккаунт.',
    'server.You cannot delete your own account': 'Нельзя удалить собственный аккаунт.',
    'server.Only administrators can manage roles': 'Менять роли может только администратор.',
    'server.Only administrators can delete users': 'Удалять пользователей может только администратор.',
    'server.Resource not found': 'Не найдено.',
    'server.Not Found': 'Не найдено.',
    'server.Resource conflict': 'Изменение конфликтует с существующими данными.',
    'server.Internal server error': 'Ошибка сервера. Попробуйте позже.',
    'server.Bad request': 'Запрос отклонён.',
  },
};

function detectLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && dictionaries[stored]) return stored;
  } catch {
    /* storage unavailable */
  }
  const preferred = (navigator.languages || [navigator.language || '']).map((tag) =>
    String(tag).slice(0, 2).toLowerCase(),
  );
  return preferred.find((code) => dictionaries[code]) || DEFAULT_LOCALE;
}

let locale = detectLocale();
const listeners = new Set();

export function getLocale() {
  return locale;
}

/** Subscribe to locale changes; returns an unsubscribe function. */
export function onLocaleChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLocale(next) {
  if (!dictionaries[next] || next === locale) return;
  locale = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage unavailable */
  }
  document.documentElement.lang = next;
  listeners.forEach((listener) => listener(next));
}

/**
 * Translate `key`, replacing `{placeholders}` with `vars`.
 * Unknown keys fall back to English, then to the key itself, so a missing
 * translation is visible during development instead of rendering blank.
 */
export function t(key, vars) {
  const template = dictionaries[locale][key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : match,
  );
}

export const taskStatusLabel = (status) => t(`task.status.${status}`);
export const taskPriorityLabel = (priority) => t(`task.priority.${priority}`);
export const roleLabel = (role) => t(`role.${role}`);

/** Translate a `detail` string returned by the API, falling back to the raw text. */
export function serverMessage(detail) {
  if (!detail) return t('error.generic');
  const key = `server.${detail}`;
  const translated = dictionaries[locale][key] ?? dictionaries[DEFAULT_LOCALE][key];
  return translated ?? detail;
}

/** Apply translations to static markup annotated with `data-i18n*` attributes. */
export function translateDocument(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  root.querySelectorAll('[data-i18n-label]').forEach((node) => {
    node.setAttribute('aria-label', t(node.dataset.i18nLabel));
  });
}

const dateFormats = {
  date: { day: 'numeric', month: 'short', year: 'numeric' },
  dateTime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
};

const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Parse an API timestamp into a Date, or `null` when it is absent or invalid.
 *
 * The API stores UTC, but depending on the database driver it may serialize
 * without an offset. JavaScript would read such a value as local time, so the
 * missing designator is added back before parsing.
 */
export function parseTimestamp(value) {
  if (!value) return null;
  const normalized = typeof value === 'string' && !HAS_OFFSET.test(value) ? `${value}Z` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format an API timestamp in the active locale, or return a dash when absent. */
export function formatDate(value, { withTime = false } = {}) {
  const date = parseTimestamp(value);
  if (!date) return '—';
  const options = withTime ? dateFormats.dateTime : dateFormats.date;
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatNumber(value) {
  return new Intl.NumberFormat(locale).format(value);
}

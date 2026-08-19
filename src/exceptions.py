"""Domain exceptions mapped to HTTP status codes.

Доменные исключения, которые мапятся в HTTP-статусы.
"""


class AppError(Exception):
    """Base application error mapped to an HTTP response.

    Базовая ошибка приложения, которая превращается в HTTP-ответ.
    """

    status_code = 500
    detail = "Internal server error"

    def __init__(self, detail: str | None = None) -> None:
        """Store an optional client-facing error message.

        Сохраняет необязательное сообщение, которое увидит клиент.
        """
        self.detail = detail or self.detail
        super().__init__(self.detail)


class BadRequestError(AppError):
    """Invalid request that the server cannot process.

    Некорректный запрос, который сервер не может обработать.
    """

    status_code = 400
    detail = "Bad request"


class UnauthorizedError(AppError):
    """Missing or invalid authentication.

    Отсутствует или недействительна аутентификация.
    """

    status_code = 401
    detail = "Not authenticated"


class ForbiddenError(AppError):
    """Authenticated user lacks permission.

    У аутентифицированного пользователя нет прав.
    """

    status_code = 403
    detail = "Insufficient permissions"


class NotFoundError(AppError):
    """Requested resource does not exist.

    Запрошенный ресурс не существует.
    """

    status_code = 404
    detail = "Resource not found"


class ConflictError(AppError):
    """Request conflicts with the current resource state.

    Запрос конфликтует с текущим состоянием ресурса.
    """

    status_code = 409
    detail = "Resource conflict"

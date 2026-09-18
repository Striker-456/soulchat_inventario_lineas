using System.Net;
using System.Text.Json;
using SoulChat.Application.Common;

namespace SoulChat.Api.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, title, errors) = exception switch
        {
            NotFoundException => (HttpStatusCode.NotFound, exception.Message, null),
            ConflictException => (HttpStatusCode.Conflict, exception.Message, null),
            UnauthorizedAppException => (HttpStatusCode.Unauthorized, exception.Message, null),
            ForbiddenAppException => (HttpStatusCode.Forbidden, exception.Message, null),
            ValidationAppException validationEx => (HttpStatusCode.BadRequest, "Errores de validación.", (object?)validationEx.Errors),
            _ => (HttpStatusCode.InternalServerError, "Ocurrió un error interno en el servidor.", null),
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Error no controlado procesando {Path}", context.Request.Path);
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var payload = new
        {
            status = (int)statusCode,
            title,
            errors,
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
    }
}

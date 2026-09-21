using FluentValidation;
using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Clientes;

namespace SoulChat.Application.Validators;

internal static class ClienteRules
{
    // RFC mexicano: 3 letras (persona moral, 12 caracteres) o 4 (persona física, 13) + fecha AAMMDD + homoclave de 3.
    public const string RfcPattern = @"^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$";

    public const string RfcMensaje =
        "El RFC debe tener 12 (persona moral) o 13 caracteres (persona física), p. ej. GPS920315R12 o GPSA920315R12.";
}

public class ClienteCreateDtoValidator : AbstractValidator<ClienteCreateDto>
{
    public ClienteCreateDtoValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(150);

        RuleFor(x => x.Rfc)
            .Matches(ClienteRules.RfcPattern, System.Text.RegularExpressions.RegexOptions.IgnoreCase)
            .WithMessage(ClienteRules.RfcMensaje)
            .When(x => !string.IsNullOrWhiteSpace(x.Rfc));

        RuleFor(x => x.Estado)
            .Must(e => EstadoCliente.Canonico(e) is not null)
            .WithMessage($"El estado debe ser uno de: {string.Join(", ", EstadoCliente.Validos)}.")
            .When(x => !string.IsNullOrWhiteSpace(x.Estado));
    }
}

public class ClienteUpdateDtoValidator : AbstractValidator<ClienteUpdateDto>
{
    public ClienteUpdateDtoValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(150);

        RuleFor(x => x.Rfc)
            .Matches(ClienteRules.RfcPattern, System.Text.RegularExpressions.RegexOptions.IgnoreCase)
            .WithMessage(ClienteRules.RfcMensaje)
            .When(x => !string.IsNullOrWhiteSpace(x.Rfc));

        RuleFor(x => x.Estado)
            .NotEmpty()
            .Must(e => EstadoCliente.Canonico(e) is not null)
            .WithMessage($"El estado debe ser uno de: {string.Join(", ", EstadoCliente.Validos)}.");
    }
}

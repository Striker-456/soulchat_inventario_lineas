using FluentValidation;
using SoulChat.Application.DTOs.Auth;

namespace SoulChat.Application.Validators;

public class CambiarNombreDtoValidator : AbstractValidator<CambiarNombreDto>
{
    public CambiarNombreDtoValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(150);
        RuleFor(x => x.PasswordActual).NotEmpty().WithMessage("Ingresa tu contraseña actual.");
    }
}

public class CambiarEmailDtoValidator : AbstractValidator<CambiarEmailDto>
{
    public CambiarEmailDtoValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(150);
        RuleFor(x => x.PasswordActual).NotEmpty().WithMessage("Ingresa tu contraseña actual.");
    }
}

public class CambiarPasswordPropiaDtoValidator : AbstractValidator<CambiarPasswordPropiaDto>
{
    public CambiarPasswordPropiaDtoValidator()
    {
        RuleFor(x => x.PasswordActual).NotEmpty().WithMessage("Ingresa tu contraseña actual.");
        RuleFor(x => x.NuevaPassword).NotEmpty().MinimumLength(8);
        RuleFor(x => x.NuevaPassword).NotEqual(x => x.PasswordActual)
            .WithMessage("La nueva contraseña debe ser distinta de la actual.")
            .When(x => !string.IsNullOrEmpty(x.NuevaPassword));
    }
}

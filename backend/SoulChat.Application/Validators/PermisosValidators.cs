using FluentValidation;
using SoulChat.Application.DTOs.Usuarios;

namespace SoulChat.Application.Validators;

public class PermisosUpdateDtoValidator : AbstractValidator<PermisosUpdateDto>
{
    public PermisosUpdateDtoValidator()
    {
        RuleFor(x => x.Permisos).NotNull().WithMessage("Envía la matriz de permisos.");
    }
}

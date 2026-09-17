using FluentValidation;
using SoulChat.Application.DTOs.Empleados;

namespace SoulChat.Application.Validators;

public class EmpleadoCreateDtoValidator : AbstractValidator<EmpleadoCreateDto>
{
    public EmpleadoCreateDtoValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Rol).MaximumLength(50);
    }
}

public class EmpleadoUpdateDtoValidator : AbstractValidator<EmpleadoUpdateDto>
{
    public EmpleadoUpdateDtoValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Rol).MaximumLength(50);
    }
}

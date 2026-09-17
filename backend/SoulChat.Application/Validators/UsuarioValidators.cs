using FluentValidation;
using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Usuarios;

namespace SoulChat.Application.Validators;

public class UsuarioCreateDtoValidator : AbstractValidator<UsuarioCreateDto>
{
    private static readonly string[] RolesValidos = { Roles.Admin, Roles.Editor, Roles.Consulta };

    public UsuarioCreateDtoValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(150);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
        RuleFor(x => x.Rol).NotEmpty().Must(r => RolesValidos.Contains(r))
            .WithMessage($"El rol debe ser uno de: {string.Join(", ", RolesValidos)}.");
    }
}

public class UsuarioUpdateDtoValidator : AbstractValidator<UsuarioUpdateDto>
{
    private static readonly string[] RolesValidos = { Roles.Admin, Roles.Editor, Roles.Consulta };

    public UsuarioUpdateDtoValidator()
    {
        RuleFor(x => x.Rol).NotEmpty().Must(r => RolesValidos.Contains(r))
            .WithMessage($"El rol debe ser uno de: {string.Join(", ", RolesValidos)}.");
    }
}

public class CambiarPasswordDtoValidator : AbstractValidator<CambiarPasswordDto>
{
    public CambiarPasswordDtoValidator()
    {
        RuleFor(x => x.NuevaPassword).NotEmpty().MinimumLength(8);
    }
}

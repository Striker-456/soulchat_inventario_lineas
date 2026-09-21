using FluentValidation;
using SoulChat.Application.DTOs.Lineas;

namespace SoulChat.Application.Validators;

public class LineaCreateDtoValidator : AbstractValidator<LineaCreateDto>
{
    public LineaCreateDtoValidator()
    {
        RuleFor(x => x.Numero).NotEmpty().MaximumLength(20);
        RuleFor(x => x.ClienteId).GreaterThan(0);
        RuleFor(x => x.DescripcionUso).MaximumLength(4000);
    }
}

public class LineaUpdateDtoValidator : AbstractValidator<LineaUpdateDto>
{
    public LineaUpdateDtoValidator()
    {
        RuleFor(x => x.Numero).NotEmpty().MaximumLength(20);
        RuleFor(x => x.ClienteId).GreaterThan(0);
        RuleFor(x => x.DescripcionUso).MaximumLength(4000);
    }
}

public class LineaImportRequestDtoValidator : AbstractValidator<LineaImportRequestDto>
{
    public const int MaxFilas = 500;

    public LineaImportRequestDtoValidator()
    {
        RuleFor(x => x.Filas)
            .NotNull().WithMessage("Envía las filas a importar.")
            .Must(f => f is { Count: > 0 }).WithMessage("El archivo no contiene filas.")
            .Must(f => f is null || f.Count <= MaxFilas).WithMessage($"Puedes importar hasta {MaxFilas} filas por vez.");
    }
}

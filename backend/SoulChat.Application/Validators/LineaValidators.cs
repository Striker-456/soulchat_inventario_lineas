using FluentValidation;
using SoulChat.Application.DTOs.Lineas;

namespace SoulChat.Application.Validators;

public class LineaCreateDtoValidator : AbstractValidator<LineaCreateDto>
{
    public LineaCreateDtoValidator()
    {
        RuleFor(x => x.ClienteId).GreaterThan(0);
        RuleFor(x => x.DescripcionUso).MaximumLength(4000);
    }
}

public class LineaUpdateDtoValidator : AbstractValidator<LineaUpdateDto>
{
    public LineaUpdateDtoValidator()
    {
        RuleFor(x => x.ClienteId).GreaterThan(0);
        RuleFor(x => x.DescripcionUso).MaximumLength(4000);
    }
}

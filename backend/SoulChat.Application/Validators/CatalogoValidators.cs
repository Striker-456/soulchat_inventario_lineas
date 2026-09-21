using FluentValidation;
using SoulChat.Application.DTOs.Catalogos;

namespace SoulChat.Application.Validators;

public class CatalogoInputDtoValidator : AbstractValidator<CatalogoInputDto>
{
    public CatalogoInputDtoValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(60);
    }
}

using FluentValidation;
using SoulChat.Application.DTOs.Smart;

namespace SoulChat.Application.Validators;

public class SmartCreateDtoValidator : AbstractValidator<SmartCreateDto>
{
    public SmartCreateDtoValidator()
    {
        RuleFor(x => x.NumeroLinea).NotEmpty().MaximumLength(20);
        RuleFor(x => x.WebhookCos).MaximumLength(255);
        RuleFor(x => x.WebhookSda).MaximumLength(255);
    }
}

public class SmartUpdateDtoValidator : AbstractValidator<SmartUpdateDto>
{
    public SmartUpdateDtoValidator()
    {
        RuleFor(x => x.NumeroLinea).NotEmpty().MaximumLength(20);
        RuleFor(x => x.WebhookCos).MaximumLength(255);
        RuleFor(x => x.WebhookSda).MaximumLength(255);
    }
}

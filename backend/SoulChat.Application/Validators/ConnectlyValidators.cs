using FluentValidation;
using SoulChat.Application.DTOs.Connectly;

namespace SoulChat.Application.Validators;

public class ConnectlyCreateDtoValidator : AbstractValidator<ConnectlyCreateDto>
{
    public ConnectlyCreateDtoValidator()
    {
        RuleFor(x => x.NumeroConnectly).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Usuario).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Contrasena).NotEmpty();
        RuleFor(x => x.BusinessId).MaximumLength(100);
        RuleFor(x => x.Webhook).MaximumLength(255);
        RuleFor(x => x.Dns).MaximumLength(150);
    }
}

public class ConnectlyUpdateDtoValidator : AbstractValidator<ConnectlyUpdateDto>
{
    public ConnectlyUpdateDtoValidator()
    {
        RuleFor(x => x.NumeroConnectly).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Usuario).NotEmpty().MaximumLength(100);
        RuleFor(x => x.BusinessId).MaximumLength(100);
        RuleFor(x => x.Webhook).MaximumLength(255);
        RuleFor(x => x.Dns).MaximumLength(150);
    }
}

using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Connectly;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class ConnectlyService : IConnectlyService
{
    private readonly ILineaConnectlyConfigRepository _configs;
    private readonly ILineaRepository _lineas;
    private readonly ICredentialEncryptionService _encryption;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditoriaService _auditoria;

    public ConnectlyService(
        ILineaConnectlyConfigRepository configs,
        ILineaRepository lineas,
        ICredentialEncryptionService encryption,
        IUnitOfWork unitOfWork,
        IAuditoriaService auditoria)
    {
        _configs = configs;
        _lineas = lineas;
        _encryption = encryption;
        _unitOfWork = unitOfWork;
        _auditoria = auditoria;
    }

    public async Task<ConnectlyResponseDto> GetByLineaIdAsync(int lineaId)
    {
        var config = await _configs.GetByLineaIdAsync(lineaId)
            ?? throw new NotFoundException($"La línea {lineaId} no tiene configuración de Connectly.");

        return MapToDto(config);
    }

    public async Task<ConnectlyResponseDto> CreateAsync(int lineaId, ConnectlyCreateDto dto)
    {
        await EnsureLineaExisteAsync(lineaId);

        if (await _configs.GetByLineaIdAsync(lineaId) is not null)
        {
            throw new ConflictException($"La línea {lineaId} ya tiene configuración de Connectly.");
        }

        var config = new LineaConnectlyConfig
        {
            LineaId = lineaId,
            NumeroConnectly = dto.NumeroConnectly,
            Usuario = dto.Usuario,
            ContrasenaCifrada = _encryption.Encrypt(dto.Contrasena),
            BusinessId = dto.BusinessId,
            ApiKeyCifrada = string.IsNullOrEmpty(dto.ApiKey) ? null : _encryption.Encrypt(dto.ApiKey),
            Webhook = dto.Webhook,
            Dns = dto.Dns,
        };

        await _configs.AddAsync(config);
        await _unitOfWork.SaveChangesAsync();

        var cambios = new List<CampoCambio>
        {
            new("numero_connectly", null, config.NumeroConnectly),
            new("usuario", null, config.Usuario),
            new("contrasena", null, "(cifrado)"),
        };
        if (config.ApiKeyCifrada is not null)
        {
            cambios.Add(new CampoCambio("api_key", null, "(cifrado)"));
        }
        await _auditoria.RegistrarAsync("linea_connectly_config", config.Id, cambios);

        return MapToDto(config);
    }

    public async Task<ConnectlyResponseDto> UpdateAsync(int lineaId, ConnectlyUpdateDto dto)
    {
        var config = await _configs.GetByLineaIdAsync(lineaId)
            ?? throw new NotFoundException($"La línea {lineaId} no tiene configuración de Connectly.");

        var cambios = new List<CampoCambio>();

        if (!string.Equals(config.NumeroConnectly, dto.NumeroConnectly, StringComparison.Ordinal))
        {
            cambios.Add(new CampoCambio("numero_connectly", config.NumeroConnectly, dto.NumeroConnectly));
        }
        if (!string.Equals(config.Usuario, dto.Usuario, StringComparison.Ordinal))
        {
            cambios.Add(new CampoCambio("usuario", config.Usuario, dto.Usuario));
        }
        if (!string.Equals(config.BusinessId, dto.BusinessId, StringComparison.Ordinal))
        {
            cambios.Add(new CampoCambio("business_id", config.BusinessId, dto.BusinessId));
        }
        if (!string.Equals(config.Webhook, dto.Webhook, StringComparison.Ordinal))
        {
            cambios.Add(new CampoCambio("webhook", config.Webhook, dto.Webhook));
        }
        if (!string.Equals(config.Dns, dto.Dns, StringComparison.Ordinal))
        {
            cambios.Add(new CampoCambio("dns", config.Dns, dto.Dns));
        }

        config.NumeroConnectly = dto.NumeroConnectly;
        config.Usuario = dto.Usuario;
        config.BusinessId = dto.BusinessId;
        config.Webhook = dto.Webhook;
        config.Dns = dto.Dns;

        if (!string.IsNullOrEmpty(dto.Contrasena))
        {
            config.ContrasenaCifrada = _encryption.Encrypt(dto.Contrasena);
            cambios.Add(new CampoCambio("contrasena", "(cifrado)", "(cifrado)"));
        }

        if (dto.ApiKey is not null)
        {
            config.ApiKeyCifrada = dto.ApiKey.Length == 0 ? null : _encryption.Encrypt(dto.ApiKey);
            cambios.Add(new CampoCambio("api_key", "(cifrado)", "(cifrado)"));
        }

        config.UpdatedAt = DateTime.UtcNow;

        _configs.Update(config);
        await _unitOfWork.SaveChangesAsync();

        if (cambios.Count > 0)
        {
            await _auditoria.RegistrarAsync("linea_connectly_config", config.Id, cambios);
        }

        return MapToDto(config);
    }

    public async Task DeleteAsync(int lineaId)
    {
        var config = await _configs.GetByLineaIdAsync(lineaId)
            ?? throw new NotFoundException($"La línea {lineaId} no tiene configuración de Connectly.");

        _configs.Remove(config);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<ConnectlyRevealResponseDto> RevelarAsync(int lineaId)
    {
        var config = await _configs.GetByLineaIdAsync(lineaId)
            ?? throw new NotFoundException($"La línea {lineaId} no tiene configuración de Connectly.");

        var contrasena = _encryption.Decrypt(config.ContrasenaCifrada);
        var apiKey = config.ApiKeyCifrada is not null ? _encryption.Decrypt(config.ApiKeyCifrada) : null;

        await _auditoria.RegistrarAsync(
            "linea_connectly_config",
            config.Id,
            new[] { new CampoCambio("revelar_credenciales", null, "accedido") });

        return new ConnectlyRevealResponseDto(contrasena, apiKey);
    }

    private async Task EnsureLineaExisteAsync(int lineaId)
    {
        if (await _lineas.GetByIdAsync(lineaId) is null)
        {
            throw new NotFoundException($"No se encontró la línea con id {lineaId}.");
        }
    }

    private ConnectlyResponseDto MapToDto(LineaConnectlyConfig c)
    {
        var contrasenaPlain = _encryption.Decrypt(c.ContrasenaCifrada);
        var apiKeyPlain = c.ApiKeyCifrada is not null ? _encryption.Decrypt(c.ApiKeyCifrada) : null;

        return new ConnectlyResponseDto(
            c.Id,
            c.LineaId,
            c.NumeroConnectly,
            c.Usuario,
            CredentialMasker.Mask(contrasenaPlain),
            c.BusinessId,
            CredentialMasker.Mask(apiKeyPlain),
            c.Webhook,
            c.Dns,
            c.CreatedAt,
            c.UpdatedAt);
    }
}

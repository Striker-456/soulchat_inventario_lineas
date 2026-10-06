using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Smart;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class SmartService : ISmartService
{
    private readonly ILineaSmartConfigRepository _configs;
    private readonly ILineaRepository _lineas;
    private readonly ICatalogRepository<Bsp> _bsps;
    private readonly ICredentialEncryptionService _encryption;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAuditoriaService _auditoria;

    public SmartService(
        ILineaSmartConfigRepository configs,
        ILineaRepository lineas,
        ICatalogRepository<Bsp> bsps,
        ICredentialEncryptionService encryption,
        IUnitOfWork unitOfWork,
        IAuditoriaService auditoria)
    {
        _configs = configs;
        _lineas = lineas;
        _bsps = bsps;
        _encryption = encryption;
        _unitOfWork = unitOfWork;
        _auditoria = auditoria;
    }

    public async Task<SmartResponseDto> GetByLineaIdAsync(int lineaId)
    {
        var config = await _configs.GetByLineaIdAsync(lineaId)
            ?? throw new NotFoundException($"La línea {lineaId} no tiene configuración de Smart.");

        return MapToDto(config);
    }

    public async Task<SmartResponseDto> CreateAsync(int lineaId, SmartCreateDto dto)
    {
        if (await _lineas.GetByIdAsync(lineaId) is null)
        {
            throw new NotFoundException($"No se encontró la línea con id {lineaId}.");
        }

        if (await _configs.GetByLineaIdAsync(lineaId) is not null)
        {
            throw new ConflictException($"La línea {lineaId} ya tiene configuración de Smart.");
        }

        await ValidarBspAsync(dto.BspId);

        var config = new LineaSmartConfig
        {
            LineaId = lineaId,
            NumeroLinea = dto.NumeroLinea,
            Estado = dto.Estado,
            TipoActivacion = dto.TipoActivacion,
            CompanyCampanasBotai = dto.CompanyCampanasBotai,
            BspId = dto.BspId,
            WebhookCampanas = dto.WebhookCampanas,
            WebhookCos = dto.WebhookCos,
            WebhookSda = dto.WebhookSda,
            UsuarioCompanyId = dto.UsuarioCompanyId,
            ClaveCifrada = string.IsNullOrEmpty(dto.Clave) ? null : _encryption.Encrypt(dto.Clave),
            CompanyBot = dto.CompanyBot,
            BotId = dto.BotId,
            BotVersion = dto.BotVersion,
            AppChannel = dto.AppChannel,
            CompanyIdCampanas = dto.CompanyIdCampanas,
            EnvioPush = dto.EnvioPush,
            Uso = dto.Uso,
            Observaciones = dto.Observaciones,
            FechaVerificacion = dto.FechaVerificacion,
            Facturado = dto.Facturado,
        };

        await _configs.AddAsync(config);
        await _unitOfWork.SaveChangesAsync();

        var cambios = ToFieldMap(config)
            .Where(kv => kv.Value is not null)
            .Select(kv => new CampoCambio(kv.Key, null, kv.Value))
            .ToList();
        if (config.ClaveCifrada is not null)
        {
            cambios.Add(new CampoCambio("clave", null, "(cifrado)"));
        }
        await _auditoria.RegistrarAsync("linea_smart_config", config.Id, cambios);

        return MapToDto(config);
    }

    public async Task<SmartResponseDto> UpdateAsync(int lineaId, SmartUpdateDto dto)
    {
        var config = await _configs.GetByLineaIdAsync(lineaId)
            ?? throw new NotFoundException($"La línea {lineaId} no tiene configuración de Smart.");

        await ValidarBspAsync(dto.BspId);

        var antes = ToFieldMap(config);

        config.NumeroLinea = dto.NumeroLinea;
        config.Estado = dto.Estado;
        config.TipoActivacion = dto.TipoActivacion;
        config.CompanyCampanasBotai = dto.CompanyCampanasBotai;
        config.BspId = dto.BspId;
        config.WebhookCampanas = dto.WebhookCampanas;
        config.WebhookCos = dto.WebhookCos;
        config.WebhookSda = dto.WebhookSda;
        config.UsuarioCompanyId = dto.UsuarioCompanyId;
        config.CompanyBot = dto.CompanyBot;
        config.BotId = dto.BotId;
        config.BotVersion = dto.BotVersion;
        config.AppChannel = dto.AppChannel;
        config.CompanyIdCampanas = dto.CompanyIdCampanas;
        config.EnvioPush = dto.EnvioPush;
        config.Uso = dto.Uso;
        config.Observaciones = dto.Observaciones;
        config.FechaVerificacion = dto.FechaVerificacion;
        config.Facturado = dto.Facturado;
        config.UpdatedAt = DateTime.UtcNow;

        var despues = ToFieldMap(config);
        var cambios = AuditDiff.Compare(antes, despues);

        if (dto.Clave is not null)
        {
            config.ClaveCifrada = dto.Clave.Length == 0 ? null : _encryption.Encrypt(dto.Clave);
            cambios.Add(new CampoCambio("clave", "(cifrado)", "(cifrado)"));
        }

        _configs.Update(config);
        await _unitOfWork.SaveChangesAsync();

        if (cambios.Count > 0)
        {
            await _auditoria.RegistrarAsync("linea_smart_config", config.Id, cambios);
        }

        return MapToDto(config);
    }

    public async Task DeleteAsync(int lineaId)
    {
        var config = await _configs.GetByLineaIdAsync(lineaId)
            ?? throw new NotFoundException($"La línea {lineaId} no tiene configuración de Smart.");

        _configs.Remove(config);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<SmartRevealResponseDto> RevelarAsync(int lineaId)
    {
        var config = await _configs.GetByLineaIdAsync(lineaId)
            ?? throw new NotFoundException($"La línea {lineaId} no tiene configuración de Smart.");

        var clave = config.ClaveCifrada is not null ? _encryption.Decrypt(config.ClaveCifrada) : null;

        await _auditoria.RegistrarAsync(
            "linea_smart_config",
            config.Id,
            new[] { new CampoCambio("revelar_credenciales", null, "accedido") });

        return new SmartRevealResponseDto(clave);
    }

    private async Task ValidarBspAsync(int? bspId)
    {
        if (bspId is not null && await _bsps.GetByIdAsync(bspId.Value) is null)
        {
            throw new NotFoundException($"No se encontró el BSP con id {bspId}.");
        }
    }

    internal static Dictionary<string, string?> ToFieldMap(LineaSmartConfig c) => new()
    {
        ["numero_linea"] = c.NumeroLinea,
        ["estado"] = c.Estado,
        ["tipo_activacion"] = c.TipoActivacion,
        ["company_campanas_botai"] = c.CompanyCampanasBotai,
        ["bsp_id"] = c.BspId?.ToString(),
        ["webhook_campanas"] = c.WebhookCampanas,
        ["webhook_cos"] = c.WebhookCos,
        ["webhook_sda"] = c.WebhookSda,
        ["usuario_companyid"] = c.UsuarioCompanyId,
        ["company_bot"] = c.CompanyBot,
        ["bot_id"] = c.BotId,
        ["bot_version"] = c.BotVersion,
        ["app_channel"] = c.AppChannel,
        ["company_id_campanas"] = c.CompanyIdCampanas,
        ["envio_push"] = c.EnvioPush.ToString(),
        ["uso"] = c.Uso,
        ["observaciones"] = c.Observaciones,
        ["fecha_verificacion"] = c.FechaVerificacion?.ToString("O"),
        ["facturado"] = c.Facturado.ToString(),
    };

    private SmartResponseDto MapToDto(LineaSmartConfig c)
    {
        var clavePlain = c.ClaveCifrada is not null ? _encryption.Decrypt(c.ClaveCifrada) : null;

        return new SmartResponseDto(
            c.Id,
            c.LineaId,
            c.NumeroLinea,
            c.Estado,
            c.TipoActivacion,
            c.CompanyCampanasBotai,
            c.BspId,
            c.Bsp?.Nombre,
            c.WebhookCampanas,
            c.WebhookCos,
            c.WebhookSda,
            c.UsuarioCompanyId,
            CredentialMasker.Mask(clavePlain),
            c.CompanyBot,
            c.BotId,
            c.BotVersion,
            c.AppChannel,
            c.CompanyIdCampanas,
            c.EnvioPush,
            c.Uso,
            c.Observaciones,
            c.FechaVerificacion,
            c.Facturado,
            c.CreatedAt,
            c.UpdatedAt);
    }
}

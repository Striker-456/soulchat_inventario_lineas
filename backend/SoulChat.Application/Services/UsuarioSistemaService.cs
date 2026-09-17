using SoulChat.Application.Common;
using SoulChat.Application.DTOs.Usuarios;
using SoulChat.Application.Interfaces;
using SoulChat.Domain.Entities;
using SoulChat.Domain.Interfaces;

namespace SoulChat.Application.Services;

public class UsuarioSistemaService : IUsuarioSistemaService
{
    private readonly IUsuarioSistemaRepository _repository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;

    public UsuarioSistemaService(
        IUsuarioSistemaRepository repository,
        IPasswordHasher passwordHasher,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser)
    {
        _repository = repository;
        _passwordHasher = passwordHasher;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<UsuarioResponseDto>> GetAllAsync()
    {
        var usuarios = await _repository.GetAllAsync();
        return usuarios.Select(MapToDto).ToList();
    }

    public async Task<UsuarioResponseDto> GetByIdAsync(int id)
    {
        var usuario = await _repository.GetByIdAsync(id)
            ?? throw new NotFoundException($"No se encontró el usuario con id {id}.");

        return MapToDto(usuario);
    }

    public async Task<UsuarioResponseDto> CreateAsync(UsuarioCreateDto dto)
    {
        if (await _repository.GetByEmailAsync(dto.Email) is not null)
        {
            throw new ConflictException($"Ya existe un usuario con el email {dto.Email}.");
        }

        var usuario = new UsuarioSistema
        {
            Email = dto.Email,
            PasswordHash = _passwordHasher.Hash(dto.Password),
            Rol = dto.Rol,
            Activo = true,
        };

        await _repository.AddAsync(usuario);
        await _unitOfWork.SaveChangesAsync();

        return MapToDto(usuario);
    }

    public async Task<UsuarioResponseDto> UpdateAsync(int id, UsuarioUpdateDto dto)
    {
        var usuario = await _repository.GetByIdAsync(id)
            ?? throw new NotFoundException($"No se encontró el usuario con id {id}.");

        if (usuario.Id == _currentUser.UsuarioId && !dto.Activo)
        {
            throw new ForbiddenAppException("No puedes desactivar tu propia cuenta.");
        }

        usuario.Rol = dto.Rol;
        usuario.Activo = dto.Activo;

        _repository.Update(usuario);
        await _unitOfWork.SaveChangesAsync();

        return MapToDto(usuario);
    }

    public async Task ResetPasswordAsync(int id, CambiarPasswordDto dto)
    {
        var usuario = await _repository.GetByIdAsync(id)
            ?? throw new NotFoundException($"No se encontró el usuario con id {id}.");

        usuario.PasswordHash = _passwordHasher.Hash(dto.NuevaPassword);

        _repository.Update(usuario);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var usuario = await _repository.GetByIdAsync(id)
            ?? throw new NotFoundException($"No se encontró el usuario con id {id}.");

        if (usuario.Id == _currentUser.UsuarioId)
        {
            throw new ForbiddenAppException("No puedes eliminar tu propia cuenta.");
        }

        _repository.Remove(usuario);
        await _unitOfWork.SaveChangesAsync();
    }

    private static UsuarioResponseDto MapToDto(UsuarioSistema u) =>
        new(u.Id, u.Email, u.Rol, u.Activo);
}

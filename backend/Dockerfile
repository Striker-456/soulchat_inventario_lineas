# syntax=docker/dockerfile:1

# ─── restore + build ────────────────────────────────────────────────────────
# Solo se copian los .csproj primero para que "dotnet restore" quede cacheado
# mientras no cambien las dependencias, aunque cambie el código fuente.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY SoulChat.Domain/SoulChat.Domain.csproj SoulChat.Domain/
COPY SoulChat.Application/SoulChat.Application.csproj SoulChat.Application/
COPY SoulChat.Infrastructure/SoulChat.Infrastructure.csproj SoulChat.Infrastructure/
COPY SoulChat.Api/SoulChat.Api.csproj SoulChat.Api/
RUN dotnet restore SoulChat.Api/SoulChat.Api.csproj

COPY SoulChat.Domain/ SoulChat.Domain/
COPY SoulChat.Application/ SoulChat.Application/
COPY SoulChat.Infrastructure/ SoulChat.Infrastructure/
COPY SoulChat.Api/ SoulChat.Api/

RUN dotnet publish SoulChat.Api/SoulChat.Api.csproj \
    -c Release -o /app/publish --no-restore

# ─── migrate ─────────────────────────────────────────────────────────────────
# Stage aparte para aplicar migraciones como un paso propio (docker-compose lo
# usa como job de un solo uso). Necesita el SDK + código fuente, no la imagen
# de runtime publicada. La versión de dotnet-ef se fija igual a
# Microsoft.EntityFrameworkCore.Design para evitar desalineaciones.
FROM build AS migrate
RUN dotnet tool install --global dotnet-ef --version 9.0.4
ENV PATH="$PATH:/root/.dotnet/tools"
WORKDIR /src
ENTRYPOINT ["dotnet", "ef", "database", "update", \
    "--project", "SoulChat.Infrastructure", \
    "--startup-project", "SoulChat.Api"]

# ─── runtime ─────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .
# La imagen oficial ya trae un usuario sin privilegios ("app"); no hace
# falta crear uno propio.
USER $APP_UID

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_EnableDiagnostics=0
EXPOSE 8080

ENTRYPOINT ["dotnet", "SoulChat.Api.dll"]

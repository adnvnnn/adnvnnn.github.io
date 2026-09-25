# Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

COPY ["Portfolio/Portfolio.csproj", "Portfolio/"]

RUN dotnet restore "Portfolio/Portfolio.csproj"

COPY . .

RUN dotnet publish "Portfolio/Portfolio.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore


# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_HTTP_PORTS=8080

EXPOSE 8080

ENTRYPOINT ["dotnet", "Portfolio.dll"]
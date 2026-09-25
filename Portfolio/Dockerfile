# Build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY ["Portfolio.csproj", "./"]

RUN dotnet restore "Portfolio.csproj"

COPY . .

RUN dotnet publish "Portfolio.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore


# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_HTTP_PORTS=8080

EXPOSE 8080

ENTRYPOINT ["dotnet", "Portfolio.dll"]
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Portfolio.Models;
using Portfolio.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<SiteOptions>(builder.Configuration.GetSection(SiteOptions.SectionName));
builder.Services.Configure<MailOptions>(builder.Configuration.GetSection(MailOptions.SectionName));
builder.Services.AddSingleton<ContactMailer>();

builder.Services.AddRazorPages();
builder.Services.AddResponseCompression(options => options.EnableForHttps = true);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("contact", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

// Friendly error pages for the site; the JSON API keeps its plain status codes.
app.UseWhen(
    context => !context.Request.Path.StartsWithSegments("/api"),
    branch => branch.UseStatusCodePagesWithReExecute("/Error", "?code={0}"));
app.UseHttpsRedirection();
app.UseResponseCompression();

app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    headers["Content-Security-Policy"] = "frame-ancestors 'none'";
    await next();
});

app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        // Files requested with a ?v= content hash (asp-append-version) never change under
        // that URL, so they can be cached for a year. Fonts are effectively immutable too.
        var versioned = context.Context.Request.Query.ContainsKey("v")
            || context.File.Name.EndsWith(".woff2", StringComparison.OrdinalIgnoreCase);

        // The scripts import each other by plain path (./util.js), so those requests cannot carry a hash.
        // A cached copy of one module next to a fresh copy of another breaks the whole module graph (a
        // moved export is a SyntaxError and then no script runs, carousel included), so they are
        // revalidated on every load; a 304 costs next to nothing.
        var module = context.File.Name.EndsWith(".js", StringComparison.OrdinalIgnoreCase);

        context.Context.Response.Headers.CacheControl = versioned
            ? "public,max-age=31536000,immutable"
            : module ? "no-cache" : "public,max-age=3600";
    }
});

app.UseRouting();
app.UseRateLimiter();

app.MapRazorPages();

app.MapPost("/api/contact", async Task<Results<Ok<ContactResult>, BadRequest<ContactResult>, StatusCodeHttpResult>> (
        ContactRequest request,
        ContactMailer mailer,
        ILogger<Program> logger,
        CancellationToken cancellationToken) =>
    {
        // Honeypot: bots fill every field. Pretend success, deliver nothing.
        if (!string.IsNullOrWhiteSpace(request.Website))
        {
            return TypedResults.Ok(new ContactResult(true, null));
        }

        var errors = request.Validate();
        if (errors.Count > 0)
        {
            return TypedResults.BadRequest(new ContactResult(false, errors));
        }

        if (!mailer.IsConfigured)
        {
            // Nothing to deliver with: let the client fall back to the visitor's mail app.
            return TypedResults.StatusCode(StatusCodes.Status501NotImplemented);
        }

        try
        {
            await mailer.SendAsync(request, cancellationToken);
            return TypedResults.Ok(new ContactResult(true, null));
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Contact message could not be delivered");
            return TypedResults.StatusCode(StatusCodes.Status502BadGateway);
        }
    })
    .RequireRateLimiting("contact");

app.Run();

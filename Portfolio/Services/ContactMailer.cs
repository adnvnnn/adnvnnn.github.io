using System.Net;
using System.Net.Mail;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace Portfolio.Services;

public sealed class MailOptions
{
    public const string SectionName = "Mail";

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string User { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string From { get; set; } = string.Empty;
    public string To { get; set; } = string.Empty;
}

public sealed record ContactRequest(string? Name, string? Email, string? Subject, string? Message, string? Website)
{
    private static readonly Regex EmailPattern = new(
        @"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant,
        TimeSpan.FromMilliseconds(100));

    public Dictionary<string, string> Validate()
    {
        var errors = new Dictionary<string, string>();

        if (string.IsNullOrWhiteSpace(Name) || Name.Trim().Length > 100)
            errors["name"] = "Please tell me your name.";

        if (string.IsNullOrWhiteSpace(Email) || Email.Length > 200 || !EmailPattern.IsMatch(Email.Trim()))
            errors["email"] = "Please enter a valid e-mail address.";

        if (string.IsNullOrWhiteSpace(Subject) || Subject.Trim().Length > 150)
            errors["subject"] = "Please add a short subject.";

        if (string.IsNullOrWhiteSpace(Message) || Message.Trim().Length < 10 || Message.Length > 5000)
            errors["message"] = "Please write at least a few words.";

        return errors;
    }
}

public sealed record ContactResult(bool Ok, Dictionary<string, string>? Errors);

/// <summary>Sends contact-form messages through the configured SMTP server.</summary>
public sealed class ContactMailer(IOptions<MailOptions> options)
{
    private readonly MailOptions _options = options.Value;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_options.Host) &&
        !string.IsNullOrWhiteSpace(_options.To) &&
        !string.IsNullOrWhiteSpace(string.IsNullOrWhiteSpace(_options.From) ? _options.User : _options.From);

    public async Task SendAsync(ContactRequest request, CancellationToken cancellationToken)
    {
        var from = string.IsNullOrWhiteSpace(_options.From) ? _options.User : _options.From;

        using var message = new MailMessage(from, _options.To)
        {
            Subject = $"[Portfolio] {Clean(request.Subject)}",
            Body = $"From: {Clean(request.Name)} <{Clean(request.Email)}>{Environment.NewLine}{Environment.NewLine}{request.Message!.Trim()}",
            IsBodyHtml = false
        };
        message.ReplyToList.Add(new MailAddress(request.Email!.Trim(), Clean(request.Name)));

        using var client = new SmtpClient(_options.Host, _options.Port)
        {
            EnableSsl = _options.EnableSsl,
            Credentials = string.IsNullOrWhiteSpace(_options.User)
                ? CredentialCache.DefaultNetworkCredentials
                : new NetworkCredential(_options.User, _options.Password)
        };

        await client.SendMailAsync(message, cancellationToken);
    }

    /// <summary>Single-line, trimmed value that cannot inject extra mail headers.</summary>
    private static string Clean(string? value) =>
        (value ?? string.Empty).Replace("\r", " ").Replace("\n", " ").Trim();
}

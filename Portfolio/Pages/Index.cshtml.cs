using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Options;
using Portfolio.Models;

namespace Portfolio.Pages;

public class IndexModel(IOptions<SiteOptions> options) : PageModel
{
    public static readonly string[] Sections = ["home", "profile", "projects", "contact"];

    public SiteOptions Site { get; } = options.Value;

    /// <summary>The section the server renders as visible; the client router takes over afterwards.</summary>
    public string ActivePage { get; private set; } = "home";

    public string TitleFor(string section) => section switch
    {
        "profile" => $"Profile · {Site.Owner.FullName}",
        "projects" => $"Projects · {Site.Owner.FullName}",
        "contact" => $"Contact · {Site.Owner.FullName}",
        _ => $"{Site.Owner.FullName} · {Site.Owner.Role}"
    };

    public IActionResult OnGet(string? section)
    {
        var key = string.IsNullOrWhiteSpace(section) ? "home" : section.Trim().ToLowerInvariant();
        if (!Sections.Contains(key))
        {
            return NotFound();
        }

        ActivePage = key;
        return Page();
    }
}

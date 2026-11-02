using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace Portfolio.Helpers;

public static class IconHelper
{
    // Icons drawn as solid shapes; everything else is an outline icon (see wwwroot/css/base.css).
    private static readonly HashSet<string> Filled = new(StringComparer.OrdinalIgnoreCase)
    {
        "github", "telegram", "linkedin", "instagram", "fire"
    };

    private static readonly HashSet<string> Known = new(StringComparer.OrdinalIgnoreCase)
    {
        "home", "user", "grid", "call", "sound", "sound-off", "chevron-left", "chevron-right",
        "arrow-up-right", "check", "mail", "phone", "pin", "clock", "copy", "download", "send",
        "python", "css3", "java", "code", "github", "telegram", "linkedin", "instagram", "fire"
    };

    /// <summary>Renders an inline SVG that references a symbol of the page's icon sprite.</summary>
    public static IHtmlContent Icon(this IHtmlHelper html, string? name, string? cssClass = null)
    {
        var id = Known.Contains(name ?? string.Empty) ? name!.ToLowerInvariant() : "code";
        var classes = "icon" + (Filled.Contains(id) ? " icon--fill" : "") +
                      (string.IsNullOrWhiteSpace(cssClass) ? "" : " " + cssClass);

        return new HtmlString(
            $"<svg class=\"{classes}\" aria-hidden=\"true\" focusable=\"false\"><use href=\"#i-{id}\"></use></svg>");
    }
}

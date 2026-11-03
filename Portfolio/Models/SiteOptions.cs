namespace Portfolio.Models;

/// <summary>
/// All editable site content. Bound from the "Site" section of appsettings.json,
/// so copy, links and projects can be changed without touching markup or code.
/// </summary>
public sealed class SiteOptions
{
    public const string SectionName = "Site";

    public OwnerOptions Owner { get; set; } = new();
    public ContactOptions Contact { get; set; } = new();
    public List<SocialLink> Social { get; set; } = [];

    /// <summary>The liquid skill tiles on the Profile page; the top three by level also feed the Home page bars.</summary>
    public List<SkillItem> Skills { get; set; } = [];

    // No defaults on collections: the configuration binder appends to them instead of replacing.
    public List<string> ProjectFilters { get; set; } = [];

    /// <summary>
    /// Listed newest first. The first one is the "Featured Project" on first paint and the
    /// "My Latest Project" teaser on the Home page.
    /// </summary>
    public List<ProjectItem> Projects { get; set; } = [];

    public ProjectItem? FindProject(string? id) =>
        Projects.FirstOrDefault(p => string.Equals(p.Id, id, StringComparison.OrdinalIgnoreCase));
}

public sealed class OwnerOptions
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Pitch { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public string ResumeUrl { get; set; } = string.Empty;

    public int CopyrightYear => DateTime.UtcNow.Year;

    public string FullName => $"{FirstName} {LastName}".Trim();
}

public sealed class ContactOptions
{
    public string Subtitle { get; set; } = string.Empty;
    public string Intro { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Availability { get; set; } = string.Empty;
    public string AvailabilityBadge { get; set; } = "Available";
}

public sealed class SocialLink
{
    public string Name { get; set; } = string.Empty;

    /// <summary>Icon id from the sprite: github, linkedin, telegram, instagram.</summary>
    public string Icon { get; set; } = string.Empty;

    public string Url { get; set; } = "#";

    /// <summary>Pages that show this link ("home", "contact"). Empty means every page.</summary>
    public List<string> Show { get; set; } = [];

    public bool ShowsOn(string page) =>
        Show.Count == 0 || Show.Contains(page, StringComparer.OrdinalIgnoreCase);
}

public sealed class SkillItem
{
    public string Name { get; set; } = string.Empty;

    /// <summary>0-100.</summary>
    public int Level { get; set; }

    /// <summary>Icon id from the sprite: python, css3, java, …</summary>
    public string Icon { get; set; } = string.Empty;
}

public sealed class ProjectItem
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;

    /// <summary>Any of <see cref="SiteOptions.ProjectFilters"/> (other than "All"); the project shows under each.</summary>
    public List<string> Categories { get; set; } = [];

    public List<string> Tags { get; set; } = [];

    /// <summary>Thumbnail used by the project list and the Home page card.</summary>
    public string Cover { get; set; } = string.Empty;

    /// <summary>Slides of the featured carousel. Falls back to <see cref="Cover"/>.</summary>
    public List<string> Images { get; set; } = [];

    public string LiveUrl { get; set; } = string.Empty;
    public string SourceUrl { get; set; } = string.Empty;

    public IReadOnlyList<string> Slides => Images.Count > 0 ? Images : [Cover];
}

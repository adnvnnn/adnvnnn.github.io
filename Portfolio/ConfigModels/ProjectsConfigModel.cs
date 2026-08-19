namespace Portfolio.ConfigModels;

public class ProjectItem
{
    public int Id { get; set; }
    public string? Title { get; set; }
    public List<int>? CategoryIds { get; set; }
    public string? Description { get; set; }
    public string? Image { get; set; }
    public string? Link { get; set; }
    public List<string>? OtherImages { get; set; }
    public List<string>? Tags { get; set; }
}

public class ProjectsConfigModel
{
    public static List<ProjectItem>? Items { get; set; }
}

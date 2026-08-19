namespace Portfolio.ConfigModels;

public class SkillItem
{
    public string? Name { get; set; }
    public int Percent { get; set; }
}

public class SkillsConfigModel
{
    public static List<SkillItem>? Items { get; set; }
}

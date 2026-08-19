namespace Portfolio.ConfigModels;

public class CategoryItem
{
    public int Id { get; set; }
    public string? Name { get; set; }
}

public class CategoriesConfigModel
{
    public static List<CategoryItem>? Items { get; set; }
}

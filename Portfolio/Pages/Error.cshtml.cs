using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Portfolio.Pages;

[IgnoreAntiforgeryToken]
public class ErrorModel : PageModel
{
    public int Code { get; private set; } = 500;

    public void OnGet(int? code)
    {
        Code = code is >= 400 and < 600 ? code.Value : 500;
    }
}

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using queensin.api.Data;

namespace queensin.api.Features.Media;

/// <summary>
/// One-off operator command: <c>dotnet queensin.api.dll import-media manifest.json</c>.
/// Downloads each image in the manifest over HTTPS and runs it through the normal WebP pipeline.
/// Idempotent: an image whose key is already in the library (matched on FileName) is skipped,
/// so a failed run can simply be repeated. Prints "key=id" lines for wiring images to rooms and slides.
/// </summary>
public static class MediaImporter
{
    public const string Command = "import-media";

    private sealed record Entry(string Key, string Url, string? Category, string? Alt, string? Caption);

    public static async Task<int> RunAsync(IServiceProvider services, string manifestPath)
    {
        if (!File.Exists(manifestPath)) { Console.Error.WriteLine($"Manifest not found: {manifestPath}"); return 2; }
        var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var entries = JsonSerializer.Deserialize<List<Entry>>(await File.ReadAllTextAsync(manifestPath), opts) ?? [];

        await using var scope = services.CreateAsyncScope();
        var media = scope.ServiceProvider.GetRequiredService<IMediaService>();
        var db = scope.ServiceProvider.GetRequiredService<QueensInnDbContext>();
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };
        http.DefaultRequestHeaders.UserAgent.ParseAdd("queensin-importer/1.0");

        var failed = 0;
        foreach (var e in entries)
        {
            try
            {
                var existing = await db.MediaAssets.AsNoTracking().Where(m => m.FileName == e.Key).Select(m => m.MediaId).FirstOrDefaultAsync();
                if (existing != 0) { Console.WriteLine($"{e.Key}={existing}"); continue; }

                if (!Uri.TryCreate(e.Url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
                    throw new InvalidOperationException("URL must be https.");
                await using var stream = await http.GetStreamAsync(uri);
                var dto = await media.SaveImageAsync(stream, e.Key, e.Category, e.Alt, e.Caption, actorId: null);
                Console.WriteLine($"{e.Key}={dto.Id}");
            }
            catch (Exception ex)
            {
                failed++;
                Console.Error.WriteLine($"FAILED {e.Key}: {ex.Message}");
            }
        }
        return failed == 0 ? 0 : 1;
    }
}

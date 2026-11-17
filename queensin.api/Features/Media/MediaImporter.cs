using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using queensin.api.Data;
using queensin.api.Features.Site;

namespace queensin.api.Features.Media;

/// <summary>
/// One-off operator command: <c>dotnet queensin.api.dll import-media manifest.json</c>.
/// Brings each manifest entry into the media library. An entry has either <c>file</c> (a path relative to the
/// manifest, shipped with the release) or <c>url</c> (https download), and <c>kind</c> "image" (default, runs
/// through the normal WebP pipeline), "video" (a short MP4/WebM stored as is) or "favicon" (becomes the site's
/// favicon through the same resizer the admin uses; skipped while a favicon is already set).
/// Idempotent: an entry whose key is already in the library (matched on FileName) is skipped,
/// so a failed run can simply be repeated. <c>--replace=key1,key2</c> deletes and re-imports just those keys,
/// <c>--replace=all</c> every key in the manifest (use after changing the pipeline or swapping the photos).
/// Prints "key=id" lines for wiring images to rooms and slides.
/// </summary>
public static class MediaImporter
{
    public const string Command = "import-media";
    public const string ReplaceAll = "all";

    private sealed record Entry(string Key, string? Url, string? File, string? Kind, string? Category, string? Alt, string? Caption);

    public static async Task<int> RunAsync(IServiceProvider services, string manifestPath, IReadOnlySet<string>? replaceKeys = null)
    {
        if (!File.Exists(manifestPath)) { Console.Error.WriteLine($"Manifest not found: {manifestPath}"); return 2; }
        var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var entries = JsonSerializer.Deserialize<List<Entry>>(await File.ReadAllTextAsync(manifestPath), opts) ?? [];
        var baseDir = Path.GetDirectoryName(Path.GetFullPath(manifestPath))!;
        var replaceEvery = replaceKeys?.Contains(ReplaceAll) == true;

        await using var scope = services.CreateAsyncScope();
        var media = scope.ServiceProvider.GetRequiredService<IMediaService>();
        var db = scope.ServiceProvider.GetRequiredService<QueensInnDbContext>();
        var favicon = scope.ServiceProvider.GetRequiredService<IFaviconService>();
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };
        http.DefaultRequestHeaders.UserAgent.ParseAdd("queensin-importer/1.0");

        var failed = 0;
        foreach (var e in entries)
        {
            try
            {
                if (string.Equals(e.Kind, "favicon", StringComparison.OrdinalIgnoreCase))
                {
                    var current = await db.SiteSettings.AsNoTracking().Where(s => s.SettingKey == FaviconService.SettingKey).Select(s => s.SettingValue).FirstOrDefaultAsync();
                    if (!string.IsNullOrEmpty(current) && !replaceEvery && replaceKeys?.Contains(e.Key) != true) { Console.WriteLine($"{e.Key}={current}"); continue; }
                    await using var icon = await OpenAsync(e, baseDir, http);
                    var url = await favicon.SetAsync(null, icon);
                    Console.WriteLine($"{e.Key}={url}");
                    Console.Error.WriteLine($"imported {e.Key}");
                    continue;
                }

                var existing = await db.MediaAssets.AsNoTracking().Where(m => m.FileName == e.Key).Select(m => m.MediaId).FirstOrDefaultAsync();
                if (existing != 0 && (replaceEvery || replaceKeys?.Contains(e.Key) == true))
                {
                    await media.DeleteAsync(null, existing);      // FKs null out slides/rooms/slots; link-media.sql relinks them
                    Console.Error.WriteLine($"replaced {e.Key} (was {existing})");
                    existing = 0;
                }
                if (existing != 0) { Console.WriteLine($"{e.Key}={existing}"); continue; }

                var isVideo = string.Equals(e.Kind, "video", StringComparison.OrdinalIgnoreCase);
                await using var stream = await OpenAsync(e, baseDir, http);
                var dto = isVideo
                    ? await media.SaveVideoAsync(stream, e.Key, e.Category, e.Alt, e.Caption, actorId: null)
                    : await media.SaveImageAsync(stream, e.Key, e.Category, e.Alt, e.Caption, actorId: null);
                Console.WriteLine($"{e.Key}={dto.Id}");
                Console.Error.WriteLine($"imported {e.Key}");      // deploy.sh links the seed photos only when this appears
            }
            catch (Exception ex)
            {
                failed++;
                Console.Error.WriteLine($"FAILED {e.Key}: {ex.Message}");
            }
        }
        return failed == 0 ? 0 : 1;
    }

    private static async Task<Stream> OpenAsync(Entry e, string baseDir, HttpClient http)
    {
        if (!string.IsNullOrWhiteSpace(e.File))
        {
            // The file must stay inside the manifest's folder: a manifest is trusted, but a typo should not read elsewhere.
            var full = Path.GetFullPath(Path.Combine(baseDir, e.File));
            if (!full.StartsWith(baseDir + Path.DirectorySeparatorChar, StringComparison.Ordinal))
                throw new InvalidOperationException("File must be inside the manifest's folder.");
            if (!File.Exists(full)) throw new FileNotFoundException($"File not found: {e.File}");
            return new FileStream(full, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true);
        }
        if (!Uri.TryCreate(e.Url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
            throw new InvalidOperationException("Give either a file or an https URL.");
        return await http.GetStreamAsync(uri);
    }
}

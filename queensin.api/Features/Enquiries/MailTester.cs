using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace queensin.api.Features.Enquiries;

/// <summary>
/// One-off operator command: <c>dotnet queensin.api.dll test-email you@example.com</c>.
/// Sends a short message with the same Smtp:* settings the enquiry notifications use, and says plainly what went wrong
/// if it cannot (wrong host or port, rejected login, blocked sender). The password is never printed.
/// </summary>
public static class MailTester
{
    public const string Command = "test-email";

    public static async Task<int> RunAsync(IServiceProvider services, string to)
    {
        var config = services.GetRequiredService<IConfiguration>();
        var host = config["Smtp:Host"];
        if (string.IsNullOrWhiteSpace(host)) { Console.Error.WriteLine("Smtp:Host is not set, so no enquiry emails can be sent."); return 2; }
        if (!MailboxAddress.TryParse(to, out var recipient)) { Console.Error.WriteLine($"“{to}” is not a valid email address."); return 2; }

        var port = config.GetValue<int?>("Smtp:Port") ?? 587;
        var user = config["Smtp:User"];
        var from = config["Smtp:From"] ?? user ?? to;
        Console.WriteLine($"Server {host}:{port} ({(port == 465 ? "SSL" : "STARTTLS")}), login {(string.IsNullOrWhiteSpace(user) ? "(none)" : user)}, from {from}, to {recipient.Address}");

        try
        {
            var msg = new MimeMessage();
            msg.From.Add(new MailboxAddress("Queen's Inn website", from));
            msg.To.Add(recipient);
            msg.Subject = "[Queen's Inn] Test email from the website";
            msg.Body = new TextPart("plain")
            {
                Text = "This is a test from the Queen's Inn website.\n\nIf you can read it, new enquiries from the website's forms will be emailed to the staff address in Site settings.",
            };

            using var smtp = new SmtpClient { Timeout = 20000 };
            await smtp.ConnectAsync(host, port, port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls);
            Console.WriteLine("Connected.");
            if (!string.IsNullOrWhiteSpace(user)) { await smtp.AuthenticateAsync(user, config["Smtp:Password"]); Console.WriteLine("Login accepted."); }
            await smtp.SendAsync(msg);
            await smtp.DisconnectAsync(true);
            Console.WriteLine("Sent. Check the inbox (and the spam folder) of " + recipient.Address + ".");
            return 0;
        }
        catch (AuthenticationException ex) { Console.Error.WriteLine("The mail server rejected the login: " + ex.Message + " (check the mailbox name and password)."); return 1; }
        catch (Exception ex) { Console.Error.WriteLine($"Could not send ({ex.GetType().Name}): {ex.Message}"); return 1; }
    }
}

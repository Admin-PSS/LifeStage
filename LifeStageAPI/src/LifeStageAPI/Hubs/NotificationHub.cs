// src/LifeStageAPI/Hubs/NotificationHub.cs
// Replace your existing NotificationHub.cs with this file.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using LifeStageAPI.DTOs;

namespace LifeStageAPI.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    // Each connected user joins a group named after their userId
    // so we can push to a specific user from any controller.
    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrEmpty(userId))
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        if (!string.IsNullOrEmpty(userId))
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);

        await base.OnDisconnectedAsync(exception);
    }

    // ── Static helper called by controllers ───────────────────────────────────
    // Usage: await NotificationHub.SendNotificationToUser(_hub, recipientUserId, dto);
    public static async Task SendNotificationToUser(
        IHubContext<NotificationHub> hub,
        string recipientUserId,
        NotificationDto notification)
    {
        await hub.Clients
            .Group(recipientUserId)
            .SendAsync("ReceiveNotification", notification);
    }
}

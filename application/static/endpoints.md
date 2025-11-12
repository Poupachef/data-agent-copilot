🖥️ Sessions
Control WhatsApp sessions (accounts)



GET
/api/sessions
List all sessions



POST
/api/sessions
Create a session



GET
/api/sessions/{session}
Get session information



PUT
/api/sessions/{session}
Update a session



DELETE
/api/sessions/{session}
Delete the session



GET
/api/sessions/{session}/me
Get information about the authenticated account



POST
/api/sessions/{session}/start
Start the session



POST
/api/sessions/{session}/stop
Stop the session



POST
/api/sessions/{session}/logout
Logout from the session



POST
/api/sessions/{session}/restart
Restart the session



POST
/api/sessions/start
Upsert and Start session



POST
/api/sessions/stop
Stop (and Logout if asked) session



POST
/api/sessions/logout
Logout and Delete session.


🧩 Apps
Applications (built-in integrations)



GET
/api/apps
List all apps for a session



POST
/api/apps
Create a new app



PUT
/api/apps/{id}
Update an existing app



DELETE
/api/apps/{id}
Delete an app


🔑 Auth
Authentication



GET
/api/{session}/auth/qr
Get QR code for pairing WhatsApp API.



POST
/api/{session}/auth/request-code
Request authentication code.


🆔 Profile
Your profile information



GET
/api/{session}/profile
Get my profile



PUT
/api/{session}/profile/name
Set my profile name



PUT
/api/{session}/profile/status
Set profile status (About)



PUT
/api/{session}/profile/picture
Set profile picture



DELETE
/api/{session}/profile/picture
Delete profile picture


🖼️ Screenshot
Get screenshot of WhatsApp and show QR code



GET
/api/screenshot


📤 Chatting
Chatting methods



POST
/api/sendText
Send a text message



GET
/api/sendText
Send a text message



POST
/api/sendImage
Send an image



POST
/api/sendFile
Send a file



POST
/api/sendVoice
Send an voice message



POST
/api/sendVideo
Send a video



POST
/api/send/link-custom-preview
Send a text message with a CUSTOM link preview.



POST
/api/sendButtons
Send buttons (interactive message)



POST
/api/forwardMessage



POST
/api/sendSeen



POST
/api/startTyping



POST
/api/stopTyping



PUT
/api/reaction
React to a message with an emoji



PUT
/api/star
Star or unstar a message



POST
/api/sendPoll
Send a poll with options



POST
/api/sendLocation



POST
/api/sendContactVcard



POST
/api/send/buttons/reply
Reply on a button message



GET
/api/messages
Get messages in a chat



GET
/api/checkNumberStatus
Check number status



POST
/api/reply
DEPRECATED - you can set "reply_to" field when sending text, image, etc



POST
/api/sendLinkPreview


📢 Channels
Channels (newsletters) methods



GET
/api/{session}/channels
Get list of know channels



POST
/api/{session}/channels
Create a new channel.



DELETE
/api/{session}/channels/{id}
Delete the channel.



GET
/api/{session}/channels/{id}
Get the channel info



GET
/api/{session}/channels/{id}/messages/preview
Preview channel messages



POST
/api/{session}/channels/{id}/follow
Follow the channel.



POST
/api/{session}/channels/{id}/unfollow
Unfollow the channel.



POST
/api/{session}/channels/{id}/mute
Mute the channel.



POST
/api/{session}/channels/{id}/unmute
Unmute the channel.



POST
/api/{session}/channels/search/by-view
Search for channels (by view)



POST
/api/{session}/channels/search/by-text
Search for channels (by text)



GET
/api/{session}/channels/search/views
Get list of views for channel search



GET
/api/{session}/channels/search/countries
Get list of countries for channel search



GET
/api/{session}/channels/search/categories
Get list of categories for channel search


🟢 Status
Status (aka stories) methods



POST
/api/{session}/status/text
Send text status



POST
/api/{session}/status/image
Send image status



POST
/api/{session}/status/voice
Send voice status



POST
/api/{session}/status/video
Send video status



POST
/api/{session}/status/delete
DELETE sent status



GET
/api/{session}/status/new-message-id
Generate message ID you can use to batch contacts


💬 Chats
Chats methods



GET
/api/{session}/chats
Get chats



GET
/api/{session}/chats/overview
Get chats overview. Includes all necessary things to build UI "your chats overview" page - chat id, name, picture, last message. Sorting by last message timestamp



POST
/api/{session}/chats/overview
Get chats overview. Use POST if you have too many "ids" params - GET can limit it



DELETE
/api/{session}/chats/{chatId}
Deletes the chat



GET
/api/{session}/chats/{chatId}/picture
Gets chat picture



GET
/api/{session}/chats/{chatId}/messages
Gets messages in the chat



DELETE
/api/{session}/chats/{chatId}/messages
Clears all messages from the chat



POST
/api/{session}/chats/{chatId}/messages/read
Read unread messages in the chat



GET
/api/{session}/chats/{chatId}/messages/{messageId}
Gets message by id



DELETE
/api/{session}/chats/{chatId}/messages/{messageId}
Deletes a message from the chat



PUT
/api/{session}/chats/{chatId}/messages/{messageId}
Edits a message in the chat



POST
/api/{session}/chats/{chatId}/messages/{messageId}/pin
Pins a message in the chat



POST
/api/{session}/chats/{chatId}/messages/{messageId}/unpin
Unpins a message in the chat



POST
/api/{session}/chats/{chatId}/archive
Archive the chat



POST
/api/{session}/chats/{chatId}/unarchive
Unarchive the chat



POST
/api/{session}/chats/{chatId}/unread
Unread the chat


👤 Contacts
Contacts methods.
Use phone number (without +) or phone number and @c.us at the end as contactId.
'E.g: 12312312310 OR 12312312310@c.us



GET
/api/contacts/all
Get all contacts



GET
/api/contacts
Get contact basic info



GET
/api/contacts/check-exists
Check phone number is registered in WhatsApp.



GET
/api/contacts/about
Gets the Contact's "about" info



GET
/api/contacts/profile-picture
Get contact's profile picture URL



POST
/api/contacts/block
Block contact



POST
/api/contacts/unblock
Unblock contact



GET
/api/{session}/lids
Get all known lids to phone number mapping



GET
/api/{session}/lids/count
Get the number of known lids



GET
/api/{session}/lids/{lid}
Get phone number by lid



GET
/api/{session}/lids/pn/{phoneNumber}
Get lid by phone number (chat id)


👥 Groups
Groups methods.



POST
/api/{session}/groups
Create a new group.



GET
/api/{session}/groups
Get all groups.



GET
/api/{session}/groups/join-info
Get info about the group before joining.



POST
/api/{session}/groups/join
Join group via code



GET
/api/{session}/groups/count
Get the number of groups.



POST
/api/{session}/groups/refresh
Refresh groups from the server.



GET
/api/{session}/groups/{id}
Get the group.



DELETE
/api/{session}/groups/{id}
Delete the group.



POST
/api/{session}/groups/{id}/leave
Leave the group.



GET
/api/{session}/groups/{id}/picture
Get group picture



PUT
/api/{session}/groups/{id}/picture
Set group picture



DELETE
/api/{session}/groups/{id}/picture
Delete group picture



PUT
/api/{session}/groups/{id}/description
Updates the group description.



PUT
/api/{session}/groups/{id}/subject
Updates the group subject



PUT
/api/{session}/groups/{id}/settings/security/info-admin-only
Updates the group "info admin only" settings.



GET
/api/{session}/groups/{id}/settings/security/info-admin-only
Get the group's 'info admin only' settings.



PUT
/api/{session}/groups/{id}/settings/security/messages-admin-only
Update settings - who can send messages



GET
/api/{session}/groups/{id}/settings/security/messages-admin-only
Get settings - who can send messages



GET
/api/{session}/groups/{id}/invite-code
Gets the invite code for the group.



POST
/api/{session}/groups/{id}/invite-code/revoke
Invalidates the current group invite code and generates a new one.



GET
/api/{session}/groups/{id}/participants
Get participants



POST
/api/{session}/groups/{id}/participants/add
Add participants



POST
/api/{session}/groups/{id}/participants/remove
Remove participants



POST
/api/{session}/groups/{id}/admin/promote
Promote participants to admin users.



POST
/api/{session}/groups/{id}/admin/demote
Demotes participants to regular users.


✅ Presence
Presence information



POST
/api/{session}/presence
Set session presence



GET
/api/{session}/presence
Get all subscribed presence information.



GET
/api/{session}/presence/{chatId}
Get the presence for the chat id. If it hasn't been subscribed - it also subscribes to it.



POST
/api/{session}/presence/{chatId}/subscribe
Subscribe to presence events for the chat.


📅 Events
Event Message



POST
/api/{session}/events
Send an event message


🏷️ Labels
Labels - available only for WhatsApp Business accounts



GET
/api/{session}/labels
Get all labels



POST
/api/{session}/labels
Create a new label



PUT
/api/{session}/labels/{labelId}
Update a label



DELETE
/api/{session}/labels/{labelId}
Delete a label



GET
/api/{session}/labels/chats/{chatId}
Get labels for the chat



PUT
/api/{session}/labels/chats/{chatId}
Save labels for the chat



GET
/api/{session}/labels/{labelId}/chats
Get chats by label


🖼️ Media
Media methods



POST
/api/{session}/media/convert/voice
Convert voice to WhatsApp format (opus)



POST
/api/{session}/media/convert/video
Convert video to WhatsApp format (mp4)


🔍 Observability
Other methods



GET
/ping
Ping the server



GET
/health
Check the health of the server



GET
/api/server/version
Get the version of the server



GET
/api/server/environment
Get the server environment



GET
/api/server/status
Get the server status



POST
/api/server/stop
Stop (and restart) the server



GET
/api/server/debug/heapsnapshot
Return a heapsnapshot for the current nodejs process



GET
/api/server/debug/browser/trace/{session}
Collect and get a trace.json for Chrome DevTools



GET
/api/version
Get the server version


🗄️ Storage
Storage methods


Webhooks

POST
session.status
The event is triggered when the session status changes.


POST
message
Incoming message.


POST
message.reaction
The event is triggered when a user reacts or removes a reaction.


POST
message.any
Fired on all message creations, including your own.


POST
message.ack
Receive events when server or recipient gets the message, read or played it.


POST
message.revoked
The event is triggered when a user, whether it be you or any other participant, revokes a previously sent message.


POST
message.edited
The event is triggered when a user edits a previously sent message.


POST
group.v2.join
When you joined or were added to a group


POST
group.v2.leave
When you left or were removed from a group


POST
group.v2.update
When group info is updated


POST
group.v2.participants
When participants changed - join, leave, promote to admin


POST
presence.update
The most recent presence information for a chat.


POST
poll.vote
With this event, you receive new votes for the poll sent.


POST
poll.vote.failed
There may be cases when it fails to decrypt a vote from the user. Read more about how to handle such events in the documentations.


POST
chat.archive
The event is triggered when the chat is archived or unarchived


POST
call.received
The event is triggered when the call is received by the user.


POST
call.accepted
The event is triggered when the call is accepted by the user.


POST
call.rejected
The event is triggered when the call is rejected by the user.


POST
label.upsert
The event is triggered when a label is created or updated


POST
label.deleted
The event is triggered when a label is deleted


POST
label.chat.added
The event is triggered when a label is added to a chat


POST
label.chat.deleted
The event is triggered when a label is deleted from a chat


POST
event.response
The event is triggered when the event response is received.


POST
event.response.failed
The event is triggered when the event response is failed to decrypt.


POST
engine.event
Internal engine event.



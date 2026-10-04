# Convex Security Standard

This file defines the endpoint exposure classes used in Oxformals:

- `PublicOpen`: callable without authentication, returns only redacted/public data.
- `PublicAuthed`: callable from clients, requires authenticated and authorized user context.
- `InternalOnly`: never callable by clients; only via Convex internal calls, cron, or scheduler.

## Endpoint Inventory

The list below classifies every exported function in `convex/*.ts` (excluding `convex/_generated/**` examples).

### `users.ts`

- `current` (`query`): `PublicAuthed`
- `listPublic` (`query`): `PublicAuthed` — signed-out callers get `[]`; private accounts only appear to themselves and active followers.
- `listForChatPicker` (`query`): `PublicAuthed`
- `getPublicByIds` (`query`): `PublicAuthed` — signed-out callers get `[]`; a private account the viewer can't see activity for is limited to name, college, year, role (`sanitizeLimitedUser`).
- `myWishlist` (`query`): `PublicAuthed`
- `completeOnboarding` (`mutation`): `PublicAuthed`
- `agreeToRules` (`mutation`): `PublicAuthed`
- `patchProfile` (`mutation`): `PublicAuthed`
- `getPublicProfile` (`query`): `PublicOpen` — contact details (`instagramHandle`, `whatsappPhone`) and `dietaryRequirements` (PII) are revealed only to the profile owner or a matched counterparty; anonymous/other callers get the redacted profile.
- `toggleWishlistCollege` (`mutation`): `PublicAuthed`
- `saveWishlistColleges` (`mutation`): `PublicAuthed`
- `backfillEmailNotifications` (`internalMutation`): `InternalOnly`
- `backfillCollegeWishlists` (`internalMutation`): `InternalOnly`
- `backfillDietaryRequirements` (`internalMutation`): `InternalOnly`
- `backfillUiFont` (`internalMutation`): `InternalOnly`
- `backfillSubject` (`internalMutation`): `InternalOnly`

### `listings.ts`

- `listListings` (`query`): `PublicOpen`
- `listMyListings` (`query`): `PublicAuthed`
- `listUpcomingPublic` (`query`): `PublicOpen` — private hosts limited.
- `listActiveListingsForCollege` (`query`): `PublicOpen`
- `listActiveHostsForCollege` (`query`): `PublicOpen` — hosts of that college's open listings for signed-out visitors; private hosts limited.
- `listRequestsForMe` (`query`): `PublicAuthed`
- `listRequestsFromMe` (`query`): `PublicAuthed`
- `createListing` (`mutation`): `PublicAuthed`
- `createRequest` (`mutation`): `PublicAuthed`
- `declineRequest` (`mutation`): `PublicAuthed`
- `withdrawRequest` (`mutation`): `PublicAuthed`
- `acceptRequest` (`mutation`): `PublicAuthed`
- `leaveGroup` (`mutation`): `PublicAuthed`
- `releaseGuestSeat` (`mutation`): `PublicAuthed`
- `removeMember` (`mutation`): `PublicAuthed`
- `updateListing` (`mutation`): `PublicAuthed`
- `expirePastListings` (`internalMutation`): `InternalOnly`
- `backfillMenu` (`internalMutation`): `InternalOnly`
- `backfillListingTypeSwap` (`internalMutation`): `InternalOnly`
- `backfillListingAndRequestTypes` (`internalMutation`): `InternalOnly`
- `deleteListing` (`mutation`): `PublicAuthed`

### `chat.ts`

- `getOrCreateConversation` (`mutation`): `PublicAuthed`
- `createGroupConversation` (`mutation`): `PublicAuthed`
- `renameGroupConversation` (`mutation`): `PublicAuthed`
- `addGroupMember` (`mutation`): `PublicAuthed`
- `removeGroupMember` (`mutation`): `PublicAuthed`
- `leaveGroupConversation` (`mutation`): `PublicAuthed`
- `getOrCreateListingGroupChat` (`mutation`): `PublicAuthed`
- `getListingGroupConversation` (`query`): `PublicAuthed`
- `listGroupMembers` (`query`): `PublicAuthed`
- `getConversation` (`query`): `PublicAuthed`
- `searchUsersForChat` (`query`): `PublicAuthed`
- `searchUsersForMention` (`query`): `PublicAuthed`
- `getTotalUnreadCount` (`query`): `PublicAuthed`
- `clearConversation` (`mutation`): `PublicAuthed`
- `markConversationRead` (`mutation`): `PublicAuthed`
- `listMyConversations` (`query`): `PublicAuthed`
- `listMessages` (`query`): `PublicAuthed`
- `sendMessage` (`mutation`): `PublicAuthed`
- `resolveReferableListing` (`query`): `PublicAuthed`
- `listReferableListings` (`query`): `PublicAuthed`

### `collegeReviews.ts`

- `getReviewForListing` (`query`): `PublicAuthed`
- `getListingReviewState` (`query`): `PublicOpen`
- `submitReview` (`mutation`): `PublicAuthed`
- `updateReview` (`mutation`): `PublicAuthed`
- `voteReview` (`mutation`): `PublicAuthed`
- `reportReview` (`mutation`): `PublicAuthed`
- `listReviewsForCollege` (`query`): `PublicOpen`
- `getCollegeAggregates` (`query`): `PublicOpen`
- `getLeaderboard` (`query`): `PublicOpen`
- `listPublicReviewsForUser` (`query`): `PublicOpen` — empty unless the viewer can see the author's activity (`canSeeActivity`).
- `getPendingReviewListingIds` (`query`): `PublicAuthed`

### `formalAttendance.ts`

- `confirmAttendance` (`mutation`): `PublicAuthed`
- `declineAttendance` (`mutation`): `PublicAuthed`
- `getPendingAttendanceListingIds` (`query`): `PublicAuthed`

### `pushNotifications.ts`

- `registerPushToken` (`mutation`): `PublicAuthed`
- `removePushToken` (`mutation`): `PublicAuthed`
- `setPushChatAlerts` (`mutation`): `PublicAuthed`
- `getChatPushPayload` (`internalQuery`): `InternalOnly`
- `getChatWebPushPayload` (`internalQuery`): `InternalOnly`
- `pruneInvalidPushTokens` (`internalMutation`): `InternalOnly`
- `sendChatMessagePush` (`internalAction`): `InternalOnly`

### `storage.ts`

- `generateUploadUrl` (`mutation`): `PublicAuthed`

### Newer modules

Queries marked `PublicOpen` that read activity (reviews, badges, attended
formals, feed items, wishlist) gate it with `canSeeActivity` /
`activityVisibility` from `follows.ts`: private accounts show it only to
themselves and approved followers. Queries marked `PublicAuthed` below return
an empty/null result to signed-out callers rather than throwing.

- `follows.ts`: `getFollowState`, `listFollows` `PublicOpen` (activity-gated); `getMyPrivacy`, `listFollowRequests`, `listMyFriends` `PublicAuthed`; `follow`, `unfollow`, `removeFollower`, `approveFollower`, `setPrivate` `PublicAuthed` (mutations).
- `credits.ts`: `getMyCredits`, `getMyHoldsForListing`, `reportFormalDidntHappen` `PublicAuthed`; `settleDueHolds` (cron), `resolveDispute` `InternalOnly`.
- `feed.ts`: `getCampusFeed` `PublicOpen` (activity-gated per author); `getWeekFormals` `PublicOpen`.
- `feedComments.ts`: `listComments` `PublicOpen` (author via `sanitizePublicUser`); `addComment`, `deleteComment` `PublicAuthed` (own comments only).
- `feedLikes.ts`: `toggleLike` `PublicAuthed`.
- `feedBookmarks.ts`: `toggleBookmark` `PublicAuthed`.
- `share.ts`: `getListingShareCard`, `getReviewShareCard`, `getBadgeShareCard` `PublicOpen` — first names only; no name for anonymous reviews or private authors; no badge card for private accounts. Called signed out by `app/api/share/*`.
- `partyInvites.ts`: `listMyPartyInvites`, `respondToPartyInvite` `PublicAuthed`.
- `bio.ts`: `saveBio` (`action`) `PublicAuthed` (OpenAI moderation); `reportBio` `PublicAuthed`; `setBio`, `clearBio`, `backfillBioFromInterests` `InternalOnly`.
- `collegeGuide.ts`: `getGuide` `PublicOpen`; `updateGuide`, `deleteTip` `PublicAuthed` (college members / own tips); `addTip` (`action`) `PublicAuthed` (OpenAI moderation); `insertTip` `InternalOnly`.
- `collegeDirectory.ts`: `listDirectory`, `getOverview` `PublicOpen` — member previews exclude private accounts.
- `badges.ts`: `getUserBadges`, `getBadgeProgress` `PublicOpen` (activity-gated); `getMyNewBadges`, `markBadgesSeen` `PublicAuthed`.
- `profileActivity.ts`: `getProfileActivity` `PublicOpen` (activity-gated).
- `accountDeletion.ts`: `getDeletionImpact`, `deleteMyAccount` `PublicAuthed` (own account, email confirmation); `purgeUserContent` `InternalOnly` (scheduled, batched).
- `password.ts`: `hasPassword`, `setPassword` (`action`) `PublicAuthed`; `setPasswordForEmail`, `passwordStateForEmail` `InternalOnly`.
- `migrations.ts`: all exported functions are `InternalOnly`.
- `notifications.ts`: `getBellState`, `listMyNotifications`, `getMyNotificationPrefs` `PublicAuthed` (own rows only; actors via `visibleAvatar`); `markAllRead`, `setNotificationPref`, `saveWebPushSubscription`, `removeMyWebPushSubscription` `PublicAuthed` (mutations; a subscription endpoint must be `https://`); `getDeliveryPlan`, `removeWebPushSubscriptions`, `sendFormalReminders`, `pruneOldNotifications` `InternalOnly`.
- `notificationDelivery.ts` (`"use node"`): `deliver`, `sendChatWebPush` `InternalOnly`.
- `invites.ts`: `getInvitePreview` `PublicOpen` (inviter name; avatar via `visibleAvatar`); `getOrCreateMyInviteCode`, `claimInvite` `PublicAuthed` (acts only for the signed-in user; codes are random, 6 characters).
- `seatLinks.ts`: `getSeatLinkPreview` `PublicOpen` (formal, first names; avatars via `visibleAvatar`); `claimSeatLink` `PublicAuthed` (token is 12 random characters, single use, 48h); `expireSeatLink` `InternalOnly` (scheduled).
- `peopleYouMayKnow.ts`: `getPeopleYouMayKnow` `PublicAuthed` (empty when signed out; people via `visibleUser`, bounded reads).

### Internal-Only Modules

- `emails.ts`: all exported functions are `InternalOnly`
- `collegeStats.ts`: all exported functions are `InternalOnly`
- `collegeAttendance.ts`: all exported functions are `InternalOnly`
- `adminReset.ts`: all exported functions are `InternalOnly`

## New Function Checklist

Before merging any new Convex function:

1. Assign class (`PublicOpen`, `PublicAuthed`, `InternalOnly`) in this file.
2. Add argument and return validators (`args` and `returns`).
3. If `PublicAuthed`, use shared guard helpers (`requireUserId`, `requireVerifiedUser`, or `requireActiveUser`) and resource-level checks.
4. Never use client-provided identity data (email/userId strings) for authorization.
5. Return DTOs only; avoid returning raw user docs from public endpoints.
6. Keep privileged tasks as `internal*` functions.
7. For webhooks/http entry points, verify signature/secret against env vars.
8. For storage IDs, enforce ownership before linking files to user content.
9. Add or update the security regression script expectations.

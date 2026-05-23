# Convex Security Standard

This file defines the endpoint exposure classes used in Oxformals Mobile:

- `PublicOpen`: callable without authentication, returns only redacted/public data.
- `PublicAuthed`: callable from clients, requires authenticated and authorized user context.
- `InternalOnly`: never callable by clients; only via Convex internal calls, cron, or scheduler.

## Endpoint Inventory

The list below classifies every exported function in `convex/*.ts` (excluding `convex/_generated/**` examples).

### `users.ts`

- `current` (`query`): `PublicAuthed`
- `listPublic` (`query`): `PublicOpen`
- `listForChatPicker` (`query`): `PublicAuthed`
- `getPublicByIds` (`query`): `PublicOpen`
- `myWishlist` (`query`): `PublicAuthed`
- `completeOnboarding` (`mutation`): `PublicAuthed`
- `agreeToRules` (`mutation`): `PublicAuthed`
- `patchProfile` (`mutation`): `PublicAuthed`
- `getPublicProfile` (`query`): `PublicOpen`
- `toggleWishlistCollege` (`mutation`): `PublicAuthed`
- `saveWishlistColleges` (`mutation`): `PublicAuthed`
- `backfillEmailWishlistAlerts` (`internalMutation`): `InternalOnly`
- `backfillCollegeWishlists` (`internalMutation`): `InternalOnly`
- `backfillDietaryRequirements` (`internalMutation`): `InternalOnly`
- `backfillUiFont` (`internalMutation`): `InternalOnly`
- `backfillSubject` (`internalMutation`): `InternalOnly`

### `listings.ts`

- `listListings` (`query`): `PublicOpen`
- `listMyListings` (`query`): `PublicAuthed`
- `listRequestsForMe` (`query`): `PublicAuthed`
- `listRequestsFromMe` (`query`): `PublicAuthed`
- `createListing` (`mutation`): `PublicAuthed`
- `createRequest` (`mutation`): `PublicAuthed`
- `declineRequest` (`mutation`): `PublicAuthed`
- `withdrawRequest` (`mutation`): `PublicAuthed`
- `acceptRequest` (`mutation`): `PublicAuthed`
- `leaveGroup` (`mutation`): `PublicAuthed`
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
- `reportReview` (`mutation`): `PublicAuthed`
- `listReviewsForCollege` (`query`): `PublicOpen`
- `getCollegeAggregates` (`query`): `PublicOpen`
- `getLeaderboard` (`query`): `PublicOpen`
- `listPublicReviewsForUser` (`query`): `PublicOpen`
- `getPendingReviewListingIds` (`query`): `PublicAuthed`

### `pushNotifications.ts`

- `registerPushToken` (`mutation`): `PublicAuthed`
- `removePushToken` (`mutation`): `PublicAuthed`
- `setPushChatAlerts` (`mutation`): `PublicAuthed`
- `getChatPushPayload` (`internalQuery`): `InternalOnly`
- `getWishlistListingPushPayload` (`internalQuery`): `InternalOnly`
- `pruneInvalidPushTokens` (`internalMutation`): `InternalOnly`
- `sendChatMessagePush` (`internalAction`): `InternalOnly`
- `sendWishlistListingPush` (`internalAction`): `InternalOnly`

### `storage.ts`

- `generateUploadUrl` (`mutation`): `PublicAuthed`

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

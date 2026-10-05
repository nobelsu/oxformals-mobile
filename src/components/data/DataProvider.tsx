import { useAuth } from "@/src/components/auth/useAuth";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { User } from "@/src/lib/auth/types";
import { normalizeCollegeName } from "@/src/lib/data/colleges";
import {
  type NewListingInput,
  type UpdateListingInput,
} from "@/src/lib/data/dataClient";
import type {
  Listing,
  RequestType,
  SwapRequest,
} from "@/src/lib/data/types";
import { errorMessage } from "@/src/lib/errorMessage";
import { mapListing, mapRequest, mapUser } from "@/src/lib/data/mapConvex";
import { useMutation, useQuery } from "convex/react";
import {
  createContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { Alert } from "react-native";

/** Tell the person why a background action didn't go through. */
function reportFailure(title: string) {
  return (error: unknown) => Alert.alert(title, errorMessage(error));
}

export type DataContextValue = {
  ready: boolean;
  /** The listings query has answered at least once. */
  listingsLoaded: boolean;
  users: User[];
  listings: Listing[];
  requests: SwapRequest[];
  wishlist: string[];
  getUser: (userId: string) => User | undefined;
  getListing: (listingId: string) => Listing | undefined;
  createListing: (input: NewListingInput) => Listing | null;
  sendRequest: (args: {
    requestType: RequestType;
    targetListingId: string;
    offeringListingId?: string;
    message: string;
    targetOwnerUserId?: string;
    /** Unnamed "+N" guests you cover, and how each seat is paid. */
    guests?: number;
    guestMethods?: RequestType[];
    /** Mutual follows coming with you. */
    friends?: { userId: string; paysOwn: boolean; method: RequestType }[];
    /** Seats for people not on Oxformals yet; each gets a link to claim. */
    links?: { paysOwn: boolean; method: RequestType }[];
  }) => Promise<(SwapRequest & { links?: string[] }) | null>;
  requestSwap: (args: {
    targetListingId: string;
    offeringListingId: string;
    message: string;
  }) => Promise<SwapRequest | null>;
  acceptRequest: (requestId: string) => SwapRequest | null;
  declineRequest: (requestId: string) => void;
  withdrawRequest: (requestId: string) => boolean;
  updateListing: (
    listingId: string,
    patch: UpdateListingInput,
  ) => Promise<void>;
  deleteListing: (listingId: string) => void;
  leaveGroup: (listingId: string) => void;
  removeMember: (listingId: string, memberId: string) => void;
  saveWishlist: (colleges: string[]) => Promise<void>;
};

export const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth();
  const ready = authStatus === "ready";

  const convexUsers = useQuery(api.users.listPublic);
  const convexListings = useQuery(api.listings.listListings);
  const incomingRequests = useQuery(
    api.listings.listRequestsForMe,
    user ? {} : "skip",
  );
  const outgoingRequests = useQuery(
    api.listings.listRequestsFromMe,
    user ? {} : "skip",
  );

  // listPublic leaves out private accounts you don't follow, so hosts, group
  // members and request counterparties are looked up by id (limited record).
  const requestPartyIds = useMemo(() => {
    const ids = new Set<Id<"users">>();
    const listed = new Set((convexUsers ?? []).map((u) => u._id));
    for (const listing of convexListings ?? []) {
      for (const id of [listing.ownerUserId, ...listing.members]) {
        if (!listed.has(id)) ids.add(id);
      }
    }
    for (const req of incomingRequests ?? []) {
      ids.add(req.fromUserId);
      ids.add(req.toUserId);
    }
    for (const req of outgoingRequests ?? []) {
      ids.add(req.fromUserId);
      ids.add(req.toUserId);
    }
    for (const req of [...(incomingRequests ?? []), ...(outgoingRequests ?? [])]) {
      for (const seat of req.party ?? []) {
        if (seat.userId) ids.add(seat.userId);
      }
    }
    // The lookup takes 100 ids at most.
    return [...ids].sort().slice(0, 100);
  }, [convexUsers, convexListings, incomingRequests, outgoingRequests]);

  const requestPartyUsers = useQuery(
    api.users.getPublicByIds,
    ready && requestPartyIds.length > 0 ? { userIds: requestPartyIds } : "skip",
  );
  const wishlist = useQuery(api.users.myWishlist, user ? {} : "skip");

  const createListingMut = useMutation(api.listings.createListing);
  const createRequestMut = useMutation(api.listings.createRequest);
  const acceptRequestMut = useMutation(api.listings.acceptRequest);
  const declineRequestMut = useMutation(api.listings.declineRequest);
  const withdrawRequestMut = useMutation(api.listings.withdrawRequest);
  const updateListingMut = useMutation(api.listings.updateListing);
  const deleteListingMut = useMutation(api.listings.deleteListing);
  const leaveGroupMut = useMutation(api.listings.leaveGroup);
  const removeMemberMut = useMutation(api.listings.removeMember);
  const saveWishlistMut = useMutation(api.users.saveWishlistColleges);
  const getOrCreateConversationMut = useMutation(
    api.chat.getOrCreateConversation,
  );
  const sendChatMessageMut = useMutation(api.chat.sendMessage);

  const users = useMemo<User[]>(() => {
    if (!ready || convexUsers === undefined) return [];
    const byId = new Map<string, User>();
    for (const doc of convexUsers) {
      byId.set(doc._id, mapUser(doc));
    }
    for (const doc of requestPartyUsers ?? []) {
      if (!byId.has(doc._id)) {
        byId.set(doc._id, mapUser(doc));
      }
    }
    return [...byId.values()];
  }, [ready, convexUsers, requestPartyUsers]);

  const listings = useMemo<Listing[]>(() => {
    if (!ready || convexListings === undefined) return [];
    return convexListings.map(mapListing);
  }, [ready, convexListings]);

  const requests = useMemo<SwapRequest[]>(() => {
    if (
      !ready ||
      !user ||
      incomingRequests === undefined ||
      outgoingRequests === undefined
    ) {
      return [];
    }
    const byId = new Map<string, SwapRequest>();
    for (const req of [...incomingRequests, ...outgoingRequests]) {
      byId.set(req._id, mapRequest(req));
    }
    return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
  }, [ready, user, incomingRequests, outgoingRequests]);

  const wishlistColleges = useMemo<string[]>(() => {
    if (!ready || !user || wishlist === undefined) return [];
    return wishlist;
  }, [ready, user, wishlist]);

  const getUser = useCallback(
    (userId: string) => users.find((u) => u.id === userId),
    [users],
  );

  const getListing = useCallback(
    (listingId: string) => listings.find((l) => l.id === listingId),
    [listings],
  );

  const createListing = useCallback(
    (input: NewListingInput): Listing | null => {
      if (!user) return null;
      const college = normalizeCollegeName(user.college);
      const year = user.year.trim();
      const role = user.role.trim();
      // Fellows have no year.
      if (!college || !role || (!year && role !== "Fellow")) return null;
      createListingMut({
        dateTime: input.dateTime,
        groupSize: input.groupSize,
        message: input.message,
        menu: input.menu,
        listingType: input.listingType,
        formalType: input.formalType,
        ...(input.menuPdfId !== undefined
          ? { menuPdfId: input.menuPdfId as Id<"_storage"> }
          : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
      }).catch(reportFailure("Couldn't list your formal"));
      return {
        id: "pending",
        ownerUserId: user.id,
        college,
        dateTime: input.dateTime,
        groupSize: input.groupSize,
        seatsAvailable: input.groupSize - 1,
        members: [user.id],
        year,
        role,
        message: input.message,
        menu: input.menu,
        listingType: input.listingType,
        formalType: input.formalType,
        ...(input.price !== undefined ? { price: input.price } : {}),
        status: "active",
        createdAt: Date.now(),
      };
    },
    [user, createListingMut],
  );

  const sendRequest = useCallback(
    async (args: {
      requestType: RequestType;
      targetListingId: string;
      offeringListingId?: string;
      message: string;
      targetOwnerUserId?: string;
      guests?: number;
      guestMethods?: RequestType[];
      friends?: { userId: string; paysOwn: boolean; method: RequestType }[];
      links?: { paysOwn: boolean; method: RequestType }[];
    }): Promise<(SwapRequest & { links?: string[] }) | null> => {
      if (!user) return null;
      const targetFromCache = listings.find((l) => l.id === args.targetListingId);
      const toUserId = targetFromCache?.ownerUserId ?? args.targetOwnerUserId;
      if (!toUserId) return null;
      let result;
      try {
        result = await createRequestMut({
          requestType: args.requestType,
          targetListingId: args.targetListingId as Id<"listings">,
          ...(args.offeringListingId !== undefined
            ? { offeringListingId: args.offeringListingId as Id<"listings"> }
            : {}),
          message: args.message,
          ...(args.guests ? { guests: args.guests } : {}),
          ...(args.guestMethods ? { guestMethods: args.guestMethods } : {}),
          ...(args.friends
            ? {
                friends: args.friends.map((f) => ({
                  ...f,
                  userId: f.userId as Id<"users">,
                })),
              }
            : {}),
          ...(args.links ? { links: args.links } : {}),
        });
      } catch (err) {
        throw new Error(errorMessage(err, "Could not send request."));
      }
      if (args.message.trim()) {
        try {
          const conversationId = await getOrCreateConversationMut({
            otherUserId: toUserId as Id<"users">,
          });
          await sendChatMessageMut({
            conversationId,
            body: args.message.trim(),
          });
        } catch {
          // best-effort
        }
      }
      return {
        id: result.requestId,
        fromUserId: user.id,
        toUserId,
        targetListingId: args.targetListingId,
        requestType: args.requestType,
        ...(args.offeringListingId !== undefined
          ? { offeringListingId: args.offeringListingId }
          : {}),
        message: args.message,
        status: result.autoAccepted ? "accepted" : "pending",
        createdAt: Date.now(),
        ...(result.links && result.links.length > 0 ? { links: result.links } : {}),
      };
    },
    [
      user,
      listings,
      createRequestMut,
      getOrCreateConversationMut,
      sendChatMessageMut,
    ],
  );

  const requestSwap = useCallback(
    (args: {
      targetListingId: string;
      offeringListingId: string;
      message: string;
    }) =>
      sendRequest({
        requestType: "swap",
        targetListingId: args.targetListingId,
        offeringListingId: args.offeringListingId,
        message: args.message,
      }),
    [sendRequest],
  );

  const acceptRequest = useCallback(
    (requestId: string): SwapRequest | null => {
      if (!user) return null;
      const req = requests.find((r) => r.id === requestId);
      if (!req || req.toUserId !== user.id || req.status !== "pending") {
        return null;
      }
      acceptRequestMut({ requestId: requestId as Id<"requests"> }).catch(
        reportFailure("Couldn't accept this request"),
      );
      return { ...req, status: "accepted" };
    },
    [user, requests, acceptRequestMut],
  );

  const declineRequest = useCallback(
    (requestId: string) => {
      if (!user) return;
      const req = requests.find((r) => r.id === requestId);
      if (!req || req.toUserId !== user.id || req.status !== "pending") return;
      declineRequestMut({ requestId: requestId as Id<"requests"> }).catch(
        reportFailure("Couldn't decline this request"),
      );
    },
    [user, requests, declineRequestMut],
  );

  const withdrawRequest = useCallback(
    (requestId: string): boolean => {
      if (!user) return false;
      const req = requests.find((r) => r.id === requestId);
      if (!req || req.fromUserId !== user.id || req.status !== "pending") {
        return false;
      }
      withdrawRequestMut({ requestId: requestId as Id<"requests"> }).catch(
        reportFailure("Couldn't withdraw this request"),
      );
      return true;
    },
    [user, requests, withdrawRequestMut],
  );

  const updateListing = useCallback(
    async (listingId: string, patch: UpdateListingInput) => {
      if (!user) {
        throw new Error("You must be signed in to edit a listing.");
      }
      try {
        await updateListingMut({
          listingId: listingId as Id<"listings">,
          dateTime: patch.dateTime,
          groupSize: patch.groupSize,
          message: patch.message,
          menu: patch.menu,
          ...(patch.clearMenuPdf
            ? { menuPdfId: null }
            : patch.menuPdfId !== undefined
              ? { menuPdfId: patch.menuPdfId as Id<"_storage"> }
              : {}),
          listingType: patch.listingType,
          formalType: patch.formalType,
          ...(patch.price !== undefined ? { price: patch.price } : {}),
        });
      } catch (e) {
        throw new Error(errorMessage(e, "Could not update listing."));
      }
    },
    [user, updateListingMut],
  );

  const deleteListing = useCallback(
    (listingId: string) => {
      if (!user) return;
      deleteListingMut({ listingId: listingId as Id<"listings"> }).catch(
        reportFailure("Couldn't cancel this formal"),
      );
    },
    [user, deleteListingMut],
  );

  const leaveGroup = useCallback(
    (listingId: string) => {
      if (!user) return;
      leaveGroupMut({ listingId: listingId as Id<"listings"> }).catch(
        reportFailure("Couldn't leave this formal"),
      );
    },
    [user, leaveGroupMut],
  );

  const removeMember = useCallback(
    (listingId: string, memberId: string) => {
      if (!user) return;
      removeMemberMut({
        listingId: listingId as Id<"listings">,
        memberId: memberId as Id<"users">,
      }).catch(reportFailure("Couldn't remove this guest"));
    },
    [user, removeMemberMut],
  );

  const saveWishlist = useCallback(
    async (colleges: string[]) => {
      if (!user) return;
      await saveWishlistMut({ colleges });
    },
    [user, saveWishlistMut],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      ready,
      listingsLoaded: ready && convexListings !== undefined,
      users,
      listings,
      requests,
      wishlist: wishlistColleges,
      getUser,
      getListing,
      createListing,
      sendRequest,
      requestSwap,
      acceptRequest,
      declineRequest,
      withdrawRequest,
      updateListing,
      deleteListing,
      leaveGroup,
      removeMember,
      saveWishlist,
    }),
    [
      ready,
      convexListings,
      users,
      listings,
      requests,
      wishlistColleges,
      getUser,
      getListing,
      createListing,
      sendRequest,
      requestSwap,
      acceptRequest,
      declineRequest,
      withdrawRequest,
      updateListing,
      deleteListing,
      leaveGroup,
      removeMember,
      saveWishlist,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

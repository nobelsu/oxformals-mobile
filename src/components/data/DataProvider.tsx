import { useAuth } from "@/src/components/auth/useAuth";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { DEFAULT_UI_FONT } from "@/src/lib/uiFont";
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
import { useMutation, useQuery } from "convex/react";
import {
  createContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export type DataContextValue = {
  ready: boolean;
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
  }) => Promise<SwapRequest | null>;
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

type PublicUserDoc = {
  _id: Id<"users">;
  name?: string;
  email?: string;
  college?: string;
  year?: string;
  role?: string;
  interests?: string[];
  subject?: string;
  uiFont?: Doc<"users">["uiFont"];
  instagramHandle?: string;
  whatsappPhone?: string;
  avatar?: Doc<"users">["avatar"];
};

function mapUser(doc: PublicUserDoc): User {
  return {
    id: doc._id,
    email: doc.email ?? "",
    name: doc.name ?? "",
    college: doc.college ?? "",
    year: doc.year ?? "",
    role: doc.role ?? "",
    interests: doc.interests ?? [],
    subject: doc.subject ?? "",
    uiFont: doc.uiFont ?? DEFAULT_UI_FONT,
    ...(doc.instagramHandle ? { instagramHandle: doc.instagramHandle } : {}),
    ...(doc.whatsappPhone ? { whatsappPhone: doc.whatsappPhone } : {}),
    ...(doc.avatar ? { avatar: doc.avatar } : {}),
  };
}

type ConvexListingDoc = Doc<"listings"> & {
  menuPdfUrl?: string | null;
  menuFileContentType?: string | null;
};

function mapListing(doc: ConvexListingDoc): Listing {
  return {
    id: doc._id,
    ownerUserId: doc.ownerUserId,
    college: doc.college,
    dateTime: doc.dateTime,
    groupSize: doc.groupSize,
    seatsAvailable: doc.seatsAvailable,
    members: doc.members,
    year: doc.year,
    role: doc.role,
    message: doc.message,
    menu: doc.menu ?? "",
    ...(doc.menuPdfUrl ? { menuPdfUrl: doc.menuPdfUrl } : {}),
    ...(doc.menuFileContentType
      ? { menuFileContentType: doc.menuFileContentType }
      : {}),
    listingType: doc.listingType ?? "swap",
    ...(doc.price !== undefined ? { price: doc.price } : {}),
    status: doc.status,
    createdAt: doc._creationTime,
  };
}

function mapRequest(doc: Doc<"requests">): SwapRequest {
  const requestType =
    doc.requestType ?? (doc.offeringListingId !== undefined ? "swap" : "pay");
  return {
    id: doc._id,
    fromUserId: doc.fromUserId,
    toUserId: doc.toUserId,
    targetListingId: doc.targetListingId,
    requestType,
    ...(doc.offeringListingId !== undefined
      ? { offeringListingId: doc.offeringListingId }
      : {}),
    message: doc.message,
    status: doc.status,
    createdAt: doc._creationTime,
  };
}

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

  const requestPartyIds = useMemo(() => {
    if (incomingRequests === undefined && outgoingRequests === undefined) {
      return [] as Id<"users">[];
    }
    const ids = new Set<Id<"users">>();
    for (const req of incomingRequests ?? []) {
      ids.add(req.fromUserId);
      ids.add(req.toUserId);
    }
    for (const req of outgoingRequests ?? []) {
      ids.add(req.fromUserId);
      ids.add(req.toUserId);
    }
    return [...ids];
  }, [incomingRequests, outgoingRequests]);

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
      if (!college || !year || !role) return null;
      void createListingMut({
        dateTime: input.dateTime,
        groupSize: input.groupSize,
        message: input.message,
        menu: input.menu,
        listingType: input.listingType,
        ...(input.menuPdfId !== undefined
          ? { menuPdfId: input.menuPdfId as Id<"_storage"> }
          : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
      });
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
    }): Promise<SwapRequest | null> => {
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
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not send request.";
        throw new Error(message);
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
      void acceptRequestMut({ requestId: requestId as Id<"requests"> });
      return { ...req, status: "accepted" };
    },
    [user, requests, acceptRequestMut],
  );

  const declineRequest = useCallback(
    (requestId: string) => {
      if (!user) return;
      const req = requests.find((r) => r.id === requestId);
      if (!req || req.toUserId !== user.id || req.status !== "pending") return;
      void declineRequestMut({ requestId: requestId as Id<"requests"> });
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
      void withdrawRequestMut({ requestId: requestId as Id<"requests"> });
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
          ...(patch.price !== undefined ? { price: patch.price } : {}),
        });
      } catch (e) {
        throw new Error(
          e instanceof Error ? e.message : "Could not update listing.",
        );
      }
    },
    [user, updateListingMut],
  );

  const deleteListing = useCallback(
    (listingId: string) => {
      if (!user) return;
      void deleteListingMut({ listingId: listingId as Id<"listings"> });
    },
    [user, deleteListingMut],
  );

  const leaveGroup = useCallback(
    (listingId: string) => {
      if (!user) return;
      void leaveGroupMut({ listingId: listingId as Id<"listings"> });
    },
    [user, leaveGroupMut],
  );

  const removeMember = useCallback(
    (listingId: string, memberId: string) => {
      if (!user) return;
      void removeMemberMut({
        listingId: listingId as Id<"listings">,
        memberId: memberId as Id<"users">,
      });
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

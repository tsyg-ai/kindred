import type { CustomQuestion } from './questions';
import { initializeApp } from "firebase/app";
import {
	getFirestore,
	connectFirestoreEmulator,
	doc,
	setDoc,
	getDoc,
	collection,
	query,
	where,
	getDocs,
	updateDoc,
	deleteDoc,
	writeBatch,
} from "firebase/firestore";
import {
	getAuth,
	connectAuthEmulator,
	GoogleAuthProvider,
	signInWithPopup,
	signOut,
} from "firebase/auth";
import {
	getStorage,
	connectStorageEmulator,
	ref,
	uploadString,
	getDownloadURL,
	uploadBytes,
} from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { v4 as uuidv4 } from "uuid";

export interface UserProfile {
	id: string;
	userId: string;
	name: string;
	worldStyle: string;
	sceneStyle?: string;
	avatarFeatures: string;
	avatarUrl: string;
	language?: string;
	interviewAnswers?: Record<string, string>;
	profileSummary?: string;
	profileAudioUrl?: string;
	/** Custom questions used during this profile's interview — needed to display labels on friend profiles */
	customQuestions?: CustomQuestion[];
}

export interface Invite {
	id: string;
	creatorProfileId: string;
	createdAt: number;
	expiresAt: number;
}

export interface CustomQAnswers {
	answers: Record<string, string>;
	audioUrl?: string;
	summary?: string;
}

export interface FriendConnection {
	id: string;
	profileIds: string[];
	createdAt: number;
	/** Answers to one profile's custom questions, keyed by the answerer's profileId */
	customQAnswers?: Record<string, CustomQAnswers>;
}

export interface FriendshipEntry {
	id: string;
	userId: string;
	profileId: string;
	connectionId: string;
	storyTranscript: string;
	imageUrl: string;
	audioUrl: string;
	videoUrl?: string;
	videoProcessing?: boolean;
	videoNewlyReady?: boolean;
	isApproved: boolean;
	createdAt: number;
}

export interface UserSettings {
	selectedQuestionIds: string[];
	customQuestions: CustomQuestion[];
}


const firebaseConfig = {
	apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
	authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: (import.meta as any).env
		.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

if (!import.meta.env.DEV) {
	initializeAppCheck(app, {
		provider: new ReCaptchaV3Provider("6LedWIosAAAAALllitCSowkYKfC7hiwOEqr2Qn7a"),
		isTokenAutoRefreshEnabled: true,
	});
}

const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
export const functions = getFunctions(app);
if (import.meta.env.DEV) {
	connectAuthEmulator(auth, 'http://localhost:9099');
	connectFirestoreEmulator(db, 'localhost', 8080);
	connectStorageEmulator(storage, 'localhost', 9199);
	connectFunctionsEmulator(functions, 'localhost', 5001);
}

const IMMUTABLE_CACHE = { cacheControl: 'public, max-age=31536000' };

export const uploadBase64ToStorage = async (
	base64String: string,
	path: string,
): Promise<string> => {
	if (!base64String.startsWith("data:")) return base64String;

	const storageRef = ref(storage, path);
	await uploadString(storageRef, base64String, "data_url", IMMUTABLE_CACHE);
	return await getDownloadURL(storageRef);
};

export const uploadBlobToStorage = async (
	blob: Blob,
	path: string,
): Promise<string> => {
	const storageRef = ref(storage, path);
	await uploadBytes(storageRef, blob, IMMUTABLE_CACHE);
	return await getDownloadURL(storageRef);
};

export const signInWithGoogle = async () => {
	return await signInWithPopup(auth, googleProvider);
};


export const logOut = async () => {
	localStorage.removeItem("activeProfileId");
	await signOut(auth);
};

const getUserId = () => {
	const uid = auth.currentUser?.uid;
	if (!uid) throw new Error("User not authenticated");
	return uid;
};

/** Verifies the active profile in localStorage belongs to the current Firebase user. */
const getVerifiedActiveProfileId = async (): Promise<string> => {
	const profileId = getActiveProfileId();
	if (!profileId) throw new Error("No active profile");
	const uid = getUserId();
	const snap = await getDoc(doc(db, "profiles", profileId));
	if (!snap.exists() || snap.data().userId !== uid) {
		throw new Error("Active profile does not belong to current user");
	}
	return profileId;
};

export const getActiveProfileId = (): string | null => {
	return localStorage.getItem("activeProfileId");
};

export const setActiveProfileId = (id: string) => {
	localStorage.setItem("activeProfileId", id);
};

export const getAllProfiles = async (): Promise<UserProfile[]> => {
	const uid = getUserId();

	// Migrate legacy profile if it exists (best-effort; rules may deny access)
	let legacyDocSnap;
	try {
		const legacyDocRef = doc(db, "users", uid);
		legacyDocSnap = await getDoc(legacyDocRef);
	} catch {
		legacyDocSnap = null;
	}

	if (legacyDocSnap?.exists()) {
		const legacyProfile = legacyDocSnap.data() as UserProfile;
		// Save it to the new profiles collection
		const fullProfile = { ...legacyProfile, userId: uid };
		await setDoc(doc(db, "profiles", legacyProfile.id), fullProfile);
		// Delete the old one so we don't migrate again
		await deleteDoc(doc(db, "users", uid));

		// Also migrate existing friends and entries to have this profileId
		const entriesQ = query(
			collection(db, "entries"),
			where("userId", "==", uid),
		);
		const entriesSnap = await getDocs(entriesQ);
		for (const entryDoc of entriesSnap.docs) {
			if (!entryDoc.data().profileId) {
				await updateDoc(doc(db, "entries", entryDoc.id), {
					profileId: legacyProfile.id,
				});
			}
		}

		const friendsQ = query(
			collection(db, "friends"),
			where("userId", "==", uid),
		);
		const friendsSnap = await getDocs(friendsQ);
		for (const friendDoc of friendsSnap.docs) {
			if (!friendDoc.data().profileId) {
				await updateDoc(doc(db, "friends", friendDoc.id), {
					profileId: legacyProfile.id,
				});
			}
		}
	}

	const q = query(collection(db, "profiles"), where("userId", "==", uid));
	const querySnapshot = await getDocs(q);
	return querySnapshot.docs.map((doc) => doc.data() as UserProfile);
};

export const getProfile = async (): Promise<UserProfile | null> => {
	const activeId = getActiveProfileId();
	return activeId ? getProfileById(activeId) : null;
};

export const getProfileById = async (
	id: string,
): Promise<UserProfile | null> => {
	const docRef = doc(db, "profiles", id);
	const docSnap = await getDoc(docRef);
	if (docSnap.exists()) {
		return docSnap.data() as UserProfile;
	}
	return null;
};

export const saveProfile = async (
	profile: Omit<UserProfile, "userId">,
): Promise<void> => {
	const uid = getUserId();
	const fullProfile = { ...profile, userId: uid };
	await setDoc(doc(db, "profiles", profile.id), fullProfile);
	setActiveProfileId(profile.id);
};

export const updateProfile = async (
	id: string,
	updates: Partial<UserProfile>,
): Promise<void> => {
	const uid = getUserId();
	const snap = await getDoc(doc(db, "profiles", id));
	if (!snap.exists() || snap.data().userId !== uid) {
		throw new Error("Unauthorized: profile does not belong to current user");
	}
	await updateDoc(doc(db, "profiles", id), updates);
};

export const saveCustomAnswersForConnection = async (
	connectionId: string,
	answererId: string,
	data: CustomQAnswers,
): Promise<void> => {
	await updateDoc(doc(db, 'friendConnections', connectionId), {
		[`customQAnswers.${answererId}`]: data,
	});
};

// --- User Settings ---

export const getUserSettings = async (): Promise<UserSettings | null> => {
	const uid = getUserId();
	const docRef = doc(db, 'userSettings', uid);
	const docSnap = await getDoc(docRef);
	return docSnap.exists() ? (docSnap.data() as UserSettings) : null;
};

export const saveUserSettings = async (settings: UserSettings): Promise<void> => {
	const uid = getUserId();
	await setDoc(doc(db, 'userSettings', uid), settings);
};

// --- Invites & Connections ---

export const createInvite = async (): Promise<string> => {
	const profileId = await getVerifiedActiveProfileId();

	const bytes = new Uint8Array(6);
	crypto.getRandomValues(bytes);
	// Unambiguous alphanumeric chars (no 0/O, 1/I/L confusion)
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	const code = Array.from(bytes).map((b) => chars[b % chars.length]).join("");

	const invite: Invite = {
		id: code,
		creatorProfileId: profileId,
		createdAt: Date.now(),
		expiresAt: Date.now() + 48 * 60 * 60 * 1000,
	};
	await setDoc(doc(db, "invites", code), invite);
	return code;
};

export const acceptInvite = async (code: string): Promise<void> => {
	const profileId = getActiveProfileId();
	if (!profileId) throw new Error("No active profile");

	const inviteRef = doc(db, "invites", code.toUpperCase());
	const inviteSnap = await getDoc(inviteRef);

	if (!inviteSnap.exists()) {
		throw new Error("Invalid or expired invite code.");
	}

	const invite = inviteSnap.data() as Invite;

	if (invite.expiresAt && invite.expiresAt < Date.now()) {
		throw new Error("This invite code has expired.");
	}

	if (invite.creatorProfileId === profileId) {
		throw new Error("You cannot accept your own invite.");
	}

	// Check if connection already exists
	const q = query(
		collection(db, "friendConnections"),
		where("profileIds", "array-contains", profileId),
	);
	const querySnapshot = await getDocs(q);
	const existingConnection = querySnapshot.docs.find((doc) => {
		const data = doc.data() as FriendConnection;
		return data.profileIds.includes(invite.creatorProfileId);
	});

	if (existingConnection) {
		throw new Error("You are already friends with this profile.");
	}

	const connectionId = uuidv4();
	const connection: FriendConnection = {
		id: connectionId,
		profileIds: [profileId, invite.creatorProfileId],
		createdAt: Date.now(),
	};

	await setDoc(doc(db, "friendConnections", connectionId), connection);
	await deleteDoc(inviteRef); // Single-use invite
};

export const getFriendConnections = async (): Promise<
	{ connection: FriendConnection; friendProfile: UserProfile }[]
> => {
	const profileId = getActiveProfileId();
	if (!profileId) return [];

	const q = query(
		collection(db, "friendConnections"),
		where("profileIds", "array-contains", profileId),
	);
	const querySnapshot = await getDocs(q);

	const connections = querySnapshot.docs.map(
		(doc) => doc.data() as FriendConnection,
	);

	const results = await Promise.all(
		connections.map(async (conn) => {
			const friendId = conn.profileIds.find((id) => id !== profileId);
			if (!friendId) return null;
			const friendProfile = await getProfileById(friendId);
			if (!friendProfile) return null;
			return { connection: conn, friendProfile };
		}),
	);

	return results
		.filter((r): r is { connection: FriendConnection; friendProfile: UserProfile } => r !== null)
		.sort((a, b) => b.connection.createdAt - a.connection.createdAt);
};

export const getConnectionById = async (
	connectionId: string,
): Promise<{
	connection: FriendConnection;
	friendProfile: UserProfile;
} | null> => {
	const profileId = getActiveProfileId();
	if (!profileId) return null;

	const docRef = doc(db, "friendConnections", connectionId);
	const docSnap = await getDoc(docRef);

	if (docSnap.exists()) {
		const conn = docSnap.data() as FriendConnection;
		const friendId = conn.profileIds.find((id) => id !== profileId);
		if (friendId) {
			const friendProfile = await getProfileById(friendId);
			if (friendProfile) {
				return { connection: conn, friendProfile };
			}
		}
	}
	return null;
};

// --- Entries (Stories) ---

export const getEntryById = async (
	id: string,
): Promise<FriendshipEntry | null> => {
	const docRef = doc(db, "entries", id);
	const docSnap = await getDoc(docRef);
	if (docSnap.exists()) {
		return docSnap.data() as FriendshipEntry;
	}
	return null;
};

export const getEntries = async (): Promise<FriendshipEntry[]> => {
	const uid = getUserId();
	const profileId = getActiveProfileId();
	if (!profileId) return [];

	// Get entries created by me
	const q1 = query(
		collection(db, "entries"),
		where("profileId", "==", profileId),
	);
	const snap1 = await getDocs(q1);
	const myEntries = snap1.docs.map((doc) => doc.data() as FriendshipEntry);

	// Get approved entries created by my friends for my connections
	const connections = await getFriendConnections();
	const connectionIds = connections.map((c) => c.connection.id);

	let friendEntries: FriendshipEntry[] = [];
	if (connectionIds.length > 0) {
		// Firestore 'in' query supports up to 10 items. We'll fetch all approved entries for these connections.
		// To be safe with >10 connections, we'll chunk them.
		for (let i = 0; i < connectionIds.length; i += 10) {
			const chunk = connectionIds.slice(i, i + 10);
			const q2 = query(
				collection(db, "entries"),
				where("connectionId", "in", chunk),
				where("isApproved", "==", true),
			);
			const snap2 = await getDocs(q2);
			friendEntries = [
				...friendEntries,
				...snap2.docs.map((doc) => doc.data() as FriendshipEntry),
			];
		}
	}

	// Combine and deduplicate
	const allEntries = [...myEntries, ...friendEntries];
	const uniqueEntries = Array.from(
		new Map(allEntries.map((item) => [item.id, item])).values(),
	);

	return uniqueEntries.sort((a, b) => b.createdAt - a.createdAt);
};

export const getEntriesForConnection = async (
	connectionId: string,
): Promise<FriendshipEntry[]> => {
	const profileId = getActiveProfileId();
	if (!profileId) return [];

	const q = query(
		collection(db, "entries"),
		where("connectionId", "==", connectionId),
	);
	const snap = await getDocs(q);
	const entries = snap.docs.map((doc) => doc.data() as FriendshipEntry);

	// Filter: I can see it if I created it, OR if it's approved
	return entries
		.filter((e) => e.profileId === profileId || e.isApproved)
		.sort((a, b) => b.createdAt - a.createdAt);
};

export const saveEntry = async (
	entry: Omit<FriendshipEntry, "userId" | "profileId">,
): Promise<void> => {
	const uid = getUserId();
	const profileId = getActiveProfileId();
	if (!profileId) throw new Error("No active profile");
	await setDoc(doc(db, "entries", entry.id), {
		...entry,
		userId: uid,
		profileId,
	});
};

export const updateEntry = async (
	id: string,
	updates: Partial<FriendshipEntry>,
): Promise<void> => {
	const uid = getUserId();
	const snap = await getDoc(doc(db, "entries", id));
	if (!snap.exists() || snap.data().userId !== uid) {
		throw new Error("Unauthorized: entry does not belong to current user");
	}
	await updateDoc(doc(db, "entries", id), updates);
};

export const deleteEntry = async (id: string): Promise<void> => {
	const uid = getUserId();
	const snap = await getDoc(doc(db, "entries", id));
	if (!snap.exists() || snap.data().userId !== uid) {
		throw new Error("Unauthorized: entry does not belong to current user");
	}
	await deleteDoc(doc(db, "entries", id));
};

export const getEntriesWithNewVideos = async (): Promise<FriendshipEntry[]> => {
	const profileId = getActiveProfileId();
	if (!profileId) return [];
	const q = query(
		collection(db, "entries"),
		where("profileId", "==", profileId),
		where("videoNewlyReady", "==", true),
	);
	const snap = await getDocs(q);
	return snap.docs.map(d => ({ id: d.id, ...d.data() } as FriendshipEntry));
};

export const deleteFriendConnection = async (
	connectionId: string,
): Promise<void> => {
	const snap = await getDocs(query(
		collection(db, "entries"),
		where("connectionId", "==", connectionId),
	));
	const batch = writeBatch(db);
	for (const entryDoc of snap.docs) {
		batch.delete(doc(db, "entries", entryDoc.id));
	}
	batch.delete(doc(db, "friendConnections", connectionId));
	await batch.commit();
};

export const deleteProfile = async (profileId: string): Promise<void> => {
	const uid = getUserId();
	const profileSnap = await getDoc(doc(db, "profiles", profileId));
	if (!profileSnap.exists() || profileSnap.data().userId !== uid) {
		throw new Error("Unauthorized: profile does not belong to current user");
	}

	const [entriesSnap, connectionsSnap] = await Promise.all([
		getDocs(query(collection(db, "entries"), where("profileId", "==", profileId))),
		getDocs(query(collection(db, "friendConnections"), where("profileIds", "array-contains", profileId))),
	]);

	const batch = writeBatch(db);
	for (const entryDoc of entriesSnap.docs) {
		batch.delete(doc(db, "entries", entryDoc.id));
	}
	for (const connDoc of connectionsSnap.docs) {
		batch.delete(doc(db, "friendConnections", connDoc.id));
	}
	batch.delete(doc(db, "profiles", profileId));
	await batch.commit();

	if (getActiveProfileId() === profileId) {
		localStorage.removeItem("activeProfileId");
	}
};


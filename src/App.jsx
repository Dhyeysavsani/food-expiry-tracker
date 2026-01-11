import React, { useState, useEffect, useMemo } from 'react';
// FIXED: Re-integrated Firebase initialization into a single file to resolve the import error.
import { initializeApp } from 'firebase/app';
import { 
    getAuth,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged
} from 'firebase/auth';
import { 
    getFirestore,
    collection, 
    addDoc, 
    query, 
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    getDoc,
    setDoc
} from 'firebase/firestore';


// --- Firebase Initialization ---
// This configuration should be moved to a secure place in a real application
const firebaseConfig = {
  apiKey: "AIzaSyC6IpwCc-cG9K-EUCPrMCzMCRlFMWcc2Vs",
  authDomain: "food-expiry-tracker-b949e.firebaseapp.com",
  projectId: "food-expiry-tracker-b949e",
  storageBucket: "food-expiry-tracker-b949e.firebasestorage.app",
  messagingSenderId: "629829644964",
  appId: "1:629829644964:web:ca7861af6919b212762c31"
};

// Initialize Firebase and export the services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// --- Helper Functions & Constants ---

const CATEGORIES = ["Dairy", "Produce", "Pantry", "Frozen", "Beverages", "Snacks", "Other"];
const STATUS_COLORS = {
    Expired: 'bg-red-100 border-red-400 text-red-700',
    Soon: 'bg-yellow-100 border-yellow-400 text-yellow-700',
    Safe: 'bg-green-100 border-green-400 text-green-700',
};

const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return 'Safe';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays <= 3) return 'Soon';
    return 'Safe';
};


// --- SVG Icon Components ---

const LoadingSpinner = () => (
    <svg className="animate-spin h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const RecipeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;


// --- Main Application Component ---
export default function App() {
    // Auth and Data State
    const [user, setUser] = useState(null);
    const [householdId, setHouseholdId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [items, setItems] = useState([]);

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
    const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [recipeItem, setRecipeItem] = useState(null);
    const [recipes, setRecipes] = useState([]);
    const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false);

    // --- Firebase Auth Listener ---
    useEffect(() => {
        // onAuthStateChanged returns an unsubscribe function
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Fetch user's household ID from Firestore
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                
                if (userDocSnap.exists() && userDocSnap.data().householdId) {
                    setHouseholdId(userDocSnap.data().householdId);
                } else {
                    // This is a new user, so create a new household for them.
                    // The simplest way is to assign their own UID as their householdId.
                    const newHouseholdId = currentUser.uid;
                    await setDoc(userDocRef, { householdId: newHouseholdId });
                    setHouseholdId(newHouseholdId);
                }
            } else {
                setUser(null);
                setHouseholdId(null);
                setItems([]); // Clear items on logout
            }
            setIsAuthReady(true);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []); // Empty dependency array means this effect runs only once on mount

    // --- Firestore Data Fetching ---
    useEffect(() => {
        let unsubscribe = () => {};
        if (isAuthReady && user && householdId) {
            setIsLoading(true);
            const itemsCollectionRef = collection(db, `households/${householdId}/items`);
            const q = query(itemsCollectionRef);
            
            unsubscribe = onSnapshot(q, (querySnapshot) => {
                const itemsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // Ensure expiry_date is a JS Date object
                    expiry_date: doc.data().expiry_date?.toDate(),
                }));
                setItems(itemsData);
                setIsLoading(false);
            }, (err) => {
                console.error("Firestore error:", err);
                setError("Failed to fetch food items.");
                setIsLoading(false);
            });
        } else if (isAuthReady) {
            // If auth is ready but there's no user/household, stop loading
            setIsLoading(false);
        }

        // Cleanup listener on unmount or when dependencies change
        return () => unsubscribe();
    }, [isAuthReady, user, householdId]); // Re-run this effect if the user or household changes


    // --- Data Manipulation Handlers ---
    const handleAddItem = async (item) => {
        if (!householdId) return;
        try {
            const itemsCollectionRef = collection(db, `households/${householdId}/items`);
            await addDoc(itemsCollectionRef, item);
            setIsModalOpen(false);
        } catch (err) {
            console.error("Error adding item: ", err);
            setError("Failed to add item. Please try again.");
        }
    };

    const handleUpdateItem = async (item) => {
        if (!householdId) return;
        try {
            const itemDocRef = doc(db, `households/${householdId}/items`, item.id);
            const { id, ...itemData } = item; // Don't save the id inside the document
            await updateDoc(itemDocRef, itemData);
            setIsModalOpen(false);
            setEditingItem(null);
        } catch (err) {
            console.error("Error updating item: ", err);
            setError("Failed to update item. Please try again.");
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!householdId) return;
        try {
            const itemDocRef = doc(db, `households/${householdId}/items`, itemId);
            await deleteDoc(itemDocRef);
        } catch (err) {
            console.error("Error deleting item: ", err);
            setError("Failed to delete item. Please try again.");
        }
    };
    
    const handleJoinHousehold = async (newHouseholdId) => {
        const trimmedId = newHouseholdId.trim();
        if(!user || !trimmedId) {
            setError("Please enter a valid Household ID.");
            return;
        };

        try {
            // To check if a household exists, we can check if a user document with this ID exists.
            // In our simple model, the household ID is the founder's UID.
            const householdFounderDocRef = doc(db, 'users', trimmedId);
            const householdFounderSnap = await getDoc(householdFounderDocRef);

            if (householdFounderSnap.exists()) {
                // The household is valid, so update the current user's householdId
                const currentUserDocRef = doc(db, 'users', user.uid);
                await updateDoc(currentUserDocRef, { householdId: trimmedId });
                setHouseholdId(trimmedId); // Update state to trigger re-fetch
                setIsHouseholdModalOpen(false);
            } else {
                 setError("Household not found. Please check the ID and try again.");
            }
        } catch(err) {
            console.error("Error joining household:", err);
            setError("Failed to join household. Please ensure the ID is correct.");
        }
    }


    // --- Recipe Generation ---
    const handleGenerateRecipes = async (item) => {
        setRecipeItem(item);
        setIsRecipeModalOpen(true);
        setIsGeneratingRecipes(true);
        setRecipes([]);

        const prompt = `Provide 3 simple recipe ideas for using up ${item.name}. For each recipe, include a creative name, a short description (1-2 sentences), and a list of key ingredients. Format the response as a JSON array of objects, where each object has keys "recipeName", "description", and "ingredients" (an array of strings).`;
        
        const apiKey = "AIzaSyC4kUFfpxltgFLGNZiZzn7YdJ1zQBNOiOg"; // Canvas will provide the key in the runtime environment
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                "recipeName": { "type": "STRING" },
                                "description": { "type": "STRING" },
                                "ingredients": {
                                    "type": "ARRAY",
                                    "items": { "type": "STRING" }
                                }
                            },
                              required: ["recipeName", "description", "ingredients"]
                        }
                    }
                }
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                 throw new Error(`API call failed with status: ${response.status}`);
            }
            const result = await response.json();
            const jsonText = result.candidates[0].content.parts[0].text;
            const parsedRecipes = JSON.parse(jsonText);
            setRecipes(parsedRecipes);
        } catch (err) {
            console.error("Recipe generation failed:", err);
            setRecipes([{ recipeName: "Error", description: "Could not generate recipes at this time. Please try again later.", ingredients: [] }]);
        } finally {
            setIsGeneratingRecipes(false);
        }
    };

    // --- Modal Control ---
    const openAddItemModal = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const openEditItemModal = (item) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };


    // --- UI Rendering ---

    const categorizedItems = useMemo(() => {
        return items.reduce((acc, item) => {
            const status = getExpiryStatus(item.expiry_date);
            if (!acc[status]) {
                acc[status] = [];
            }
            acc[status].push(item);
            return acc;
        }, {});
    }, [items]);

    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <LoadingSpinner />
            </div>
        );
    }
    
    if (!user) {
        return <AuthScreen error={error} setError={setError} />;
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            <Header user={user} onLogout={() => signOut(auth)} onManageHousehold={() => setIsHouseholdModalOpen(true)} />
            
            <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                <DashboardSummary items={items} categorizedItems={categorizedItems} />
                
                {isLoading ? (
                    <div className="flex justify-center mt-16">
                        <LoadingSpinner />
                    </div>
                ) : items.length === 0 ? (
                    <EmptyState onAddItem={openAddItemModal} />
                ) : (
                    <div className="mt-8 space-y-10">
                        {['Soon', 'Expired', 'Safe'].map(status => (
                            categorizedItems[status] && categorizedItems[status].length > 0 && (
                                <ItemSection 
                                    key={status} 
                                    title={status === 'Soon' ? 'Expiring Soon' : status}
                                    items={categorizedItems[status]}
                                    status={status}
                                    onEdit={openEditItemModal}
                                    onDelete={handleDeleteItem}
                                    onGetRecipes={handleGenerateRecipes}
                                />
                            )
                        ))}
                    </div>
                )}
            </main>

            <button
                onClick={openAddItemModal}
                className="fixed bottom-6 right-6 bg-black text-white p-4 rounded-full shadow-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 transition-transform transform hover:scale-110"
                aria-label="Add new item"
            >
                <PlusIcon />
            </button>
            
            {isModalOpen && (
                <ItemModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
                    onSave={editingItem ? handleUpdateItem : handleAddItem}
                    item={editingItem}
                />
            )}
            
            {isRecipeModalOpen && (
                <RecipeModal
                    isOpen={isRecipeModalOpen}
                    onClose={() => setIsRecipeModalOpen(false)}
                    item={recipeItem}
                    recipes={recipes}
                    isLoading={isGeneratingRecipes}
                />
            )}

            {isHouseholdModalOpen && (
                <HouseholdModal
                    isOpen={isHouseholdModalOpen}
                    onClose={() => setIsHouseholdModalOpen(false)}
                    currentHouseholdId={householdId}
                    onJoin={handleJoinHousehold}
                />
            )}
            
            {error && <ErrorDisplay message={error} onClose={() => setError('')} />}
        </div>
    );
}


// --- Child Components (No changes needed below this line) ---

const AuthScreen = ({ error, setError }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-emerald-50 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-emerald-700">PantryPal</h1>
                    <p className="text-gray-600 mt-2">Your smart food expiry tracker.</p>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-lg">
                    <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                    {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</p>}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition duration-300 disabled:bg-emerald-400 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (<div className="flex justify-center"><LoadingSpinner/></div>)  : (isLogin ? 'Login' : 'Sign Up')}
                        </button>
                    </form>
                    <p className="text-center text-sm text-gray-500 mt-6">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button onClick={() => {setIsLogin(!isLogin); setError('')}} className="font-semibold text-emerald-600 hover:underline ml-1">
                            {isLogin ? 'Sign Up' : 'Login'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

const Header = ({ user, onLogout, onManageHousehold }) => (
    <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
                <div className="flex-shrink-0">
                    <h1 className="text-2xl font-bold text-black">PantryPal</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500 hidden sm:block">{user.email}</div>
                     <button onClick={onManageHousehold} title="Manage Household" className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <UserIcon />
                    </button>
                    <button onClick={onLogout} title="Logout" className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <LogoutIcon />
                    </button>
                </div>
            </div>
        </div>
    </header>
);

const DashboardSummary = ({ items, categorizedItems }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 text-center">
        <div className="bg-red-100 p-4 rounded-4xl">
            <h3 className="text-xl font-bold text-red-800">Expired</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">{categorizedItems['Expired']?.length || 0}</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded-4xl">
            <h3 className="text-xl font-bold text-yellow-800">Expiring Soon</h3>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{categorizedItems['Soon']?.length || 0}</p>
        </div>
        <div className="bg-green-100 p-4 rounded-4xl">
            <h3 className="text-xl font-bold text-green-800">Total Items</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{items.length}</p>
        </div>
    </div>
);

const EmptyState = ({ onAddItem }) => (
    <div className="text-center py-16 px-6 mt-10 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold text-gray-700">Your pantry is empty!</h2>
        <p className="text-gray-500 mt-2">Get started by adding your first food item.</p>
        <button onClick={onAddItem} className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
            Add First Item
        </button>
    </div>
);


const ItemSection = ({ title, items, status, onEdit, onDelete, onGetRecipes }) => (
    <section>
        <h2 className={`text-2xl font-bold mb-4 pb-2 border-b-2 ${STATUS_COLORS[status].split(' ')[1]}`}>{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.sort((a, b) => (a.expiry_date || 0) - (b.expiry_date || 0)).map(item => (
                <ItemCard key={item.id} item={item} status={status} onEdit={onEdit} onDelete={onDelete} onGetRecipes={onGetRecipes} />
            ))}
        </div>
    </section>
);


const ItemCard = ({ item, status, onEdit, onDelete, onGetRecipes }) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const expiry = new Date(item.expiry_date);
    expiry.setHours(0,0,0,0);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    let expiryText;
    if (!item.expiry_date) expiryText = 'No date set';
    else if (diffDays < 0) expiryText = `Expired ${Math.abs(diffDays)} days ago`;
    else if (diffDays === 0) expiryText = 'Expires today';
    else if (diffDays === 1) expiryText = 'Expires tomorrow';
    else expiryText = `Expires in ${diffDays} days`;

    return (
        <div className={`bg-white-200 rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 ${STATUS_COLORS[status].split(' ')[1]}`}>
            <div className="p-5">
                <div className="flex justify-between items-start">
                    <p className={`px-3 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[status]}`}>{item.category}</p>
                    <p className={`text-sm font-bold ${STATUS_COLORS[status].split(' ')[2]}`}>{expiryText}</p>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mt-3 truncate">{item.name}</h3>
                <p className="text-gray-500 text-sm mt-1">Expiry Date: {formatDate(item.expiry_date)}</p>
                
                <div className="mt-5 space-y-2">
                     <button onClick={() => onGetRecipes(item)} className="w-full flex items-center justify-center text-sm bg-emerald-500 text-white py-2 px-4 rounded-lg hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 transition-colors">
                        <RecipeIcon /> Get Recipes
                    </button>
                    <div className="flex space-x-2">
                        <button onClick={() => onEdit(item)} className="w-1/2 text-sm bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors">Edit</button>
                        <button onClick={() => onDelete(item.id)} className="w-1/2 text-sm bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ItemModal = ({ isOpen, onClose, onSave, item }) => {
    const [name, setName] = useState('');
    const [expiry_date, setExpiryDate] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [modalError, setModalError] = useState('');

    useEffect(() => {
        if (item) {
            setName(item.name);
            setCategory(item.category);
            if (item.expiry_date) {
                const d = item.expiry_date instanceof Date ? item.expiry_date : item.expiry_date.toDate();
                setExpiryDate(d.toISOString().split('T')[0]);
            }
        } else {
            setName('');
            setExpiryDate('');
            setCategory(CATEGORIES[0]);
        }
        setModalError('');
    }, [item, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !expiry_date || !category) {
            setModalError('All fields are required.');
            return;
        }
        const savedItem = {
            name,
            expiry_date: new Date(expiry_date),
            category,
        };
        if (item) {
            savedItem.id = item.id;
        }
        onSave(savedItem);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
                <div className="flex justify-between items-center p-5 border-b">
                    <h3 className="text-xl font-semibold">{item ? 'Edit Item' : 'Add New Item'}</h3>
                    <button onClick={onClose}><CloseIcon /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                     {modalError && <p className="text-red-500 text-sm">{modalError}</p>}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Item Name</label>
                        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"/>
                    </div>
                     <div>
                        <label htmlFor="expiry_date" className="block text-sm font-medium text-gray-700">Expiry Date</label>
                        <input type="date" id="expiry_date" value={expiry_date} onChange={(e) => setExpiryDate(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"/>
                    </div>
                     <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                        <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500">
                           {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center p-2 border border-dashed border-gray-300 rounded-lg">
                        <button type="button" disabled className="flex-1 text-sm bg-gray-200 text-gray-500 py-2 px-4 rounded-md cursor-not-allowed flex items-center justify-center opacity-70">
                            <CameraIcon /> Scan Barcode (soon)
                        </button>
                    </div>
                    <div className="flex justify-end pt-4 space-x-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">{item ? 'Save Changes' : 'Add Item'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const RecipeModal = ({ isOpen, onClose, item, recipes, isLoading }) => {
    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto">
                <div className="flex justify-between items-center p-5 border-b">
                    <h3 className="text-xl font-semibold">Recipe Ideas for {item?.name}</h3>
                    <button onClick={onClose}><CloseIcon /></button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-48">
                            <LoadingSpinner />
                            <p className="mt-4 text-gray-600">Generating creative recipes...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {recipes.map((recipe, index) => (
                                <div key={index} className="border-b pb-4 last:border-b-0">
                                    <h4 className="font-bold text-lg text-emerald-700">{recipe.recipeName}</h4>
                                    <p className="text-gray-600 text-sm mt-1 mb-3">{recipe.description}</p>
                                    <h5 className="font-semibold text-sm text-gray-800">Key Ingredients:</h5>
                                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                                        {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                 <div className="flex justify-end p-4 bg-gray-50 rounded-b-lg">
                    <button type="button" onClick={onClose} className="px-5 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">Close</button>
                </div>
            </div>
        </div>
    );
};

const HouseholdModal = ({ isOpen, onClose, currentHouseholdId, onJoin }) => {
    const [joinId, setJoinId] = useState('');

    if (!isOpen) return null;
    
    const handleCopy = () => {
        navigator.clipboard.writeText(currentHouseholdId);
        // Add a small visual feedback if you want
    }

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
                 <div className="flex justify-between items-center p-5 border-b">
                    <h3 className="text-xl font-semibold">Manage Household</h3>
                    <button onClick={onClose}><CloseIcon /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <h4 className="font-semibold text-gray-800">Share Your Household</h4>
                        <p className="text-sm text-gray-600 mt-1">Give this ID to others so they can join your household inventory.</p>
                        <div className="mt-2 flex items-center bg-gray-100 p-2 rounded-md">
                           <input type="text" readOnly value={currentHouseholdId} className="flex-grow bg-transparent outline-none text-gray-700"/>
                           <button onClick={handleCopy} className="ml-2 px-3 py-1 text-sm bg-emerald-500 text-white rounded hover:bg-emerald-600">Copy</button>
                        </div>
                    </div>
                     <div className="border-t pt-6">
                        <h4 className="font-semibold text-gray-800">Join a Household</h4>
                        <p className="text-sm text-gray-600 mt-1">Enter the ID of the household you want to join.</p>
                        <form onSubmit={(e) => { e.preventDefault(); onJoin(joinId); }} className="mt-2 flex space-x-2">
                             <input 
                                type="text" 
                                value={joinId}
                                onChange={(e) => setJoinId(e.target.value)}
                                placeholder="Enter Household ID"
                                className="flex-grow w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700">Join</button>
                        </form>
                    </div>
                </div>
            </div>
         </div>
    );
}

const ErrorDisplay = ({ message, onClose }) => (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-red-600 text-white py-3 px-6 rounded-lg shadow-lg flex items-center space-x-4">
        <span>{message}</span>
        <button onClick={onClose} className="font-bold text-xl">&times;</button>
    </div>
);
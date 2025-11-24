import { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../utils/supabase";
import { SessionContext } from "./SessionContext";

export const CartContext = createContext({
  products: [],
  cart: [],
  loading: false,
  error: null,
  addToCart: () => {},
  updateQty: () => {},
  clearCart: () => {},
  removeFromCart: () => {},
  uniqueProducts: [],
  addProduct: () => {},
  removeProduct: () => {},
  updateProduct: () => {},
  removeProductFromDB: () => {}
});

export function CartProvider({ children }) {
  const { session } = useContext(SessionContext);

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  let mounted = true;

  useEffect(() => {
    if (!session) {
      setProducts([]);
      setCart([]);
      setLoading(false);
      fetchProductsSupabase();
      return;
    }

    async function fetchProductsSupabase() {
      try {
        const { data, error: fetchError } = await supabase.from("product_2v").select("*");
        if (!mounted) return;
        if (fetchError) {
          setError(fetchError.message || JSON.stringify(fetchError));
          setProducts([]);
        } else {
          setProducts(data || []);
        }
      } catch (err) {
        if (mounted) setError(String(err));
        if (mounted) setProducts([]);
      }
    }

    async function fetchCartSupabase() {
      if (!session?.user?.id) {
        if (mounted) setCart([]);
        if (mounted) setLoading(false);
        return;
      }

      try {
        const { data, error: cartError } = await supabase
          .from("cart")
          .select("*")
          .eq("customer_id", session.user.id)
          .order("added_at", { ascending: false });

        if (!mounted) return;

        if (cartError) {
          setError(cartError.message || JSON.stringify(cartError));
          setCart([]);
        } else {
          setCart(data || []);
        }
      } catch (err) {
        if (mounted) setError(String(err));
        if (mounted) setCart([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    setLoading(true);
    fetchProductsSupabase();
    fetchCartSupabase();

    return () => {
      mounted = false;
    };
  }, [session]);

  const addToCart = (product) => {
    setCart((prev) => [...prev, { ...product, quantity: 1 }]);

    async function addCartItem(prod) {
      if (!session?.user?.id) {
        setError("Entre em sua conta para modificar o carrinho");
        return;
      }

      try {
        const { data: existing } = await supabase
          .from("cart")
          .select("*")
          .eq("customer_id", session.user.id)
          .eq("product_id", prod.id)
          .maybeSingle();

        if (existing) {
          const newQty = existing.quantity + 1;
          await supabase
            .from("cart")
            .update({ quantity: newQty, added_at: new Date().toISOString() })
            .eq("customer_id", session.user.id)
            .eq("product_id", prod.id);
          return;
        }

        await supabase.from("cart").insert({
          customer_id: session.user.id,
          product_id: prod.id,
          quantity: 1,
          title: prod.title,
          price: prod.price,
          thumbnail: prod.thumbnail,
          description: prod.description,
          added_at: new Date().toISOString(),
        });
      } catch (err) {
        setError(String(err));
      }
    }

    addCartItem(product);
  };

  const updateQty = async (product, qty) => {
    if (!session?.user?.id) {
      setError("Entre em sua conta para modificar o carrinho");
      return;
    }

    try {
      const productId = product.product_id ?? product.id;

      await supabase
        .from("cart")
        .update({ quantity: qty, added_at: new Date().toISOString() })
        .eq("customer_id", session.user.id)
        .eq("product_id", productId);
    } catch (err) {
      setError(String(err));
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === product.id || item.product_id === product.id ? { ...item, quantity: qty } : item
      )
    );
  };

  const removeFromCart = async (product) => {
    const match = cart.find(
      (item) =>
        item.id === product.id ||
        item.product_id === product.id ||
        (product.product_id && item.product_id === product.product_id)
    );

    if (!match) return;

    const currentQty = match.quantity;
    const productId = match.product_id ?? match.id;

    if (currentQty > 1) {
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.id === match.id || item.product_id === productId
            ? { ...item, quantity: (item.quantity ?? 1) - 1 }
            : item
        )
      );
    } else {
      setCart((prevCart) => prevCart.filter(
        (item) => item.id !== match.id && item.product_id !== productId
      ));
    }

    // Persist change to Supabase
    if (!session?.user?.id) {
      setError("Entre em sua conta para modificar o carrinho");
      return;
    }

    try {
      if (currentQty > 1) {
        await supabase
          .from("cart")
          .update({ quantity: currentQty - 1, added_at: new Date().toISOString() })
          .eq("customer_id", session.user.id)
          .eq("product_id", productId);
      } else {
        await supabase
          .from("cart")
          .delete()
          .eq("customer_id", session.user.id)
          .eq("product_id", productId);
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const clearCart = async () => {
    if (!session?.user?.id) return;
    try {
      await supabase
        .from("cart")
        .delete()
        .eq("customer_id", session.user.id);
      setCart([]);
    } catch (err) {
      setError(String(err));
    }
  };

  const addProduct = (product) => {
    setProducts((prev) => [...prev, { ...product, id: Date.now() }]);
  };

  const removeProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const updateProduct = async (updated) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );

    try {
      await supabase
        .from("product_2v")
        .update({
          title: updated.title,
          price: updated.price,
          description: updated.description,
          thumbnail: updated.thumbnail,
          updated_at: new Date().toISOString(),
        })
        .eq("id", updated.id);
    } catch (err) {
      setError(String(err));
    }
  };

  const removeProductFromDB = async (id) => {
    try {
      await supabase.from("product_2v").delete().eq("id", id);
      removeProduct(id);
    } catch (err) {
      setError(String(err));
    }
  };

  const productMap = {};
  cart.forEach((product) => {
    const idKey = product.product_id ?? product.id;
    if (productMap[idKey]) {
      productMap[idKey].qty += product.quantity ?? 1;
    } else {
      productMap[idKey] = { ...product, qty: product.quantity ?? 1, id: idKey };
    }
  });

  const uniqueProducts = Object.values(productMap);

  const context = {
    products,
    cart,
    loading,
    error,
    addToCart,
    updateQty,
    clearCart,
    removeFromCart,
    uniqueProducts,
    addProduct,
    removeProduct,
    updateProduct,
    removeProductFromDB
  };

  return <CartContext.Provider value={context}>{children}</CartContext.Provider>;
}

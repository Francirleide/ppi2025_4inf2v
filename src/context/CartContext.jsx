import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useSession } from "./SessionContext";

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useSession();
  const [cart, setCart] = useState([]);

  // Carregar carrinho do Supabase ao logar
  useEffect(() => {
    if (!user) {
      setCart([]);
      return;
    }

    const loadCart = async () => {
      const { data } = await supabase
        .from("cart")
        .select("*")
        .eq("user_id", user.id);

      setCart(data || []);
    };

    loadCart();
  }, [user]);

  // =============================
  // Adicionar item
  // =============================
  const addToCart = async (productId) => {
    if (!user) return;

    const existing = cart.find((i) => i.product_id === productId);

    if (existing) {
      updateQuantity(productId, existing.quantity + 1);
      return;
    }

    const { data } = await supabase
      .from("cart")
      .insert([{ user_id: user.id, product_id: productId, quantity: 1 }])
      .select()
      .single();

    setCart([...cart, data]);
  };

  // =============================
  // Atualizar quantidade
  // =============================
  const updateQuantity = async (productId, newQty) => {
    if (!user) return;

    const { data } = await supabase
      .from("cart")
      .update({ quantity: newQty })
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .select()
      .single();

    setCart((prev) =>
      prev.map((i) =>
        i.product_id === productId ? { ...i, quantity: data.quantity } : i
      )
    );
  };

  // =============================
  // Remover item
  // =============================
  const removeFromCart = async (productId) => {
    if (!user) return;

    await supabase
      .from("cart")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);

    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "coven:hide-values";
/** Máscara no lugar do número, com a largura parecida com a de um valor. */
export const MASK = "R$ ••••••";

interface HiddenValuesContext {
  hidden: boolean;
  toggle: () => void;
}

const Ctx = createContext<HiddenValuesContext>({
  hidden: false,
  toggle: () => {},
});

/**
 * "Esconder valores": troca todo valor em dinheiro por uma máscara, para usar
 * o sistema com alguém olhando a tela. A escolha fica salva no navegador.
 */
export function HiddenValuesProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  // Lê depois da montagem: no SSR não existe localStorage, e ler no estado
  // inicial causaria divergência de hidratação.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setHidden(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      }
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ hidden, toggle }}>{children}</Ctx.Provider>;
}

export function useHiddenValues() {
  return useContext(Ctx);
}

/**
 * Formatador que respeita o "esconder valores". Passe a função que formata
 * normalmente e use o resultado no lugar dela.
 *
 *   const fmt = useMaskedMoney(brl);
 *   <span>{fmt(entry.amount)}</span>
 */
export function useMaskedMoney<T>(format: (value: T) => string) {
  const { hidden } = useHiddenValues();
  return useCallback(
    (value: T) => (hidden ? MASK : format(value)),
    [hidden, format],
  );
}

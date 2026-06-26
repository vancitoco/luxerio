import { createContext, useContext, useState, useEffect } from 'react';
import { storefrontQuery } from '../lib/shopify/client.js';
import {
  CUSTOMER_ACCESS_TOKEN_CREATE,
  CUSTOMER_ACCESS_TOKEN_DELETE,
  CUSTOMER_CREATE,
  CUSTOMER_UPDATE,
  CUSTOMER_QUERY,
} from '../lib/shopify/customer-queries.js';

const TOKEN_KEY = 'luxerio-customer-token';
const CustomerContext = createContext(null);

export function CustomerProvider({ children }) {
  const [token, setToken]       = useState(() => localStorage.getItem(TOKEN_KEY));
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading]   = useState(!!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (token) hydrate(token);
  }, []);

  async function hydrate(t) {
    setLoading(true);
    try {
      const data = await storefrontQuery(CUSTOMER_QUERY, { customerAccessToken: t });
      if (data.customer) {
        setCustomer(data.customer);
      } else {
        clearToken();
      }
    } catch {
      clearToken();
    } finally {
      setLoading(false);
    }
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCustomer(null);
  }

  async function login(email, password) {
    setLoading(true);
    try {
      const data = await storefrontQuery(CUSTOMER_ACCESS_TOKEN_CREATE, {
        input: { email, password },
      });
      const { customerAccessToken, customerUserErrors } = data.customerAccessTokenCreate;
      if (customerUserErrors?.length) return { error: customerUserErrors[0].message };
      const t = customerAccessToken.accessToken;
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      await hydrate(t);
      return { ok: true };
    } catch {
      return { error: 'Login failed. Try again.' };
    } finally {
      setLoading(false);
    }
  }

  async function signup(firstName, lastName, email, password) {
    setLoading(true);
    try {
      const data = await storefrontQuery(CUSTOMER_CREATE, {
        input: { firstName, lastName, email, password },
      });
      const { customerUserErrors } = data.customerCreate;
      if (customerUserErrors?.length) return { error: customerUserErrors[0].message };
      return login(email, password);
    } catch {
      return { error: 'Signup failed. Try again.' };
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(fields) {
    if (!token) return { error: 'Not logged in.' };
    setLoading(true);
    try {
      const data = await storefrontQuery(CUSTOMER_UPDATE, {
        customerAccessToken: token,
        customer: fields,
      });
      const { customer: updated, customerUserErrors } = data.customerUpdate;
      if (customerUserErrors?.length) return { error: customerUserErrors[0].message };
      setCustomer((prev) => ({ ...prev, ...updated }));
      return { ok: true };
    } catch {
      return { error: 'Update failed. Try again.' };
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      if (token) await storefrontQuery(CUSTOMER_ACCESS_TOKEN_DELETE, { customerAccessToken: token });
    } catch {}
    clearToken();
  }

  return (
    <CustomerContext.Provider value={{ customer, token, loading, login, signup, logout, updateProfile }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  return useContext(CustomerContext);
}

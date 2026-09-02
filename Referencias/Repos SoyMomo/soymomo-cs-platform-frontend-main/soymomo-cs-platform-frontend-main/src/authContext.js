/* eslint-disable react/prop-types */
// authContext.js
import { createContext, useState, useContext, useEffect } from "react";
import React from 'react'

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [tokens, setTokens] = useState(() => {
    // On initial load, try to get the state from local storage
    try {
      const item = window.localStorage.getItem('tokens');
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error("Failed to parse auth token from local storage", error);
      return null;
    }
  });

  // Make sure to keep local storage in sync with the state
  useEffect(() => {
    if (tokens) {
      window.localStorage.setItem('tokens', JSON.stringify(tokens));
    } else {
      window.localStorage.removeItem('tokens');
    }
  }, [tokens]);

  return (
    <AuthContext.Provider value={{ tokens, setTokens }}>
      {children}
    </AuthContext.Provider>
  );
};

export const checkAuth = (tokens) => {
  // Se trabaja con milisegundos, por lo que se tiene que multiplicar el ExpiresIn por 1000
  const end = tokens.emissionTime + tokens.ExpiresIn*1000;

  if (Date.now() >= end) {
    return false;
  }
  return true;
}

export const useAuth = () => useContext(AuthContext);
export default AuthProvider;


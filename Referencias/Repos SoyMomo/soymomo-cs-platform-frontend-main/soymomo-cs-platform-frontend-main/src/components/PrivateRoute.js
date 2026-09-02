// This is used to determine if a user is authenticated and
// if they are allowed to visit the page they navigated to.

// If they are: they proceed to the page
// If not: they are redirected to the login page.
// Créditos a bluesixty en https://stackoverflow.com/questions/47476186/when-user-is-not-logged-in-redirect-to-login-reactjs
import React from 'react'
import { useAuth, checkAuth } from "../authContext";
import { Navigate, Route } from 'react-router-dom'

const PrivateRoute = ({ component: Component, ...rest }) => {

  // Add your own authentication on the below line.
  const { tokens } = useAuth();

  let isLoggedIn = false;

  if (tokens && checkAuth(tokens)) {
    isLoggedIn = true;
  }

  return (
    <Route
      {...rest}
      render={props => 
        isLoggedIn ? (
          <Component {...props} />
        ) : (
          <Navigate to={{ pathname: '/login', state: { from: props.location } }} />
        )
      }
    />
  )
}

export default PrivateRoute